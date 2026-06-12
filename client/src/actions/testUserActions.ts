import { apiUrl } from "../config.ts";
import { parseApiResponse } from "./apiClient.ts";
import type { ServerError } from "../types.t";

export type TestUserInfo = {
    userId: number;
    accountId: number;
    accountName: string | null;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    isOwner: boolean;
};

export type ActivationResult = {
    previousAccountId: number;
    previousOwnerUserId: number | null;
};

export async function fetchTestUser(userId: number): Promise<TestUserInfo | ServerError> {
    const response = await fetch(apiUrl(`/testUser/user/${userId}`));
    const data = await parseApiResponse<TestUserInfo>(response);
    return data as TestUserInfo | ServerError;
}

export async function fetchAccountOwner(accountId: number): Promise<TestUserInfo | ServerError> {
    const response = await fetch(apiUrl(`/testUser/owner/${accountId}`));
    const data = await parseApiResponse<TestUserInfo>(response);
    return data as TestUserInfo | ServerError;
}

export async function activateTestUser(input: { testUserId: number; targetAccountId: number; }): Promise<ActivationResult | ServerError> {
    const response = await fetch(apiUrl(`/testUser/activate`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });
    return await parseApiResponse<ActivationResult>(response);
}

export async function deactivateTestUser(input: {
    testUserId: number;
    previousAccountId: number;
    previousOwnerUserId: number | null;
}): Promise<{ ok: true } | ServerError> {
    const response = await fetch(apiUrl(`/testUser/deactivate`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });
    return await parseApiResponse<{ ok: true }>(response);
}
