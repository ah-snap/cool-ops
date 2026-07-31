import { spawnSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { configSectionToProfileName, parseIni } from "./iniParser.ts";

export type ProfileDiscoveryResult = {
    profile: string;
    status: "ok" | "expired" | "error";
    accountId?: string;
    arn?: string;
    role?: string;
    region?: string;
    message?: string;
};

export type MappingSuggestion = {
    settingKey: string;
    accountId: string;
    candidates: Array<{
        credentialProfile: string;
        configProfile: string;
        role?: string;
        region: string;
    }>;
};

export type AwsProfileDiscoveryResponse = {
    scannedAt: string;
    profiles: ProfileDiscoveryResult[];
    suggestions: MappingSuggestion[];
    unmatchedAccountIds: string[];
};

// Duplicated from server/resources/settings/settingDefinitions.ts (the
// forwards container is built from its own, separate Docker context, same
// reason forwards/common/settingsStore.ts duplicates the key-name list).
const AWS_MAPPING_KEY_DEFINITIONS: Array<{ key: string; accountId: string }> = [
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

const DEFAULT_REGION = "us-east-1";
const GET_CALLER_IDENTITY_TIMEOUT_MS = 8000;

function configFilePath(): string {
    return process.env.AWS_CONFIG_FILE || `${process.env.HOME || "/root"}/.aws/config`;
}

function credentialsFilePath(): string {
    return process.env.AWS_SHARED_CREDENTIALS_FILE || `${process.env.HOME || "/root"}/.aws/credentials`;
}

function readIniFile(path: string): Record<string, Record<string, string>> {
    if (!existsSync(path)) return {};
    try {
        return parseIni(readFileSync(path, "utf-8"));
    } catch {
        return {};
    }
}

// Every profile name a human could pass to `aws --profile`, from either file.
function listProfileNames(): string[] {
    const configSections = readIniFile(configFilePath());
    const credentialsSections = readIniFile(credentialsFilePath());

    const names = new Set<string>();
    for (const section of Object.keys(configSections)) {
        // ~/.aws/config also has non-profile sections like [sso-session foo]
        // or [services foo] — only "default" and "profile X" are real profiles.
        if (section !== "default" && !section.startsWith("profile ")) continue;
        names.add(configSectionToProfileName(section));
    }
    for (const section of Object.keys(credentialsSections)) {
        names.add(section);
    }
    names.delete("default");

    return Array.from(names);
}

function getProfileRegion(profile: string): string {
    const configSections = readIniFile(configFilePath());
    const section = configSections[`profile ${profile}`] || configSections[profile];
    return section?.region || DEFAULT_REGION;
}

// Parses the role name out of an assumed-role/role/user ARN, e.g.
// "arn:aws:sts::445822975327:assumed-role/ReadOnly/jdoe" -> "ReadOnly". AWS
// SSO permission sets show up as "AWSReservedSSO_<PermissionSet>_<hash>" —
// unwrap that to just the permission set name (e.g. "Developer"), which is
// what the rest of this app treats as the "role" (see updateAwsCreds.sh).
function extractRoleName(arn: string): string | undefined {
    const assumedRoleMatch = arn.match(/:assumed-role\/([^/]+)\//);
    const roleMatch = arn.match(/:role\/([^/]+)$/);
    const userMatch = arn.match(/:user\/([^/]+)$/);
    const rawRole = assumedRoleMatch?.[1] || roleMatch?.[1] || userMatch?.[1];
    if (!rawRole) return undefined;

    const ssoMatch = rawRole.match(/^AWSReservedSSO_(.+)_[0-9a-f]{16}$/i);
    return ssoMatch ? ssoMatch[1] : rawRole;
}

function classifyFailure(stderr: string): { status: "expired" | "error"; message: string } {
    const message = stderr.trim().split("\n")[0] || "aws sts get-caller-identity failed";
    if (/expiredtoken|token has expired|sso session.*expired|error loading sso token/i.test(stderr)) {
        return { status: "expired", message };
    }
    return { status: "error", message };
}

function getCallerIdentity(profile: string): ProfileDiscoveryResult {
    const result = spawnSync(
        "aws",
        ["sts", "get-caller-identity", "--profile", profile, "--output", "json", "--cli-connect-timeout", "5", "--cli-read-timeout", "5"],
        {
            timeout: GET_CALLER_IDENTITY_TIMEOUT_MS,
            encoding: "utf-8",
            env: { ...process.env, AWS_PAGER: "" },
        }
    );

    if (result.error) {
        return { profile, status: "error", message: result.error.message };
    }

    if (result.status !== 0) {
        const { status, message } = classifyFailure(result.stderr || "");
        return { profile, status, message };
    }

    try {
        const parsed = JSON.parse(result.stdout) as { Account?: string; Arn?: string };
        if (!parsed.Account || !parsed.Arn) {
            return { profile, status: "error", message: "Unexpected aws sts get-caller-identity output" };
        }

        return {
            profile,
            status: "ok",
            accountId: parsed.Account,
            arn: parsed.Arn,
            role: extractRoleName(parsed.Arn),
            region: getProfileRegion(profile),
        };
    } catch {
        return { profile, status: "error", message: "Could not parse aws sts get-caller-identity output" };
    }
}

// Prefer a friendly alias (e.g. "prod_access") over a raw SSO-generated name
// (e.g. "445822975327_ReadOnly") when multiple profiles resolve to the same
// account, since aliases are what the rest of this app's settings expect.
function rankProfile(profile: ProfileDiscoveryResult): number {
    return /^\d+_/.test(profile.profile) ? 1 : 0;
}

export function discoverAwsProfileMappings(): AwsProfileDiscoveryResponse {
    const profileNames = listProfileNames();
    const profiles = profileNames.map(getCallerIdentity).sort((a, b) => a.profile.localeCompare(b.profile));

    const byAccountId = new Map<string, ProfileDiscoveryResult[]>();
    for (const profile of profiles) {
        if (profile.status !== "ok" || !profile.accountId) continue;
        const list = byAccountId.get(profile.accountId) || [];
        list.push(profile);
        byAccountId.set(profile.accountId, list);
    }

    const suggestions: MappingSuggestion[] = [];
    const unmatchedAccountIds: string[] = [];

    for (const { key, accountId } of AWS_MAPPING_KEY_DEFINITIONS) {
        const matches = byAccountId.get(accountId);
        if (!matches || matches.length === 0) {
            unmatchedAccountIds.push(accountId);
            continue;
        }

        const ranked = [...matches].sort((a, b) => rankProfile(a) - rankProfile(b));
        suggestions.push({
            settingKey: key,
            accountId,
            candidates: ranked.map((match) => ({
                credentialProfile: match.profile,
                configProfile: match.profile,
                role: match.role,
                region: match.region || DEFAULT_REGION,
            })),
        });
    }

    return {
        scannedAt: new Date().toISOString(),
        profiles,
        suggestions,
        unmatchedAccountIds,
    };
}
