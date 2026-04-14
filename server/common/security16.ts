import sql from "mssql";

function buildSqlConfig()  {
return {
    user: process.env.security16User,
    password: process.env.security16Password,
    database: process.env.security16Database,
    driver: 'tedious',
    port: Number(process.env.security16Port || 1433),
    server: process.env.security16Host || 'localhost',
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
    try {
        console.log("Attempting to connect to SQL Server with config:", buildSqlConfig());
        const pool = await sql.connect(buildSqlConfig());
        console.log("Connected to SQL Server");
        return pool;
    } catch (err) {
        console.error("SQL Server connection error:", err);
        console.log(buildSqlConfig());
        throw err;
    }

    return await sql.connect(buildSqlConfig());
}