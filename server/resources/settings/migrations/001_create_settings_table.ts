import type { PoolClient } from "pg";
import {
    AWS_MAPPING_KEY_DEFINITIONS,
    parseLegacyAwsProfileMappings,
    SETTING_DEFINITIONS,
} from "../settingDefinitions.ts";

export const id = "001_create_settings_table";

export async function up(client: PoolClient): Promise<void> {
    await client.query(`
        CREATE TABLE IF NOT EXISTS settings (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            key varchar(50) NOT NULL UNIQUE,
            secure boolean NOT NULL DEFAULT false,
            value jsonb NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
        )
    `);

    // Backwards compatible with existing .env files: prefer the value from
    // process.env (the running server's real .env) over the .env.example
    // default, but only insert rows that don't already exist.
    for (const def of SETTING_DEFINITIONS) {
        const envValue = process.env[def.envVar];
        const value = envValue !== undefined && envValue !== "" ? envValue : def.defaultValue;

        await client.query(
            `INSERT INTO settings (key, secure, value)
             VALUES ($1, $2, $3::jsonb)
             ON CONFLICT (key) DO NOTHING`,
            [def.key, def.secure, JSON.stringify(value)]
        );
    }

    const legacyMappingsByAccountId = parseLegacyAwsProfileMappings(process.env.PORT_FORWARD_AWS_PROFILE_MAPPINGS);

    for (const mappingDef of AWS_MAPPING_KEY_DEFINITIONS) {
        const mapping = legacyMappingsByAccountId.get(mappingDef.accountId) || {
            credentialProfile: "",
            configProfile: "",
            role: "",
            accountId: mappingDef.accountId,
            region: "us-east-1",
        };

        await client.query(
            `INSERT INTO settings (key, secure, value)
             VALUES ($1, false, $2::jsonb)
             ON CONFLICT (key) DO NOTHING`,
            [mappingDef.key, JSON.stringify(mapping)]
        );
    }
}
