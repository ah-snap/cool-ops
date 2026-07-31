import { timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import * as service from "./service.ts";
import { sendApiError } from "../../common/apiResponses.ts";
import type { UpdateSettingInput } from "./dtos.ts";

// Constant-time string compare so an invalid secret can't be brute-forced
// via response-time differences.
function secretsMatch(provided: string, expected: string): boolean {
    const providedBuf = Buffer.from(provided);
    const expectedBuf = Buffer.from(expected);
    if (providedBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(providedBuf, expectedBuf);
}

export async function listSettings(req: Request, res: Response) {
    try {
        const result = await service.listSettings();
        res.send(result);
    } catch (err) {
        sendApiError(res, err);
    }
}

export async function exportSettings(req: Request, res: Response) {
    const expectedSecret = process.env.SETTINGS_EXPORT_SECRET;
    if (!expectedSecret) {
        res.status(500).send({ error: "SETTINGS_EXPORT_SECRET is not configured on the server" });
        return;
    }

    const provided = req.query.secret;
    if (typeof provided !== "string" || !secretsMatch(provided, expectedSecret)) {
        res.status(403).send({ error: "Invalid or missing export secret" });
        return;
    }

    const rawKeys = req.query.keys;
    const keys = typeof rawKeys === "string" && rawKeys.length > 0 ? rawKeys.split(",").map((k) => k.trim()).filter(Boolean) : undefined;

    try {
        const result = await service.exportSettings(keys);
        res.send(result);
    } catch (err) {
        sendApiError(res, err);
    }
}

export async function getSetting(req: Request<{ key: string; }>, res: Response) {
    const { key } = req.params;

    try {
        const result = await service.getSetting(key);
        if (!result) {
            res.status(404).send({ error: `Unknown setting "${key}"` });
            return;
        }
        res.send(result);
    } catch (err) {
        sendApiError(res, err);
    }
}

export async function updateSetting(req: Request<{ key: string; }, unknown, UpdateSettingInput>, res: Response) {
    const { key } = req.params;
    const { value } = req.body;

    try {
        const result = await service.updateSetting(key, value);
        if (!result) {
            res.status(404).send({ error: `Unknown setting "${key}"` });
            return;
        }
        res.send(result);
    } catch (err) {
        sendApiError(res, err);
    }
}
