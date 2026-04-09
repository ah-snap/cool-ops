import * as service from "./service.js"
import type { Request, Response } from "express";
import { sendApiError } from "../../common/apiResponses.js";


export async function getPspDetails(req: Request<{ psp: string; }>, res: Response) {
    const psp = req.params['psp'];
    console.log("Psp", psp);

    try {
        const result = await service.getPspDetails(psp);
        console.log("Result", result);

        res.send(result);
    } catch (err) {
        sendApiError(res, err);
        console.log(err)
    }
}