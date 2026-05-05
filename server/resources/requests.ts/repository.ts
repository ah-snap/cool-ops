import sql from "mssql";
import * as queries from "./queries.js"
import type {
    ExpiredLicenseRow,
    LicenseDetailsTargetInput,
    LicenseTransactionRow,
    PotentiallyMissingPspRow,
    ReferenceTransactionFields,
    SecuritySubscriptionCodeDetailRow,
    SecurityVendorTransactionDetailRow,
    StripeValidationRow,
    SubscriptionCodeValues,
} from "./dtos.js";

export async function getFieldsFromReferencePSP(pool: sql.ConnectionPool, referencePSP: string): Promise<ReferenceTransactionFields> {
    const query = `SELECT
                VT.transaction_id, VT.account_id, VT.vendor_id, VT.cost, VT.product_name, VT.sku, VT.is_recurring 
                ,DATEADD(year, 1, created_time) as created_time
                ,DATEADD(year, 1, last_update_time) as last_update_time
                ,VT.dealer_id, VT.tax, VT.tax_percent, 
                VT.cancellation_date
            FROM Security_16..vendor_transaction VT
            INNER JOIN Security_16..SubscriptionCode SC ON sc.transaction_id = VT.id
            INNER JOIN Security_16..Consumer C ON SC.ConsumerId = C.Id
            INNER JOIN Security_16..Account A ON VT.account_id = A.Id AND C.AccountId = A.Id
            WHERE VT.transaction_id = @transaction_id`;
    
    const request = new sql.Request(pool);
    request.input('transaction_id', sql.VarChar(50), referencePSP);
    const result = await request.query(query)
    return result.recordset[0];
}

export async function getIDForExistingTransaction(transaction_id: string): Promise<number | null> {
    console.log("Checking for existing transaction", transaction_id);
    const query = `SELECT ID FROM Security_16..vendor_transaction WHERE transaction_id = @transaction_id`;
    const request = new sql.Request();
    request.input('transaction_id', sql.VarChar(50), transaction_id);
    const result = await request.query(query);
    return result.recordset[0] ? result.recordset[0].ID : null;
}

export async function insertTransaction({ pool, transaction_id, account_id, vendor_id, cost, product_name, sku, is_recurring, created_time, last_update_time, dealer_id, tax, tax_percent, cancellation_date }: {
    pool: sql.ConnectionPool;
    transaction_id: string;
    account_id: number;
    vendor_id: number;
    cost: number;
    product_name: string;
    sku: string;
    is_recurring: boolean;
    created_time: Date;
    last_update_time: Date;
    dealer_id: number;
    tax: number;
    tax_percent: number;
    cancellation_date: Date | null;
}): Promise<number> {
    const query = `INSERT INTO Security_16..vendor_transaction
            (transaction_id, account_id, vendor_id, cost, product_name, sku, is_recurring, created_time, last_update_time, dealer_id, tax, tax_percent, cancellation_date)
            OUTPUT INSERTED.ID
            VALUES
            (@transaction_id, @account_id, @vendor_id, @cost, @product_name, @sku, @is_recurring, @created_time, @last_update_time, @dealer_id, @tax, @tax_percent, @cancellation_date)
            `;
    const request = new sql.Request(pool);
    request.input('transaction_id', sql.VarChar(50), transaction_id);
    request.input('account_id', sql.Int, account_id);
    request.input('vendor_id', sql.Int, vendor_id);
    request.input('cost', sql.Decimal(18, 2), cost);
    request.input('product_name', sql.VarChar(255), product_name);
    request.input('sku', sql.VarChar(50), sku);
    request.input('is_recurring', sql.Bit, is_recurring);
    request.input('created_time', sql.DateTime, created_time);
    request.input('last_update_time', sql.DateTime, last_update_time);
    request.input('dealer_id', sql.Int, dealer_id);
    request.input('tax', sql.Decimal(18, 2), tax);
    request.input('tax_percent', sql.Decimal(18, 2), tax_percent);
    request.input('cancellation_date', sql.DateTime, cancellation_date);
    request.input('newPsp', sql.VarChar(50), transaction_id);

    // return request;
    console.log("Executing", query, request);
    const result = await request.query(query)
    
    return result.recordset[0].ID;
}

