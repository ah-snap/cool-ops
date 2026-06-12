import { DealerInfo, ServerError } from "../types.t";
import { parseApiResponse } from "./apiClient.ts";
import { apiUrl } from "../config.ts";

export async function getDealerByDCode(dCode: string): Promise<DealerInfo | ServerError> {
    const response = await fetch(apiUrl(`/dealers?dCode=${encodeURIComponent(dCode)}`));
    return parseApiResponse<DealerInfo>(response);
}

export async function getDealerByEmail(email: string): Promise<DealerInfo | ServerError> {
    const response = await fetch(apiUrl(`/dealers?email=${encodeURIComponent(email)}`));
    return parseApiResponse<DealerInfo>(response);
}

export async function getDealerByDCodeOrEmail(dCodeOrEmail: string): Promise<DealerInfo | ServerError> {
    const isEmail = dCodeOrEmail.includes("@");
    const queryParam = isEmail ? `email=${encodeURIComponent(dCodeOrEmail)}` : `dCode=${encodeURIComponent(dCodeOrEmail)}`;
    const response = await fetch(apiUrl(`/dealers?${queryParam}`));
    return parseApiResponse<DealerInfo>(response);
}

export async function updateFreeConnectLicenses(dCode: string, freeConnectLicenses: number): Promise<DealerInfo | ServerError> {
    const response = await fetch(apiUrl(`/dealers/${dCode}/freeConnectLicenses`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freeConnectLicenses }),
    });
    return parseApiResponse<DealerInfo>(response);
}
