import React from "react";
import { fetchSettings, updateSetting, type SettingResponse } from "../actions/settingsActions.ts";

// Module-level cache shared by every hook instance, so we only hit
// GET /settings once no matter how many fields the Settings page renders.
let settingsCache: Map<string, SettingResponse> | null = null;
let settingsFetchPromise: Promise<Map<string, SettingResponse>> | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
    listeners.forEach((listener) => listener());
}

async function loadSettings(): Promise<Map<string, SettingResponse>> {
    const rows = await fetchSettings();
    const map = new Map<string, SettingResponse>();
    for (const row of rows) {
        map.set(row.key, row);
    }
    return map;
}

function ensureSettingsLoaded(): Promise<Map<string, SettingResponse>> {
    if (settingsCache) {
        return Promise.resolve(settingsCache);
    }

    if (!settingsFetchPromise) {
        settingsFetchPromise = loadSettings()
            .then((map) => {
                settingsCache = map;
                notifyListeners();
                return map;
            })
            .catch((error) => {
                settingsFetchPromise = null;
                throw error;
            });
    }

    return settingsFetchPromise;
}

// Drops the shared cache and re-fetches from the server, notifying every
// mounted useServerStoredSettings instance. Use this after bulk writes (e.g.
// an import) that happen outside any single hook instance's setValue call.
export async function invalidateSettingsCache(): Promise<void> {
    settingsCache = null;
    settingsFetchPromise = null;
    await ensureSettingsLoaded();
}

const MASK_ASTERISK_THRESHOLD = 2;

// Values that come back censored (e.g. "****ab12") shouldn't be re-saved
// as-is — that would happen if a field is re-rendered/edited without the
// user actually changing it (or a stray keystroke on a masked input), and
// would permanently overwrite the real secret with the mask.
export function looksMasked(value: unknown): boolean {
    if (typeof value !== "string") return false;
    const asteriskCount = (value.match(/\*/g) || []).length;
    return asteriskCount > MASK_ASTERISK_THRESHOLD;
}

export default function useServerStoredSettings<T>(key: string, defaultValue: T) {
    const [storedValue, setStoredValue] = React.useState<T>(defaultValue);

    React.useEffect(() => {
        let cancelled = false;

        function applyFromCache() {
            const entry = settingsCache?.get(key);
            if (!cancelled && entry !== undefined) {
                setStoredValue(entry.value as T);
            }
        }

        ensureSettingsLoaded()
            .then(() => {
                if (!cancelled) applyFromCache();
            })
            .catch((error) => {
                console.error(`Failed to load setting "${key}"`, error);
            });

        listeners.add(applyFromCache);
        return () => {
            cancelled = true;
            listeners.delete(applyFromCache);
        };
    }, [key]);

    const setValue = React.useCallback(
        (value: T | ((val: T) => T)) => {
            const valueToStore = value instanceof Function ? value(storedValue) : value;

            // Don't fire an update if we'd just be writing the censored
            // placeholder back over the real secret.
            if (looksMasked(valueToStore)) {
                return;
            }

            setStoredValue(valueToStore);

            updateSetting(key, valueToStore)
                .then((updated) => {
                    settingsCache?.set(key, updated);
                    notifyListeners();
                })
                .catch((error) => {
                    console.error(`Failed to save setting "${key}"`, error);
                });
        },
        [key, storedValue]
    );

    return [storedValue, setValue] as const;
}
