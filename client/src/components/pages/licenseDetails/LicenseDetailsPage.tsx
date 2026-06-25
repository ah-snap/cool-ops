import { useEffect, useMemo, useState } from "react";
import { DataGrid, GridColDef, GridRowModel } from "@mui/x-data-grid";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useNavigate, useParams } from "react-router-dom";
import {
  deleteLicenseDetailsTarget,
  getLicenseDetails,
  revokeLicenseDetailsTarget,
  updateSecuritySubscriptionCodeExpiration,
  updateSecurityVendorTransactionId,
  updateSnowSystemSubscriptionExpiration,
  updateSnowSystemSubscriptionTransactionId,
} from "../../../actions/licenseActions.ts";
import { isServerError } from "../../../actions/apiClient.ts";
import type { LicenseDetailsPayload, LicenseDetailsTargetType, ServerError } from "../../../types.t";
import PageShell from "../../common/layout/PageShell.tsx";

type EditableFieldType = "date" | "string";

type EditableField = {
  field: string;
  type: EditableFieldType;
};

type TableSectionProps = {
  title: string;
  rows: Record<string, unknown>[];
  /**
   * Name of the column on each row that carries the DB primary key. Used
   * when an editable cell is saved. Defaults to "id".
   */
  idField?: string;
  editable?: EditableField[];
  /**
   * Called with the row's primary key (as a string) and the changed
   * editable fields. Should throw on failure so the DataGrid reverts.
   */
  onSave?: (id: string, updates: Record<string, unknown>) => Promise<void>;
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

function coerceToDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildColumns(
  rows: Record<string, unknown>[],
  editable: EditableField[],
): GridColDef[] {
  if (rows.length === 0) {
    return [{ field: "id", headerName: "id", width: 90 }];
  }

  const editableByField = new Map(editable.map((e) => [e.field, e]));
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));

  return keys.map((key): GridColDef => {
    const editConfig = editableByField.get(key);

    if (editConfig?.type === "date") {
      return {
        field: key,
        headerName: `${key} ✏️`,
        minWidth: 200,
        flex: 1,
        editable: true,
        type: "date",
        valueGetter: (_value, row) => coerceToDate((row as Record<string, unknown>)[key]),
      };
    }

    if (editConfig?.type === "string") {
      return {
        field: key,
        headerName: `${key} ✏️`,
        minWidth: 200,
        flex: 1,
        editable: true,
        valueGetter: (_value, row) => {
          const raw = (row as Record<string, unknown>)[key];
          return raw === null || raw === undefined ? "" : String(raw);
        },
      };
    }

    return {
      field: key,
      headerName: key,
      minWidth: 180,
      flex: 1,
      valueGetter: (_value, row) => toCellString((row as Record<string, unknown>)[key]),
    };
  });
}

function normalizeRows(rows: Record<string, unknown>[], idField: string): Record<string, unknown>[] {
  // MUI DataGrid requires a unique `id` on each row. When the DB primary
  // key column is something other than `id` (e.g. `system_subscription_id`)
  // copy it into `id` for the grid while leaving the original field in
  // place so it still renders as a column.
  return rows.map((row, index) => ({
    id: row[idField] ?? row.id ?? `${index}-${JSON.stringify(row).slice(0, 20)}`,
    ...row,
  }));
}

function TableSection({ title, rows, idField = "id", editable = [], onSave }: TableSectionProps) {
  const normalizedRows = useMemo(() => normalizeRows(rows, idField), [rows, idField]);
  const columns = useMemo(() => buildColumns(rows, editable), [rows, editable]);

  // Runs when an edited cell is committed. Diff the editable fields,
  // ship the changed ones to onSave. Throwing here makes the grid roll
  // back the edit, which is what we want on failure.
  const processRowUpdate = async (newRow: GridRowModel, oldRow: GridRowModel) => {
    if (!onSave || editable.length === 0) return oldRow;

    const updates: Record<string, unknown> = {};
    for (const cfg of editable) {
      const before = (oldRow as Record<string, unknown>)[cfg.field];
      const after = (newRow as Record<string, unknown>)[cfg.field];

      if (cfg.type === "date") {
        const beforeISO = coerceToDate(before)?.toISOString() ?? null;
        const afterISO = coerceToDate(after)?.toISOString() ?? null;
        if (beforeISO !== afterISO) {
          updates[cfg.field] = afterISO;
        }
      } else if (before !== after) {
        updates[cfg.field] = after;
      }
    }

    if (Object.keys(updates).length === 0) return oldRow;

    const id = (newRow as Record<string, unknown>)[idField];
    if (id === null || id === undefined || id === "") {
      throw new Error(`Cannot update row: missing ${idField}`);
    }

    await onSave(String(id), updates);
    return newRow;
  };

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
          processRowUpdate={onSave ? processRowUpdate : undefined}
          onProcessRowUpdateError={(err) => {
            console.error("Row update failed", err);
            alert(`Update failed: ${err instanceof Error ? err.message : String(err)}`);
          }}
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

// Throws on ServerError so DataGrid's processRowUpdate rolls back the cell.
function throwIfError<T>(result: T | ServerError): T {
  if (isServerError(result)) {
    throw new Error(result.error);
  }
  return result;
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
            <TableSection
              title="Security16..SubscriptionCode"
              rows={details.securitySubscriptionCodes}
              idField="id"
              editable={[{ field: "expirationDate", type: "date" }]}
              onSave={async (id, updates) => {
                if ("expirationDate" in updates) {
                  throwIfError(
                    await updateSecuritySubscriptionCodeExpiration(id, updates.expirationDate as string | null)
                  );
                }
                await load();
              }}
            />
            <TableSection
              title="Security16..VendorTransaction"
              rows={details.securityVendorTransactions}
              idField="Id"
              editable={[{ field: "transaction_id", type: "string" }]}
              onSave={async (id, updates) => {
                if ("transaction_id" in updates) {
                  throwIfError(
                    await updateSecurityVendorTransactionId(id, String(updates.transaction_id))
                  );
                }
                await load();
              }}
            />
            <TableSection
              title="snow.subscription.system_subscription"
              rows={details.snowSystemSubscriptions}
              idField="system_subscription_id"
              editable={[{ field: "expiration_date", type: "date" }]}
              onSave={async (id, updates) => {
                if ("expiration_date" in updates) {
                  throwIfError(
                    await updateSnowSystemSubscriptionExpiration(id, updates.expiration_date as string | null)
                  );
                }
                await load();
              }}
            />
            <TableSection
              title="snow.subscription.system_subscription_transaction"
              rows={details.snowSystemSubscriptionTransactions}
              idField="system_subscription_transaction_id"
              editable={[{ field: "transaction_id_from_source", type: "string" }]}
              onSave={async (id, updates) => {
                if ("transaction_id_from_source" in updates) {
                  throwIfError(
                    await updateSnowSystemSubscriptionTransactionId(id, String(updates.transaction_id_from_source))
                  );
                }
                await load();
              }}
            />
            <TableSection title="snow.subscription.subscription" rows={details.snowSubscriptions} />
          </>
        )}
      </ThemeProvider>
    </PageShell>
  );
}
