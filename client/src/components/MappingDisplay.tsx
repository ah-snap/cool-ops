import { useEffect, useRef, useState } from "react";
import { Mapping } from "../types.t";
import { DataGrid, GridCellParams } from '@mui/x-data-grid';
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { GridColDef } from '@mui/x-data-grid';
import { isServerError, parseApiResponse } from "../actions/apiClient.ts";
import { apiUrl } from "../config.ts";
import { CONNECT_TIER_VALUES, ConnectTier, patchAccount } from "../actions/accountActions.ts";

const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 75 },
    { field: 'Source', headerName: 'Source', width: 75 },
    { field: 'Name', headerName: '  Account Name', width: 230 },
    { field: 'CertificateCommonName', headerName: 'Controller', width: 250 },
    { field: 'ConnectStatus', headerName: 'Connect Status', width: 150 },
    { field: 'ovrc_location_id', headerName: 'Location ID', width: 220 },
    { field: 'dCode', headerName: 'DCode', width: 150 },
    { field: 'dealerName', headerName: 'Dealer Name', width: 200 },
    { field: 'excludeAssist', headerName: 'Exclude Assist', width: 150, renderCell: (params) => <ExcludeAssist mapping={params.row} /> },
    { field: 'is_domestic', headerName: 'Domestic', width: 150, type: 'boolean' },
    { field: 'external_id', headerName: 'External ID', width: 200 },
    { field: 'originalVersion', headerName: 'OS Version', width: 150 },
    { field: 'XBackwardsUser', headerName: 'X-Backwards-User', width: 400 },
    { field: 'stripeCustomerID', headerName: 'Stripe Customer ID', width: 200 },
    {
        field: 'connect_tier',
        headerName: 'Connect Tier',
        width: 220,
        renderCell: (params) => <ConnectTierCell mapping={params.row} />,
    },
    { field: 'auth_token', headerName: 'Auth Token', width: 200 },
    { field: 'isTestPassword', headerName: 'Test Password', width: 150, type: 'boolean' },
    { field: 'splitKey', headerName: 'Split Key', width: 200 }

];

type Row = Mapping & {
    Source: string;
    XBackwardsUser?: string;
    onRefresh?: () => void;
};

function ExcludeAssist({ mapping }: { mapping: Row }) {
    const [editing, setEditing] = useState(false);
    const [newValue, setNewValue] = useState(mapping.excludeAssist);

    if (!editing) {
        return <div className="excludeAssist" onClick={() => setEditing(true)}>
            {mapping.excludeAssist ? "Exclude Assist" : "Include Assist"}
        </div>;
    }

    const submitChange = async () => {
        console.log("Submitting change", newValue);
        const response = await fetch(apiUrl(`/automationAccounts/excludeAssist/${mapping.ovrc_location_id}`), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ excludeAssist: newValue }),
        });

        const parsed = await parseApiResponse<{ acknowledged: boolean; modifiedCount: number }>(response);

        if (!isServerError(parsed)) {
            setEditing(false);
        } else {
            console.error("Failed to update excludeAssist", parsed.error);
        }
    }


    return <div className="excludeAssist">
        <label>Exclude Assist</label>
        <input type="checkbox" checked={newValue} onChange={() => setNewValue(!newValue)} />
        <button onClick={async () => await submitChange()}>Save</button>
        <button onClick={() => setEditing(false)}>Cancel</button>
    </div>;
}

