import * as service from "./service.js";
import type { Request, Response } from "express";
import { sendApiError } from "../../common/apiResponses.js";

export async function getAccountRegistration(req: Request<{ accountId: string }>, res: Response) {
    const accountId = Number(req.params.accountId);

    try {
        const result = await service.getByAccountId(accountId);
        res.send(result);
    } catch (err) {
        sendApiError(res, err);
        console.log(err);
    }
}

export async function patchAccountRegistration(req: Request<{ accountId: string }, unknown, unknown>, res: Response) {
    const accountId = Number(req.params.accountId);

    try {
        const result = await service.updateByAccountId(accountId, req.body);
        res.send(result);
    } catch (err) {
        sendApiError(res, err);
        console.log(err);
    }
}
