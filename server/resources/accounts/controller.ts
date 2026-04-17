import * as service from "./service.js"
import type { Request, Response } from "express";
import { sendApiError } from "../../common/apiResponses.js";

export async function createLegacyAccount(req: Request<unknown, unknown, { accountName: string; email: string; }>, res: Response) {
        console.log("Creating Legacy Account", req.body)

        const { accountName, email } = req.body;
    try {
        // make sure that any items are correctly URL encoded in the connection
        const result = await service.createLegacyAccount({ accountName, email });

        console.log("Result", result);
        res.send(result);
    } catch (err) {
        sendApiError(res, err);
        console.log(err)
    }
}


export async function markAccountAsConnect(req: Request<{ accountName: string; }>, res: Response) {
    console.log("Marking Account As Connect", req.params)

    const { accountName } = req.params;
    try {
        // make sure that any items are correctly URL encoded in the connection
        const result = await service.markAccountAsConnect({ accountName });

        console.log("Result", result);
        res.send(result);
    } catch (err) {
        sendApiError(res, err);
        console.log(err)
    }
}

export async function updateAccountType(req: Request<{ accountName: string; }, unknown, { newType: "Connect" | "Legacy" }>, res: Response) {
    console.log("Updating Account Type", req.params, req.body)

    const { accountName } = req.params;
    const { newType } = req.body;
    try {
        const result = await service.updateAccountType({ accountName, newType });

        console.log("Result", result);
        res.send(result);
    } catch (err) {
        sendApiError(res, err);
        console.log(err)
    }
}