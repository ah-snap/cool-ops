import * as security16 from "../../common/security16.js";
import * as repository from "./repository.js";
import * as mongoRepository from "./mongoRepository.js";
import type { UserRow } from "./dtos.js";

function splitEmailsOrMacs(raw: string): string[] {
    return raw
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
}

/**
 * Joins Security_16 `user`/`account`/…/`ovrc_mapping` with OvrC Mongo
 * `companies`/`users` to produce the same projection as the datalake query:
 *   control4_email, user_id, splitKey, certificateCommonName, d_code, ovrc_email
 *
 * Input accepts either a single value or a comma-separated list.
 */
export async function lookupUsers({ emailOrMac }: { emailOrMac: string; }): Promise<UserRow[]> {
    const emailsOrMacs = splitEmailsOrMacs(emailOrMac);
    if (emailsOrMacs.length === 0) return [];

    const emailInputs = emailsOrMacs.filter((v) => v.includes("@"));

    const sqlRows = await security16.withPool(() => repository.findUsersAndDCodes({ emailsOrMacs }));

    const dCodes = Array.from(
        new Set(
            sqlRows
                .map((row) => row.d_code)
                .filter((code): code is string => typeof code === "string" && code.length > 0)
        )
    );

    const [ownerRows, ovrcOnlyRows] = await Promise.all([
        dCodes.length > 0 ? mongoRepository.getOwnersForDCodes(dCodes) : Promise.resolve([]),
        emailInputs.length > 0 ? mongoRepository.findOvrcUsersByEmails(emailInputs) : Promise.resolve([])
    ]);

    const ownerByDCode = new Map(ownerRows.map((owner) => [owner.d_code, owner]));

    const sqlResults: UserRow[] = sqlRows.map((row) => ({
        control4_email: row.control4_email,
        user_id: row.user_id,
        splitKey: row.splitKey,
        certificateCommonName: row.certificateCommonName,
        d_code: row.d_code,
        ovrc_email: row.d_code ? ownerByDCode.get(row.d_code)?.ovrc_email ?? null : null,
        isTestPassword: typeof row.isTestPassword === "boolean" ? row.isTestPassword : null
    }));

    // Any email input whose address did not appear as a control4_email OR as
    // an ovrc_email in the SQL-derived results is an OvrC-only user. Emit a
    // row with the ovrc_email + d_code (other fields blank).
    const matchedEmails = new Set<string>();
    for (const row of sqlResults) {
        if (row.control4_email) matchedEmails.add(row.control4_email.toLowerCase());
        if (row.ovrc_email) matchedEmails.add(row.ovrc_email.toLowerCase());
    }

    const ovrcOnlyResults: UserRow[] = ovrcOnlyRows
        .filter((r) => !matchedEmails.has(r.ovrc_email.toLowerCase()))
        .map((r) => ({
            control4_email: null,
            user_id: null,
            splitKey: null,
            certificateCommonName: null,
            d_code: r.d_code,
            ovrc_email: r.ovrc_email,
            isTestPassword: null
        }));

    return [...sqlResults, ...ovrcOnlyResults];
}
