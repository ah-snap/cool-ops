import * as service from "./service.js";
import type { Request, Response } from "express";
import { sendApiError } from "../../common/apiResponses.js";

export async function lookupUsers(req: Request<{ emailOrMac: string; }>, res: Response) {
    const emailOrMac = req.params["emailOrMac"];

    try {
        const rows = await service.lookupUsers({ emailOrMac });
        res.send(rows);
    } catch (err) {
        console.error("Error looking up users", err);
        sendApiError(res, err);
    }
}
