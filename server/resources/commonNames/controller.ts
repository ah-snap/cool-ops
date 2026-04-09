import * as service from "./service.js";
import type { Request, Response } from "express";
import { sendApiError } from "../../common/apiResponses.js";

export async function getCommonNameInfo(req: Request<{ commonNameOrMac: string; }>, res: Response) {
    const commonNameOrMac = req.params['commonNameOrMac'];

    try {
        const result = await service.getCommonNameInfo({ commonNameOrMac });
        console.log("Result", result);
        if (!result || Object.keys(result).length === 0) {
            sendApiError(res, "No results found", 404);
            return;
        }

        res.send(result);
    } catch (err) {
        sendApiError(res, err);
        console.log(err)
    }
}

export async function getSimpleMappingInfo(req: Request<{ commonNameOrMac: string; }>, res: Response) {
    const commonNameOrMac = req.params['commonNameOrMac'];

    try {
        const result = await service.getSimpleMappingInfo({ commonNameOrMac });
        console.log("Result", result);
        if (!result) {
            sendApiError(res, "No results found", 404);
            return;
        }

        res.send(result);
    } catch (err) {
        sendApiError(res, err);
        console.log(err)
    }
}