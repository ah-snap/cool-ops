import type { Request, Response } from "express";
import { sendApiError } from "../../common/apiResponses.js";
import * as service from "./service.js";
import type { DataChangeRequestStatus } from "./service.js";

export async function listRequests(
    req: Request<unknown, unknown, unknown, { type?: string; status?: DataChangeRequestStatus; limit?: string; offset?: string; }>,
    res: Response,
) {
    try {
        const { type, status, limit, offset } = req.query;
        const result = await service.listRequests({
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
        const record = await service.getRequest(req.params.id);
        if (!record) {
            res.status(404).send({ error: "Data change request not found" });
            return;
        }
        res.send(record);
    } catch (err) {
        sendApiError(res, err);
        console.log(err);
    }
}

export async function createRequest(
    req: Request<unknown, unknown, { type: string; data: string; requestor: string; notes?: string | null; status?: DataChangeRequestStatus; }>,
    res: Response,
) {
    try {
        const { type, data, requestor, notes, status } = req.body;
        if (!type || !data || !requestor) {
            res.status(400).send({ error: "type, data, and requestor are required" });
            return;
        }
        const record = await service.createRequest({ type, data, requestor, notes, status });
        res.status(201).send(record);
    } catch (err) {
        sendApiError(res, err);
        console.log(err);
    }
}

export async function updateRequestById(
    req: Request<{ id: string; }, unknown, { status?: DataChangeRequestStatus; notes?: string | null; data?: string; type?: string; }>,
    res: Response,
) {
    try {
        const record = await service.updateRequest(req.params.id, req.body);
        if (!record) {
            res.status(404).send({ error: "Data change request not found" });
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
        const removed = await service.deleteRequest(req.params.id);
        if (!removed) {
            res.status(404).send({ error: "Data change request not found" });
            return;
        }
        res.status(204).send();
    } catch (err) {
        sendApiError(res, err);
        console.log(err);
    }
}
