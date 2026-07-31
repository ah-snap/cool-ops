import { useState } from "react";
import { fetchAwsProfileDiscovery, type AwsProfileDiscoveryResponse } from "../../../actions/portForwardActions";
import type { AwsProfileMapping } from "../../../types.t";
import styles from "./settings.module.css";

export type AwsMappingRow = {
    dbKey: string;
    label: string;
    value: AwsProfileMapping;
    onChange: (value: AwsProfileMapping) => void;
};

export default function AwsProfileDiscoveryPanel({ mappings }: { mappings: AwsMappingRow[] }) {
    const [result, setResult] = useState<AwsProfileDiscoveryResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleDiscover() {
        setLoading(true);
        setError(null);
        try {
            setResult(await fetchAwsProfileDiscovery());
        } catch (err) {
            setError(err instanceof Error ? err.message : "Discovery failed.");
        } finally {
            setLoading(false);
        }
    }

    function applyCandidate(
        mapping: AwsMappingRow,
        candidate: AwsProfileDiscoveryResponse["suggestions"][number]["candidates"][number],
        accountId: string
    ) {
        mapping.onChange({
            credentialProfile: candidate.credentialProfile,
            configProfile: candidate.configProfile,
            role: candidate.role || "",
            accountId,
            region: candidate.region,
        });
    }

    const expiredProfiles = result?.profiles.filter((p) => p.status === "expired") ?? [];

    return (
        <div className={styles.discoveryPanel}>
            <button type="button" className={styles.toolbarButton} onClick={handleDiscover} disabled={loading}>
                {loading ? "Scanning ~/.aws\u2026" : "Discover AWS Profiles"}
            </button>

            {error && <div className={styles.exportError}>{error}</div>}

            {result && (
                <div className={styles.discoveryResults}>
                    {expiredProfiles.length > 0 && (
                        <div className={styles.discoveryWarning}>
                            {expiredProfiles.length} profile(s) have expired SSO credentials ({expiredProfiles.map((p) => p.profile).join(", ")}) —
                            update your credentials fil, then discover again.
                        </div>
                    )}

                    {result.suggestions.length === 0 && <div>No matching AWS profiles found for any known account.</div>}

                    {result.suggestions.map((suggestion) => {
                        const mapping = mappings.find((m) => m.dbKey === suggestion.settingKey);
                        if (!mapping) return null;

                        return (
                            <div key={suggestion.settingKey} className={styles.discoverySuggestion}>
                                <strong>{mapping.label}</strong> (account {suggestion.accountId})
                                {suggestion.candidates.map((candidate) => (
                                    <div key={candidate.credentialProfile} className={styles.discoveryCandidate}>
                                        <span>
                                            {candidate.credentialProfile} {candidate.role ? `(${candidate.role})` : ""}
                                        </span>
                                        <button
                                            type="button"
                                            className={styles.toolbarButton}
                                            onClick={() => applyCandidate(mapping, candidate, suggestion.accountId)}
                                        >
                                            Apply
                                        </button>
                                    </div>
                                ))}
                            </div>
                        );
                    })}

                    {result.unmatchedAccountIds.length > 0 && (
                        <div>No profile found for account(s): {result.unmatchedAccountIds.join(", ")}</div>
                    )}
                </div>
            )}
        </div>
    );
}
