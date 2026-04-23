import * as repository from "./repository.js"
import * as security16 from "../../common/security16.js";
import type { AccountPatch, ConnectTier, CreateLegacyAccountResultRow } from "./dtos.js";
import { CONNECT_TIER_VALUES } from "./dtos.js";

export async function createLegacyAccount({ accountName, email }: { accountName: string; email: string; }): Promise<CreateLegacyAccountResultRow[]> {

    await security16.connect();

    return repository.createLegacyAccount({ 
        accountName,
        firstName: "Legacy",
        lastName: "User",
        email,
        address: "12345 Snap One Dr",
        city: "Lehi",
        state: "UT",
        postalCode: "84404",
        phone: "801-111-1111",
        country: "US",
        companyName: "" });
}

export async function markAccountAsConnect({ accountName }: { accountName: string; }): Promise<unknown[]> {

    await security16.connect();

    return repository.markAccountAsConnect({ 
        accountName
    });
}

export async function updateAccountType({ accountName, newType }: { accountName: string; newType: "Connect" | "Legacy" }): Promise<unknown[]> {

    await security16.connect();

    return repository.updateAccountType({
        accountName,
        newType
    });
}

function isValidAccountType(value: unknown): value is "Connect" | "Legacy" {
    return value === "Connect" || value === "Legacy";
}

function isValidConnectTier(value: unknown): value is ConnectTier | null {
    if (value === null) return true;
    return typeof value === "string" && (CONNECT_TIER_VALUES as string[]).includes(value);
}

export async function patchAccount({ accountName, patch }: { accountName: string; patch: unknown }): Promise<{ updated: (keyof AccountPatch)[] }> {
    if (!patch || typeof patch !== "object") {
        throw new Error("Request body must be an object");
    }

    const sanitized: AccountPatch = {};
    const rawPatch = patch as Record<string, unknown>;

    if ("accountType" in rawPatch) {
        if (!isValidAccountType(rawPatch.accountType)) {
            throw new Error(`Invalid accountType '${String(rawPatch.accountType)}'. Must be 'Connect' or 'Legacy'.`);
        }
        sanitized.accountType = rawPatch.accountType;
    }

    if ("connectTier" in rawPatch) {
        if (!isValidConnectTier(rawPatch.connectTier)) {
            throw new Error(`Invalid connectTier '${String(rawPatch.connectTier)}'. Must be one of ${CONNECT_TIER_VALUES.join(", ")} or null.`);
        }
        sanitized.connectTier = rawPatch.connectTier;
    }

    const updatedFields = Object.keys(sanitized) as (keyof AccountPatch)[];
    if (updatedFields.length === 0) {
        throw new Error("No updatable fields provided. Supported fields: accountType, connectTier.");
    }

    await security16.connect();
    await repository.patchAccount({ accountName, patch: sanitized });

    return { updated: updatedFields };
}