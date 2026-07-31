import { useRef, useState } from "react";
import { exportSettings, updateSetting } from "../../../actions/settingsActions";
import { invalidateSettingsCache } from "../../../hooks/useServerStoredSettings";
import styles from "./settings.module.css";

export type ExportSection = {
    id: string;
    title: string;
    keys: string[];
};

export default function ExportImportBar({ sections }: { sections: ExportSection[] }) {
    const [exportOpen, setExportOpen] = useState(false);
    const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(
        () => new Set(sections.map((s) => s.id))
    );
    const [secret, setSecret] = useState("");
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    function toggleSection(id: string) {
        setSelectedSectionIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }

    async function handleExport() {
        setError(null);

        const keys = sections
            .filter((s) => selectedSectionIds.has(s.id))
            .flatMap((s) => s.keys);

        if (keys.length === 0) {
            setError("Select at least one section to export.");
            return;
        }

        if (!secret) {
            setError("Enter the export secret.");
            return;
        }

        setExporting(true);
        try {
            const exported = await exportSettings(secret, keys);
            const payload = Object.fromEntries(exported.map((e) => [e.key, e.value]));
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `settings-export-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            setSecret("");
            setExportOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Export failed.");
        } finally {
            setExporting(false);
        }
    }

    function handleImportClick() {
        fileInputRef.current?.click();
    }

    async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        if (!window.confirm(`Import settings from "${file.name}"? This will overwrite existing values for any matching keys.`)) {
            return;
        }

        setError(null);
        setImporting(true);
        try {
            const text = await file.text();
            const parsed = JSON.parse(text);
            if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
                throw new Error("Import file must be a JSON object of setting key/value pairs.");
            }

            const knownKeys = new Set(sections.flatMap((s) => s.keys));
            const entries = Object.entries(parsed).filter(([key]) => knownKeys.has(key));
            if (entries.length === 0) {
                throw new Error("No matching settings keys found in the selected file.");
            }

            await Promise.all(entries.map(([key, value]) => updateSetting(key, value)));
            await invalidateSettingsCache();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Import failed.");
        } finally {
            setImporting(false);
        }
    }

    return (
        <div>
            <div className={styles.toolbar}>
                {/* Room for more buttons here in the future */}
                <button type="button" className={styles.toolbarButton} onClick={handleImportClick} disabled={importing}>
                    {importing ? "Importing…" : "Import"}
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json"
                    className={styles.visuallyHidden}
                    onChange={handleFileSelected}
                />
                <button type="button" className={styles.toolbarButton} onClick={() => setExportOpen((v) => !v)}>
                    Export
                </button>
            </div>

            {exportOpen && (
                <div className={styles.exportPanel}>
                    <div className={styles.exportPanelSections}>
                        {sections.map((s) => (
                            <label key={s.id}>
                                <input
                                    type="checkbox"
                                    checked={selectedSectionIds.has(s.id)}
                                    onChange={() => toggleSection(s.id)}
                                />
                                {s.title}
                            </label>
                        ))}
                    </div>

                    <div className={styles.exportPanelActions}>
                        <input
                            type="password"
                            placeholder="Export secret"
                            value={secret}
                            onChange={(e) => setSecret(e.target.value)}
                        />
                        <button type="button" className={styles.toolbarButton} onClick={handleExport} disabled={exporting}>
                            {exporting ? "Exporting…" : "Download Export"}
                        </button>
                    </div>

                    {error && <div className={styles.exportError}>{error}</div>}
                </div>
            )}

            {!exportOpen && error && <div className={styles.exportError}>{error}</div>}
        </div>
    );
}
