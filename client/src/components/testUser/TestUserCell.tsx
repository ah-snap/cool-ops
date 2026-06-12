import { useState, useSyncExternalStore } from "react";
import TestUserModal from "./TestUserModal.tsx";
import { getStoredActivation, subscribeToTestUserState } from "./testUserState.ts";

export type TestUserCellProps = {
    targetAccountId: number | null;
    targetAccountName: string | null;
};

/**
 * Renders the "Test User" DataGrid cell. The cell shows the current
 * activation status (across the whole app, not just this row) and opens
 * the activation/deactivation modal on click.
 *
 * Only meaningful when `targetAccountId` is non-null — on rows that don't
 * represent a C4 account (e.g. the OvrC row) we render a hint instead.
 */
export default function TestUserCell({ targetAccountId, targetAccountName }: TestUserCellProps) {
    const activation = useSyncExternalStore(
        subscribeToTestUserState,
        getStoredActivation,
        () => null,
    );
    const [modalOpen, setModalOpen] = useState(false);

    if (targetAccountId === null) {
        return <span style={{ opacity: 0.5 }}>—</span>;
    }

    const isActive = activation !== null;
    const label = isActive
        ? "✅ Test User Active"
        : "❌ Test User Inactive (click to activate)";

    return (
        <>
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    setModalOpen(true);
                }}
                style={{ cursor: "pointer", whiteSpace: "nowrap" }}
                title={isActive
                    ? `Currently impersonating on account ${activation?.targetAccountName ?? activation?.targetAccountId}`
                    : "Click to open test user controls"}
            >
                {label}
            </div>
            <TestUserModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                defaultTargetAccountId={targetAccountId}
                defaultTargetAccountName={targetAccountName}
            />
        </>
    );
}