export async function getValuesForSubscriptionCode(pool: sql.ConnectionPool, oldPsp: string): Promise<SubscriptionCodeValues> {
    const query = `SELECT
                SC.Code, SC.Duration, SC.ConsumerId
                ,DATEADD(year, 1, ActivationDate) as ActivationDate
                ,DATEADD(year, 1, ExpirationDate) as ExpirationDate
                , SC.SubscriptionCodeBatchId, SC.ProductId, SC.AppliedByUserId, SC.RevokedByAccountId, SC.RevocationDate
            FROM Security_16..SubscriptionCode SC
            INNER JOIN Security_16..vendor_transaction VT ON sc.transaction_id = vt.id
            WHERE VT.transaction_id = @transaction_id`;
    
    const request = new sql.Request(pool);
    request.input('transaction_id', sql.VarChar(50), oldPsp);
    const result = await request.query(query)
    return result.recordset[0];
}


export async function insertLicense({ pool, code, duration, consumerId, activationDate, expirationDate, subscriptionCodeBatchId, productId, appliedByUserId, revokedByAccountId, revocationDate, transactionId }: {
    pool: sql.ConnectionPool;
    code: string;
    duration: string;
    consumerId: number;
    activationDate: Date;
    expirationDate: Date;
    subscriptionCodeBatchId: number;
    productId: number;
    appliedByUserId: number | null;
    revokedByAccountId: number | null;
    revocationDate: Date | null;
    transactionId: number;
}): Promise<number> {
    const query = `INSERT INTO Security_16..SubscriptionCode
            (Code, Duration, ConsumerId, ActivationDate, ExpirationDate, SubscriptionCodeBatchId, ProductId, AppliedByUserId, RevokedByAccountId, RevocationDate, transaction_id)
            OUTPUT INSERTED.ID
            VALUES
            (@code, @duration, @consumerId, @activationDate, @expirationDate, @subscriptionCodeBatchId, @productId, @appliedByUserId, @revokedByAccountId, @revocationDate, @transactionId)`;

    const request = new sql.Request(pool);

    console.log("code", code);

    request.input('code', sql.VarChar(50), code);
    request.input('duration', sql.VarChar(32), duration);
    request.input('consumerId', sql.Int, consumerId);
    request.input('activationDate', sql.DateTime, activationDate);
    request.input('expirationDate', sql.DateTime, expirationDate);
    request.input('subscriptionCodeBatchId', sql.Int, subscriptionCodeBatchId);
    request.input('productId', sql.Int, productId);
    request.input('appliedByUserId', sql.Int, appliedByUserId);
    request.input('revokedByAccountId', sql.Int, revokedByAccountId);
    request.input('revocationDate', sql.DateTime, revocationDate);
    request.input('transactionId', sql.BigInt, transactionId);


    const result = await request.query(query);
    return result.recordset[0].ID;
}

export async function getIdsForMurder(psp: string): Promise<{ vt4SightID: number | null; vtConnectID: number | null; sc4SightID: number | null; scConnectID: number | null; }> {
    const query = `
        SELECT 
            VT4Sight.ID as vt4SightID
            ,VTConnect.ID as vtConnectID
            ,SC4Sight.ID as sc4SightID
            ,SCConnect.ID as scConnectID
        FROM SECURITY_16..vendor_transaction VT4Sight
        LEFT OUTER JOIN SECURITY_16..vendor_transaction VTConnect ON VTConnect.transaction_id = CONCAT(VT4Sight.transaction_id, '-Connect')
        LEFT OUTER JOIN SECURITY_16..SubscriptionCode SC4Sight ON SC4Sight.transaction_id = VT4Sight.id
        LEFT OUTER JOIN SECURITY_16..SubscriptionCode SCConnect ON SCConnect.transaction_id = VTConnect.id
        WHERE VT4Sight.transaction_id = @transaction_id
        `;

    const request = new sql.Request();
    request.input('transaction_id', sql.VarChar(50), psp);
    const result = await request.query(query);
    return result.recordset[0];
}

export async function insertSubscriptionCodeFromIds(ids: { vt4SightID: number; scConnectID: number; }, code: string): Promise<sql.IResult<{ ID: number; }>> {
    const query = `
        INSERT INTO Security_16..SubscriptionCode
            (Code, Duration, ConsumerId, ActivationDate, ExpirationDate, SubscriptionCodeBatchId, ProductId, AppliedByUserId, RevokedByAccountId, RevocationDate, transaction_id)
            OUTPUT INSERTED.ID
            SELECT
                @code as Code
                ,Duration
                ,ConsumerId
                ,ActivationDate
                ,ExpirationDate
                ,SubscriptionCodeBatchId
                ,1 as ProductId
                ,AppliedByUserId
                ,RevokedByAccountId
                ,RevocationDate
                ,@vt4SightID as transaction_id
            FROM Security_16..SubscriptionCode
            WHERE ID = @scConnectID`;

    const request = new sql.Request();
    request.input('code', sql.VarChar(50), code);
    request.input('vt4SightID', sql.Int, ids.vt4SightID);
    request.input('scConnectId', sql.Int, ids.scConnectID);

    return await request.query(query);
}

