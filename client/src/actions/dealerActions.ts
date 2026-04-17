import { DealerInfo, ServerError } from "../types.t";
import { parseApiResponse } from "./apiClient.ts";
import { apiUrl } from "../config.ts";

export async function getDealerByDCode(dCode: string): Promise<DealerInfo | ServerError> {
    const response = await fetch(apiUrl(`/dealers/${dCode}`));
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
