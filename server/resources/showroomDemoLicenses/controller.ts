import * as service from "./service.js"
import type { Request, Response } from "express";
import type { AssignLicenseLine } from "./dtos.js";
import { sendApiError } from "../../common/apiResponses.js";


export async function assignLicenses(req: Request<unknown, unknown, AssignLicenseLine[]>, res: Response) {
    console.log("Assigning licenses", req.body);

    try {
        const result = await service.assignLicenses(req.body);
        console.log("Result", result);

        res.send(result);
    } catch (err) {
        sendApiError(res, err);
        console.log(err)
    }
}