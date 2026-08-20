import { AccountRegistration, AccountRegistrationPatch, ServerError } from "../types.t";
import { parseApiResponse } from "./apiClient.ts";
import { apiUrl } from "../config.ts";

export async function getAccountRegistration(accountId: number): Promise<AccountRegistration[] | ServerError> {
    const response = await fetch(apiUrl(`/accountRegistration/${accountId}`));
    return await parseApiResponse<AccountRegistration[]>(response);
}

export async function patchAccountRegistration(accountId: number, patch: AccountRegistrationPatch): Promise<AccountRegistration[] | ServerError> {
    const response = await fetch(apiUrl(`/accountRegistration/${accountId}`), {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(patch)
    });
    return await parseApiResponse<AccountRegistration[]>(response);
}
