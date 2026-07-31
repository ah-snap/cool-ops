// Canonical list of every setting the app knows about. Used by the migration
// to prepopulate the `settings` table (backwards compatible with existing
// `.env` files: if `envVar` is set in process.env when the migration runs,
// that value wins; otherwise `defaultValue` — mirroring `.env.example` —
// is used) and by the client to know which keys exist.

export interface SettingDefinition {
    /** Primary key stored in the `settings` table. */
    key: string;
    /** process.env var name this key is backfilled from (usually === key). */
    envVar: string;
    /** Whether the value should be censored when returned to the client. */
    secure: boolean;
    /** Fallback used when envVar isn't set (matches .env.example). */
    defaultValue: string;
}

export const SETTING_DEFINITIONS: SettingDefinition[] = [
    { key: "mongoConnectionString", envVar: "mongoConnectionString", secure: true, defaultValue: "" },
    { key: "security16User", envVar: "security16User", secure: false, defaultValue: "user" },
    { key: "security16Password", envVar: "security16Password", secure: true, defaultValue: "" },
    { key: "security16Database", envVar: "security16Database", secure: false, defaultValue: "Security_16" },
    { key: "security16Host", envVar: "security16Host", secure: false, defaultValue: "localhost" },
    { key: "adyenCookie", envVar: "adyenCookie", secure: true, defaultValue: "" },
    { key: "PGUSER", envVar: "PGUSER", secure: false, defaultValue: "root" },
    { key: "PGPASSWORD", envVar: "PGPASSWORD", secure: true, defaultValue: "password" },
    { key: "PGHOST", envVar: "PGHOST", secure: false, defaultValue: "forwards" },
    { key: "PGPORT", envVar: "PGPORT", secure: false, defaultValue: "5433" },
    { key: "PGDATABASE", envVar: "PGDATABASE", secure: false, defaultValue: "snow" },
    { key: "PORT_FORWARD_AWS_SSO_LOGIN_PROFILE", envVar: "PORT_FORWARD_AWS_SSO_LOGIN_PROFILE", secure: false, defaultValue: "prod_access_1" },
    { key: "PORT_FORWARD_AWS_SSO_USE_DEVICE_CODE", envVar: "PORT_FORWARD_AWS_SSO_USE_DEVICE_CODE", secure: false, defaultValue: "true" },
    { key: "OVRC_PROD_SSM_PROFILE", envVar: "OVRC_PROD_SSM_PROFILE", secure: false, defaultValue: "ovrc_prod_ssm" },
    { key: "PROD_ACCESS_PROFILE", envVar: "PROD_ACCESS_PROFILE", secure: false, defaultValue: "prod_access" },
    { key: "PORT_FORWARD_AWS_CODEARTIFACT_PROFILE", envVar: "PORT_FORWARD_AWS_CODEARTIFACT_PROFILE", secure: false, defaultValue: "prod_access" },
    { key: "PORT_FORWARD_AWS_CODEARTIFACT_DOMAIN", envVar: "PORT_FORWARD_AWS_CODEARTIFACT_DOMAIN", secure: false, defaultValue: "control4" },
    { key: "SNOWDB_HOST", envVar: "SNOWDB_HOST", secure: false, defaultValue: "localhost" },
    { key: "SECURITY16_FORWARDING_HOST", envVar: "SECURITY16_FORWARDING_HOST", secure: false, defaultValue: "127.0.0.1" },
    { key: "SNOWDB_FORWARD_USER", envVar: "SNOWDB_FORWARD_USER", secure: false, defaultValue: "" },
    { key: "REQUESTS_URL", envVar: "REQUESTS_URL", secure: false, defaultValue: "" },
    { key: "REQUESTS_API_KEY", envVar: "REQUESTS_API_KEY", secure: true, defaultValue: "" },
];

// AWS profile mapping keys, named after how the accounts show up in AWS
// rather than the old `credentialProfile,configProfile,role,accountId,region`
// blob. These are not secrets (they're just developer-local aliases), so
// `secure` is always false.
export interface AwsMappingKeyDefinition {
    key: string;
    accountId: string;
}

export const AWS_MAPPING_KEY_DEFINITIONS: AwsMappingKeyDefinition[] = [
    { key: "CloudExperiencesDevMapping", accountId: "586053279305" },
    { key: "CloudExperiencesProdMapping", accountId: "819977075662" },
    { key: "CloudServicesDevMapping", accountId: "489561981168" },
    { key: "CloudServicesProdMapping", accountId: "367507620554" },
    { key: "OvrCDevMapping", accountId: "268853364163" },
    { key: "OvrCProdMapping", accountId: "445822975327" },
    { key: "OvrCStageMapping", accountId: "642727902844" },
    { key: "OvrCInteropProdMapping", accountId: "483191400031" },
    { key: "OvrCInteropStageMapping", accountId: "471354728075" },
];

export interface AwsProfileMapping {
    credentialProfile: string;
    configProfile: string;
    role: string;
    accountId: string;
    region: string;
}

const DEFAULT_REGION = "us-east-1";

// Parses the legacy `PORT_FORWARD_AWS_PROFILE_MAPPINGS` blob
// (`credentialProfile,configProfile,role,accountId,region;...`) into a map
// keyed by accountId, so the migration can backfill the new per-account
// mapping settings from an existing `.env`.
export function parseLegacyAwsProfileMappings(raw: string | undefined): Map<string, AwsProfileMapping> {
    const byAccountId = new Map<string, AwsProfileMapping>();
    if (!raw) {
        return byAccountId;
    }

    for (const entry of raw.split(";")) {
        const trimmed = entry.trim();
        if (!trimmed) continue;

        const [credentialProfile, configProfile, role, accountId, region] = trimmed.split(",").map((part) => part.trim());
        if (!accountId) continue;

        byAccountId.set(accountId, {
            credentialProfile: credentialProfile || "",
            configProfile: configProfile || "",
            role: role || "",
            accountId,
            region: region || DEFAULT_REGION,
        });
    }

    return byAccountId;
}
