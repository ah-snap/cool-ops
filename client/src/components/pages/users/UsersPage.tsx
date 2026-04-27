import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import PageShell from "../../common/layout/PageShell.tsx";
import { isServerError } from "../../../actions/apiClient.ts";
import { lookupUsers } from "../../../actions/userActions.ts";
import type { UserRow } from "../../../types.t";
import "./users.css";

type GridRow = UserRow & { id: string };

const COLUMNS: GridColDef<GridRow>[] = [
    { field: "control4_email", headerName: "control4_email", minWidth: 220, flex: 1 },
    { field: "user_id", headerName: "user_id", width: 110 },
    { field: "splitKey", headerName: "splitKey", minWidth: 160, flex: 1 },
    {
        field: "certificateCommonName",
        headerName: "CertificateCommonName",
        minWidth: 220,
        flex: 1,
        renderCell: (params) => {
            const value = params.value as string | null;
            if (!value) return null;
            return <Link to={`/licenses/${encodeURIComponent(value)}`}>{value}</Link>;
        }
    },
    {
        field: "d_code",
        headerName: "d_code",
        width: 110,
        renderCell: (params) => {
            const value = params.value as string | null;
            if (!value) return null;
            return <Link to={`/dealer/${encodeURIComponent(value)}`}>{value}</Link>;
        }
    },
    { field: "ovrc_email", headerName: "ovrc_email", minWidth: 220, flex: 1 },
    { field: "isTestPassword", headerName: "Test Password", width: 130, type: "boolean" },
];

function rowId(row: UserRow, index: number): string {
    return `${row.user_id ?? "no-user"}-${row.d_code ?? "no-dcode"}-${row.ovrc_email ?? "no-ovrc"}-${index}`;
}

const darkTheme = createTheme({ palette: { mode: "dark" } });

export default function UsersPage() {
    const { emailOrMac: routeEmailOrMac } = useParams<{ emailOrMac?: string }>();
    const navigate = useNavigate();

    const [emailOrMac, setEmailOrMac] = useState<string>(routeEmailOrMac ?? "");
    const [rows, setRows] = useState<UserRow[] | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const runLookup = async (value: string) => {
        setLoading(true);
        setError(null);
        setRows(null);

        const result = await lookupUsers(value);
        if (isServerError(result)) {
            setError(result.error);
            setRows([]);
        } else {
            setRows(result);
        }
        setLoading(false);
    };

    const attempt = async () => {
        const trimmed = emailOrMac.trim();
        if (!trimmed) return;
        if (trimmed !== emailOrMac) {
            setEmailOrMac(trimmed);
        }
        const encoded = encodeURIComponent(trimmed);
        if (routeEmailOrMac !== trimmed) {
            navigate(`/users/${encoded}`, { replace: false });
        }
        await runLookup(trimmed);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        attempt();
    };

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        const trimmed = routeEmailOrMac?.trim();
        if (trimmed) {
            setEmailOrMac(trimmed);
            runLookup(trimmed);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routeEmailOrMac]);

    const gridRows = (rows ?? []).map((row, index) => ({ ...row, id: rowId(row, index) }));

    return (
        <PageShell>
            <h1>Users</h1>
            <form onSubmit={handleSubmit} className="usersForm">
                <label>
                    Email, MAC, or Common Name:
                    <input
                        ref={inputRef}
                        type="text"
                        value={emailOrMac}
                        onChange={(e) => setEmailOrMac(e.target.value)}
                        className="usersInput"
                        placeholder="user@example.com, 00:0F:FF:AA:BB:CC, ..."
                    />
                    <button type="submit" disabled={loading || !emailOrMac.trim()}>
                        {loading ? "Looking up..." : "Look up"}
                    </button>
                    <span className="usersHint">
                        Enter a single value or a comma-separated list. MAC addresses may include colons.
                    </span>
                </label>
            </form>

            {error && (
                <div style={{ color: "#b00020", marginBottom: "1rem" }}>
                    {error}
                </div>
            )}

            <div className="usersGridWrapper">
                <ThemeProvider theme={darkTheme}>
                    <DataGrid
                        rows={gridRows}
                        columns={COLUMNS}
                        autoHeight
                        hideFooter
                        loading={loading}
                        localeText={{ noRowsLabel: rows === null ? "Enter a value and press Look up." : "No results found." }}
                        getRowHeight={() => "auto"}
                        sx={{
                            ".MuiDataGrid-cell": {
                                whiteSpace: "normal",
                                lineHeight: "normal",
                                alignItems: "start",
                                paddingTop: "8px",
                                paddingBottom: "8px",
                            },
                        }}
                    />
                </ThemeProvider>
            </div>
        </PageShell>
    );
}
