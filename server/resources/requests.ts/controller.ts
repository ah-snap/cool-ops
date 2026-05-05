import * as service from "./service.js"
import type { Request, Response } from "express";
import { sendApiError } from "../../common/apiResponses.js";
import type { RequestStatus, RequestType } from "./store.js";


export async function createWhiteLabelRequest(req: Request<unknown, unknown, { requestDate?: string; sCode?: string; licenseType?: string; mac?: string; }>, res: Response) {
    console.log("Creating white label request", req.body);
    const { requestDate, sCode, licenseType, mac } = req.body;

    try {
        const result = await service.createWhiteLabelRequest({ requestDate, sCode, licenseType, mac });
        console.log("Result", result);

        res.status(201).send(result);
    } catch (err) {
        sendApiError(res, err);
        console.log(err)
    }
}

export async function listRequests(
    req: Request<unknown, unknown, unknown, { type?: RequestType; status?: RequestStatus; limit?: string; offset?: string; }>,
    res: Response,
) {
    try {
        const { type, status, limit, offset } = req.query;
        const result = service.listRequests({
            type,
            status,
            limit: limit !== undefined ? Number(limit) : undefined,
            offset: offset !== undefined ? Number(offset) : undefined,
        });
        res.send(result);
    } catch (err) {
        sendApiError(res, err);
        console.log(err);
    }
}

export async function getRequestById(req: Request<{ id: string; }>, res: Response) {
    try {
        const record = service.getRequest(req.params.id);
        if (!record) {
            res.status(404).send({ error: "Request not found" });
            return;
        }
        res.send(record);
    } catch (err) {
        sendApiError(res, err);
        console.log(err);
    }
}

export async function updateRequestById(
    req: Request<{ id: string; }, unknown, { status?: RequestStatus; result?: unknown; error?: string; }>,
    res: Response,
) {
    try {
        const record = service.updateRequest(req.params.id, req.body);
        if (!record) {
            res.status(404).send({ error: "Request not found" });
            return;
        }
        res.send(record);
    } catch (err) {
        sendApiError(res, err);
        console.log(err);
    }
}

export async function deleteRequestById(req: Request<{ id: string; }>, res: Response) {
    try {
        const removed = service.deleteRequest(req.params.id);
        if (!removed) {
            res.status(404).send({ error: "Request not found" });
            return;
        }
        res.status(204).send();
    } catch (err) {
        sendApiError(res, err);
        console.log(err);
    }
}