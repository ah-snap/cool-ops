import * as ovrcMongo from "../../common/ovcMongo.js";
import type { DealerInfo, UpdateFreeConnectLicensesInput } from "./dtos.js";

export async function getDealerByDCode(dCode: string): Promise<DealerInfo | null> {
    return ovrcMongo.withMongo(async (client) => {
        const db = client.db("ovrcmain");
        const result = await db.collection("companies").findOne({ accountNum: dCode });
        return result as DealerInfo | null;
    });
}

export async function getDealerByDCodeOrEmail(dCode?: string, email?: string): Promise<DealerInfo | null> {
    return ovrcMongo.withMongo(async (client) => {
        const db = client.db("ovrcmain");
        const query: { accountNum?: string; email?: string } = {};

        if (dCode) {
            query.accountNum = dCode;
        } else if (email) {
            console.log("Querying by email:", email);
            query.email = email;
        } else {
            return null; // No valid query parameters provided
        }

        const result = await db.collection("companies").findOne(query);
        return result as DealerInfo | null;
    });
}

export async function updateFreeConnectLicenses({ dCode, freeConnectLicenses }: UpdateFreeConnectLicensesInput): Promise<DealerInfo | null> {
    return ovrcMongo.withMongo(async (client) => {
        const db = client.db("ovrcmain");

        await db.collection("companies").updateOne(
            { accountNum: dCode },
            { $set: { freeConnectLicenses } }
        );

        return db.collection("companies").findOne({ accountNum: dCode }) as Promise<DealerInfo | null>;
    });
}
