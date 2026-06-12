import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import {
    activateTestUser,
    deactivateTestUser,
    fetchAccountOwner,
    fetchTestUser,
    type TestUserInfo,
} from "../../actions/testUserActions.ts";
import { isServerError } from "../../actions/apiClient.ts";
import {
    getStoredActivation,
    getStoredTestUserId,
    setStoredActivation,
    setStoredTestUserId,
    subscribeToTestUserState,
    type TestUserActivation,
} from "./testUserState.ts";

const darkTheme = createTheme({ palette: { mode: "dark" } });

const userColumns: GridColDef[] = [
    { field: "role", headerName: "Role", width: 130 },
    { field: "accountId", headerName: "Account ID", width: 110 },
    { field: "accountName", headerName: "Account Name", width: 200 },
    { field: "userId", headerName: "User ID", width: 90 },
    { field: "email", headerName: "Email", width: 230 },
    { field: "firstName", headerName: "First Name", width: 130 },
    { field: "lastName", headerName: "Last Name", width: 130 },
    { field: "isOwner", headerName: "Is Owner", width: 100, valueFormatter: ( value ) => value ? "Yes" : "No" },
];

type UserRowKind = "owner" | "testUser";

type DisplayRow = {
    id: string;
    role: string;
    accountId: number | null;
    accountName: string | null;
    userId: number | null;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    isOwner: boolean;
};

function toDisplayRow(kind: UserRowKind, info: TestUserInfo | null, fallbackLabel: string): DisplayRow {
    return {
        id: kind,
        role: fallbackLabel,
        accountId: info?.accountId ?? null,
        accountName: info?.accountName ?? null,
        userId: info?.userId ?? null,
        email: info?.email ?? null,
        firstName: info?.firstName ?? null,
        lastName: info?.lastName ?? null,
        isOwner: info?.isOwner ?? false,
    };
}

export type TestUserModalProps = {
    open: boolean;
    onClose: () => void;
    /**
     * Account that "activate" should target. When the modal is opened from a
     * MappingDisplay cell this is the C4 account being inspected. When it's
     * opened from the nav-bar warning glyph during an active impersonation
     * the stored activation overrides this.
     */
    defaultTargetAccountId?: number | null;
    defaultTargetAccountName?: string | null;
};

/**
 * useSyncExternalStore subscribes to our custom + storage events so the
 * modal stays in sync if state changes (e.g. activation finishes).
 */
function useStoredTestUserId(): number | null {
    return useSyncExternalStore(subscribeToTestUserState, getStoredTestUserId, () => null);
}
function useStoredActivation(): TestUserActivation | null {
    return useSyncExternalStore(subscribeToTestUserState, getStoredActivation, () => null);
}

