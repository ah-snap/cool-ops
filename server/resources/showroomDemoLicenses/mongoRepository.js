import * as ovrcMongo from "../../common/ovcMongo.js";


export async function assignLicenses(lines) {
    const wholeDB = await ovrcMongo.connect();
    const db = wholeDB.db("ovrcmain");
    console.log("Connected to MongoDB");

    console.log("Assigning licenses to companies:", lines);
    const dCodes = lines.map(line => line.dCode);

    const results = [];
    lines.forEach(line => {
        const { dCode, freeConnectLicenses} = line;
        console.log("Updating company ", dCode, " with licenses ", freeConnectLicenses, line);
        results.push(db.collection("companies").updateOne({accountNum: dCode}, {$set: {freeConnectLicenses: parseInt(freeConnectLicenses)}}));
    });

    await Promise.all(results);
    console.log(results);

    return db.collection("companies").find({accountNum: {$in: dCodes}}).toArray();
}