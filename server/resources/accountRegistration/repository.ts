import sql from "mssql";
import * as queries from "./queries.js";
import type { AccountRegistrationPatch, AccountRegistrationRow } from "./dtos.js";
import {
    ACCOUNT_REGISTRATION_BOOLEAN_FIELDS,
    ACCOUNT_REGISTRATION_NUMBER_FIELDS,
    ACCOUNT_REGISTRATION_STRING_FIELDS,
} from "./dtos.js";

export async function getByAccountId(accountId: number): Promise<AccountRegistrationRow[]> {
    const request = new sql.Request();
    request.input("accountId", sql.BigInt, accountId);

    const result = await request.query<AccountRegistrationRow>(queries.getByAccountId);
    return result.recordset;
}

export async function updateByAccountId(accountId: number, patch: AccountRegistrationPatch): Promise<AccountRegistrationRow[]> {
    const request = new sql.Request();
    request.input("accountId", sql.BigInt, accountId);

    const setClauses: string[] = [];

    for (const field of ACCOUNT_REGISTRATION_STRING_FIELDS) {
        if (patch[field] !== undefined) {
            request.input(field, sql.NVarChar, patch[field] as string | null);
            setClauses.push(`[${field}] = @${field}`);
        }
    }

    for (const field of ACCOUNT_REGISTRATION_BOOLEAN_FIELDS) {
        if (patch[field] !== undefined) {
            request.input(field, sql.Bit, patch[field] as boolean | null);
            setClauses.push(`[${field}] = @${field}`);
        }
    }

    for (const field of ACCOUNT_REGISTRATION_NUMBER_FIELDS) {
        if (patch[field] !== undefined) {
            request.input(field, sql.Float, patch[field] as number | null);
            setClauses.push(`[${field}] = @${field}`);
        }
    }

    if (setClauses.length === 0) {
        return getByAccountId(accountId);
    }

    await request.query(queries.buildUpdateByAccountId(setClauses));

    return getByAccountId(accountId);
}
