export interface TestUserRow {
    userId: number;
    accountId: number;
    accountName: string | null;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    isOwner: boolean;
}

export interface ActivationResult {
    previousAccountId: number;
    previousOwnerUserId: number | null;
}

export interface ActivateInput {
    testUserId: number;
    targetAccountId: number;
}

export interface DeactivateInput {
    testUserId: number;
    previousAccountId: number;
    previousOwnerUserId: number | null;
}
