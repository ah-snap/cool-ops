import { LicenseData, LicenseRequestBody, RevokeLicensesItem, ServerError, SnowLicenseAndTransactionRequestBody } from "../types.t";
import { parseApiResponse } from "./apiClient.ts";
import { apiUrl, d365Url } from "../config.ts";

export async function getLicensesForAccount(accountName: string) : Promise<LicenseData[] | ServerError>    {
    const response = await fetch(apiUrl(`/licenses/${accountName}`));
    return await parseApiResponse<LicenseData[]>(response);
}

export async function updateLicense(code: string, updates: Partial<LicenseData>) {
    const response = await fetch(apiUrl(`/licenses/${code}`), {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(updates)
    });
    return await parseApiResponse<{ rowsAffected: number[] }>(response);

}

export async function addLicense(requestBody: LicenseRequestBody) {
    console.log("Saving License", requestBody);
    
    const request = {
        method: "POST",
        body: JSON.stringify(requestBody),
        headers: {
            "X-BACKWARDS-USER": `{"userId": ${requestBody.userId}, "accountId": ${requestBody.accountId}, "internal": true}`,
            "Content-Type": "application/json"
        }
    };
    
    const response = await fetch(d365Url(`/v1/customers/${requestBody.d365CustomerId}/licenses`), request);
    console.log("Response:", response);
    const data = await response.json();
    console.log("Request", request, "Response", response, "Data", data);
    console.log(data);
}

export async function getValidatedStripeLicenses() {
    const response = await fetch(apiUrl(`/licenses/stripeLicenses`));
    return await parseApiResponse<any[]>(response);
}

export async function addLicenseToSnow(requestBody: SnowLicenseAndTransactionRequestBody) {
    const response = await fetch(apiUrl(`/licenses/snowLicenseAndTransaction`), {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
    });
    return await parseApiResponse<unknown>(response);
}

export async function revokeLicenses(licenses: RevokeLicensesItem[]) : Promise<LicenseData[] | ServerError> {
    const response = await fetch(apiUrl(`/licenses/expire`), {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({licenses: licenses})
    });
    return await parseApiResponse<LicenseData[]>(response);
} 

export async function licenseProcessCall(requestBody: LicenseRequestBody, onComplete?: () => void) {
    console.log("Saving License", requestBody);
    const request = {
        method: "POST",
        body: JSON.stringify(requestBody),
        headers: {
            "X-BACKWARDS-USER": `{"userId": ${requestBody.userId}, "accountId": ${requestBody.accountId}, "internal": true}`,
            "Content-Type": "application/json"
        }
    };
    const response = await fetch(d365Url(`/v1/customers/${requestBody.d365CustomerId}/licenses`), request);
    const data = await response.json();
    console.log("Request", request, "Response", response, "Data", data);
    console.log(data);

    if (onComplete) {
        onComplete();
    }

    return data;
}