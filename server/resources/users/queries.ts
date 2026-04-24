/**
 * Finds all (user, d_code) pairs that match any of the values in the
 * dynamically-built WHERE clause. The caller builds `whereClause` as
 * a boolean expression using parameterized inputs bound on the Request
 * (e.g. `u.email IN (@e0, @e1) OR a.CertificateCommonName LIKE @c0`).
 *
 * NOTE: Column-side `LOWER()` / `REPLACE()` are intentionally avoided so
 * indexes on `email` and `CertificateCommonName` can be used. Security_16
 * uses a case-insensitive collation, so `email = @e0` is effectively
 * `LOWER(email) = LOWER(@e0)` anyway. CertificateCommonName values
 * don't contain colons, so stripping colons on the input side is
 * sufficient.
 */
export function buildFindUsersAndDCodes(whereClause: string): string {
    return `
SELECT DISTINCT
    u.email AS control4_email,
    u.Id AS user_id,
    CONCAT('userid:', u.Id) AS splitKey,
    a.CertificateCommonName AS certificateCommonName,
    om.d_code AS d_code,
    IIF(HASHBYTES('MD5', CONCAT(N'Control4!', u.PasswordSalt)) = u.PasswordHash, 1, 0) AS isTestPassword
FROM Security_16..[User] u
INNER JOIN Security_16..Account a ON u.AccountId = a.Id
LEFT OUTER JOIN Security_16..Consumer c ON c.AccountId = a.Id
LEFT OUTER JOIN Security_16..Dealer d ON c.DealerId = d.Id
LEFT OUTER JOIN Security_16..Account da ON d.AccountId = da.Id
LEFT OUTER JOIN Security_16..partner_ovrc_mapping pom ON pom.account_Id = da.Id
LEFT OUTER JOIN Security_16..ovrc_mapping om ON pom.ovrc_id = om.id
WHERE ${whereClause}
`;
}
