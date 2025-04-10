export const getTransactionInfo = `SELECT
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