export default function TestUserModal({
    open,
    onClose,
    defaultTargetAccountId,
    defaultTargetAccountName,
}: TestUserModalProps) {
    const storedTestUserId = useStoredTestUserId();
    const activation = useStoredActivation();

    // When activated, always use stored target so deactivation can't be
    // misdirected (e.g. user navigated to a different mapping).
    const targetAccountId = activation?.targetAccountId ?? defaultTargetAccountId ?? null;
    const targetAccountName = activation?.targetAccountName ?? defaultTargetAccountName ?? null;

    const isActivated = activation !== null;

    const [configuring, setConfiguring] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [lookupBusy, setLookupBusy] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [testUser, setTestUser] = useState<TestUserInfo | null>(null);
    const [owner, setOwner] = useState<TestUserInfo | null>(null);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Reset transient state every time the modal is opened so a previous
    // session's error doesn't carry over.
    useEffect(() => {
        if (!open) return;
        setError(null);
        setInputValue("");
        setConfiguring(storedTestUserId === null);
    }, [open, storedTestUserId]);

    const loadUsers = useCallback(async () => {
        if (!open) return;
        if (storedTestUserId === null) {
            setTestUser(null);
            setOwner(null);
            return;
        }
        setLoadingUsers(true);
        setError(null);
        try {
            // While activated we want to keep showing the user we demoted
            // (so the operator can see their isOwner=false), even though
            // they no longer match `WHERE IsOwner = 1`. Fetch them by ID
            // instead of by account. Otherwise look up whoever currently
            // owns the target account.
            const ownerPromise = activation?.previousOwnerUserId !== undefined && activation?.previousOwnerUserId !== null
                ? fetchTestUser(activation.previousOwnerUserId)
                : targetAccountId !== null
                    ? fetchAccountOwner(targetAccountId)
                    : Promise.resolve(null);

            const [testUserResult, ownerResult] = await Promise.all([
                fetchTestUser(storedTestUserId),
                ownerPromise,
            ]);

            if (isServerError(testUserResult)) {
                setError(`Test user ${storedTestUserId}: ${testUserResult.error}`);
                setTestUser(null);
            } else if (testUserResult) {
                setTestUser(testUserResult);
            }

            if (ownerResult && isServerError(ownerResult)) {
                // Missing owner isn't necessarily fatal — show it inline
                // rather than blocking the modal.
                setOwner(null);
            } else if (ownerResult) {
                setOwner(ownerResult);
            } else {
                setOwner(null);
            }
        } finally {
            setLoadingUsers(false);
        }
    }, [open, storedTestUserId, targetAccountId, activation?.previousOwnerUserId]);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    const handleSaveTestUserId = async () => {
        const trimmed = inputValue.trim();
        const parsed = Number(trimmed);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            setError(`"${trimmed}" is not a valid user ID`);
            return;
        }
        setLookupBusy(true);
        setError(null);
        try {
            const result = await fetchTestUser(parsed);
            if (isServerError(result)) {
                setError(result.error);
                return;
            }
            setStoredTestUserId(parsed);
            setTestUser(result);
            setConfiguring(false);
        } finally {
            setLookupBusy(false);
        }
    };

    const handleActivate = async () => {
        if (storedTestUserId === null || targetAccountId === null) return;
        setBusy(true);
        setError(null);
        try {
            const result = await activateTestUser({
                testUserId: storedTestUserId,
                targetAccountId,
            });
            if (isServerError(result)) {
                setError(result.error);
                return;
            }
            setStoredActivation({
                testUserId: storedTestUserId,
                targetAccountId,
                targetAccountName: targetAccountName,
                previousAccountId: result.previousAccountId,
                previousOwnerUserId: result.previousOwnerUserId,
                activatedAt: new Date().toISOString(),
            });
            // Refresh — the test user now belongs to the target account.
            await loadUsers();
        } finally {
            setBusy(false);
        }
    };

    const handleDeactivate = async () => {
        if (!activation) return;
        setBusy(true);
        setError(null);
        try {
            const result = await deactivateTestUser({
                testUserId: activation.testUserId,
                previousAccountId: activation.previousAccountId,
                previousOwnerUserId: activation.previousOwnerUserId,
            });
            if (isServerError(result)) {
                setError(result.error);
                return;
            }
            setStoredActivation(null);
            await loadUsers();
        } finally {
            setBusy(false);
        }
    };

    const rows = useMemo<DisplayRow[]>(() => {
        const result: DisplayRow[] = [];
        result.push(toDisplayRow("owner", owner, isActivated ? "Demoted Owner" : "Account Owner"));
        result.push(toDisplayRow("testUser", testUser, "Test User"));
        return result;
    }, [owner, testUser, isActivated]);

    const canActivate = !isActivated && storedTestUserId !== null && targetAccountId !== null && !configuring;
    const canDeactivate = isActivated && !configuring;

    return (
        <ThemeProvider theme={darkTheme}>
            <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
                <DialogTitle>
                    {isActivated ? "Test User Active (impersonating)" : "Test User"}
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2}>
                        {targetAccountId !== null && (
                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                {isActivated ? "Currently impersonating on:" : "Will activate on:"}{" "}
                                <strong>{targetAccountName ?? "(unnamed)"}</strong> (account ID {targetAccountId})
                            </Typography>
                        )}

                        {error && <Alert severity="error">{error}</Alert>}

                        {/* Configure / re-configure test user ID */}
                        {(configuring || storedTestUserId === null) ? (
                            <Stack direction="row" spacing={1} alignItems="center">
                                <TextField
                                    label="Test User ID"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    size="small"
                                    autoFocus
                                    disabled={lookupBusy}
                                />
                                <Button
                                    variant="contained"
                                    onClick={handleSaveTestUserId}
                                    disabled={lookupBusy || inputValue.trim() === ""}
                                >
                                    {lookupBusy ? "Validating..." : "Save"}
                                </Button>
                                {storedTestUserId !== null && (
                                    <Button onClick={() => setConfiguring(false)} disabled={lookupBusy}>
                                        Cancel
                                    </Button>
                                )}
                            </Stack>
                        ) : (
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="body2">
                                    Stored test user ID: <strong>{storedTestUserId}</strong>
                                </Typography>
                                <Tooltip title="Configure test user ID">
                                    <span>
                                        <IconButton
                                            size="small"
                                            onClick={() => {
                                                setInputValue(String(storedTestUserId));
                                                setConfiguring(true);
                                            }}
                                            disabled={busy || isActivated}
                                            aria-label="Configure test user ID"
                                        >
                                            ⚙
                                        </IconButton>
                                    </span>
                                </Tooltip>
                                {isActivated && (
                                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                        (deactivate before reconfiguring)
                                    </Typography>
                                )}
                            </Stack>
                        )}

                        <Box sx={{ height: 200, width: "100%" }}>
                            <DataGrid
                                rows={rows}
                                columns={userColumns}
                                hideFooter
                                disableRowSelectionOnClick
                                localeText={{ noRowsLabel: loadingUsers ? "Loading..." : "No user info" }}
                            />
                            {loadingUsers && (
                                <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
                                    <CircularProgress size={20} />
                                </Box>
                            )}
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} disabled={busy}>Close</Button>
                    {canActivate && (
                        <Button
                            variant="contained"
                            color="success"
                            onClick={handleActivate}
                            disabled={busy}
                        >
                            {busy ? "Activating..." : "Activate Test User"}
                        </Button>
                    )}
                    {canDeactivate && (
                        <Button
                            variant="contained"
                            color="warning"
                            onClick={handleDeactivate}
                            disabled={busy}
                        >
                            {busy ? "Deactivating..." : "Deactivate Test User"}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </ThemeProvider>
    );
}
