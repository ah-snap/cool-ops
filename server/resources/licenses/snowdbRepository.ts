import { Client } from "pg";
import { getPgHost, getPgPort } from "../../common/snowdbPostgres.ts";

interface SnowInsertInput {
    transaction_id: string;
    c4_user_id: number;
    skus: string;
    subscription_id: string;
    account_id: number;
    location_id: string;
    expiration_date: string | Date;
    external_customer_id: string;
}

export interface SnowLicenseRow {
    id: number;
    accountid: number;
    locationid: string;
    expirationdate: Date;
    canceled: boolean;
    status: string;
    deleted: boolean;
    modified_date: Date;
    d365customerid: string;
    sku: string;
    transactionid: string;
}

function createPgClient(): Client {
    return new Client({
        user: process.env.PGUSER,
        host: getPgHost(),
        database: process.env.PGDATABASE,
        password: process.env.PGPASSWORD,
        port: getPgPort(),
    });
}

function getSnowPspFilter(pspHints: string[]): { clause: string; params: unknown[] } {
    return {
        clause: "EXISTS (SELECT 1 FROM unnest($1::text[]) AS psp_hint(value) WHERE sst.transaction_id_from_source LIKE (psp_hint.value || '%'))",
        params: [pspHints],
    };
}

export async function insertLicenseAndTransaction({ transaction_id, c4_user_id, skus, subscription_id, account_id, location_id, expiration_date, external_customer_id }: SnowInsertInput) {
    const client = createPgClient();
    try {
        await client.connect();

        let systemSubscriptionTransactionId = 0;

        const idResult = await client.query(
            `SELECT system_subscription_transaction_id FROM snow.subscription.system_subscription_transaction
             WHERE transaction_id_from_source = $1`,
            [transaction_id]
        );
        systemSubscriptionTransactionId = idResult.rows[0]?.system_subscription_transaction_id || 0;

        if (!systemSubscriptionTransactionId) {
            const transactionResult = await client.query(
                `INSERT INTO snow.subscription.system_subscription_transaction
                 (transaction_source_id, transaction_id_from_source, c4_user_id, skus)
                 VALUES ($1, $2, $3, $4)
                 RETURNING system_subscription_transaction_id`,
                ["3c42963c-bc03-4093-8fa1-cfc2b87d6f1d", transaction_id, c4_user_id, skus]
            );

            systemSubscriptionTransactionId = transactionResult.rows[0].system_subscription_transaction_id;
        }

        const subscriptionIdResult = await client.query(
            `SELECT ss.subscription_id FROM snow.subscription.system_subscription ss
             INNER JOIN snow.subscription.system_subscription_transaction sst
                ON ss.system_subscription_transaction_id = sst.system_subscription_transaction_id
             WHERE sst.transaction_id_from_source = $1
               AND ss.subscription_id = $2`,
            [transaction_id, subscription_id]
        );

        if (subscriptionIdResult.rows.length > 0) {
            console.log(`Subscription with id ${subscription_id} already exists for transaction ${transaction_id}`);
        } else {
            await client.query(
                `INSERT INTO snow.subscription.system_subscription
                 (subscription_id, account_id, location_id, expiration_date, deleted, canceled, status, system_subscription_transaction_id, external_customer_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [subscription_id, account_id, location_id, expiration_date, false, false, "ACTIVE", systemSubscriptionTransactionId, external_customer_id]
            );
        }

        return await client.query(
            `SELECT
                ss.subscription_id,
                ss.account_id,
                ss.location_id,
                ss.expiration_date
             FROM snow.subscription.system_subscription ss
             INNER JOIN snow.subscription.system_subscription_transaction sst
                ON ss.system_subscription_transaction_id = sst.system_subscription_transaction_id
             WHERE sst.transaction_id_from_source = $1`,
            [transaction_id]
        );
    } finally {
        await client.end();
    }
}

export async function getLicensesByAccountId({ accountId }: { accountId: string | number; }): Promise<SnowLicenseRow[]> {
    const client = createPgClient();
    try {
        await client.connect();
        const result = await client.query(
            `SELECT
                system_subscription_id as id,
                account_id as accountId,
                location_id as locationId,
                expiration_date as expirationDate,
                canceled,
                status,
                deleted,
                system_subscription.modified_date,
                external_customer_id as d365CustomerId,
                sku,
                sst.transaction_id_from_source as transactionId
             FROM snow.subscription.system_subscription
             INNER JOIN snow.subscription.subscription s on s.subscription_id = system_subscription.subscription_id
             INNER JOIN snow.subscription.system_subscription_transaction sst on system_subscription.system_subscription_transaction_id = sst.system_subscription_transaction_id
             WHERE account_id = $1`,
            [accountId]
        );
        return result.rows as SnowLicenseRow[];
    } finally {
        await client.end();
    }
}

export async function getSnowLicenseDetails(pspHints: string[]): Promise<{
    systemSubscriptions: Record<string, unknown>[];
    systemSubscriptionTransactions: Record<string, unknown>[];
    subscriptions: Record<string, unknown>[];
}> {
    if (!pspHints.length) {
        return {
            systemSubscriptions: [],
            systemSubscriptionTransactions: [],
            subscriptions: [],
        };
    }

    const client = createPgClient();
    const { clause, params } = getSnowPspFilter(pspHints);

    try {
        await client.connect();

        const [systemSubscriptionsResult, transactionsResult, subscriptionsResult] = await Promise.all([
            client.query(
                `SELECT
                    ss.*,
                    s.sku AS subscription_sku,
                    s.subscription_id AS subscription_table_id,
                    sst.transaction_id_from_source
                 FROM snow.subscription.system_subscription ss
                 INNER JOIN snow.subscription.system_subscription_transaction sst
                    ON sst.system_subscription_transaction_id = ss.system_subscription_transaction_id
                 LEFT JOIN snow.subscription.subscription s
                    ON s.subscription_id = ss.subscription_id
                 WHERE ${clause}
                 ORDER BY ss.modified_date DESC`,
                params
            ),
            client.query(
                `SELECT
                    sst.*
                 FROM snow.subscription.system_subscription_transaction sst
                 WHERE ${clause}
                 ORDER BY sst.system_subscription_transaction_id DESC`,
                params
            ),
            client.query(
                `SELECT DISTINCT
                    s.*
                 FROM snow.subscription.system_subscription ss
                 INNER JOIN snow.subscription.system_subscription_transaction sst
                    ON sst.system_subscription_transaction_id = ss.system_subscription_transaction_id
                 INNER JOIN snow.subscription.subscription s
                    ON s.subscription_id = ss.subscription_id
                 WHERE ${clause}
                 ORDER BY s.subscription_id`,
                params
            ),
        ]);

        return {
            systemSubscriptions: systemSubscriptionsResult.rows,
            systemSubscriptionTransactions: transactionsResult.rows,
            subscriptions: subscriptionsResult.rows,
        };
    } finally {
        await client.end();
    }
}

export async function revokeSnowLicenseTarget(pspHints: string[]): Promise<{ rowCount: number; }> {
    if (!pspHints.length) {
        return { rowCount: 0 };
    }

    const client = createPgClient();
    const { clause, params } = getSnowPspFilter(pspHints);

    try {
        await client.connect();
        const result = await client.query(
            `UPDATE snow.subscription.system_subscription ss
             SET expiration_date = CURRENT_DATE - INTERVAL '1 day',
                 modified_date = NOW()
             FROM snow.subscription.system_subscription_transaction sst
             WHERE ss.system_subscription_transaction_id = sst.system_subscription_transaction_id
               AND ${clause}`,
            params
        );

        return { rowCount: result.rowCount || 0 };
    } finally {
        await client.end();
    }
}

export async function deleteSnowLicenseTarget(pspHints: string[]): Promise<{ deletedSubscriptions: number; deletedTransactions: number; }> {
    if (!pspHints.length) {
        return { deletedSubscriptions: 0, deletedTransactions: 0 };
    }

    const client = createPgClient();
    const { clause, params } = getSnowPspFilter(pspHints);

    try {
        await client.connect();
        await client.query("BEGIN");

        const deleteSubscriptionsResult = await client.query(
            `DELETE FROM snow.subscription.system_subscription ss
             USING snow.subscription.system_subscription_transaction sst
             WHERE ss.system_subscription_transaction_id = sst.system_subscription_transaction_id
               AND ${clause}`,
            params
        );

        const deleteTransactionsResult = await client.query(
            `DELETE FROM snow.subscription.system_subscription_transaction sst
             WHERE ${clause}
               AND NOT EXISTS (
                   SELECT 1
                   FROM snow.subscription.system_subscription ss
                   WHERE ss.system_subscription_transaction_id = sst.system_subscription_transaction_id
               )`,
            params
        );

        await client.query("COMMIT");

        return {
            deletedSubscriptions: deleteSubscriptionsResult.rowCount || 0,
            deletedTransactions: deleteTransactionsResult.rowCount || 0,
        };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        await client.end();
    }
}
