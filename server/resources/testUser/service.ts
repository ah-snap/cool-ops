import * as repository from "./repository.js";
import type { ActivateInput, ActivationResult, DeactivateInput, TestUserRow } from "./dtos.js";

export async function getUserById(userId: number): Promise<TestUserRow | null> {
    return repository.getUserById(userId);
}

export async function getOwnerByAccountId(accountId: number): Promise<TestUserRow | null> {
    return repository.getOwnerByAccountId(accountId);
}

export async function activate(input: ActivateInput): Promise<ActivationResult> {
    return repository.activate(input);
}

export async function deactivate(input: DeactivateInput): Promise<void> {
    return repository.deactivate(input);
}
