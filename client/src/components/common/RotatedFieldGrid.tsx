import { useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { DataGrid, GridColDef, GridRowModel } from "@mui/x-data-grid";
import { createTheme, ThemeProvider } from "@mui/material/styles";

export type RotatedFieldType = "string" | "number" | "boolean";

export type RotatedFieldRow = {
    field: string;
    label: string;
    value: unknown;
    editable?: boolean;
    type?: RotatedFieldType;
    valueStyle?: CSSProperties;
    // Prevents the value from wrapping onto multiple lines (e.g. long JSON blobs).
    noWrap?: boolean;
    // Renders the value as a link instead of plain text; text stays the same.
    href?: string;
    to?: string;
};

type RotatedFieldGridProps = {
    rows: RotatedFieldRow[];
    onSave?: (field: string, value: unknown) => Promise<void>;
    noRowsLabel?: string;
};

function toCellString(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (typeof value === "boolean") return value ? "true" : "false";
    return String(value);
}

// Dark rounded-square clipboard icon; swaps to a checkmark briefly after a
// successful copy instead of relying on button text.
function CopyIconButton({ copied, onCopy }: { copied: boolean; onCopy: () => void }) {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onCopy();
            }}
            title="Copy value"
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}
        >
            <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
                <rect width="26" height="26" rx="6" fill="#1b1b1b" />
                {copied ? (
                    <path d="M7 13.5l3.5 3.5L19 8" stroke="#4caf50" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                    <g stroke="#fff" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="7.5" y="5.5" width="11" height="15" rx="2" />
                        <rect x="10" y="3.5" width="6" height="3" rx="1" fill="#1b1b1b" />
                        <line x1="9.5" y1="10.5" x2="16" y2="10.5" />
                        <line x1="9.5" y1="13.5" x2="16" y2="13.5" />
                        <line x1="9.5" y1="16.5" x2="14" y2="16.5" />
                    </g>
                )}
            </svg>
        </button>
    );
}

// Matches the check/x icons used for boolean columns in MappingDisplay's DataGrid.
function BooleanIcon({ value }: { value: boolean }) {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.7 }}>
            {value ? (
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            ) : (
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            )}
        </svg>
    );
}

function BooleanValueCell({ row, onSave }: { row: RotatedFieldRow; onSave?: (field: string, value: unknown) => Promise<void> }) {
    const [saving, setSaving] = useState(false);
    const checked = Boolean(row.value);

    const toggle = async () => {
        if (!onSave || saving) return;
        setSaving(true);
        try {
            await onSave(row.field, !checked);
        } catch (err) {
            alert(err instanceof Error ? err.message : String(err));
        } finally {
            setSaving(false);
        }
    };

    return (
        <input
            type="checkbox"
            checked={checked}
            disabled={!onSave || saving}
            onClick={(e) => e.stopPropagation()}
            onChange={toggle}
        />
    );
}

// A compact "field as row" grid: label / value / copy button. Optionally
// supports inline editing of the value column (text fields via the DataGrid's
// own editor, booleans via a checkbox that saves immediately on toggle).
export default function RotatedFieldGrid({ rows, onSave, noRowsLabel = "No data" }: RotatedFieldGridProps) {
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const gridRows = rows.map((row) => ({ id: row.field, ...row }));

    const columns: GridColDef[] = [
        { field: "label", headerName: "Field", width: 220, sortable: false },
        {
            field: "value",
            headerName: "Value",
            width: 320,
            flex: 1,
            sortable: false,
            editable: Boolean(onSave),
            isCellEditable: (params) => Boolean(onSave) && Boolean(params.row.editable) && params.row.type !== "boolean",
            valueGetter: (_value, row) => toCellString((row as RotatedFieldRow).value),
            renderCell: (params) => {
                const row = params.row as RotatedFieldRow;
                if (row.type === "boolean") {
                    if (onSave && row.editable) {
                        return <BooleanValueCell row={row} onSave={onSave} />;
                    }
                    return <BooleanIcon value={Boolean(row.value)} />;
                }

                const text = toCellString(row.value);
                const style: CSSProperties = {
                    ...(row.noWrap ? { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" } : {}),
                    ...row.valueStyle,
                };

                if (row.href) {
                    return <a href={row.href} target="_blank" rel="noopener noreferrer" title={row.noWrap ? text : undefined} style={{ color: "inherit", ...style }}>{text}</a>;
                }
                if (row.to) {
                    return <Link to={row.to} title={row.noWrap ? text : undefined} style={{ color: "inherit", ...style }}>{text}</Link>;
                }
                return <span title={row.noWrap ? text : undefined} style={style}>{text}</span>;
            },
        },
        {
            field: "copy",
            headerName: "",
            width: 60,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params) => {
                const row = params.row as RotatedFieldRow;
                return (
                    <CopyIconButton
                        copied={copiedField === row.field}
                        onCopy={() => {
                            navigator.clipboard.writeText(toCellString(row.value))
                                .then(() => {
                                    setCopiedField(row.field);
                                    window.setTimeout(() => setCopiedField((current) => (current === row.field ? null : current)), 800);
                                })
                                .catch((err) => console.error("Failed to copy value: ", err));
                        }}
                    />
                );
            },
        },
    ];

    const processRowUpdate = async (newRow: GridRowModel, oldRow: GridRowModel) => {
        if (!onSave) return oldRow;

        const oldField = oldRow as unknown as RotatedFieldRow;
        const rawAfter = (newRow as unknown as { value: string }).value;
        const fieldType = oldField.type ?? "string";

        let after: unknown = rawAfter;
        if (fieldType === "number") {
            after = rawAfter === "" ? null : Number(rawAfter);
            if (after !== null && Number.isNaN(after)) {
                throw new Error(`Invalid number for ${oldField.label}`);
            }
        } else if (rawAfter === "") {
            after = null;
        }

        if (toCellString(oldField.value) === toCellString(after)) {
            return oldRow;
        }

        await onSave(oldField.field, after);
        return { ...newRow, value: after };
    };

    return (
        <div style={{ width: "100%", maxWidth: 760 }}>
            <ThemeProvider theme={createTheme({ palette: { mode: "dark" } })}>
                <DataGrid
                    rows={gridRows}
                    columns={columns}
                    getRowHeight={() => "auto"}
                    hideFooter
                    localeText={{ noRowsLabel }}
                    processRowUpdate={onSave ? processRowUpdate : undefined}
                    onProcessRowUpdateError={(err) => {
                        console.error("Row update failed", err);
                        alert(`Update failed: ${err instanceof Error ? err.message : String(err)}`);
                    }}
                    sx={{
                        ".MuiDataGrid-cell": {
                            whiteSpace: "normal",
                            lineHeight: "normal",
                            alignItems: "center",
                        },
                    }}
                />
            </ThemeProvider>
        </div>
    );
}
