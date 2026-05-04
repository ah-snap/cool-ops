import * as licenseActions from './licenseActions.ts'
import * as accountActions from './accountActions.ts'
import { LicenseData, Mapping, ServerError } from '../types.t';

const subscription_ids: { [key: string]: string } = {
    "C4-CONNECT": "63f7eb4a-f24b-4198-9d0e-ed4345e3f61b",
    "C4-ASSIST": "678e934d-518c-4455-b19a-50c9544bc65d",
    "C4-ASSIST-PREMIUM": "d7cc23d6-7349-4662-b52f-26ae80e422db",
}

function getSubscriptionID(sku: string): string {
    return subscription_ids[translateSku(sku).toUpperCase()];
}

/**
 * Normalizes whatever the user pasted into the date column to an ISO-ish
 * timestamp string the downstream Snow / license APIs accept.
 *
 * Accepts inputs like:
 *   - "2026-05-04"
 *   - "5/4/2026"
 *   - "5/4/2026 4:10:30 PM"
 *   - "2026-05-04T16:10:30Z"
 *
 * If the input has no time component, noon local time is used (preserving
 * the previous "<date> 12:00:00" behavior). If the input already has a
 * time, that time is preserved instead of getting an extra "12:00:00"
 * suffix appended (which produced `... 4:10:30 PM 12:00:00` and broke
 * Postgres timestamptz parsing).
 */
function normalizeExpirationDate(raw: string): string {
    const trimmed = (raw || "").trim();
    if (!trimmed) {
        throw new Error("Expiration date is required");
    }

    // Date-only forms: append noon and let the server treat as local.
    const dateOnly = /^\d{4}-\d{1,2}-\d{1,2}$/.test(trimmed)
        || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(trimmed);
    if (dateOnly) {
        const d = new Date(`${trimmed} 12:00:00`);
        if (isNaN(d.getTime())) {
            throw new Error(`Unrecognized date: "${raw}"`);
        }
        return d.toISOString();
    }

    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) {
        throw new Error(`Unrecognized date: "${raw}"`);
    }
    return parsed.toISOString();
}

function calculateTransactionId(account: Mapping, sku: string): string {
    return `MANUAL-API-A${account.accountId}`;
}

async function updateExpirationDate(code: string, newExpirationDate: string) {
    await licenseActions.updateLicense(code, { ExpirationDate: newExpirationDate });
}

function calculateSkus(sku: string) : string[] {
    const skus = [translateSku(sku)];

    if (sku.toLowerCase().includes("connect")) { 
        skus.push("C4-4Sight-E");
    }

    return skus;
}

function translateSku(sku: string): string {
    if (sku.toLowerCase().includes("assist") && !sku.toLowerCase().includes("premium")) {
        return "C4-ASSIST";
    } else if (sku.toLowerCase().includes("assist") && sku.toLowerCase().includes("premium")) {
        return "C4-ASSIST-PREMIUM";
    } else if (sku.toLowerCase().includes("connect")) {
        return "C4-CONNECT";
    } else {
        return sku;
    }
}

async function createLicense(transactionId: string, sku: string, expirationDate: string, account: Mapping) {
    await licenseActions.addLicense({
        createdTime: "",
        accountId: account.accountId,
        skus: calculateSkus(sku),
        transactionId: transactionId,
        isRecurring: false,
        vendor: "D365",
        d365CustomerId: account.d365CustomerID,
        cost: 0,
        tax: 0,
        taxPercent: 0,
        extraDays: 0,
        productName: sku === "C4-CONNECT" ? "Control4 Connect" : (sku === "C4-ASSIST-PREMIUM" ? "Control4 Assist Premium" : "Control4 Assist"),
        userId: account.userId,
    });
}

async function addLicenseToSnow({ transactionId, c4_user_id, skus, subscription_id, account_id, location_id, expiration_date, external_customer_id } : { transactionId: string, c4_user_id: number, skus: string[], subscription_id: string, account_id: number, location_id: string, expiration_date: string, external_customer_id: string }) {
    const result = await licenseActions.addLicenseToSnow({
        transaction_id: transactionId,
        c4_user_id,
        skus,
        subscription_id,
        account_id,
        location_id,
        expiration_date,
        external_customer_id
    });
    console.log("Result of adding license to Snow:", result);
}

export async function process(row: { macOrCommonName: string; requestedExpirationDate: string; sku: string; }, updateStatus: (status: string) => void) {
    updateStatus("Looking up account...");
    const account = await accountActions.getAccountMappingByCommonNameOrMac(row.macOrCommonName) as Mapping;
    if (!account || account.error) {
        console.error(`Account not found for row: ${JSON.stringify(row)}`);
        updateStatus(`Account not found. ${JSON.stringify(row)}`);
        return;
    }

    console.log("Processing account:", account);
    updateStatus("Processing");

    let expirationDate: string;
    try {
        expirationDate = normalizeExpirationDate(row.requestedExpirationDate);
    } catch (err) {
        console.error(err);
        updateStatus(`Invalid expiration date: "${row.requestedExpirationDate}"`);
        return;
    }

    const transactionId = calculateTransactionId(account, row.sku);

    console.log(`Looking for licenses with sku: ${row.sku} for account: ${account.Name}`);
    updateStatus(`Finding License: ${row.sku}`);
    
    const licenses = await licenseActions.getLicensesForAccount(account.Name).then(licenses => {
        if (Array.isArray(licenses)) {
            return licenses.filter((license: LicenseData) => license.sku.toUpperCase() === translateSku(row.sku).toUpperCase());
        }
        return [];
    });

    console.log(`Found ${licenses.length} licenses for sku: ${row.sku}`);
    console.log("Licenses:", licenses);

    if (licenses.length === 0) {
        updateStatus(`Found ${licenses.length} licenses. Creating new license...`);

        await createLicense(transactionId, row.sku, expirationDate, account);
    }

    updateStatus(`Updating licenses`);

    for (const license of await licenseActions.getLicensesForAccount(account.Name).then(licenses => {
        if (Array.isArray(licenses)) {
            return licenses.filter((license : LicenseData) => license.sku.toUpperCase() === translateSku(row.sku).toUpperCase());
        }
        return [];
    })) {
        console.log(`Updating expiration date for license code: ${license.Code} to ${expirationDate}`);
        await updateExpirationDate(license.Code, expirationDate);
    }

    updateStatus(`Updated licenses. Syncing to Snow...`);

    const snowResult = await addLicenseToSnow({ 
        transactionId,
        c4_user_id: account.userId,
        skus: [translateSku(row.sku)],
        subscription_id: getSubscriptionID(row.sku),
        account_id: account.accountId,
        location_id: account.locationId,
        expiration_date: expirationDate,
        external_customer_id: account.d365CustomerID
    });

    console.log("Result of Snow sync:", snowResult);

    updateStatus(`Completed`);
}