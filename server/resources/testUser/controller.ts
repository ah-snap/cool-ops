import type { Request, Response } from "express";
import * as service from "./service.js";
import { sendApiError } from "../../common/apiResponses.js";

function parsePositiveInt(value: unknown, label: string): number {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isInteger(n) || n <= 0) {
        throw new Error(`Invalid ${label}: ${String(value)}`);
    }
    return n;
}

export async function getUserById(req: Request<{ userId: string; }>, res: Response) {
    try {
        const userId = parsePositiveInt(req.params.userId, "userId");
        const row = await service.getUserById(userId);
        if (!row) {
            res.status(404).send({ error: `User ${userId} not found` });
            return;
        }
        res.send(row);
    } catch (err) {
        sendApiError(res, err, 400);
    }
}

export async function getOwnerByAccountId(req: Request<{ accountId: string; }>, res: Response) {
    try {
        const accountId = parsePositiveInt(req.params.accountId, "accountId");
        const row = await service.getOwnerByAccountId(accountId);
        if (!row) {
            res.status(404).send({ error: `No owner found for account ${accountId}` });
            return;
        }
        res.send(row);
    } catch (err) {
        sendApiError(res, err, 400);
    }
}

export async function activate(
    req: Request<unknown, unknown, { testUserId: number; targetAccountId: number; }>,
    res: Response
) {
    try {
        const testUserId = parsePositiveInt(req.body?.testUserId, "testUserId");
        const targetAccountId = parsePositiveInt(req.body?.targetAccountId, "targetAccountId");
        const result = await service.activate({ testUserId, targetAccountId });
        res.send(result);
    } catch (err) {
        console.error("Error activating test user", err);
        sendApiError(res, err);
    }
}

export async function deactivate(
    req: Request<unknown, unknown, { testUserId: number; previousAccountId: number; previousOwnerUserId: number | null; }>,
    res: Response
) {
    try {
        const testUserId = parsePositiveInt(req.body?.testUserId, "testUserId");
        const previousAccountId = parsePositiveInt(req.body?.previousAccountId, "previousAccountId");
        const previousOwnerUserId =
            req.body?.previousOwnerUserId === null || req.body?.previousOwnerUserId === undefined
                ? null
                : parsePositiveInt(req.body.previousOwnerUserId, "previousOwnerUserId");
        await service.deactivate({ testUserId, previousAccountId, previousOwnerUserId });
        res.send({ ok: true });
    } catch (err) {
        console.error("Error deactivating test user", err);
        sendApiError(res, err);
    }
}
