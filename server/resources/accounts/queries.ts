export const createLegacyAccount = `
-- get the Holding dealer
DECLARE @dealerid bigint;
SET @dealerid = (select id from dealer where name ='Control4 Holding Dealer');

insert into Account (Name, TypeId, Enabled, Created, Modified, HasLoggedIn, AllowsSupport, AllowsPatching,
                     BlockNotifications, external_id,ovrc_created, ExtendedType, for_delete, frozen)
values (@accontName,
        1,
        1,
        SYSDATETIME( ),
        SYSDATETIME(),
        1,
        1,
        0,
        0,
        NEWID(),
        0,
        0
        ,0
        ,0
       );

DECLARE @accountId bigint
set @accountId = (select id from account where name = @accontName)

insert into Consumer (AccountId, DealerId, PurchaseDate)
values (@accountId, @dealerid, SYSDATETIME());

insert into AccountRegistration (AccountId, Company, Address, City, State, Zip, Country, Phone, AllowsPromotions,
                                 AllowsControllerUpdates)
values (@accountId,
        @companyName,
        @address,
        @city,
        @state,
        @postalCode,
        @country,
        @phone,
        1,
        1);


DECLARE @pwhash binary(16)
DECLARE @pwsalt varchar(255)
DECLARE @bcrypt binary(60)
set @pwhash = (select passwordhash from [user] where id = 3496666) -- using the password from a known user
set @pwsalt = (select PasswordSalt from [user] where id = 3496666) -- Control4!
set @bcrypt = (select bcrypt_hash from [user] where id = 3496666)

insert into [User] (AccountId, PasswordHash, PasswordSalt, FirstName, LastName, Email, Enabled, IsOwner,
                    IsActive, external_id, project_type_id, is_admin,
                    bcrypt_hash, frozen, locked, failed_login_attempts, ComposerProLicenseMax, ComposerProEnabled, language_code, consecutive_lockouts)
values (@accountId, @pwhash, @pwsalt, @firstName, @lastName, @email,
        1, 1, 1, NEWID(), 1, 1, @bcrypt,
        0, 0, 0, 0, 0, 'en', 0);


        SELECT
            a.Id as accountId, a.Name as accountName, u.Id as userId, u.Email as email
        FROM Account A 
        INNER JOIN SECURITY_16..[User] U ON U.AccountId = A.Id
        WHERE A.Name = @accontName;
`;

export const markAccountAsConnect = `
UPDATE Security_16..Account
SET ovrc_created = 1, no_connect=0, legacy_connect_upgrade=0
WHERE Name = @accontName`