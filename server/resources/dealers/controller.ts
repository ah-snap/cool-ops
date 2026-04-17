import * as service from "./service.js";
import type { Request, Response } from "express";
import { sendApiError } from "../../common/apiResponses.js";

export async function getDealerByDCode(req: Request<{ dCode: string }>, res: Response) {
    console.log("Getting dealer by DCode", req.params);

    const { dCode } = req.params;
    try {
        const result = await service.getDealerByDCode(dCode);
        if (!result) {
            res.status(404).json({ error: `No dealer found for DCode: ${dCode}` });
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
