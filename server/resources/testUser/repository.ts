import sql from "mssql";
import * as queries from "./queries.js";
import type { ActivateInput, ActivationResult, DeactivateInput, TestUserRow } from "./dtos.js";
import { withPool } from "../../common/security16.js";

export async function getUserById(userId: number): Promise<TestUserRow | null> {
    return withPool(async () => {
        const request = new sql.Request();
        request.input("userId", sql.BigInt, userId);
        const result = await request.query(queries.getUserById);
        const row = (result.recordset?.[0] as TestUserRow | undefined) ?? null;
        return row;
    });
}

export async function getOwnerByAccountId(accountId: number): Promise<TestUserRow | null> {
    return withPool(async () => {
        const request = new sql.Request();
        request.input("accountId", sql.BigInt, accountId);
        const result = await request.query(queries.getOwnerByAccountId);
        const row = (result.recordset?.[0] as TestUserRow | undefined) ?? null;
        return row;
    });
}

/**
 * Move the test user into the target account and demote whichever user is
 * currently `IsOwner = 1` on that account. Returns the prior state so the
 * caller can restore it during deactivation.
 *
 * All four statements run in a single transaction so a mid-flight failure
 * cannot leave Security_16 in a half-impersonated state.
 */
export async function activate({ testUserId, targetAccountId }: ActivateInput): Promise<ActivationResult> {
    return withPool(async (pool) => {
        const tx = new sql.Transaction(pool);
        await tx.begin();
        try {
            const lookupTestUser = new sql.Request(tx);
            lookupTestUser.input("userId", sql.BigInt, testUserId);
            const testUserResult = await lookupTestUser.query(queries.getUserById);
            const testUserRow = testUserResult.recordset?.[0] as TestUserRow | undefined;
            if (!testUserRow) {
                throw new Error(`Test user ${testUserId} not found`);
            }
            const previousAccountId = testUserRow.accountId;

            if (previousAccountId === targetAccountId) {
                throw new Error(`Test user ${testUserId} is already on account ${targetAccountId}; refusing to activate`);
            }

            const lookupOwner = new sql.Request(tx);
            lookupOwner.input("accountId", sql.BigInt, targetAccountId);
            const ownerResult = await lookupOwner.query(queries.getOwnerByAccountId);
            const ownerRow = ownerResult.recordset?.[0] as TestUserRow | undefined;
            const previousOwnerUserId = ownerRow?.userId ?? null;

            if (previousOwnerUserId !== null) {
                const demote = new sql.Request(tx);
                demote.input("userId", sql.BigInt, previousOwnerUserId);
                demote.input("isOwner", sql.Bit, 0);
                await demote.query(queries.setUserIsOwner);
            }

            const moveTestUser = new sql.Request(tx);
            moveTestUser.input("userId", sql.BigInt, testUserId);
            moveTestUser.input("newAccountId", sql.BigInt, targetAccountId);
            await moveTestUser.query(queries.setUserAccount);

            await tx.commit();
            return { previousAccountId, previousOwnerUserId };
        } catch (err) {
            try { await tx.rollback(); } catch { /* nothing to roll back */ }
            throw err;
        }
    });
}

/**
 * Restore the test user to its prior account and re-promote the previously
 * demoted owner.
 */
export async function deactivate({ testUserId, previousAccountId, previousOwnerUserId }: DeactivateInput): Promise<void> {
    return withPool(async (pool) => {
        const tx = new sql.Transaction(pool);
        await tx.begin();
        try {
            const moveTestUser = new sql.Request(tx);
            moveTestUser.input("userId", sql.BigInt, testUserId);
            moveTestUser.input("newAccountId", sql.BigInt, previousAccountId);
            await moveTestUser.query(queries.setUserAccount);

            if (previousOwnerUserId !== null) {
                const promote = new sql.Request(tx);
                promote.input("userId", sql.BigInt, previousOwnerUserId);
                promote.input("isOwner", sql.Bit, 1);
                await promote.query(queries.setUserIsOwner);
            }

            await tx.commit();
        } catch (err) {
            try { await tx.rollback(); } catch { /* nothing to roll back */ }
            throw err;
        }
    });
}
