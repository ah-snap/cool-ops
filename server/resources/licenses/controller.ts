import * as service from "./service.js"
import type { Request, Response } from "express";
import { sendApiError } from "../../common/apiResponses.js";


export async function createLicense(req: Request<unknown, unknown, { oldPsp?: string; newPsp?: string; }>, res: Response) {
    console.log("Creating license", req.body);
    const { oldPsp, newPsp } = req.body;

    try {
        const result = await service.createLicense({oldPsp, newPsp});
        console.log("Result", result);

        res.send(result);
    } catch (err) {
        sendApiError(res, err);
        console.log(err)
    }
}

export async function updateLicense(req: Request<{ code: string; }, unknown, Record<string, string>>, res: Response) {
    const { code } = req.params;

    console.log("Updating license", code, req.body);

    const updates = req.body;

    try {
        const result = await service.updateLicense({ code, updates });
        console.log("Result", result);
        res.send(result);
    } catch (err) {
        sendApiError(res, err);
        console.log(err)
    }
}


export async function getLicenses(req: Request<{ accountName: string; }>, res: Response) {
    console.log("Getting license", req.params);
    const accountName = req.params['accountName'];

    try {
        const result = await service.getTransactionInformation({ accountName });
        res.send(result);
        console.log("Licenses got");
    } catch (err) {
        sendApiError(res, err);
        console.log(err)
    }
}

export async function getLicensesByAccountId(req: Request<{ accountId: string; }>, res: Response) {
    console.log("Getting license", req.params);
    const accountId = req.params['accountId'];

    try {
        const result = await service.getTransactionInformation({ accountId });
        res.send(result);
        console.log("Licenses got");
    } catch (err) {
        sendApiError(res, err);
        console.log(err)
    }
}

export async function getPotentiallyMissingPsp(req: Request<{ psp?: string; externalId?: string; }>, res: Response) {
    console.log("Getting potentially missing psp", req.params);
    const { psp, externalId } = req.params;

    try {
        const result = await service.getPotentiallyMissingPsp({ psp, externalId });
        console.log("Result", result);
        res.send(result);
    } catch (err) {
        sendApiError(res, err);
        console.log(err)
    }
}

export async function insertVendorTransaction(req: Request<unknown, unknown, { transactionId: string; accountId: number; productName: string; sku: string; dealerId: number; }>, res: Response) {
    console.log("Inserting vendor transaction", req.body);
    const { transactionId, accountId, productName, sku, dealerId } = req.body;

    try {
        const result = await service.insertTransaction({
        transaction_id: transactionId,
        account_id: accountId,
        vendor_id: 2,
        cost: 0,
        product_name: productName,
        sku: sku,
        is_recurring: false,
        created_time: new Date(),
        last_update_time: new Date(),
        dealer_id: dealerId,
        tax: 0,
        tax_percent: 0,
        cancellation_date: null
    });
        console.log("Result", result);
        res.send({vendorTransactionId: result});
    } catch (err) {
        sendApiError(res, err);
        console.log(err)
    }
}

export async function insertSubscriptionCode(req: Request<unknown, unknown, { consumerId: number; expirationDate: Date; productId: number; subscriptionCodeBatchId: number; transactionId: number; }>, res: Response) {
    console.log("Inserting subscription code", req.body);
    const { consumerId, expirationDate, productId, subscriptionCodeBatchId, transactionId } = req.body;

    try {
        const result = await service.insertLicense({
            code: service.generateRandomCode(),
            duration: "365.00:00:00",
            consumerId,
            activationDate: new Date(),
            expirationDate,
            subscriptionCodeBatchId,
            productId,
            appliedByUserId: null,
            revokedByAccountId: null,
            revocationDate: null,
            transactionId
        });
        console.log("Result", result);
        res.send({subscriptionCodeId: result});
    } catch (err) {
        sendApiError(res, err);
        console.log(err)
    }
}

export async function retrieveBatchOfStripeLicenses(req: Request<unknown, unknown, { lastId?: string; batchSize?: number; }>, res: Response) {
    console.log("Retrieving batch of stripe licenses", req.body);
    const { lastId, batchSize } = req.body;
    try {
        const result = await service.retrieveStripeEvents();
        console.log("Result", result);
        res.send(result);
    } catch (err) {
        sendApiError(res, err);
        console.log(err)
    }
}

export async function insertSnowLicenseAndTransaction(req: Request<unknown, unknown, { transaction_id: string; c4_user_id: number; skus: string; subscription_id: string; account_id: number; location_id: string; expiration_date: string; external_customer_id: string; }>, res: Response) {
    console.log("Inserting Snow license and transaction", req.body);
    const { transaction_id, c4_user_id, skus, subscription_id, account_id, location_id, expiration_date, external_customer_id } = req.body;
    try {
        const result = await service.insertSnowDbLicenseAndTransaction({ transaction_id, c4_user_id, skus, subscription_id, account_id, location_id, expiration_date, external_customer_id });
        console.log("Result", result);
        res.send(result);
    } catch (err) {
        sendApiError(res, err);
        console.log(err)
    }
}

export async function expireLicenses(req: Request<unknown, unknown, { licenses: Array<{ psp?: string; code?: string; }>; }>, res: Response) {
    console.log("Expiring licenses", req.body);
    const { licenses } = req.body;
    try {
        const result = await service.expireLicenses({ licenses });
        console.log("Result", result);
        res.send(result);
    } catch (err) {
        sendApiError(res, err);
        console.log(err)
    }
}