function ConnectTierCell({ mapping }: { mapping: Row }) {
    const currentTier = (mapping.connect_tier ?? "") as string;
    const [editing, setEditing] = useState(false);
    const [newValue, setNewValue] = useState<string>(currentTier);
    const [saving, setSaving] = useState(false);

    // Connect Tier lives on the C4 Account (Consumer row), not the OvrC side.
    const isEditable = mapping.Source === "C4" && Boolean(mapping.Name);

    useEffect(() => {
        if (!editing) {
            setNewValue(currentTier);
        }
    }, [currentTier, editing]);

    if (!isEditable) {
        return <div>{currentTier}</div>;
    }

    if (!editing) {
        return <div
            style={{ cursor: "pointer", minHeight: 20 }}
            title="Click to edit connect tier"
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
        >
            {currentTier || <em style={{ opacity: 0.6 }}>(unset)</em>}
        </div>;
    }

    const submit = async () => {
        setSaving(true);
        // Treat empty string as explicit null so we can clear the column.
        const patchValue = newValue === "" ? null : (newValue as ConnectTier);
        const result = await patchAccount(mapping.Name, { connectTier: patchValue });
        setSaving(false);

        if (result && typeof result === "object" && "error" in result) {
            alert((result as { error: string }).error);
            return;
        }

        setEditing(false);
        mapping.onRefresh?.();
    };

    return <div style={{ display: "flex", gap: 4, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
        <select
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            disabled={saving}
            autoFocus
        >
            <option value="">(unset)</option>
            {CONNECT_TIER_VALUES.map((tier) => (
                <option key={tier} value={tier}>{tier}</option>
            ))}
        </select>
        <button onClick={submit} disabled={saving}>{saving ? "..." : "Save"}</button>
        <button onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
    </div>;
}
const calculateC4Row = (mapping: Mapping, onRefresh?: () => void): Row => {
    return { 
        ...mapping,
        id: mapping?.id ?? 0,
        Source: "C4",
        XBackwardsUser: `{"userId": ${mapping.userId}, "accountId": ${mapping.accountId}, "internal": true}`,
        dCode: mapping.DCodes ?? mapping.dCode,
        onRefresh,
    }
}

const calculateOvrcRow = (mapping: Mapping): Row => {
    return { 
        ...mapping,
        id: mapping.accountId + 1,
        Source: "OvrC",
        Name: (mapping.automationAccounts && mapping.automationAccounts.map(m => m.accountName).join(', ')) ?? "",
        ConnectStatus: mapping.automationAccounts ? "Mapped" : "Unmapped",
        dealerName: mapping.companyName,
        ovrc_location_id: mapping.locationId,
        CertificateCommonName: mapping.mac
    }
}


const calculateRows = (mapping: Mapping | null, onRefresh?: () => void): Row[] => {
    if (!mapping) {
        return [];
    }

    return [calculateC4Row(mapping, onRefresh), calculateOvrcRow(mapping)];
}

export default function MappingDisplay({ mapping, onRefresh }: { mapping: Mapping | null; onRefresh?: () => void }) {
    const [isShowingCopyFeedback, setIsShowingCopyFeedback] = useState(false);
    const copyFeedbackTimeoutRef = useRef<number | null>(null);

    const clipboardCursor = 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2720%27 height=%2720%27 viewBox=%270 0 24 24%27%3E%3Cpath fill=%27%23fff%27 d=%27M16 4h-1.18A3 3 0 0 0 12 2a3 3 0 0 0-2.82 2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm-4-1a1 1 0 0 1 .99.85L13 4h-2a1 1 0 0 1 1-1Z%27/%3E%3C/svg%3E") 2 2, copy';

    useEffect(() => {
        return () => {
            if (copyFeedbackTimeoutRef.current !== null) {
                window.clearTimeout(copyFeedbackTimeoutRef.current);
            }
        };
    }, []);

    const showCopyFeedback = () => {
        setIsShowingCopyFeedback(true);

        if (copyFeedbackTimeoutRef.current !== null) {
            window.clearTimeout(copyFeedbackTimeoutRef.current);
        }

        copyFeedbackTimeoutRef.current = window.setTimeout(() => {
            setIsShowingCopyFeedback(false);
            copyFeedbackTimeoutRef.current = null;
        }, 500);
    };

    const darkTheme = createTheme({
        palette: {
            mode: 'dark',
        },
    });

      const handleOnCellClick = (params: GridCellParams) => {
            // Skip copy behavior for cells that own their own interactions.
            if (params.field === 'connect_tier' || params.field === 'excludeAssist') {
                return;
            }

            const cellValue = String(params.value);

            navigator.clipboard.writeText(cellValue)
            .then(() => {
                console.log(`Copied value: ${cellValue}`);
                showCopyFeedback();
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
            });
        };


    return <div style={{ width: '80vw', overflow: 'auto', cursor: isShowingCopyFeedback ? clipboardCursor : 'cell' }}>
        <ThemeProvider theme={darkTheme} >
            <DataGrid rows={calculateRows(mapping, onRefresh)} columns={columns} autoHeight localeText={{ noRowsLabel: 'Loading mapping...' }} hideFooter
                initialState={{
                    columns: {
                        columnVisibilityModel: {
                            XBackwardsUser: false,
                            external_id: false,
                            stripeCustomerID: false,
                            id: false,
                            auth_token: false,
                            isTestPassword: false,
                            splitKey: false
                        },
                    },
                }}
                onCellClick={handleOnCellClick}
                />
        </ThemeProvider>
    </div>;

}