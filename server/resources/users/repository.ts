import sql from "mssql";
import { buildFindUsersAndDCodes } from "./queries.js";
import type { UserSqlRow } from "./dtos.js";

function isLikelyEmail(value: string): boolean {
    return value.includes("@");
}

export async function findUsersAndDCodes({ emailsOrMacs }: { emailsOrMacs: string[]; }): Promise<UserSqlRow[]> {
    if (!emailsOrMacs.length) return [];

    const request = new sql.Request();

    const emailParams: string[] = [];
    const commonNameLikeClauses: string[] = [];

    emailsOrMacs.forEach((rawValue, index) => {
        const value = rawValue.trim();
        if (!value) return;

        if (isLikelyEmail(value)) {
            const paramName = `e${index}`;
            request.input(paramName, sql.NVarChar(256), value);
            emailParams.push(`@${paramName}`);
        } else {
            const paramName = `c${index}`;
            // Strip colons on the input side only — CertificateCommonName
            // values don't contain colons, so a single suffix LIKE against
            // the stored column lets the index be considered.
            const suffix = `%${value.replace(/:/g, "")}`;
            request.input(paramName, sql.NVarChar(256), suffix);
            commonNameLikeClauses.push(`a.CertificateCommonName LIKE @${paramName}`);
        }
    });

    const whereParts: string[] = [];
    if (emailParams.length > 0) {
        whereParts.push(`u.email IN (${emailParams.join(", ")})`);
    }
    if (commonNameLikeClauses.length > 0) {
        whereParts.push(`(${commonNameLikeClauses.join(" OR ")})`);
    }

    if (whereParts.length === 0) {
        return [];
    }

    const query = buildFindUsersAndDCodes(whereParts.join(" OR "));
    const result = await request.query(query);
    return (result.recordset as UserSqlRow[]).map((row) => ({
        ...row,
        isTestPassword: row.isTestPassword === 1 || row.isTestPassword === true
    }));
}
