import { DataGrid } from '@mui/x-data-grid';
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { GridColDef } from '@mui/x-data-grid';
import { LicenseData } from '../types.t';
import { useNavigate } from 'react-router-dom';

/**
 * Reduce a date-ish value to a YYYY-MM-DD key in UTC for comparison. Returns
 * null when the value is empty or not parseable.
 */
function toDayKey(value: string | Date | null | undefined): string | null {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
}

function buildColumns(navigate: ReturnType<typeof useNavigate>): GridColDef[] {
return [
    { field: 'sku', headerName: 'SKU', width: 200 },
    { field: 'ActivationDate', headerName: 'Activation Date', width: 220 },
    {
        field: 'ExpirationDate',
        headerName: 'Expiration Date',
        width: 240,
        renderCell: (params) => {
            const value = params.value as string | null | undefined;
            const snow = (params.row as LicenseData).expirationDateSnow;
            const display = value ? String(value) : '';

            let marker: { color: string; title: string } | null = null;
            if (snow) {
                const sec16Day = toDayKey(value);
                const snowDay = toDayKey(snow);
                if (sec16Day && snowDay && sec16Day === snowDay) {
                    marker = { color: '#4caf50', title: `SnowDB matches (${snow})` };
                } else {
                    marker = { color: '#f44336', title: `SnowDB differs: ${snow}` };
                }
            }

            return (
                <span>
                    {display}
                    {marker && (
                        <sup
                            title={marker.title}
                            style={{ color: marker.color, marginLeft: 4, fontWeight: 600 }}
                        >
                            +1
                        </sup>
                    )}
                </span>
            );
        },
    },
    {
        field: 'Code',
        headerName: 'Code',
        width: 200,
        renderCell: (params) => {
            const value = String(params.value ?? '');
            if (!value) return null;
            return (
                <button
                    onClick={() => navigate(`/licenseDetails/code/${encodeURIComponent(value)}`)}
                    style={{ background: 'none', border: 'none', color: '#7cb8ff', cursor: 'pointer', padding: 0 }}
                >
                    {value}
                </button>
            );
        }
    },
    {
        field: 'transaction_id',
        headerName: 'Transaction Id',
        width: 350,
        renderCell: (params) => {
            const value = String(params.value ?? '');
            if (!value) return null;
            const normalizedPsp = value.replace(/-(Connect|Assist|Assist-Premium)$/i, '');
            return (
                <button
                    onClick={() => navigate(`/licenseDetails/psp/${encodeURIComponent(normalizedPsp)}`)}
                    style={{ background: 'none', border: 'none', color: '#7cb8ff', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                >
                    {value}
                </button>
            );
        }
    },
];
}

export default function LicensesDisplay({ licenseData } : { licenseData: LicenseData[] | null }) {
    const navigate = useNavigate();
    const columns = buildColumns(navigate);

    const noRowsLabel = licenseData === null ? 'Loading licenses...' : 'No licenses found';

    return <div className="mappingDisplay">
        <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
            <DataGrid rows={licenseData ?? []} columns={columns} autoHeight localeText={{ noRowsLabel }} hideFooter />
        </ThemeProvider>
    </div>
}