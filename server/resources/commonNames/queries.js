export const getAutomationAccountInfo = `SELECT
        a.Name
        ,A.Id AS accountId
        ,D.Id AS dealerId
        ,D.is_domestic
        ,D.name as dealerName
        ,LOWER(A.external_id) AS external_id
        ,A.CertificateCommonName
        
     ,IIF(D.is_domestic IS NULL OR d.is_domestic = 0, 'Not Connect Elligible',
          IIF(A.no_connect = 1, 'Flagged for No Connect',
              IIF(A.ovrc_created IS NULL OR A.ovrc_created = 0,
                  IIF(A.legacy_connect_upgrade = 1, 'Started Upgrade to Connect', 'Legacy'),
                  IIF(A.handoff_date is null, 'Missing Handoff Date', 'Connect Required')))) AS ConnectStatus
     ,A.ovrc_location_id
     ,f.DCodes
     ,a.ovrc_created
     ,a.legacy_connect_upgrade
     ,a.no_connect

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
FROM Security_16..Account A
         INNER JOIN Security_16..Consumer C ON A.Id = C.AccountId
         INNER JOIN Security_16..Dealer D ON C.DealerId = D.Id
         INNER JOIN Security_16..Account DA ON D.AccountId = DA.Id
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
WHERE A.CertificateCommonName LIKE CONCAT('%', REPLACE(@commonNameOrMac, ':', ''))
      OR A.Name = @commonNameOrMac
      OR A.Name = @accountName`