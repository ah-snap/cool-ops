import { useState, useSyncExternalStore } from "react";
import TestUserModal from "../../testUser/TestUserModal.tsx";
import { getStoredActivation, subscribeToTestUserState } from "../../testUser/testUserState.ts";

/**
 * Persistent nav-bar reminder that a test user is currently impersonating
 * on a customer account. Clicking the glyph opens the modal pre-pointed
 * at the active impersonation, so the operator can deactivate quickly.
 */
export default function TestUserActiveIndicator() {
    const activation = useSyncExternalStore(
        subscribeToTestUserState,
        getStoredActivation,
        () => null,
    );
    const [open, setOpen] = useState(false);

    if (!activation) return null;

    const label = activation.targetAccountName ?? `account ${activation.targetAccountId}`;
    const title = `Test user ${activation.testUserId} is impersonating on ${label} — click to deactivate`;

    return (
        <li
            style={{
                listStyle: "none",
                border: "1px solid #f7c948",
                background: "rgba(247, 201, 72, 0.15)",
                color: "#f7c948",
                margin: "0.75em",
                padding: "0.5em",
                borderRadius: 10,
                textAlign: "center",
            }}
        >
            <button
                type="button"
                onClick={() => setOpen(true)}
                title={title}
                aria-label={title}
                style={{
                    background: "none",
                    border: "none",
                    color: "inherit",
                    cursor: "pointer",
                    font: "inherit",
                    padding: 0,
                    width: "100%",
                }}
            >
                ⚠ Test User: {label}
            </button>
            <TestUserModal open={open} onClose={() => setOpen(false)} />
        </li>
    );
}
