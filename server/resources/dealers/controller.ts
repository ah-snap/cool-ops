import * as service from "./service.js";
import type { Request, Response } from "express";
import { sendApiError } from "../../common/apiResponses.js";

export async function getDealerByDCodeOrEmail(req: Request<{ dCode?: string, email?: string }>, res: Response) {
    console.log("Getting dealer", req.query);

    const { dCode, email } = req.query;
    try {
        const result = await service.getDealerByDCodeOrEmail(dCode, email);
        if (!result) {
            res.status(404).json({ error: `No dealer found for ${dCode || email}` });
            return;
        }
        res.send(result);
    } catch (err) {
        sendApiError(res, err);
        console.log(err);
    }
}

export async function updateFreeConnectLicenses(req: Request<{ dCode: string }, unknown, { freeConnectLicenses: number }>, res: Response) {
    console.log("Updating freeConnectLicenses", req.params, req.body);

    const { dCode } = req.params;
    const { freeConnectLicenses } = req.body;
    try {
        const result = await service.updateFreeConnectLicenses({ dCode, freeConnectLicenses });
        res.send(result);
    } catch (err) {
        sendApiError(res, err);
        console.log(err);
    }
}
