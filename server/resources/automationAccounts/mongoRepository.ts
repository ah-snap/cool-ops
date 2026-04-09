import * as ovrcMongo from "../../common/ovcMongo.js";
import type { UpdateResult } from "mongodb";
import type { SetExcludeAssistInput } from "./dtos.js";


export async function setExcludeAssist(locationId: SetExcludeAssistInput["locationId"], excludeAssist: SetExcludeAssistInput["excludeAssist"]): Promise<UpdateResult> {
    const wholeDB = await ovrcMongo.connect();
    const db = wholeDB.db("ovrcmain");
    console.log("Connected to MongoDB");

    const collection = db.collection("automationaccounts");

    console.log('locationId', locationId);
    console.log('excludeAssist', excludeAssist);

    console.log(collection.find({ locationId }));
    console.log(await (await collection.find({ locationId })).toArray());
    return collection.updateOne({ locationId }, { $set: { excludeAssist } });
}