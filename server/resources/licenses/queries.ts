export const updateAllMissingSnowExpirations = `UPDATE subscription.system_subscription
    SET expiration_date = modified_date + interval '1 year'
    WHERE
        expiration_date IS NULL
        AND EXISTS (SELECT
                        *
                    FROM subscription.system_subscription_transaction SST
                    INNER JOIN subscription.transaction_source TS ON SST.transaction_source_id = TS.transaction_source_id
                        AND TS.source_name = 'ADYEN'
                    WHERE SST.system_subscription_transaction_id = system_subscription.system_subscription_transaction_id
        );
`

export const getTransactionInfo = `SELECT
    VT.transaction_id
     ,VT.id
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
WHERE A.Name = @accountName OR A.Id = @accountId
UNION
SELECT
    VT.transaction_id
    ,SC.id
    ,VT.account_id
    ,VT.vendor_id
    ,VT.cost
    ,VT.product_name
    ,P.Name AS sku
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
FROM Security_16..SubscriptionCode SC
LEFT OUTER JOIN Security_16..vendor_transaction VT ON SC.transaction_id = VT.id
INNER JOIN Security_16..Consumer C ON SC.ConsumerId = C.Id
INNER JOIN Security_16..Account A ON C.AccountId = A.Id
INNER JOIN Security_16..Product P ON SC.ProductId = P.Id
WHERE (A.Name = @accountName OR A.Id = @accountId)
AND VT.ID IS NULL`;

export const getTransactionInfoOld = `SELECT
        VT.transaction_id
        ,VT.id
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
    WHERE A.Name = @accountName`;
    // WHERE A.CertificateCommonName LIKE CONCAT('%', REPLACE(@accountName, ':', ''
    // ))
    // OR A.Name LIKE CONCAT('%', @accountName, '%')`;

    // export const getPotentiallyMissingPsp = `SELECT
    //     @externalId as externalId
    //     ,@psp as psp`;
        

export const getPotentiallyMissingPsp = `SELECT
    VT.transaction_id as psp
     ,A.id as accountId
     ,A.external_id as externalId
     ,A.ovrc_location_id
     ,sc.consumerId as consumerId
     ,U.Id as userId
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
     ,SC.code
     ,SC.ExpirationDate
FROM Security_16..Account A
         LEFT OUTER JOIN Security_16..vendor_transaction VT ON VT.account_id = A.Id
         LEFT OUTER JOIN Security_16..SubscriptionCode SC ON SC.transaction_id = VT.id
         LEFT OUTER JOIN Security_16..[User] U ON A.Id = U.AccountId AND U.IsOwner = 1
WHERE VT.transaction_id LIKE CONCAT(@psp, '%')
    OR CONVERT(varchar(40), A.external_id) = @externalId`;
    // OR (CONVERT(varchar(40), A.external_id) = @externalId AND (vt.transaction_id IS NULL OR VT.created_time > DATEADD(month, -1, GETDATE())))`;




export const manuallyInsertVendorTransaction = `INSERT INTO Security_16..vendor_transaction
(transaction_id, account_id, vendor_id, cost, product_name, sku, is_recurring, created_time, last_update_time, dealer_id, tax, tax_percent, cancellation_date)
VALUES(
    @transactionId
    ,@accountId
    ,2
    ,0
    ,@productName
    ,@sku
    ,0
    ,GETDATE()
    ,GETDATE()
    ,@dealerId
    ,0
    ,0
    ,null
);`;

export const validateStripeEvents = `SELECT
    e.event_id,
    e.created,
    vt.id AS transaction_id,
    sc.id AS subscription_code_id,
    sc.consumerId as consumerId
FROM #TempStripeEvents e
LEFT OUTER JOIN Security_16..vendor_transaction vt ON e.event_id = vt.transaction_id
LEFT OUTER JOIN Security_16..SubscriptionCode sc ON vt.id = sc.transaction_id

`

export const expireLicenses = `
UPDATE #TempLicensesToExpire
SET PSP = (SELECT TOP 1
                REPLACE(VT.transaction_id, '-Connect', '')
           FROM Security_16..vendor_transaction VT
           INNER JOIN Security_16..SubscriptionCode SC ON VT.id = SC.transaction_id
           INNER JOIN #TempLicensesToExpire TLTE on (TLTE.CODE IS NOT NULL AND SC.Code = TLTE.code)
           )
WHERE psp IS NULL AND Code IS NOT NULL

UPDATE Security_16..SubscriptionCode
SET ExpirationDate = ActivationDate
WHERE transaction_id IN (SELECT vt.id
                        FROM Security_16..vendor_transaction vt
                                 INNER JOIN Security_16..SubscriptionCode sc ON sc.transaction_id = vt.id
                                 INNER JOIN #TempLicensesToExpire et
                                     ON (et.psp is not null AND VT.transaction_id LIKE CONCAT(et.psp, '%'))
                                     OR (ET.code IS NOT NULL AND SC.Code = et.code));

SELECT 
    VT.id
    ,VT.created_time
    ,VT.account_id
    ,SC.ConsumerId
    ,VT.sku
    ,SC.ActivationDate
    ,SC.ExpirationDate
    ,SC.Code
    ,VT.transaction_id
FROM #TempLicensesToExpire et
INNER JOIN Security_16..vendor_transaction VT ON (et.psp is not null AND VT.transaction_id LIKE CONCAT(et.psp, '%'))
INNER JOIN Security_16..SubscriptionCode SC ON VT.id = SC.transaction_id`;