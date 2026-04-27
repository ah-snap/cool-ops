import * as ovrcMongo from "../../common/ovcMongo.js";
import type { OvrcOwnerForDCode } from "./dtos.js";

/**
 * For a set of d_codes (account numbers in the OvrC world), looks up each
 * company and its owning user. Mirrors the two JSON sub-selects in the
 * datalake query:
 *
 *   companies (accountNum, _id, freeConnectLicenses)
 *     ⨝ users (companyId = company._id, isOwner = true)
 */
export async function getOwnersForDCodes(dCodes: string[]): Promise<OvrcOwnerForDCode[]> {
    const cleaned = Array.from(new Set(dCodes.filter((code): code is string => typeof code === "string" && code.length > 0)));
    if (cleaned.length === 0) return [];

    const client = await ovrcMongo.connect();
    const db = client.db("ovrcmain");

    const cursor = db.collection("companies").aggregate<{
        accountNum: string;
        freeConnectLicenses?: number | null;
        owner?: { username?: string | null };
    }>([
        { $match: { accountNum: { $in: cleaned } } },
        {
            $addFields: {
                companyIdStr: { $toString: "$_id" }
            }
        },
        {
            $lookup: {
                from: "users",
                let: { cid: "$companyIdStr" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$companyId", "$$cid"] },
                                    { $eq: ["$isOwner", true] }
                                ]
                            }
                        }
                    },
                    { $project: { username: 1, _id: 0 } },
                    { $limit: 1 }
                ],
                as: "owner"
            }
        },
        { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 0,
                accountNum: 1,
                freeConnectLicenses: 1,
                "owner.username": 1
            }
        }
    ]);

    const docs = await cursor.toArray();
    return docs.map((doc) => ({
        d_code: doc.accountNum,
        ovrc_email: doc.owner?.username ?? null,
        freeConnectLicenses: doc.freeConnectLicenses ?? null
    }));
}

/**
 * For a set of emails, finds OvrC users by `username` and joins to their
 * owning company to recover the d_code (accountNum). Used to surface users
 * who exist only in OvrC (no matching Security_16 account) so the Users
 * page can still show an ovrc_email + d_code row for them.
 */
export async function findOvrcUsersByEmails(
    emails: string[]
): Promise<{ ovrc_email: string; d_code: string | null }[]> {
    const cleaned = Array.from(
        new Set(
            emails
                .map((e) => e.trim())
                .filter((e) => e.length > 0 && e.includes("@"))
        )
    );
    if (cleaned.length === 0) return [];

    const client = await ovrcMongo.connect();
    const db = client.db("ovrcmain");

    const cursor = db.collection("users").aggregate<{
        username: string;
        companyId?: string;
        company?: { accountNum?: string | null };
    }>([
        { $match: { username: { $in: cleaned } } },
        {
            $lookup: {
                from: "companies",
                let: { cid: "$companyId" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: [{ $toString: "$_id" }, "$$cid"]
                            }
                        }
                    },
                    { $project: { accountNum: 1, _id: 0 } },
                    { $limit: 1 }
                ],
                as: "company"
            }
        },
        { $unwind: { path: "$company", preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, username: 1, "company.accountNum": 1 } }
    ]);

    const docs = await cursor.toArray();
    return docs.map((doc) => ({
        ovrc_email: doc.username,
        d_code: doc.company?.accountNum ?? null
    }));
}
