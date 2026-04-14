import type { Request, Response } from "express";
import { portForwardManager } from "./service.ts";

function getLimit(queryValue: unknown): number {
    const parsed = Number(queryValue);
    if (!Number.isFinite(parsed)) {
        return 300;
    }

    return Math.max(1, Math.min(1000, Math.floor(parsed)));
}

export async function listPortForwards(_req: Request, res: Response) {
    res.json({ data: portForwardManager.listSummaries() });
}

export async function getAwsCredentialsFreshness(req: Request, res: Response) {
    const parsed = Number(req.query.maxAgeHours);
    const maxAgeHours = Number.isFinite(parsed) ? parsed : 8;
    res.json({ data: portForwardManager.getAwsCredentialsFreshness(maxAgeHours) });
}

export async function getPortForwardLogs(req: Request, res: Response) {
    try {
        const logs = portForwardManager.getLogs(req.params.id, getLimit(req.query.limit));
        res.json({ data: logs });
    } catch (error) {
        res.status(404).json({ error: (error as Error).message });
    }
}

export async function startPortForward(req: Request, res: Response) {
    try {
        const state = portForwardManager.start(req.params.id);
        res.json({ data: state });
    } catch (error) {
        res.status(404).json({ error: (error as Error).message });
    }
}

export async function restartPortForward(req: Request, res: Response) {
    try {
        const state = await portForwardManager.restart(req.params.id);
        res.json({ data: state });
    } catch (error) {
        res.status(404).json({ error: (error as Error).message });
    }
}

export async function stopPortForward(req: Request, res: Response) {
    try {
        const state = await portForwardManager.stop(req.params.id);
        res.json({ data: state });
    } catch (error) {
        res.status(404).json({ error: (error as Error).message });
    }
}
