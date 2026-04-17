import * as security16 from "../../common/security16.js";
import * as repository from "./repository.js";
import * as snowdbRepository from "./snowdbRepository.js";
import type {
    ExpiredLicenseRow,
    LicenseDetailsPayload,
    LicenseDetailsTargetInput,
    LicenseTransactionRow,
    PotentiallyMissingPspRow,
    StripeValidationRow,
    SubscriptionCodeValues,
} from "./dtos.js";

interface InsertLicenseInput {
    pool?: any;
    oldPsp?: string;
    psp?: string;
    code?: string;
    duration?: string;
    consumerId?: number;
    activationDate?: Date;
    expirationDate?: Date;
    subscriptionCodeBatchId?: number;
    productId?: number;
    appliedByUserId?: number | null;
    revokedByAccountId?: number | null;
    revocationDate?: Date | null;
    transactionId: number;
}

interface InsertTransactionInput {
    pool?: any;
    referencePSP?: string;
    transaction_id: string;
    account_id?: number;
    vendor_id?: number;
    cost?: number;
    product_name?: string;
    sku?: string;
    is_recurring?: boolean;
    created_time?: Date;
    last_update_time?: Date;
    dealer_id?: number;
    tax?: number;
    tax_percent?: number;
    cancellation_date?: Date | null;
}

export async function insertLicense({ pool, oldPsp, psp, code, duration, consumerId, activationDate, expirationDate, subscriptionCodeBatchId, productId, appliedByUserId, revokedByAccountId, revocationDate, transactionId }: InsertLicenseInput): Promise<number> {
        if (!pool) {
        pool = await security16.connect();
        console.log("Connected to security16");
    }
    
    if (!code && oldPsp) {
        const oldTransaction: SubscriptionCodeValues = await repository.getValuesForSubscriptionCode(pool, oldPsp);
        return insertLicense({
            transactionId,
            oldPsp,
            psp,
            code: generateRandomCode(),
            duration: oldTransaction.Duration,
            consumerId: oldTransaction.ConsumerId,
            activationDate: oldTransaction.ActivationDate,
            expirationDate: oldTransaction.ExpirationDate,
            subscriptionCodeBatchId: oldTransaction.SubscriptionCodeBatchId,
            productId: oldTransaction.ProductId,
            appliedByUserId: oldTransaction.AppliedByUserId,
            revokedByAccountId: oldTransaction.RevokedByAccountId,
            revocationDate: oldTransaction.RevocationDate
        });
    }

    const result = await repository.insertLicense({
        pool,
        code,
        duration,
        consumerId,
        activationDate,
        expirationDate,
        subscriptionCodeBatchId,
        productId,
        appliedByUserId,
        revokedByAccountId,
        revocationDate,
        transactionId
    });

    return result;
}

export async function insertTransaction({ pool, referencePSP, transaction_id, account_id, vendor_id, cost, product_name, sku, is_recurring, created_time, last_update_time, dealer_id, tax, tax_percent, cancellation_date }: InsertTransactionInput): Promise<number> {
    console.log("Inserting license", transaction_id);
    if (!pool) {
        pool = await security16.connect();
        console.log("Connected to security16");
    }

    if (referencePSP && !account_id) {
        const referenceFields = await repository.getFieldsFromReferencePSP(pool, referencePSP);
        return insertTransaction({
            transaction_id: transaction_id,
            account_id: referenceFields.account_id,
            vendor_id: referenceFields.vendor_id,
            cost: referenceFields.cost,
            product_name: referenceFields.product_name,
            sku: referenceFields.sku,
            is_recurring: referenceFields.is_recurring,
            created_time: created_time || referenceFields.created_time,
            last_update_time: last_update_time || referenceFields.last_update_time,
            dealer_id: referenceFields.dealer_id,
            tax: referenceFields.tax,
            tax_percent: referenceFields.tax_percent,
            cancellation_date: referenceFields.cancellation_date
        });
    }

    const existingId = await repository.getIDForExistingTransaction(transaction_id);
    console.log("Existing ID", existingId);
    if (existingId) return existingId;

    const result = await repository.insertTransaction({
        pool,
        transaction_id,
        account_id,
        vendor_id,
        cost,
        product_name,
        sku,
        is_recurring,
        created_time,
        last_update_time,
        dealer_id,
        tax,
        tax_percent,
        cancellation_date
    });
    
    return result;
}

