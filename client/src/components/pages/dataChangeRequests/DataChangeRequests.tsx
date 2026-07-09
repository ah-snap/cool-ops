import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import PageShell from "../../common/layout/PageShell.tsx";
import * as dataChangeRequestActions from "../../../actions/dataChangeRequestActions.ts";
import type {
    DataChangeRequest,
    DataChangeRequestStatus,
} from "../../../actions/dataChangeRequestActions.ts";
import { isServerError } from "../../../actions/apiClient.ts";
import { parseRequestData } from "./parsers.ts";
import "./dataChangeRequests.css";

type StatusFilter = "all" | DataChangeRequestStatus;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: "Pending", label: "Pending" },
    { value: "Confirmed", label: "Confirmed" },
    { value: "In Progress", label: "In Progress" },
    { value: "Failed", label: "Failed" },
    { value: "Invalid", label: "Invalid" },
    { value: "all", label: "All" },
];

type GridRow = {
    id: string;
    status: DataChangeRequestStatus;
    createdAt: string;
    requestor: string;
    requestType: string;
    data: string;
    valid: boolean;
    invalidReason: string;
};

const darkTheme = createTheme({ palette: { mode: "dark" } });

function statusBadgeClass(status: DataChangeRequestStatus): string {
    // "In Progress" contains a space; strip it for a valid class name.
    return `dcReqStatusBadge dcReqStatus-${status.replace(/\s+/g, "")}`;
}

const COLUMNS: GridColDef<GridRow>[] = [
    {
        field: "status",
        headerName: "Status",
        width: 130,
        renderCell: (params) => (
            <span className={statusBadgeClass(params.value as DataChangeRequestStatus)}>
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
    { field: "requestor", headerName: "Requestor", minWidth: 220, flex: 1 },
    { field: "requestType", headerName: "Request Type", width: 200 },
    { field: "data", headerName: "Data", minWidth: 240, flex: 1 },
    {
        field: "valid",
        headerName: "Valid",
        width: 130,
        renderCell: (params) => (
            <span className={params.value ? "dcReqValidYes" : "dcReqValidNo"} title={params.row.invalidReason}>
                {params.value ? "Yes" : "No"}
            </span>
        ),
    },
    {
        field: "open",
        headerName: "",
        width: 90,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
            <Link to={`/dataChangeRequests/${params.row.id}`}>Open</Link>
        ),
    },
];

function toGridRow(item: DataChangeRequest): GridRow {
    const parseResult = parseRequestData(item.type, item.data);
    return {
        id: item.id,
        status: item.status,
        createdAt: item.created_at,
        requestor: item.requestor || "",
        requestType: item.type,
        data: item.data,
        valid: parseResult.valid,
        invalidReason: parseResult.valid ? "" : parseResult.reason,
    };
}

export default function DataChangeRequests() {
    const [items, setItems] = useState<DataChangeRequest[]>([]);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("Pending");
    const [searchText, setSearchText] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadRequests = async () => {
        setLoading(true);
        setError(null);
        const result = await dataChangeRequestActions.listDataChangeRequests({
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
            r.requestor.toLowerCase().includes(q) ||
            r.requestType.toLowerCase().includes(q) ||
            r.data.toLowerCase().includes(q)
        );
    }, [items, searchText]);

    return (
        <PageShell>
            <div className="dcReqHeader">
                <h1>Data Change Requests</h1>
                <button onClick={loadRequests} disabled={loading}>
                    {loading ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            <div className="dcReqFilters">
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
                        placeholder="requestor, type, data..."
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ width: 280 }}
                    />
                </label>
                <span className="dcReqCount">
                    {gridRows.length} of {items.length} shown
                </span>
            </div>

            {error && <div className="dcReqError">Error: {error}</div>}

            <div className="dcReqGridWrapper">
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
