import { MongoClient } from "mongodb";
import * as mongoRepository from "./mongoRepository.js";
import type { Request, Response } from "express";
import type { AutomationAccountDocument } from "./dtos.js";
import { sendApiError } from "../../common/apiResponses.js";

export async function getAutomationAccountsByCommonName(req: Request<unknown, unknown, { commonNameOrMac?: string; }>, res: Response) {
    const { commonNameOrMac } = req.body;

    const uri = process.env.mongoConnectionString;
    const mongoClient = new MongoClient(uri);
    mongoClient.connect()
        .then(() => {
            console.log("Connected to MongoDB");
            const db = mongoClient.db("automationaccounts");
            const collection = db.collection("automationaccounts");

            return collection.find({ _id: null }).toArray();
        })
        .then((result: AutomationAccountDocument[]) => {
            if (result.length === 0) {
                sendApiError(res, "No results found", 404);
                return;
            }

            res.send(result);
        })
        .catch((err) => {
            sendApiError(res, err);
            console.log(err)
        })
        .finally(() => {
            mongoClient.close();
        });
}

export async function updateExcludeAssist(req: Request<{ locationId: string; }, unknown, { excludeAssist: boolean; }>, res: Response) {
    const { locationId } = req.params;
    const { excludeAssist } = req.body;

    const result = await mongoRepository.setExcludeAssist(locationId, excludeAssist);

    res.send(result);
    console.log("Result", result);
}