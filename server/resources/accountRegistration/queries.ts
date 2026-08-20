export const getByAccountId = `
SELECT Id, AccountId, Company, Address, City, State, Zip, Country, Phone,
       AllowsPromotions, AllowsControllerUpdates, InstallZoning, InstallManufacturingStage,
       lat, long, address_text
FROM Security_16..AccountRegistration
WHERE AccountId = @accountId`;

export function buildUpdateByAccountId(setClauses: string[]): string {
    return `
UPDATE Security_16..AccountRegistration
SET ${setClauses.join(", ")}
WHERE AccountId = @accountId`;
}
