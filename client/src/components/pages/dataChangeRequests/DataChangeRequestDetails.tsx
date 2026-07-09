import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import PageShell from "../../common/layout/PageShell.tsx";
import MappingDisplay from "../../MappingDisplay.tsx";
import * as dataChangeRequestActions from "../../../actions/dataChangeRequestActions.ts";
import type {
    DataChangeRequest,
    DataChangeRequestStatus,
} from "../../../actions/dataChangeRequestActions.ts";
import * as dealerActions from "../../../actions/dealerActions.ts";
import * as accountActions from "../../../actions/accountActions.ts";
import { isServerError, parseApiResponse } from "../../../actions/apiClient.ts";
import { apiUrl } from "../../../config.ts";
import type { DealerInfo, Mapping } from "../../../types.t";
import {
    isAccountTypeParsed,
    isShowroomParsed,
    normalizeType,
    parseRequestData,
    type AccountTypeChangeParsed,
    type DataChangeRequestType,
    type ShowroomDemoLicensesParsed,
} from "./parsers.ts";
import "./dataChangeRequests.css";

const darkTheme = createTheme({ palette: { mode: "dark" } });

function statusBadgeClass(status: DataChangeRequestStatus): string {
    return `dcReqStatusBadge dcReqStatus-${status.replace(/\s+/g, "")}`;
}