async function createLicenseFromFailedRenewal(pool: any, oldPsp: string, newPsp: string): Promise<number[]> {
    const insertResult = await insertTransaction({
        pool,
        referencePSP: oldPsp,
        transaction_id: newPsp
    });
    const insertResultConnect = await insertTransaction({
        referencePSP: `${oldPsp}-Connect`,
        transaction_id: `${newPsp}-Connect`
    });
    const insertResultLicense = await insertLicense({
        pool,
        oldPsp,
        psp: newPsp,
        transactionId: insertResult,
    });
    const insertResultLicenseConnect = await insertLicense({
        pool,
        oldPsp: `${oldPsp}-Connect`,
        psp: `${newPsp}-Connect`,
        transactionId: insertResultConnect,
    });

    return [insertResult, insertResultConnect, insertResultLicense, insertResultLicenseConnect];
}

async function unmurder4Sight(psp: string): Promise<{ vt4SightID: number | null; vtConnectID: number | null; sc4SightID: number | null; scConnectID: number | null; error?: string; }> {
    const code = generateRandomCode();
    const ids = await repository.getIdsForMurder(psp);

    if (ids.sc4SightID) {
        return {...ids, error: "Already exists"};
    }

    const result = await repository.insertSubscriptionCodeFromIds(ids as { vt4SightID: number; scConnectID: number; }, code)
    return {...ids, sc4SightID: result.recordset[0].ID};
}



export function generateRandomCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 16; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    console.log("Code", code);

    return code.match(/..../g).join('-');
}

export async function createLicense({oldPsp, newPsp}: { oldPsp?: string; newPsp: string; }) {
    console.log("Connecting to security16");
    const pool = await security16.connect();
    console.log("Connected");

    if (oldPsp && newPsp) {
        return await createLicenseFromFailedRenewal(pool, oldPsp, newPsp);
    }

    return await unmurder4Sight(newPsp);
}

export async function getTransactionInformation({accountName, accountId}: { accountName?: string; accountId?: string | number; }): Promise<Array<LicenseTransactionRow & { expirationDateSnow?: Date | null; }>> {
    await security16.connect();
    console.log("Connected to security16");

    const security16Result = await repository.getTransactionInformation({ accountName, accountId });
    console.log("Got result from security16", security16Result);

    if (!accountId) return security16Result;

    try {
        const snowResult = await snowdbRepository.getLicensesByAccountId({ accountId });
        return security16Result.map(license => {
            const matchingSnowLicense = snowResult.find(snowLicense => license.transaction_id.startsWith(snowLicense.transactionid) && license.sku.toLowerCase() === snowLicense.sku.toLowerCase());
            return {
                ...license,
                expirationDateSnow: matchingSnowLicense ? matchingSnowLicense.expirationdate : null,
            }
        });
    }
    catch (err) {
        console.error("Error fetching from SnowDB", err);
        return security16Result;
    }

    

    return await repository.getTransactionInformation({ accountName, accountId });
}

export async function getPotentiallyMissingPsp({psp, externalId}: { psp?: string; externalId?: string; }): Promise<PotentiallyMissingPspRow[]> {
    await security16.connect();
    console.log("Connected to security16");

    return await repository.getPotentiallyMissingPsp({ psp, externalId });
}

export async function updateLicense({ code, updates }: { code: string; updates: Record<string, string>; }) {
    await security16.connect();
    console.log("Connected to security16");
    return await repository.updateLicense({ code, updates });
}

export async function validateStripeEvents({ events }: { events: Array<{ id: string; created: number; }>; }): Promise<StripeValidationRow[] | null> {
    await security16.connect();
    console.log("Connected to security16");
    return await repository.validateStripeEvents({ events });
}

export async function retrieveStripeEvents(): Promise<StripeValidationRow[] | null> {
    const events = [];
    let has_more = true;
    
    do {
        const batch = await retrieveBatchOfStripeEvents({ lastEventId: events.length > 0 ? events[events.length - 1].id : null, batchSize: 100 });
        console.log("Batch", batch);
        events.push(...batch.data.map(event => ({
            id: event.id,
            type: event.type,
            customer: event.data.object.customer,
            calculated_statement_descriptor: event.data.object.calculated_statement_descriptor,
            amount: event.data.object.amount,
            created: event.data.object.created,
            currency: event.data.object.currency,
            description: event.data.object.description,
        })));
        console.log("Retrieved batch of", batch.data.length, "events");
        console.log(events);
        has_more = batch.has_more;
        if (!has_more) {
            console.log("No more events to retrieve");
        }
        if (events.length >= 200) {
            has_more = false;
            console.log("Reached 1000 events, stopping retrieval to avoid long processing times");
        }
    } while (has_more);

    return await validateStripeEvents({ events });
}

