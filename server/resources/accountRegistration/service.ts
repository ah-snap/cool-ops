import * as repository from "./repository.js";
import * as security16 from "../../common/security16.js";
import type { AccountRegistrationPatch, AccountRegistrationRow } from "./dtos.js";
import {
    ACCOUNT_REGISTRATION_BOOLEAN_FIELDS,
    ACCOUNT_REGISTRATION_NUMBER_FIELDS,
    ACCOUNT_REGISTRATION_STRING_FIELDS,
} from "./dtos.js";

export async function getByAccountId(accountId: number): Promise<AccountRegistrationRow[]> {
    return security16.withPool(() => repository.getByAccountId(accountId));
}

export async function updateByAccountId(accountId: number, patch: unknown): Promise<AccountRegistrationRow[]> {
    if (!patch || typeof patch !== "object") {
        throw new Error("Request body must be an object");
    }

    const rawPatch = patch as Record<string, unknown>;
    const sanitized: AccountRegistrationPatch = {};

    for (const field of ACCOUNT_REGISTRATION_STRING_FIELDS) {
        if (field in rawPatch) {
            const value = rawPatch[field];
            if (value !== null && typeof value !== "string") {
                throw new Error(`Invalid ${field}. Must be a string or null.`);
            }
            sanitized[field] = value as string | null;
        }
    }

    for (const field of ACCOUNT_REGISTRATION_BOOLEAN_FIELDS) {
        if (field in rawPatch) {
            const value = rawPatch[field];
            if (value !== null && typeof value !== "boolean") {
                throw new Error(`Invalid ${field}. Must be a boolean or null.`);
            }
            sanitized[field] = value as boolean | null;
        }
    }

    for (const field of ACCOUNT_REGISTRATION_NUMBER_FIELDS) {
        if (field in rawPatch) {
            const value = rawPatch[field];
            if (value !== null && typeof value !== "number") {
                throw new Error(`Invalid ${field}. Must be a number or null.`);
            }
            sanitized[field] = value as number | null;
        }
    }

    if (Object.keys(sanitized).length === 0) {
        throw new Error("No updatable fields provided.");
    }

    return security16.withPool(() => repository.updateByAccountId(accountId, sanitized));
}
