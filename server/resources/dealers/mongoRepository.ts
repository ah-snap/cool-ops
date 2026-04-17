import * as ovrcMongo from "../../common/ovcMongo.js";
import type { DealerInfo, UpdateFreeConnectLicensesInput } from "./dtos.js";

export async function getDealerByDCode(dCode: string): Promise<DealerInfo | null> {
    const client = await ovrcMongo.connect();
    const db = client.db("ovrcmain");

    const result = await db.collection("companies").findOne({ accountNum: dCode });
    return result as DealerInfo | null;
}

export async function updateFreeConnectLicenses({ dCode, freeConnectLicenses }: UpdateFreeConnectLicensesInput): Promise<DealerInfo | null> {
    const client = await ovrcMongo.connect();
    const db = client.db("ovrcmain");

    await db.collection("companies").updateOne(
        { accountNum: dCode },
        { $set: { freeConnectLicenses } }
    );

    return db.collection("companies").findOne({ accountNum: dCode }) as Promise<DealerInfo | null>;
}