export default function DataChangeRequestDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [request, setRequest] = useState<DataChangeRequest | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [logLines, setLogLines] = useState<string[]>([]);

    const appendLog = useCallback((line: string) => {
        const stamped = `[${new Date().toLocaleTimeString()}] ${line}`;
        setLogLines(prev => [...prev, stamped]);
    }, []);

    const loadRequest = async () => {
        if (!id) return;
        const result = await dataChangeRequestActions.getDataChangeRequest(id);
        if (isServerError(result)) {
            setLoadError(result.error);
            return;
        }
        setRequest(result);
    };

    useEffect(() => {
        loadRequest();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const parseResult = useMemo(() => {
        if (!request) return null;
        return parseRequestData(request.type, request.data);
    }, [request]);

    const normalizedType: DataChangeRequestType | null = request
        ? normalizeType(request.type)
        : null;

    const patchStatus = async (
        newStatus: DataChangeRequestStatus,
        notes?: string | null,
    ) => {
        if (!id) return;
        const updated = await dataChangeRequestActions.updateDataChangeRequest(id, {
            status: newStatus,
            ...(notes !== undefined ? { notes } : {}),
        });
        if (!isServerError(updated)) {
            setRequest(updated);
            appendLog(`Status set to ${newStatus}.`);
        } else {
            appendLog(`Failed to update status: ${updated.error}`);
        }
    };

    const markInvalid = () => patchStatus("Invalid");
    const reopen = () => patchStatus("Pending");

    const remove = async () => {
        if (!id) return;
        if (!window.confirm("Delete this request?")) return;
        const result = await dataChangeRequestActions.deleteDataChangeRequest(id);
        if (result && isServerError(result)) {
            appendLog(`Delete failed: ${result.error}`);
            return;
        }
        navigate("/dataChangeRequests");
    };

    if (loadError) {
        return (
            <PageShell>
                <h1>Data Change Request</h1>
                <div className="dcReqError">Error: {loadError}</div>
                <Link to="/dataChangeRequests">Back to list</Link>
            </PageShell>
        );
    }

    if (!request) {
        return (
            <PageShell>
                <h1>Data Change Request</h1>
                <div>Loading...</div>
            </PageShell>
        );
    }

    return (
        <PageShell>
            <div className="dcReqHeader">
                <h1>Data Change Request</h1>
                <Link to="/dataChangeRequests">Back to list</Link>
            </div>

            <div>
                <strong>Request ID:</strong> {request.id}
                <br />
                <strong>Status:</strong>{" "}
                <span className={statusBadgeClass(request.status)}>{request.status}</span>
                <br />
                <strong>Created:</strong> {new Date(request.created_at).toLocaleString()}
                {" | "}
                <strong>Updated:</strong> {new Date(request.updated_at).toLocaleString()}
            </div>

            <h2 style={{ marginTop: 16 }}>Original Payload</h2>
            <div className="dcReqDetailGrid">
                <label>Type:</label>
                <input type="text" value={request.type} readOnly />
                <label>Requestor:</label>
                <input type="text" value={request.requestor} readOnly />
                <label>Data:</label>
                <input type="text" value={request.data} readOnly />
                <label>Notes:</label>
                <textarea value={request.notes ?? ""} readOnly rows={2} />
                <label>Valid:</label>
                <div>
                    {parseResult?.valid ? (
                        <span className="dcReqValidYes">Yes</span>
                    ) : (
                        <>
                            <span className="dcReqValidNo">No</span>
                            <span className="dcReqInvalidReason">
                                &nbsp;— {parseResult?.reason ?? "unknown type"}
                            </span>
                        </>
                    )}
                </div>
            </div>

            <h2>Process</h2>
            {!normalizedType && (
                <>
                    <div className="dcReqError">
                        Unknown request type: <code>{request.type}</code>. No processor available,
                        but the request can still be marked invalid, re-opened, or deleted.
                    </div>
                    <ActionButtons
                        processing={processing}
                        canProcess={false}
                        onProcess={() => { /* no-op: no processor for unknown type */ }}
                        onMarkInvalid={markInvalid}
                        onReopen={reopen}
                        onDelete={remove}
                        reopenVisible={request.status !== "Pending"}
                    />
                </>
            )}

            {normalizedType === "ShowroomDemoLicenses" && (
                <ShowroomProcessSection
                    request={request}
                    parsed={
                        parseResult && parseResult.valid && isShowroomParsed(parseResult.parsed)
                            ? parseResult.parsed
                            : null
                    }
                    parseError={
                        parseResult && !parseResult.valid ? parseResult.reason : null
                    }
                    processing={processing}
                    setProcessing={setProcessing}
                    appendLog={appendLog}
                    onStatus={patchStatus}
                    onMarkInvalid={markInvalid}
                    onReopen={reopen}
                    onDelete={remove}
                />
            )}

            {(normalizedType === "MarkAccountAsConnect" ||
                normalizedType === "MarkAccountAsLegacy") && (
                <AccountTypeProcessSection
                    request={request}
                    targetType={normalizedType === "MarkAccountAsConnect" ? "Connect" : "Legacy"}
                    parsed={
                        parseResult && parseResult.valid && isAccountTypeParsed(parseResult.parsed)
                            ? parseResult.parsed
                            : null
                    }
                    parseError={
                        parseResult && !parseResult.valid ? parseResult.reason : null
                    }
                    processing={processing}
                    setProcessing={setProcessing}
                    appendLog={appendLog}
                    onStatus={patchStatus}
                    onMarkInvalid={markInvalid}
                    onReopen={reopen}
                    onDelete={remove}
                />
            )}

            {logLines.length > 0 && (
                <div className="dcReqLogBox">
                    {logLines.join("\n")}
                </div>
            )}
        </PageShell>
    );
}

// -------------------------------------------------------------
// Shared button strip (Process / Mark Invalid / Re-open / Delete)
// -------------------------------------------------------------
interface ActionButtonsProps {
    processing: boolean;
    canProcess: boolean;
    processLabel?: string;
    onProcess: () => void;
    onMarkInvalid: () => void;
    onReopen: () => void;
    onDelete: () => void;
    reopenVisible: boolean;
}

function ActionButtons({
    processing,
    canProcess,
    processLabel = "Process",
    onProcess,
    onMarkInvalid,
    onReopen,
    onDelete,
    reopenVisible,
}: ActionButtonsProps) {
    return (
        <div className="dcReqActions">
            <button onClick={onProcess} disabled={processing || !canProcess}>
                {processing ? "Processing..." : processLabel}
            </button>
            <button onClick={onMarkInvalid} disabled={processing}>
                Mark Invalid
            </button>
            {reopenVisible && (
                <button onClick={onReopen} disabled={processing}>
                    Re-open (Pending)
                </button>
            )}
            <button onClick={onDelete} disabled={processing} style={{ marginLeft: "auto" }}>
                Delete
            </button>
        </div>
    );
}

// -------------------------------------------------------------
// ShowroomDemoLicenses: parsed DCode/count + Dealer page contents
// -------------------------------------------------------------
interface ShowroomProcessSectionProps {
    request: DataChangeRequest;
    parsed: ShowroomDemoLicensesParsed | null;
    parseError: string | null;
    processing: boolean;
    setProcessing: (value: boolean) => void;
    appendLog: (line: string) => void;
    onStatus: (status: DataChangeRequestStatus, notes?: string | null) => Promise<void>;
    onMarkInvalid: () => void;
    onReopen: () => void;
    onDelete: () => void;
}

function ShowroomProcessSection({
    request,
    parsed,
    parseError,
    processing,
    setProcessing,
    appendLog,
    onStatus,
    onMarkInvalid,
    onReopen,
    onDelete,
}: ShowroomProcessSectionProps) {
    const [dealer, setDealer] = useState<DealerInfo | null>(null);
    const [dealerError, setDealerError] = useState<string | null>(null);
    const [freeConnectLicenses, setFreeConnectLicenses] = useState<string>(
        parsed ? String(parsed.numberOfLicenses) : "",
    );

    const loadDealer = useCallback(async (dCode: string) => {
        setDealer(null);
        setDealerError(null);
        const result = await dealerActions.getDealerByDCodeOrEmail(dCode);
        if (isServerError(result)) {
            setDealerError(result.error);
            return;
        }
        setDealer(result);
    }, []);

    useEffect(() => {
        if (parsed?.dCode) {
            loadDealer(parsed.dCode);
        }
    }, [parsed?.dCode, loadDealer]);

    const processRow = async () => {
        if (!dealer) {
            appendLog("Cannot process: dealer not loaded.");
            return;
        }
        const count = Number(freeConnectLicenses);
        if (!Number.isFinite(count) || count < 0) {
            appendLog("Cannot process: freeConnectLicenses must be a non-negative number.");
            return;
        }
        setProcessing(true);
        try {
            appendLog(`Updating freeConnectLicenses on ${dealer.accountNum} to ${count}...`);
            const result = await dealerActions.updateFreeConnectLicenses(dealer.accountNum, count);
            if (isServerError(result)) {
                appendLog(`Error: ${result.error}`);
                await onStatus("Failed");
                return;
            }
            setDealer(result);
            setFreeConnectLicenses(String(result.freeConnectLicenses ?? ""));
            appendLog(`freeConnectLicenses set to ${result.freeConnectLicenses}.`);
            await onStatus("Confirmed");
        } finally {
            setProcessing(false);
        }
    };

    const columns: GridColDef[] = [
        { field: "label", headerName: "Label", width: 220 },
        { field: "value", headerName: "Value", width: 520, flex: 1 },
    ];

    const dealerRows = dealer
        ? Object.entries(dealer).map(([key, value], index) => ({
            id: index + 1,
            label: key,
            value:
                typeof value === "object" && value !== null
                    ? JSON.stringify(value)
                    : String(value ?? ""),
        }))
        : [];

    return (
        <>
            <div className="dcReqDetailGrid">
                <label>DCode:</label>
                <input type="text" value={parsed?.dCode ?? ""} readOnly />
                <label>Number Of Licenses:</label>
                <input type="text" value={parsed ? String(parsed.numberOfLicenses) : ""} readOnly />
                {parseError && (
                    <>
                        <label>Parse error:</label>
                        <span className="dcReqInvalidReason">{parseError}</span>
                    </>
                )}
            </div>

            <ActionButtons
                processing={processing}
                canProcess={Boolean(parsed && dealer)}
                onProcess={processRow}
                onMarkInvalid={onMarkInvalid}
                onReopen={onReopen}
                onDelete={onDelete}
                reopenVisible={request.status !== "Pending"}
            />

            <h2>Dealer</h2>
            {dealerError && <div className="dcReqError">Error: {dealerError}</div>}
            {dealer && (
                <>
                    <div style={{ height: "auto", width: "70%", minWidth: 600 }}>
                        <ThemeProvider theme={darkTheme}>
                            <DataGrid
                                rows={dealerRows}
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
                        </label>
                    </div>
                </>
            )}
        </>
    );
}

// -------------------------------------------------------------
// MarkAccountAsConnect / MarkAccountAsLegacy: MappingDisplay + set account type
// -------------------------------------------------------------
interface AccountTypeProcessSectionProps {
    request: DataChangeRequest;
    targetType: "Connect" | "Legacy";
    parsed: AccountTypeChangeParsed | null;
    parseError: string | null;
    processing: boolean;
    setProcessing: (value: boolean) => void;
    appendLog: (line: string) => void;
    onStatus: (status: DataChangeRequestStatus, notes?: string | null) => Promise<void>;
    onMarkInvalid: () => void;
    onReopen: () => void;
    onDelete: () => void;
}

function AccountTypeProcessSection({
    request,
    targetType,
    parsed,
    parseError,
    processing,
    setProcessing,
    appendLog,
    onStatus,
    onMarkInvalid,
    onReopen,
    onDelete,
}: AccountTypeProcessSectionProps) {
    const [mapping, setMapping] = useState<Mapping | null>(null);
    const [mappingError, setMappingError] = useState<string | null>(null);

    const loadMapping = useCallback(async (value: string) => {
        setMapping(null);
        setMappingError(null);
        const response = await fetch(apiUrl(`/commonNames/${encodeURIComponent(value)}`));
        const data = await parseApiResponse<Mapping>(response);
        if (isServerError(data)) {
            setMappingError(data.error);
            return;
        }
        setMapping(data);
    }, []);

    useEffect(() => {
        if (parsed?.accountNameOrMac) {
            loadMapping(parsed.accountNameOrMac);
        }
    }, [parsed?.accountNameOrMac, loadMapping]);

    const processRow = async () => {
        if (!mapping) {
            appendLog("Cannot process: mapping not loaded.");
            return;
        }
        setProcessing(true);
        try {
            appendLog(`Marking ${mapping.Name} as ${targetType}...`);
            const result = await accountActions.updateAccountType(mapping.Name, targetType);
            if (result && "error" in result) {
                appendLog(`Error: ${result.error}`);
                await onStatus("Failed");
                return;
            }
            if (result) setMapping(result as Mapping);
            appendLog(`Account ${mapping.Name} marked as ${targetType}.`);
            await onStatus("Confirmed");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <>
            <div className="dcReqDetailGrid">
                <label>Account Name / MAC:</label>
                <input type="text" value={parsed?.accountNameOrMac ?? ""} readOnly />
                <label>Target Account Type:</label>
                <input type="text" value={targetType} readOnly />
                {parseError && (
                    <>
                        <label>Parse error:</label>
                        <span className="dcReqInvalidReason">{parseError}</span>
                    </>
                )}
            </div>

            <ActionButtons
                processing={processing}
                canProcess={Boolean(mapping)}
                processLabel={`Process (Mark as ${targetType})`}
                onProcess={processRow}
                onMarkInvalid={onMarkInvalid}
                onReopen={onReopen}
                onDelete={onDelete}
                reopenVisible={request.status !== "Pending"}
            />

            <h2>Mapping</h2>
            {mappingError && <div className="dcReqError">Error: {mappingError}</div>}
            <MappingDisplay
                mapping={mapping}
                onRefresh={() => {
                    if (parsed?.accountNameOrMac) loadMapping(parsed.accountNameOrMac);
                }}
            />
        </>
    );
}
