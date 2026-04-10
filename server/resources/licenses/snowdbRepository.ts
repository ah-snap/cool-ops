import { Client } from 'pg';

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

export async function insertLicenseAndTransaction({ transaction_id, c4_user_id, skus, subscription_id, account_id, location_id, expiration_date, external_customer_id }: SnowInsertInput) {
        const client = new Client({
            user: process.env.PGUSER,
            host: process.env.PGHOST,
            database: process.env.PGDATABASE,
            password: process.env.PGPASSWORD,
            port: process.env.PGPORT,
        });
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
                    ['3c42963c-bc03-4093-8fa1-cfc2b87d6f1d', transaction_id, c4_user_id, skus]
                );

                systemSubscriptionTransactionId = transactionResult.rows[0].system_subscription_transaction_id;
            }

            // check for an existing system_subscription record with the same transaction_id_from_source and subscription_id to avoid duplicate subscriptions

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
                    [subscription_id, account_id, location_id, expiration_date, false, false, 'ACTIVE', systemSubscriptionTransactionId, external_customer_id]
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
    const client = new Client({
        user: process.env.PGUSER,
        host: process.env.PGHOST,
        database: process.env.PGDATABASE,
        password: process.env.PGPASSWORD,
        port: process.env.PGPORT,
    });
    try {
        await client.connect();
        const result = await client.query(
            `SELECT
                system_subscription_id as id
                ,account_id as accountId
                ,location_id as locationId
                ,expiration_date as expirationDate
                ,canceled
                ,status
                ,deleted
                ,system_subscription.modified_date
                ,external_customer_id as d365CustomerId
                ,sku
                ,sst.transaction_id_from_source as transactionId
            FROM snow.subscription.system_subscription
                    inner join snow.subscription.subscription s on s.subscription_id = system_subscription.subscription_id
                    inner join snow.subscription.system_subscription_transaction sst on system_subscription.system_subscription_transaction_id = sst.system_subscription_transaction_id
            where account_id = $1`,
            [accountId]
        );
        return result.rows as SnowLicenseRow[];
    } finally {
        await client.end();
    }
}