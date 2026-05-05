import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PageShell from "../../common/layout/PageShell.tsx";
import LicensesDisplay from "../../LicensesDisplay.tsx";
import * as requestActions from "../../../actions/requestActions.ts";
import * as accountActions from "../../../actions/accountActions.ts";
import * as licenseActions from "../../../actions/licenseActions.ts";
import * as bulkAssistActions from "../../../actions/bulkAssistActions.ts";
import { isServerError } from "../../../actions/apiClient.ts";
import type {
    StoredRequest,
    WhiteLabelRequestPayload,
} from "../../../actions/requestActions.ts";
import type { LicenseData, SimpleAccountMapping } from "../../../types.t";
import "./whiteLabelAssistRequests.css";

export default function WhiteLabelAssistRequestDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [request, setRequest] = useState<StoredRequest<WhiteLabelRequestPayload> | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [mac, setMac] = useState("");
    const [sku, setSku] = useState("");
    const [expirationDate, setExpirationDate] = useState("");

    const [mapping, setMapping] = useState<SimpleAccountMapping | null>(null);
    const [licenseData, setLicenseData] = useState<LicenseData[]>([]);
    const [status, setStatus] = useState("");
    const [logLines, setLogLines] = useState<string[]>([]);
    const [processing, setProcessing] = useState(false);

    const appendLog = (line: string) => {
        const stamped = `[${new Date().toLocaleTimeString()}] ${line}`;
        setLogLines(prev => [...prev, stamped]);
    };

    const updateStatus = (next: string) => {
        setStatus(next);
        appendLog(next);
    };

    const loadRequest = async () => {
        if (!id) return;
        const result = await requestActions.getRequest(id);
        if (isServerError(result)) {
            setLoadError(result.error);
            return;
        }
        setRequest(result);
        const p = result.payload || {};
        setMac(p.mac || "");
        setSku(p.licenseType || "");
        setExpirationDate(p.requestDate || "");
    };

    useEffect(() => {
        loadRequest();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Load account mapping by mac/common name
    useEffect(() => {
        if (!mac) {
            setMapping(null);
            return;
        }
        accountActions.getSimpleMappingInfoByCommonNameOrMac(mac).then(result => {
            if (result && typeof result === "object" && "id" in result) {
                setMapping(result as SimpleAccountMapping);
            } else {
                setMapping(null);
            }
        });
    }, [mac]);

    const refreshLicenses = async (accountName: string) => {
        const result = await licenseActions.getLicensesForAccount(accountName);
        if (Array.isArray(result)) {
            setLicenseData(result as LicenseData[]);
        } else {
            setLicenseData([]);
        }
    };

    useEffect(() => {
        if (mapping?.name) {
            refreshLicenses(mapping.name);
        } else {
            setLicenseData([]);
        }
    }, [mapping]);

    const processRow = async () => {
        if (!id || !request) return;
        if (!expirationDate) {
            updateStatus("Cannot process: requested expiration date is empty.");
            return;
        }
        setProcessing(true);
        try {
            updateStatus("Processing...");
            await bulkAssistActions.process(
                { macOrCommonName: mac, requestedExpirationDate: expirationDate, sku },
                updateStatus,
            );
            if (mapping?.name) await refreshLicenses(mapping.name);

            const updated = await requestActions.updateRequest(id, {
                status: "completed",
                result: { mac, sku, expirationDate, accountName: mapping?.name },
            });
            if (!isServerError(updated)) setRequest(updated);
            updateStatus("Marked as completed.");
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            updateStatus(`Error: ${message}`);
            const updated = await requestActions.updateRequest(id, {
                status: "failed",
                error: message,
            });
            if (!isServerError(updated)) setRequest(updated);
        } finally {
            setProcessing(false);
        }
    };

    const markStatus = async (newStatus: "invalid" | "pending") => {
        if (!id) return;
        const updated = await requestActions.updateRequest(id, { status: newStatus });
        if (!isServerError(updated)) {
            setRequest(updated);
            appendLog(`Status set to ${newStatus}.`);
        }
    };

    const remove = async () => {
        if (!id) return;
        if (!window.confirm("Delete this request?")) return;
        const result = await requestActions.deleteRequest(id);
        if (result && isServerError(result)) {
            appendLog(`Delete failed: ${result.error}`);
            return;
        }
        navigate("/whiteLabelAssistRequests");
    };

    if (loadError) {
        return (
            <PageShell>
                <h1>White Label Assist Request</h1>
                <div className="wlReqError">Error: {loadError}</div>
                <Link to="/whiteLabelAssistRequests">Back to list</Link>
            </PageShell>
        );
    }

    if (!request) {
        return (
            <PageShell>
                <h1>White Label Assist Request</h1>
                <div>Loading...</div>
            </PageShell>
        );
    }

    const payload = request.payload || {};

    return (
        <PageShell>
            <div className="wlReqHeader">
                <h1>White Label Assist Request</h1>
                <Link to="/whiteLabelAssistRequests">Back to list</Link>
            </div>

            <div>
                <strong>Request ID:</strong> {request.id}
                <br />
                <strong>Status:</strong>{" "}
                <span className={`wlReqStatusBadge wlReqStatus-${request.status}`}>
                    {request.status}
                </span>
                <br />
                <strong>Created:</strong> {new Date(request.createdAt).toLocaleString()}
                {" | "}
                <strong>Updated:</strong> {new Date(request.updatedAt).toLocaleString()}
                {request.error && (
                    <div className="wlReqError" style={{ marginTop: 8 }}>
                        Last error: {request.error}
                    </div>
                )}
            </div>

            <h2 style={{ marginTop: 16 }}>Original Payload</h2>
            <div className="wlReqDetailGrid">
                <label>sCode:</label>
                <input type="text" value={payload.sCode || ""} readOnly />
                <label>License Type:</label>
                <input type="text" value={payload.licenseType || ""} readOnly />
                <label>MAC:</label>
                <input type="text" value={payload.mac || ""} readOnly />
                <label>Requested Date:</label>
                <input type="text" value={payload.requestDate || ""} readOnly />
            </div>

            <h2>Process</h2>
            <div className="wlReqDetailGrid">
                <label>Account Name:</label>
                <input type="text" value={mapping?.name || "(not found)"} readOnly />
                <label>SKU:</label>
                <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                />
                <label>MAC / Common Name:</label>
                <input
                    type="text"
                    value={mac}
                    onChange={(e) => setMac(e.target.value)}
                />
                <label>Expiration Date (YYYY-MM-DD):</label>
                <input
                    type="text"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    placeholder="YYYY-MM-DD"
                />
                <label>Status:</label>
                <input type="text" value={status} readOnly />
            </div>

            <div className="wlReqActions">
                <button onClick={processRow} disabled={processing || !mapping}>
                    {processing ? "Processing..." : "Process"}
                </button>
                <button onClick={() => markStatus("invalid")} disabled={processing}>
                    Mark Invalid
                </button>
                {request.status !== "pending" && (
                    <button onClick={() => markStatus("pending")} disabled={processing}>
                        Re-open (Pending)
                    </button>
                )}
                <button onClick={remove} disabled={processing} style={{ marginLeft: "auto" }}>
                    Delete
                </button>
            </div>

            <h2>Licenses for Account</h2>
            <LicensesDisplay licenseData={licenseData} />

            {logLines.length > 0 && (
                <div className="wlReqLogBox">
                    {logLines.join("\n")}
                </div>
            )}
        </PageShell>
    );
}
