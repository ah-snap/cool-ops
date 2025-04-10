import * as security16 from "../../common/security16.js";
import * as repository from "./repository.js";

async function insertLicense({ pool, oldPsp, psp, code, duration, consumerId, activationDate, expirationDate, subscriptoinCodeBatchId, productId, appliedByUserId, revokedByAccountId, revocationDate, transactionId }) {
    if (!code && oldPsp) {
        const oldTransaction = await repository.getValuesForSubscriptionCode(pool, oldPsp);
        return insertLicense({
            transactionId,
            oldPsp,
            psp,
            code: generateRandomCode(),
            duration: oldTransaction.Duration,
            consumerId: oldTransaction.ConsumerId,
            activationDate: oldTransaction.ActivationDate,
            expirationDate: oldTransaction.ExpirationDate,
            subscriptoinCodeBatchId: oldTransaction.SubscriptionCodeBatchId,
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
        subscriptoinCodeBatchId,
        productId,
        appliedByUserId,
        revokedByAccountId,
        revocationDate,
        transactionId
    });

    return result.recordset[0].ID;
}

async function insertTransaction({ pool, referencePSP, transaction_id, account_id, vendor_id, cost, product_name, sku, is_recurring, created_time, last_update_time, dealer_id, tax, tax_percent, cancellation_date }) {
    console.log("Inserting license", transaction_id);
    
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
    
    return result.recordset[0].ID;
}

async function createLicenseFromFailedRenewal(pool, oldPsp, newPsp) {
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

async function unmurder4Sight(psp) {
    const code = generateRandomCode();
    const ids = await repository.getIdsForMurder(psp);

    if (ids.sc4SightID) {
        return {...ids, error: "Already exists"};
    }

    const result = repository.insertSubscriptionCodeFromIds(ids, code)
    return {...ids, sc4SightID: result.recordset[0].ID};
}



function generateRandomCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 16; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    console.log("Code", code);

    return code.match(/..../g).join('-');
}

export async function createLicense({oldPsp, newPsp}) {
    console.log("Connecting to security16");
    const pool = await security16.connect();
    console.log("Connected");

    if (oldPsp && newPsp) {
        return await createLicenseFromFailedRenewal(pool, oldPsp, newPsp);
    }

    return await unmurder4Sight(newPsp);
}

export async function getTransactionInformation({accountName}) {
    await security16.connect();
    console.log("Connected to security16");

    return await repository.getTransactionInformation({ accountName });
}