export async function getTransactionInformation({accountName, accountId}: { accountName?: string; accountId?: string | number; }): Promise<LicenseTransactionRow[]> {
    const query = queries.getTransactionInfo;

    const request = new sql.Request();
    request.input('accountName', sql.VarChar(255), accountName);
    request.input('accountId', sql.BigInt, accountId);
    const result = await request.query(query);
    return result.recordset;
}

export async function getPotentiallyMissingPsp({psp, externalId}: { psp?: string; externalId?: string; }): Promise<PotentiallyMissingPspRow[]> {
    const query = queries.getPotentiallyMissingPsp;

    const request = new sql.Request();
    request.input('psp', sql.VarChar(50), psp);
    request.input('externalId', sql.VarChar(40), externalId);
    const result = await request.query(query);

    return result.recordset;
}

export async function updateLicense({ code, updates }: { code: string; updates: Record<string, string>; }): Promise<{ rowsAffected: number[]; }> {
    const setClauses = [];
    const request = new sql.Request();
    request.input('code', sql.VarChar(50), code);
    for (const [key, value] of Object.entries(updates)) {
        const paramName = `param_${key}`;
        setClauses.push(`${key} = @${paramName}`);
        request.input(paramName, sql.VarChar(255), value);
    }
    const query = `
        UPDATE Security_16..SubscriptionCode
        SET ${setClauses.join(', ')}
        WHERE Code = @code
    `;
    console.log("Executing update with query:", query);
    // return request;
    const result = await request.query(query);
    return { rowsAffected: result.rowsAffected };
}

export async function validateStripeEvents({ events }: { events: Array<{ id: string; created: number; }>; }): Promise<StripeValidationRow[] | null> {
    console.log("Connected to security16");

    let table = new sql.Table('#TempStripeEvents');
    table.create = true;
    table.columns.add('event_id', sql.VarChar(255), { nullable: false });
    table.columns.add('created', sql.BigInt, { nullable: false });
    for (const event of events) {
        table.rows.add(event.id, event.created);
    }

    let endResult = null;

    const request = new sql.Request();
    await request.bulk(table, async function(err, result) {
        if (err) {
            console.error("Bulk insert error:", err)
            throw err
        }
        console.log("Bulk insert result:", result)

        await request.query(queries.validateStripeEvents, async function(err, result) {
                if (err) {
                    console.error("Select query error:", err)
                    throw err
                }
                console.log("Select query result:", result)
                endResult = result.recordset;
                return result.recordset;
            }
        );  
    });

    while (endResult === null) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log("End result", endResult);
    return endResult;
}

export async function expireLicenses({ licenses }: { licenses: Array<{ code?: string | null; psp?: string | null; }>; }): Promise<ExpiredLicenseRow[] | null> {
    const request = new sql.Request();

    let table = new sql.Table('#TempLicensesToExpire');
    table.create = true;
    table.columns.add('code', sql.VarChar(50), { nullable: true });
    table.columns.add('psp', sql.VarChar(50), { nullable: true });
    for (const license of licenses) {
        table.rows.add(license.code, license.psp);
    }

    let endResult = null;
    
    await request.bulk(table, async function(err, result) {
        if (err) {
            console.error("Bulk insert error:", err)
            throw err
        }

        console.log("Bulk insert result:", result)
        await request.query(queries.expireLicenses, async function(err, result) {
                if (err) {
                    console.error("Update query error:", err)
                    throw err
                }
                console.log("Update query result:", result)
                
                endResult = result.recordset;
            } 
        );  
    });

    while (endResult === null) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log("End result", endResult);
    return endResult;
}

