import sql from "mssql";
import * as security16 from "../../common/security16.js";

async function getIDs(transactionId) {
    const query = `SELECT
              A.ID as accountId
              ,C.ID as consumerId
              ,sc.ID as subscriptionCodeId
              ,vt.ID as vendorTransactionId
          FROM Security_16..vendor_transaction VT
          LEFT OUTER JOIN Security_16..SubscriptionCode SC ON sc.transaction_id = VT.id
          INNER JOIN Security_16..Consumer C ON SC.ConsumerId = C.Id
          INNER JOIN Security_16..Account A ON VT.account_id = A.Id AND C.AccountId = A.Id
          WHERE VT.transaction_id = '${transactionId}'`

    console.log("Hitting", query);
    const result = await sql.query(query);
    console.log("Result", result);
    return result.recordset;
}



// INSERT INTO Security_16..vendor_transaction
// (transaction_id, account_id, vendor_id, cost, product_name, sku, is_recurring, created_time, last_update_time, dealer_id, tax, tax_percent, cancellation_date)
// SELECT
//     @newPSP AS transaction_id
//      ,account_id
//      ,vendor_id
//      ,cost
//      ,product_name
//      ,sku
//      ,is_recurring
//      ,DATEADD(year, 1, created_time) as created_time
//      ,DATEADD(year, 1, last_update_time) as last_update_time
//      ,dealer_id
//      ,tax
//      ,tax_percent
//      ,cancellation_date
// FROM
//     Security_16..vendor_transaction
// WHERE ID = @old4SightVTID;

async function getFieldsFromReferencePSP(pool, referencePSP) {
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

async function getIDForExistingTransaction(transaction_id) {
    const query = `SELECT ID FROM Security_16..vendor_transaction WHERE transaction_id = @transaction_id`;
    const request = new sql.Request();
    request.input('transaction_id', sql.VarChar(50), transaction_id);
    const result = await request.query(query);
    return result.recordset[0] ? result.recordset[0].ID : null;
}

async function insertTransaction({ pool, referencePSP, transaction_id, account_id, vendor_id, cost, product_name, sku, is_recurring, created_time, last_update_time, dealer_id, tax, tax_percent, cancellation_date }) {
    console.log("Inserting license", transaction_id);
    
    if (referencePSP && !account_id) {
        const referenceFields = await getFieldsFromReferencePSP(pool, referencePSP);
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

    const existingId = await getIDForExistingTransaction(transaction_id);
    console.log("Existing ID", existingId);
    if (existingId) return existingId;

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

async function getValuesForSubscriptionCode(pool, oldPsp) {
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

function generateRandomCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 16; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    console.log("Code", code);

    return code.match(/..../g).join('-');
}

async function insertLicense({ pool, oldPsp, psp, code, duration, consumerId, activationDate, expirationDate, subscriptoinCodeBatchId, productId, appliedByUserId, revokedByAccountId, revocationDate, transactionId }) {
    if (!code && oldPsp) {
        const oldTransaction = await getValuesForSubscriptionCode(pool, oldPsp);
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

async function getIdsForMurder(psp) {
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

async function unmurder4Sight(psp) {
    const ids = await getIdsForMurder(psp);
    if (ids.sc4SightID) {
        return {...ids, error: "Already exists"};
    }

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
    request.input('code', sql.VarChar(50), generateRandomCode());
    request.input('vt4SightID', sql.Int, ids.vt4SightID);
    request.input('scConnectId', sql.Int, ids.scConnectID);

    const result = await request.query(query);
    return {...ids, sc4SightID: result.recordset[0].ID};
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

export async function createLicense(req, res) {
    console.log("Creating license", req.body);
    const { oldPsp, newPsp } = req.body;

    try {
        // make sure that any items are correctly URL encoded in the connection string
        console.log("Connecting to security16");
        const pool = await security16.connect();
        console.log("Connected");

        if (oldPsp && newPsp) {
            res.send(await createLicenseFromFailedRenewal(pool, oldPsp, newPsp));
            return;
        }

        console.log("Unmurdering", newPsp);
        res.send(await unmurder4Sight(newPsp));
        // console.dir(result)
    } catch (err) {
        res.send({
            error: err
        });
        console.log(err)
    }
}

async function getTransactionInformation({accountName}) {
    const query = `SELECT
        VT.transaction_id
        ,VT.account_id
        ,VT.vendor_id
        ,VT.cost
        ,VT.product_name
        ,VT.sku
        ,VT.is_recurring
        ,VT.created_time
        ,VT.last_update_time
        ,VT.dealer_id
        ,VT.tax
        ,VT.tax_percent
        ,VT.cancellation_date
        ,SC.Code
        ,SC.Duration
        ,SC.ConsumerId
        ,SC.ActivationDate
        ,SC.ExpirationDate
        ,SC.SubscriptionCodeBatchId
        ,SC.ProductId
        ,SC.AppliedByUserId
        ,SC.RevokedByAccountId
        ,SC.RevocationDate
    FROM Security_16..vendor_transaction VT
    LEFT OUTER JOIN Security_16..SubscriptionCode SC ON SC.transaction_id = VT.id
    LEFT OUTER JOIN Security_16..Consumer C ON SC.ConsumerId = C.Id
    LEFT OUTER JOIN Security_16..Account A ON VT.account_id = A.Id
    WHERE A.CertificateCommonName LIKE CONCAT('%', REPLACE(@accountName, ':', ''
    ))
    OR A.Name LIKE CONCAT('%', @accountName, '%')`;

    const request = new sql.Request();
    request.input('accountName', sql.VarChar(255), accountName);
    const result = await request.query(query);
    return result.recordset;
}

export async function getLicenses(req, res) {
    const accountName = req.params['accountName'];

    console.log("Get licenses", accountName)
    try {
        // make sure that any items are correctly URL encoded in the connection
        console.log("Connecting to security16");
        await security16.connect();
        console.log("Connected");

        const result = await getTransactionInformation({ accountName });
        console.log("Result", result);
        res.send(result);
    } catch (err) {
        res.send({
            error: err
        });
        console.log(err)
    }

}