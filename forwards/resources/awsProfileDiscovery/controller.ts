import type { Request, Response } from "express";
import { discoverAwsProfileMappings } from "./service.ts";

export async function getAwsProfileDiscovery(_req: Request, res: Response) {
    try {
        const data = discoverAwsProfileMappings();
        res.json({ data });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
}
