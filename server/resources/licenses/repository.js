import sql from "mssql";
import * as queries from "./queries.js"

export async function getFieldsFromReferencePSP(pool, referencePSP) {
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

export async function getIDForExistingTransaction(transaction_id) {
    const query = `SELECT ID FROM Security_16..vendor_transaction WHERE transaction_id = @transaction_id`;
    const request = new sql.Request();
    request.input('transaction_id', sql.VarChar(50), transaction_id);
    const result = await request.query(query);
    return result.recordset[0] ? result.recordset[0].ID : null;
}

export async function insertTransaction({ pool, transaction_id, account_id, vendor_id, cost, product_name, sku, is_recurring, created_time, last_update_time, dealer_id, tax, tax_percent, cancellation_date }) {
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

export async function getValuesForSubscriptionCode(pool, oldPsp) {
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


export async function insertLicense({ pool, code, duration, consumerId, activationDate, expirationDate, subscriptoinCodeBatchId, productId, appliedByUserId, revokedByAccountId, revocationDate, transactionId }) {
    const query = `INSERT INTO Security_16..SubscriptionCode
            (Code, Duration, ConsumerId, ActivationDate, ExpirationDate, SubscriptionCodeBatchId, ProductId, AppliedByUserId, RevokedByAccountId, RevocationDate, transaction_id)
            OUTPUT INSERTED.ID
            VALUES
            (@code, @duration, @consumerId, @activationDate, @expirationDate, @subscriptoinCodeBatchId, @productId, @appliedByUserId, @revokedByAccountId, @revocationDate, @transactionId)`;

    const request = new sql.Request(pool);

    console.log("code", code);

    request.input('code', sql.VarChar(50), code);
    request.input('duration', sql.VarChar(32), duration);
    request.input('consumerId', sql.Int, consumerId);
    request.input('activationDate', sql.DateTime, activationDate);
    request.input('expirationDate', sql.DateTime, expirationDate);
    request.input('subscriptoinCodeBatchId', sql.Int, subscriptoinCodeBatchId);
    request.input('productId', sql.Int, productId);
    request.input('appliedByUserId', sql.Int, appliedByUserId);
    request.input('revokedByAccountId', sql.Int, revokedByAccountId);
    request.input('revocationDate', sql.DateTime, revocationDate);
    request.input('transactionId', sql.BigInt, transactionId);


    const result = await request.query(query);
    return result.recordset[0].ID;
}

export async function getIdsForMurder(psp) {
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

export async function insertSubscriptionCodeFromIds(ids, code) {
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

export async function getTransactionInformation({accountName}) {
    const query = queries.getTransactionInfo;

    const request = new sql.Request();
    request.input('accountName', sql.VarChar(255), accountName);
    const result = await request.query(query);
    return result.recordset;
}