export async function getSecuritySubscriptionCodeDetails(target: LicenseDetailsTargetInput): Promise<SecuritySubscriptionCodeDetailRow[]> {
    const request = new sql.Request();
    const whereClause = target.type === "code"
        ? "SC.Code = @value"
        : "VT.transaction_id LIKE CONCAT(@value, '%')";

    request.input("value", sql.VarChar(80), target.value);

    const query = `
        SELECT
            SC.Id AS id,
            SC.Code AS code,
            SC.Duration AS duration,
            SC.ConsumerId AS consumerId,
            SC.ActivationDate AS activationDate,
            SC.ExpirationDate AS expirationDate,
            SC.SubscriptionCodeBatchId AS subscriptionCodeBatchId,
            SC.ProductId AS productId,
            SC.AppliedByUserId AS appliedByUserId,
            SC.RevokedByAccountId AS revokedByAccountId,
            SC.RevocationDate AS revocationDate,
            SC.transaction_id AS transactionDbId,
            VT.transaction_id AS psp,
            VT.account_id AS accountId,
            A.Name AS accountName,
            P.Name AS productName
        FROM Security_16..SubscriptionCode SC
        LEFT JOIN Security_16..vendor_transaction VT ON VT.Id = SC.transaction_id
        LEFT JOIN Security_16..Account A ON A.Id = VT.account_id
        LEFT JOIN Security_16..Product P ON P.Id = SC.ProductId
        WHERE ${whereClause}
        ORDER BY SC.ActivationDate DESC, SC.Id DESC`;

    const result = await request.query(query);
    return result.recordset;
}

export async function getSecurityVendorTransactionDetails(target: LicenseDetailsTargetInput): Promise<SecurityVendorTransactionDetailRow[]> {
    const request = new sql.Request();
    const whereClause = target.type === "code"
        ? `VT.Id IN (
            SELECT SC.transaction_id
            FROM Security_16..SubscriptionCode SC
            WHERE SC.Code = @value
        )`
        : "VT.transaction_id LIKE CONCAT(@value, '%')";

    request.input("value", sql.VarChar(80), target.value);

    const query = `
        SELECT
            VT.Id,
            VT.transaction_id,
            VT.account_id,
            VT.vendor_id,
            VT.cost,
            VT.product_name,
            VT.sku,
            VT.is_recurring,
            VT.created_time,
            VT.last_update_time,
            VT.dealer_id,
            VT.tax,
            VT.tax_percent,
            VT.cancellation_date
        FROM Security_16..vendor_transaction VT
        WHERE ${whereClause}
        ORDER BY VT.created_time DESC, VT.Id DESC`;

    const result = await request.query(query);
    return result.recordset;
}

export async function revokeLicenseTarget(target: LicenseDetailsTargetInput): Promise<{ rowsAffected: number[]; }> {
    const request = new sql.Request();
    request.input("value", sql.VarChar(80), target.value);
    const whereClause = target.type === "code"
        ? "SC.Code = @value"
        : "VT.transaction_id LIKE CONCAT(@value, '%')";

    const query = `
        UPDATE SC
        SET ExpirationDate = DATEADD(day, -1, CONVERT(date, GETDATE()))
        FROM Security_16..SubscriptionCode SC
        LEFT JOIN Security_16..vendor_transaction VT ON VT.Id = SC.transaction_id
        WHERE ${whereClause}`;

    const result = await request.query(query);
    return { rowsAffected: result.rowsAffected };
}

export async function deleteLicenseTarget(target: LicenseDetailsTargetInput): Promise<{ rowsAffected: number[]; }> {
    const request = new sql.Request();
    request.input("value", sql.VarChar(80), target.value);
    const whereClause = target.type === "code"
        ? "SC.Code = @value"
        : "VT.transaction_id LIKE CONCAT(@value, '%')";

    const query = `
        DECLARE @MatchedTransactions TABLE (Id BIGINT PRIMARY KEY);

        INSERT INTO @MatchedTransactions (Id)
        SELECT DISTINCT VT.Id
        FROM Security_16..vendor_transaction VT
        LEFT JOIN Security_16..SubscriptionCode SC ON SC.transaction_id = VT.Id
        WHERE ${whereClause};

        DELETE SC
        FROM Security_16..SubscriptionCode SC
        INNER JOIN @MatchedTransactions MT ON MT.Id = SC.transaction_id;

        DELETE VT
        FROM Security_16..vendor_transaction VT
        INNER JOIN @MatchedTransactions MT ON MT.Id = VT.Id
        WHERE NOT EXISTS (
            SELECT 1
            FROM Security_16..SubscriptionCode SC
            WHERE SC.transaction_id = VT.Id
        );`;

    const result = await request.query(query);
    return { rowsAffected: result.rowsAffected };
}