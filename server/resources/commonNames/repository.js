import sql from "mssql";
import * as queries from "./queries.js"

export async function getCommonNameInfo({ commonNameOrMac, accountName}) {
    const query = queries.getAutomationAccountInfo;

    const request = new sql.Request();
    request.input('commonNameOrMac', sql.VarChar(50), commonNameOrMac);
    request.input('accountName', sql.VarChar(50), accountName);

    const result = await request.query(query);
    return result.recordset;
}
