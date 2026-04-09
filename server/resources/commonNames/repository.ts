import sql from "mssql";
import * as queries from "./queries.js"
import type { AutomationAccountInfoRow, SimpleMappingInfoRow } from "./dtos.js";

export async function getCommonNameInfo({ commonNameOrMac, accountName }: { commonNameOrMac: string; accountName?: string; }): Promise<AutomationAccountInfoRow[]> {
    const query = queries.getAutomationAccountInfo;

    console.log("Getting common name info for", commonNameOrMac, accountName);
    const request = new sql.Request();
    request.input('commonNameOrMac', sql.VarChar(50), commonNameOrMac);
    request.input('accountName', sql.VarChar(50), accountName);

    const result = await request.query(query);
    console.log("Got common name info for", commonNameOrMac, accountName, result.recordset);
    return result.recordset;
}


export async function getSimpleMappingInfo({ commonNameOrMac, accountName }: { commonNameOrMac: string; accountName?: string; }): Promise<SimpleMappingInfoRow[]> {
    const query = queries.getSimpleMappingInfo;

    const request = new sql.Request();
    request.input('commonNameOrMac', sql.VarChar(50), commonNameOrMac);
    request.input('accountName', sql.VarChar(50), accountName);

    const result = await request.query(query);
    return result.recordset;
}
