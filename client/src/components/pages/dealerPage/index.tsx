import React, { useEffect, useRef, useState } from "react";
import { DealerInfo } from "../../../types.t";
import * as dealerActions from "../../../actions/dealerActions.ts";
import { isServerError } from "../../../actions/apiClient.ts";
import PageShell from "../../common/layout/PageShell.tsx";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { Link, useNavigate, useParams } from "react-router-dom";

export const DealerPage: React.FC = () => {
    const { dCode: routeDCode } = useParams<{ dCode?: string }>();
    const navigate = useNavigate();
    const [dCode, setDCode] = useState<string>(routeDCode ?? "");
    const [enableButton, setEnableButton] = useState<boolean>(Boolean(routeDCode));
    const [dealer, setDealer] = useState<DealerInfo | null>(null);
    const [freeConnectLicenses, setFreeConnectLicenses] = useState<string>("");
    const [saving, setSaving] = useState<boolean>(false);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const handleDCodeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setDCode(value);
        setEnableButton(value.length > 0);
    };

    const runLookup = async (value: string) => {
        setDealer(null);
        setFreeConnectLicenses("");
        setEnableButton(false);
        const result = await dealerActions.getDealerByDCode(value);
        setEnableButton(true);
        if (isServerError(result)) {
            alert(result.error);
            return;
        }
        setDealer(result);
        setFreeConnectLicenses(String(result.freeConnectLicenses ?? ""));
    };

    const lookup = async () => {
        const trimmed = dCode.trim();
        if (!trimmed) return;
        if (trimmed !== dCode) {
            setDCode(trimmed);
        }
        const encoded = encodeURIComponent(trimmed);
        if (routeDCode !== trimmed) {
            navigate(`/dealer/${encoded}`, { replace: false });
        }
        await runLookup(trimmed);
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        lookup();
    };

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        const trimmed = routeDCode?.trim();
        if (trimmed) {
            setDCode(trimmed);
            runLookup(trimmed);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [routeDCode]);

    const saveFreeConnectLicenses = async () => {
        if (!dealer) return;
        const parsed = Number(freeConnectLicenses);
        if (isNaN(parsed)) {
            alert("freeConnectLicenses must be a number");
            return;
        }
        setSaving(true);
        const result = await dealerActions.updateFreeConnectLicenses(dealer.accountNum, parsed);
        setSaving(false);
        if (isServerError(result)) {
            alert(result.error);
            return;
        }
        setDealer(result);
        setFreeConnectLicenses(String(result.freeConnectLicenses ?? ""));
    };

    const columns: GridColDef[] = [
        { field: "label", headerName: "Label", width: 220 },
        { field: "value", headerName: "Value", width: 520, flex: 1 },
    ];

    const rows = dealer
        ? Object.entries(dealer).map(([key, value], index) => ({
              id: index + 1,
              label: key,
              value: typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? ""),
          }))
        : [];

    return (
        <PageShell>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, minWidth: 600 }}>
                <h1 style={{ margin: 0 }}>Dealer Info</h1>
                <Link
                    to="/showroomDemoLicenses"
                    style={{
                        padding: "8px 12px",
                        borderRadius: 4,
                        border: "1px solid #666",
                        backgroundColor: "#2f2f2f",
                        color: "#fff",
                        textDecoration: "none",
                        fontWeight: 600,
                    }}
                >
                    Bulk Showroom Demo Licenses
                </Link>
            </div>
            <label>
                DCode:
                <form onSubmit={handleSubmit} style={{ display: "inline" }}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={dCode}
                        onChange={handleDCodeChange}
                        style={{ marginLeft: 8, marginRight: 8, width: 180 }}
                    />
                    <button type="submit" disabled={!enableButton}>Look Up</button>
                </form>
            </label>

            {dealer && (
                <div style={{ marginTop: 20 }}>
                    <div style={{ height: "auto", width: "70%", minWidth: 600 }}>
                        <ThemeProvider theme={createTheme({ palette: { mode: "dark" } })}>
                            <DataGrid
                                rows={rows}
                                columns={columns}
                                getRowHeight={() => "auto"}
                                hideFooter
                                sx={{
                                    ".MuiDataGrid-cell": {
                                        whiteSpace: "normal",
                                        lineHeight: "normal",
                                    },
                                }}
                            />
                        </ThemeProvider>
                    </div>

                    <div style={{ marginTop: 16 }}>
                        <label>
                            <strong>freeConnectLicenses:</strong>
                            <input
                                type="number"
                                value={freeConnectLicenses}
                                onChange={(e) => setFreeConnectLicenses(e.target.value)}
                                style={{ marginLeft: 8, marginRight: 8, width: 100 }}
                            />
                            <button onClick={saveFreeConnectLicenses} disabled={saving}>
                                {saving ? "Saving..." : "Save"}
                            </button>
                        </label>
                    </div>
                </div>
            )}
        </PageShell>
    );
};

export default DealerPage;
