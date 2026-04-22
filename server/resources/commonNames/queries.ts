export const getAutomationAccountInfo = `SELECT TOP 1
    a.Name
     ,A.id
     ,A.Id AS accountId
     ,D.Id AS dealerId
     ,D.is_domestic
     ,D.name as dealerName
     ,LOWER(A.external_id) AS external_id
     ,A.CertificateCommonName
     ,IIF(A.no_connect = 1, 'Flagged for No Connect',
          IIF(A.ovrc_created IS NULL OR A.ovrc_created = 0,
              IIF(A.legacy_connect_upgrade = 1, 'Started Upgrade to Connect', 'Legacy'),
              IIF(A.handoff_date is null, 'Missing Handoff Date', 'Connect Required'))) AS ConnectStatus
     ,A.ovrc_location_id
     ,f.DCodes
     ,a.ovrc_created
     ,a.legacy_connect_upgrade
     ,a.no_connect
     ,u.id AS userId
     ,CONCAT('C', C.Id) as d365CustomerID
     ,CONCAT('db["automationaccounts"].updateMany({locationId: "', A.ovrc_location_id,
             '"}, {$set: {csAccountId: NumberLong(', A.id, '), accountName: "', A.Name,
             '", csExternalAccountId: "', lower(A.external_id),'"}});') as update_command
     ,CONCAT('db.automationaccounts.insertOne({"accountName": "', A.Name,
             '", "csAccountId": Long(', A.Id,
             '), "csExternalAccountId": "', LOWER(A.external_id),
             '", "locationId": "', A.ovrc_location_id,
             '", "password": "", "deleted": false, "projectType": "C4"})') AS automation_account_record
     ,(SELECT TOP 1 ISNULL(ExpirationDate, '2099-01-01') FROM Security_16..SubscriptionCode SC WHERE SC.ConsumerId = C.Id AND ProductId = 1) AS '4SightExpiry'
     ,(SELECT TOP 1 ISNULL(ExpirationDate, '2099-01-01') FROM Security_16..SubscriptionCode SC WHERE SC.ConsumerId = C.Id AND ProductId = 25) AS 'ConnectExpiry'
     ,a.handoff_date
     ,SV.OriginalVersion as originalVersion
     ,VARS.vendor_customer_id as stripeCustomerID
           ,C.connect_tier
           ,CAT.auth_token
           ,IIF(HASHBYTES('MD5', CONCAT(N'Control4!', U.PasswordSalt)) = u.PasswordHash,1, 0) AS isTestPassword
           ,CONCAT('userid:', u.id) AS splitKey
FROM Security_16..Account A
         INNER JOIN Security_16..[User] U ON A.Id = U.AccountId AND U.IsOwner = 1
         INNER JOIN Security_16..Consumer C ON A.Id = C.AccountId
         INNER JOIN Security_16..Dealer D ON C.DealerId = D.Id
         INNER JOIN Security_16..Account DA ON D.AccountId = DA.Id
         LEFT OUTER JOIN Security_16..Controllers CONT on A.Id = CONT.AccountId
         LEFT OUTER JOIN Security_16..SoftwareVersions SV ON CONT.SoftwareVersionId = SV.Id
         LEFT OUTER JOIN Security_16..vendor_account_rel VARS ON A.Id = VARS.account_id AND VARS.vendor_id = 1
         LEFT OUTER JOIN Security_16..client_auth_token CAT ON CAT.user_id = U.ID AND CAT.status = 1 AND CAT.expiration_time > GETDATE()
         CROSS APPLY
     (
         SELECT STUFF((
                          SELECT '|' + OM.d_code
                          FROM Security_16..partner_ovrc_mapping AS POM
                                   INNER JOIN Security_16..ovrc_mapping AS OM ON POM.ovrc_id = OM.id
                          WHERE POM.account_id = DA.Id
                          ORDER BY OM.d_code
                          FOR XML PATH ('')), 1, 1, '')
     ) F(DCodes)
WHERE A.CertificateCommonName = @commonNameOrMac
   OR A.CertificateCommonName LIKE CONCAT('%', REPLACE(@commonNameOrMac, ':', ''))
   OR A.Name = @commonNameOrMac
   OR A.Name = @accountName
   OR CONVERT(VARCHAR(50), A.external_id) = @commonNameOrMac`;

export const getSimpleMappingInfo = `SELECT
        A.id
        ,A.name
        ,A.Id AS accountId
        ,LOWER(A.external_id) AS external_id
        ,A.certificateCommonName
        ,IIF(A.no_connect = 1, 'Flagged for No Connect',
                IIF(A.ovrc_created IS NULL OR A.ovrc_created = 0,
                        IIF(A.legacy_connect_upgrade = 1, 'Started Upgrade to Connect', 'Legacy'),
                        IIF(A.handoff_date is null, 'Missing Handoff Date', 'Connect Required'))) AS ConnectStatus
     ,A.ovrc_location_id
     ,a.ovrc_created
     ,a.legacy_connect_upgrade
     ,a.no_connect
     ,a.handoff_date
FROM Security_16..Account A
WHERE A.CertificateCommonName LIKE CONCAT('%', REPLACE(@commonNameOrMac, ':', ''))
      OR A.Name = @commonNameOrMac
      OR A.Name = @accountName
      OR CONVERT(VARCHAR(50), A.external_id) = @commonNameOrMac`;