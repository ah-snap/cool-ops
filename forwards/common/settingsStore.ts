import { getSettingsPool } from "./settingsPostgres.ts";

// Thin read-through accessor mirroring server/common/settingsStore.ts. Falls
// back to `process.env[key]` (the legacy .env-driven value) if the settings
// store is unreachable or the key hasn't been migrated in yet, so a fresh
// checkout without the settings-db running yet still boots.
export async function getSettingValue(key: string): Promise<string | undefined> {
    try {
        const pool = getSettingsPool();
        const result = await pool.query("SELECT value FROM settings WHERE key = $1", [key]);
        if (result.rows.length) {
            const { value } = result.rows[0] as { value: unknown };
            if (value !== null && value !== undefined) {
                return typeof value === "string" ? value : String(value);
            }
        }
    } catch (err) {
        console.error(`Failed to read setting "${key}" from settings store; falling back to process.env.`, err);
    }

    return process.env[key];
}

interface AwsProfileMapping {
    credentialProfile: string;
    configProfile: string;
    role: string;
    accountId: string;
    region: string;
}

// Keep in sync with AWS_MAPPING_KEY_DEFINITIONS in
// server/resources/settings/settingDefinitions.ts (duplicated here since the
// forwards container is built from its own, separate Docker context).
const AWS_MAPPING_SETTING_KEYS = [
    "CloudExperiencesDevMapping",
    "CloudExperiencesProdMapping",
    "CloudServicesDevMapping",
    "CloudServicesProdMapping",
    "OvrCDevMapping",
    "OvrCProdMapping",
    "OvrCStageMapping",
    "OvrCInteropProdMapping",
    "OvrCInteropStageMapping",
];

// Reconstructs the legacy `credentialProfile,configProfile,role,accountId,region;...`
// blob that updateAwsCreds.sh expects, from the individual per-account
// mapping settings. Falls back to PORT_FORWARD_AWS_PROFILE_MAPPINGS from
// process.env if the settings store is unreachable or has no mapping rows.
export async function getAwsProfileMappingsBlob(): Promise<string> {
    try {
        const pool = getSettingsPool();
        const result = await pool.query("SELECT value FROM settings WHERE key = ANY($1)", [AWS_MAPPING_SETTING_KEYS]);
        if (result.rows.length) {
            const entries = (result.rows as { value: AwsProfileMapping }[])
                .map(({ value }) => value)
                .filter((mapping) => mapping && mapping.accountId)
                .map((mapping) => [mapping.credentialProfile, mapping.configProfile, mapping.role, mapping.accountId, mapping.region].join(","));

            if (entries.length) {
                return entries.join(";");
            }
        }
    } catch (err) {
        console.error("Failed to read AWS profile mappings from settings store; falling back to process.env.", err);
    }

    return process.env.PORT_FORWARD_AWS_PROFILE_MAPPINGS || "";
}