export async function retrieveBatchOfStripeEvents({ lastEventId, batchSize }: { lastEventId: string | null; batchSize: number; }) {
    const myHeaders = new Headers();

    const requestOptions: RequestInit = {
    method: "GET",
    redirect: "follow"
    };

    
    const url = `https://api.stripe.com/v1/events?type=charge.succeeded&limit=${batchSize}${lastEventId ?`&starting_after=${lastEventId}` : ''}`;
    console.log("Fetching URL", url);
    return await fetch(url, requestOptions)
        .then((response) => response.json())
        // .then((result) => console.log(result))
        .catch((error) => console.error(error));
}

export async function insertSnowDbLicenseAndTransaction({ transaction_id, c4_user_id, skus, subscription_id, account_id, location_id, expiration_date, external_customer_id }: {
    transaction_id: string;
    c4_user_id: number;
    skus: string;
    subscription_id: string;
    account_id: number;
    location_id: string;
    expiration_date: string | Date;
    external_customer_id: string;
}) {
    return await snowdbRepository.insertLicenseAndTransaction({ transaction_id, c4_user_id, skus, subscription_id, account_id, location_id, expiration_date, external_customer_id });
}

export async function expireLicenses({ licenses }: { licenses: Array<{ code?: string | null; psp?: string | null; }>; }): Promise<ExpiredLicenseRow[] | null> {
    await security16.connect();
    console.log("Connected to security16");
    
    return await repository.expireLicenses({ licenses });
}

function normalizePsp(psp: string): string {
    return psp.replace(/-(Connect|Assist|Assist-Premium)$/i, "");
}

function getPspHintsFromSecurityRows(
    target: LicenseDetailsTargetInput,
    securitySubscriptionCodes: Array<{ psp?: string | null; }>,
    securityVendorTransactions: Array<{ transaction_id?: string | null; }>
): string[] {
    if (target.type === "psp") {
        return [normalizePsp(target.value)];
    }

    const hints = new Set<string>();
    securitySubscriptionCodes.forEach((row) => {
        if (row.psp) {
            hints.add(normalizePsp(row.psp));
        }
    });
    securityVendorTransactions.forEach((row) => {
        if (row.transaction_id) {
            hints.add(normalizePsp(row.transaction_id));
        }
    });

    return Array.from(hints);
}

export async function getLicenseDetails(target: LicenseDetailsTargetInput): Promise<LicenseDetailsPayload> {
    await security16.connect();

    const [securitySubscriptionCodes, securityVendorTransactions] = await Promise.all([
        repository.getSecuritySubscriptionCodeDetails(target),
        repository.getSecurityVendorTransactionDetails(target),
    ]);

    const pspHints = getPspHintsFromSecurityRows(target, securitySubscriptionCodes, securityVendorTransactions);
    let snow = {
        systemSubscriptions: [] as Record<string, unknown>[],
        systemSubscriptionTransactions: [] as Record<string, unknown>[],
        subscriptions: [] as Record<string, unknown>[],
    };

    try {
        snow = await snowdbRepository.getSnowLicenseDetails(pspHints);
    } catch (err) {
        console.error("Error fetching Snow license details", err);
    }

    return {
        sourceType: target.type,
        sourceValue: target.value,
        securitySubscriptionCodes,
        securityVendorTransactions,
        snowSystemSubscriptions: snow.systemSubscriptions,
        snowSystemSubscriptionTransactions: snow.systemSubscriptionTransactions,
        snowSubscriptions: snow.subscriptions,
    };
}

export async function revokeLicenseDetailsTarget(target: LicenseDetailsTargetInput): Promise<{
    security: { rowsAffected: number[]; };
    snow: { rowCount: number; };
}> {
    await security16.connect();

    const [securitySubscriptionCodes, securityVendorTransactions] = await Promise.all([
        repository.getSecuritySubscriptionCodeDetails(target),
        repository.getSecurityVendorTransactionDetails(target),
    ]);
    const pspHints = getPspHintsFromSecurityRows(target, securitySubscriptionCodes, securityVendorTransactions);

    const [security, snow] = await Promise.all([
        repository.revokeLicenseTarget(target),
        snowdbRepository.revokeSnowLicenseTarget(pspHints),
    ]);

    return { security, snow };
}

export async function deleteLicenseDetailsTarget(target: LicenseDetailsTargetInput): Promise<{
    security: { rowsAffected: number[]; };
    snow: { deletedSubscriptions: number; deletedTransactions: number; };
}> {
    await security16.connect();

    const [securitySubscriptionCodes, securityVendorTransactions] = await Promise.all([
        repository.getSecuritySubscriptionCodeDetails(target),
        repository.getSecurityVendorTransactionDetails(target),
    ]);
    const pspHints = getPspHintsFromSecurityRows(target, securitySubscriptionCodes, securityVendorTransactions);

    const [security, snow] = await Promise.all([
        repository.deleteLicenseTarget(target),
        snowdbRepository.deleteSnowLicenseTarget(pspHints),
    ]);

    return { security, snow };
}
