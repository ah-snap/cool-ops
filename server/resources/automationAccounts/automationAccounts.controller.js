import { MongoClient } from "mongodb";
import * as ovrcMongo from "../../common/ovcMongo.js";

export async function getAutomationAccountsByCommonName(req, res) {
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
        .then((result) => {
            if (result.length === 0) {
                res.send({
                    error: "No results found"
                });
                return;
            }

            res.send(result);
        })
        .catch((err) => {
            res.send({
                error: err
            });
            console.log(err)
        })
        .finally(() => {
            mongoClient.close();
        });
}