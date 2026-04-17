import { Mapping, ServerError, SimpleAccountMapping } from "../types.t";
import { parseApiResponse } from "./apiClient.ts";
import { apiUrl } from "../config.ts";

export async function getAccountMappingByCommonNameOrMac(commonNameOrMac: string) : Promise<Mapping | ServerError | null> {
        const response = await fetch(apiUrl(`/commonNames/${commonNameOrMac}`));
        return await parseApiResponse<Mapping>(response);
    }

export async function getSimpleMappingInfoByCommonNameOrMac(commonNameOrMac: string) : Promise<SimpleAccountMapping | ServerError | null> {
        const response = await fetch(apiUrl(`/commonNames/simple/${commonNameOrMac}`));
        return await parseApiResponse<SimpleAccountMapping>(response);
    }

export async function markAccountAsConnect(accountName: string) : Promise<Mapping | ServerError | null> {
    const response = await fetch(apiUrl(`/accounts/connect/${accountName}`), {
        method: 'PUT'
    });
    const data = await parseApiResponse<unknown[]>(response);

    if (data && typeof data === "object" && "error" in data) {
        return data as ServerError;
    }

    return getAccountMappingByCommonNameOrMac(accountName);
}

export async function updateAccountType(accountName: string, newType: "Connect" | "Legacy") : Promise<Mapping | ServerError | null> {
    const response = await fetch(apiUrl(`/accounts/type/${accountName}`), {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newType })
    });
    const data = await parseApiResponse<unknown[]>(response);

    if (data && typeof data === "object" && "error" in data) {
        return data as ServerError;
    }

    return getAccountMappingByCommonNameOrMac(accountName);
}