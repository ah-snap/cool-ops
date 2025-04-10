import { MongoClient } from "mongodb";

export async function connect() {
    const uri = process.env.mongoConnectionString;
    const mongoClient = new MongoClient(uri);
    return await mongoClient.connect();
}