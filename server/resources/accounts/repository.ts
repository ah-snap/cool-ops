import sql from "mssql";
import * as queries from "./queries.js"
import type { CreateLegacyAccountInput, CreateLegacyAccountResultRow, MarkAccountAsConnectInput } from "./dtos.js";

export async function createLegacyAccount({ accountName, firstName, lastName, email, address, city, state, postalCode, phone, country, companyName }: CreateLegacyAccountInput): Promise<CreateLegacyAccountResultRow[]> {
    const query = queries.createLegacyAccount;

    const request = new sql.Request();
    request.input('accontName', sql.VarChar(25), accountName);
    request.input('firstName', sql.VarChar(50), firstName);
    request.input('lastName', sql.VarChar(50), lastName);
    request.input('email', sql.VarChar(100), email);
    request.input('address', sql.VarChar(255), address);
    request.input('city', sql.VarChar(100), city);
    request.input('state', sql.VarChar(50), state);
    request.input('postalCode', sql.VarChar(20), postalCode);
    request.input('phone', sql.VarChar(25), phone);
    request.input('country', sql.VarChar(50), country);
    request.input('companyName', sql.VarChar(255), companyName);

    // return { request, query, queries };
    const result = await request.query(query);
    console.log("Create Legacy Account Result", result);
    return result.recordset;
}

export async function markAccountAsConnect({ accountName }: MarkAccountAsConnectInput): Promise<unknown[]> {
    const query = queries.markAccountAsConnect;

    const request = new sql.Request();
    request.input('accontName', sql.VarChar(25), accountName);

    const result = await request.query(query);
    console.log("Mark Account As Connect Result", result);
    return result.recordset;
}
