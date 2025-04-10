import { ObjectId } from "mongodb";
import * as ovrcMongo from "../../common/ovcMongo.js";


export async function getAutomationAccountsByProperties({csAccountId, accountName, locationId}) {
    const result = {};

    const wholeDB = await ovrcMongo.connect();
    const db = wholeDB.db("ovrcmain");
    console.log("Connected to MongoDB");

    const aggregation = [{
        $match: { $or: {csAccountId: csAccountId, accountName: accountName, locationId: locationId} }
    },
    {
        $addFields:
        {
            locationIdAsObjectId: { $toObjectId: "$locationId"}
        }
    },
    {
        $lookup: {
            from: "locations",
            localField: "locationIdAsObjectId",
            foreignField: "_id",
            as: "location"
        }
    },
    {
        $unwind: "$location"
    },
    {
        $lookup: {
            from: "automationaccounts",
            localField: "locationId",
            foreignField: "locationId",
            as: "automationAccount"
        }
    },
    {
        $unwind: {
            path: "$automationAccount",
            preserveNullAndEmptyArrays: true
        }
    }
    ];


}

export async function getAutomationAccountsByCommonName(commonNameOrMac) {
    const result = {};

    const wholeDB = await ovrcMongo.connect();
    const db = wholeDB.db("ovrcmain");
    console.log("Connected to MongoDB");

    const mac = commonNameOrMac.split('_').slice(-1)[0].replaceAll(':', '').match(/../g).join(":");

    const aggregation = [{
        $match: { macAddress: mac }
    },
    {
        $addFields:
        {
            locationIdAsObjectId: { $toObjectId: "$locationId"},
            companyIdAsObjectId: { $toObjectId: "$dealerId" }
        }
    },
    {
        $lookup: {
            from: "companies",
            localField: "companyIdAsObjectId",
            foreignField: "_id",
            as: "company"
        }
    },
    {
        $unwind: "$company"
    },
    {
        $lookup: {
            from: "locations",
            localField: "locationIdAsObjectId",
            foreignField: "_id",
            as: "location"
        }
    },
    {
        $unwind: "$location"
    },
    {
        $lookup: {
            from: "automationaccounts",
            localField: "locationId",
            foreignField: "locationId",
            as: "automationAccount"
        }
    },
    {
        $unwind: {
            path: "$automationAccount",
            preserveNullAndEmptyArrays: true
        }
    }
    ];

    const devices = await db.collection("devices").aggregate(aggregation).toArray();

    if (!devices || devices.length === 0) {
        console.log("No devices found with mac", mac);
    }
    else if (devices.length > 1) {
        console.log("Too many devices with mac", mac);
    } else {
        const device = devices[0];
        result.mac = device.macAddress;
        result.dCode = device.company.accountNum;
        result.locationId = device.locationId;
        result.locationName = device.location.locationName;
        result.csAccountId = device.automationAccount?.csAccountId;
        result.companyName = device.company.companyName;

        if (device.location.dealerId !== device.dealerId) {
            console.log("Location does not belong to company", device.company._id);
        }

        if (device.automationAccount) {
            const duplicateAutomationAccounts = await (db.collection("automationaccounts").find({ csAccountId: result.csAccountId })).toArray();
            result.automationAccounts = duplicateAutomationAccounts;
        }
    }

    return result;
}

export async function getAutomationAccountsByCommonNameOld(commonName) {
    const result = {};

    const wholeDB = await ovrcMongo.connect();
    const db = wholeDB.db("ovrcmain");
    console.log("Connected to MongoDB", db);

    const certificateCommonName = commonName
        .replaceAll(":", "");
    const mac = certificateCommonName.split('_').slice(-1)[0].replaceAll(':', '').match(/../g).join(":");
    const devices = await (db.collection("devices").find({ macAddress: mac })).toArray();

    if (devices.length > 1) {
        console.log("Too many devices with mac", mac);
    } else if (devices.length <= 0) {
        console.log("Can't find mac", mac);
    } else {
        const device = devices[0];
        result.mac = mac;
        console.log("Found device with mac", mac);
        const locationId = device.locationId;
        const companyId = device.dealerId;
        if (!locationId) {
            console.log("No locationId for device", device._id);
        }
        if (!companyId) {
            console.log("No companyId for device", device._id);
        }

        const company = await db.collection("companies").findOne({ "_id": new ObjectId(String(companyId)) });
        const accountNum = company.accountNum;
        result.dCode = accountNum;
        result.locationId = locationId;

        const location = await db.collection("locations").findOne({ "_id": new ObjectId(String(locationId)) });
        result.locationName = location.name;

        console.log(`Found location under dCode`, accountNum);

        if (location.dealerId !== companyId) {
            console.log("Location does not belong to company", companyId);
        }

        const automationAccount = await (db.collection("automationaccounts").find({ locationId: String(locationId) })).toArray();
        if (automationAccount.length > 0) {
            const accountId = automationAccount[0].csAccountId;
            const duplicateAutomationAccounts = await (db.collection("automationaccounts").find({ csAccountId: accountId })).toArray();
            result.automationAccounts = duplicateAutomationAccounts;
            console.log(`Found ${duplicateAutomationAccounts.length} automation account(s) for account ${accountId}`, duplicateAutomationAccounts);
        } else {
            result.automationAccounts = [];
            console.log("No automation account found for location", locationId);
        }
    }

    return result;

}