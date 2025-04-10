import sql from "mssql";

function buildSqlConfig()  {
return {
    user: process.env.security16User,
    password: process.env.security16Password,
    database: process.env.security16Database,
    driver: 'tedious',
    port: 1433,
    server: 'localhost',
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
        createRetryIntervalMillis: 2000,
    },
    trustedConnection: true,
    connectionRetryInterval: 5000,
    options: {
        trustedConnection: true,
        trustServerCertificate: true,
        connectionRetryInterval: 5000,
    }
}}


export async function connect() {
    return await sql.connect(buildSqlConfig());
}