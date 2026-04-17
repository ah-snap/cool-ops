import * as repository from "./repository.js"
import * as security16 from "../../common/security16.js";
import type { CreateLegacyAccountResultRow } from "./dtos.js";

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