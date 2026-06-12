/**
 * Persistent client-side state for the "test user" / impersonation feature.
 *
 * Two pieces of state live in localStorage:
 *
 *   1. `testUserId` — the Security_16 User.Id of the operator's personal
 *      test account. Persists across activations so the operator doesn't
 *      have to re-enter it every time.
 *
 *   2. `activation` — non-null only while a test user is currently moved
 *      onto a customer account. Holds enough state to deactivate without
 *      needing to re-query.
 *
 * Because the `storage` browser event only fires across *other* tabs, we
 * also dispatch a custom `cool-ops:test-user-changed` event on `window`
 * so subscribers in the same tab (e.g. nav bar + modal + cell) all
 * re-render when state changes.
 */

const TEST_USER_ID_KEY = "cool-ops.testUserId";
const ACTIVATION_KEY = "cool-ops.testUserActivation";
const CHANGE_EVENT = "cool-ops:test-user-changed";

export type TestUserActivation = {
    testUserId: number;
    targetAccountId: number;
    targetAccountName: string | null;
    previousAccountId: number;
    previousOwnerUserId: number | null;
    activatedAt: string;
};

// Cached snapshots. `useSyncExternalStore` requires `getSnapshot` to return
// the *same reference* until the underlying state actually changes;
// otherwise React rerenders on every tick (infinite loop). We invalidate
// these caches whenever `emitChange` fires or a cross-tab `storage` event
// touches our keys.
let cachedTestUserId: number | null = null;
let cachedActivation: TestUserActivation | null = null;
let cachesPrimed = false;

function readTestUserIdFromStorage(): number | null {
    try {
        const raw = window.localStorage.getItem(TEST_USER_ID_KEY);
        if (!raw) return null;
        const n = Number(raw);
        return Number.isInteger(n) && n > 0 ? n : null;
    } catch {
        return null;
    }
}

function readActivationFromStorage(): TestUserActivation | null {
    try {
        const raw = window.localStorage.getItem(ACTIVATION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as TestUserActivation;
        if (
            !parsed ||
            typeof parsed.testUserId !== "number" ||
            typeof parsed.targetAccountId !== "number" ||
            typeof parsed.previousAccountId !== "number"
        ) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

function primeCachesIfNeeded(): void {
    if (cachesPrimed) return;
    cachedTestUserId = readTestUserIdFromStorage();
    cachedActivation = readActivationFromStorage();
    cachesPrimed = true;
}

function refreshCaches(): void {
    cachedTestUserId = readTestUserIdFromStorage();
    cachedActivation = readActivationFromStorage();
    cachesPrimed = true;
}

export function getStoredTestUserId(): number | null {
    primeCachesIfNeeded();
    return cachedTestUserId;
}

export function getStoredActivation(): TestUserActivation | null {
    primeCachesIfNeeded();
    return cachedActivation;
}

export function setStoredTestUserId(userId: number | null): void {
    try {
        if (userId === null) {
            window.localStorage.removeItem(TEST_USER_ID_KEY);
        } else {
            window.localStorage.setItem(TEST_USER_ID_KEY, String(userId));
        }
    } catch {
        // Storage may be unavailable (private mode, quota); the UI will
        // re-prompt next time so we don't need to surface a hard error.
    }
    refreshCaches();
    emitChange();
}

export function setStoredActivation(activation: TestUserActivation | null): void {
    try {
        if (activation === null) {
            window.localStorage.removeItem(ACTIVATION_KEY);
        } else {
            window.localStorage.setItem(ACTIVATION_KEY, JSON.stringify(activation));
        }
    } catch {
        // See note in setStoredTestUserId.
    }
    refreshCaches();
    emitChange();
}

function emitChange(): void {
    try {
        window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
    } catch {
        // No-op on environments without CustomEvent (tests).
    }
}

/**
 * Subscribe to test-user-state changes from this tab (custom event) and
 * other tabs (`storage` event). Returns an unsubscribe function.
 */
export function subscribeToTestUserState(listener: () => void): () => void {
    const storageListener = (event: StorageEvent) => {
        if (event.key === TEST_USER_ID_KEY || event.key === ACTIVATION_KEY || event.key === null) {
            // Cross-tab change — re-read from storage so our cached
            // snapshots stay in sync before notifying React.
            refreshCaches();
            listener();
        }
    };
    window.addEventListener(CHANGE_EVENT, listener);
    window.addEventListener("storage", storageListener);
    return () => {
        window.removeEventListener(CHANGE_EVENT, listener);
        window.removeEventListener("storage", storageListener);
    };
}
