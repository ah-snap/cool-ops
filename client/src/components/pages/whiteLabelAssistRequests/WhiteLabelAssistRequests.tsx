import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import PageShell from "../../common/layout/PageShell.tsx";
import * as requestActions from "../../../actions/requestActions.ts";
import { isServerError } from "../../../actions/apiClient.ts";
import type {
    RequestStatus,
    StoredRequest,
    WhiteLabelRequestPayload,
} from "../../../actions/requestActions.ts";
import "./whiteLabelAssistRequests.css";

type StatusFilter = "all" | RequestStatus;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: "pending", label: "Pending" },
    { value: "completed", label: "Completed" },
    { value: "failed", label: "Failed" },
    { value: "invalid", label: "Invalid" },
    { value: "all", label: "All" },
];

type GridRow = {
    id: string;
    status: RequestStatus;
    createdAt: string;
    sCode: string;
    licenseType: string;
    mac: string;
    requestDate: string;
};

const darkTheme = createTheme({ palette: { mode: "dark" } });

const COLUMNS: GridColDef<GridRow>[] = [
    {
        field: "status",
        headerName: "Status",
        width: 120,
        renderCell: (params) => (
            <span className={`wlReqStatusBadge wlReqStatus-${params.value as RequestStatus}`}>
                {params.value as string}
            </span>
        ),
    },
    {
        field: "createdAt",
        headerName: "Created",
        width: 180,
        valueFormatter: (value: string | undefined) =>
            value ? new Date(value).toLocaleString() : "",
    },
    { field: "sCode", headerName: "sCode", minWidth: 180, flex: 1 },
    { field: "licenseType", headerName: "License Type", width: 140 },
    { field: "mac", headerName: "MAC", minWidth: 160, flex: 1 },
    { field: "requestDate", headerName: "Requested Date", width: 160 },
    {
        field: "open",
        headerName: "",
        width: 90,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
            <Link to={`/whiteLabelAssistRequests/${params.row.id}`}>Open</Link>
        ),
    },
];

function toGridRow(item: StoredRequest<WhiteLabelRequestPayload>): GridRow {
    const p = item.payload || {};
    return {
        id: item.id,
        status: item.status,
        createdAt: item.createdAt,
        sCode: p.sCode || "",
        licenseType: p.licenseType || "",
        mac: p.mac || "",
        requestDate: p.requestDate || "",
    };
}

export default function WhiteLabelAssistRequests() {
    const [items, setItems] = useState<StoredRequest<WhiteLabelRequestPayload>[]>([]);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
    const [searchText, setSearchText] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadRequests = async () => {
        setLoading(true);
        setError(null);
        const result = await requestActions.listRequests({
            type: "whiteLabel",
            status: statusFilter === "all" ? undefined : statusFilter,
        });
        if (isServerError(result)) {
            setError(result.error);
            setItems([]);
        } else {
            setItems(result.items);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadRequests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter]);

    const gridRows = useMemo(() => {
        const q = searchText.trim().toLowerCase();
        const rows = items.map(toGridRow);
        if (!q) return rows;
        return rows.filter(r =>
            r.id.toLowerCase().includes(q) ||
            r.mac.toLowerCase().includes(q) ||
            r.sCode.toLowerCase().includes(q) ||
            r.licenseType.toLowerCase().includes(q) ||
            r.requestDate.toLowerCase().includes(q)
        );
    }, [items, searchText]);

    return (
        <PageShell>
            <div className="wlReqHeader">
                <h1>White Label Assist Requests</h1>
                <button onClick={loadRequests} disabled={loading}>
                    {loading ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            <div className="wlReqFilters">
                <label>
                    Status:&nbsp;
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    >
                        {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </label>
                <label>
                    Search:&nbsp;
                    <input
                        type="text"
                        placeholder="mac, sCode, licenseType..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ width: 280 }}
                    />
                </label>
                <span className="wlReqCount">
                    {gridRows.length} of {items.length} shown
                </span>
            </div>

            {error && <div className="wlReqError">Error: {error}</div>}

            <div className="wlReqGridWrapper">
                <ThemeProvider theme={darkTheme}>
                    <DataGrid
                        rows={gridRows}
                        columns={COLUMNS}
                        autoHeight
                        hideFooter
                        loading={loading}
                        localeText={{ noRowsLabel: loading ? "Loading..." : "No requests" }}
                        getRowHeight={() => "auto"}
                        sx={{
                            ".MuiDataGrid-cell": {
                                whiteSpace: "normal",
                                lineHeight: "normal",
                                alignItems: "center",
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
