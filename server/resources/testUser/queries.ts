export const getUserById = `
SELECT
    u.Id          AS userId,
    u.AccountId   AS accountId,
    a.Name        AS accountName,
    u.Email       AS email,
    u.FirstName   AS firstName,
    u.LastName    AS lastName,
    u.IsOwner     AS isOwner
FROM Security_16..[User] u
INNER JOIN Security_16..Account a ON u.AccountId = a.Id
WHERE u.Id = @userId
`;

export const getOwnerByAccountId = `
SELECT TOP 1
    u.Id          AS userId,
    u.AccountId   AS accountId,
    a.Name        AS accountName,
    u.Email       AS email,
    u.FirstName   AS firstName,
    u.LastName    AS lastName,
    u.IsOwner     AS isOwner
FROM Security_16..[User] u
INNER JOIN Security_16..Account a ON u.AccountId = a.Id
WHERE u.AccountId = @accountId
  AND u.IsOwner = 1
ORDER BY u.Id
`;

export const setUserAccount = `
UPDATE Security_16..[User]
SET AccountId = @newAccountId
WHERE Id = @userId
`;

export const setUserIsOwner = `
UPDATE Security_16..[User]
SET IsOwner = @isOwner
WHERE Id = @userId
`;
