import { useEffect, useMemo, useState } from "react";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useNavigate, useParams } from "react-router-dom";
import {
  deleteLicenseDetailsTarget,
  getLicenseDetails,
  revokeLicenseDetailsTarget,
} from "../../../actions/licenseActions.ts";
import { isServerError } from "../../../actions/apiClient.ts";
import type { LicenseDetailsPayload, LicenseDetailsTargetType } from "../../../types.t";
import PageShell from "../../common/layout/PageShell.tsx";

type TableSectionProps = {
  title: string;
  rows: Record<string, unknown>[];
};

function toCellString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function buildColumns(rows: Record<string, unknown>[]): GridColDef[] {
  if (rows.length === 0) {
    return [{ field: "id", headerName: "id", width: 90 }];
  }

  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

  return keys.map((key) => ({
    field: key,
    headerName: key,
    minWidth: 180,
    flex: 1,
    valueGetter: (_value, row) => toCellString((row as Record<string, unknown>)[key]),
  }));
}

function normalizeRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row, index) => ({
    id: row.id ?? `${index}-${JSON.stringify(row).slice(0, 20)}`,
    ...row,
  }));
}

function TableSection({ title, rows }: TableSectionProps) {
  const normalizedRows = useMemo(() => normalizeRows(rows), [rows]);
  const columns = useMemo(() => buildColumns(rows), [rows]);

  return (
    <div style={{ marginTop: 20 }}>
      <h3>{title}</h3>
      <div style={{ width: "100%" }}>
        <DataGrid
          rows={normalizedRows}
          columns={columns}
          autoHeight
          hideFooter
          getRowHeight={() => "auto"}
          localeText={{ noRowsLabel: "No rows found" }}
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
      </div>
    </div>
  );
}

function isValidTargetType(value: string | undefined): value is LicenseDetailsTargetType {
  return value === "code" || value === "psp";
}

export default function LicenseDetailsPage() {
  const navigate = useNavigate();
  const { type, value } = useParams<{ type: string; value: string }>();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [details, setDetails] = useState<LicenseDetailsPayload | null>(null);

  const targetType = isValidTargetType(type) ? type : null;
  const targetValue = decodeURIComponent(value ?? "");

  const load = async () => {
    if (!targetType || !targetValue) {
      return;
    }

    setLoading(true);
    const result = await getLicenseDetails(targetType, targetValue);
    setLoading(false);

    if (isServerError(result)) {
      alert(result.error);
      setDetails(null);
      return;
    }

    setDetails(result);
  };

  useEffect(() => {
    void load();
  }, [type, value]);

  const onRevoke = async () => {
    if (!targetType || !targetValue) {
      return;
    }

    if (!window.confirm(`Revoke all licenses associated with ${targetType}: ${targetValue}?`)) {
      return;
    }

    setSaving(true);
    const result = await revokeLicenseDetailsTarget(targetType, targetValue);
    setSaving(false);

    if (isServerError(result)) {
      alert(result.error);
      return;
    }

    alert("Revoke complete.");
    await load();
  };

  const onDelete = async () => {
    if (!targetType || !targetValue) {
      return;
    }

    if (!window.confirm(`Delete license records for ${targetType}: ${targetValue}? This cannot be undone.`)) {
      return;
    }

    setSaving(true);
    const result = await deleteLicenseDetailsTarget(targetType, targetValue);
    setSaving(false);

    if (isServerError(result)) {
      alert(result.error);
      return;
    }

    alert("Delete complete.");
    await load();
  };

  console.log("License details", details);

  if (!targetType || !targetValue) {
    return (
      <PageShell>
        <h1>License Details</h1>
        <p>Invalid route. Use /licenseDetails/code/:value or /licenseDetails/psp/:value.</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <ThemeProvider theme={createTheme({ palette: { mode: "dark" } })}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ marginBottom: 10 }}>License Details</h1>
          <button onClick={() => navigate(-1)}>Back</button>
        </div>

        <p>
          Looking at {targetType.toUpperCase()}: <strong>{targetValue}</strong>
        </p>

        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <button onClick={onRevoke} disabled={saving || loading}>Revoke Associated Licenses</button>
          <button onClick={onDelete} disabled={saving || loading}>Delete Associated Records</button>
        </div>

        {loading && <p>Loading license details...</p>}

        {!loading && details && (
          <>
            <TableSection title="Security16..SubscriptionCode" rows={details.securitySubscriptionCodes} />
            <TableSection title="Security16..VendorTransaction" rows={details.securityVendorTransactions} />
            <TableSection title="snow.subscription.system_subscription" rows={details.snowSystemSubscriptions} />
            <TableSection title="snow.subscription.system_subscription_transaction" rows={details.snowSystemSubscriptionTransactions} />
            <TableSection title="snow.subscription.subscription" rows={details.snowSubscriptions} />
          </>
        )}
      </ThemeProvider>
    </PageShell>
  );
}
