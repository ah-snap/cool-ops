import { DataGrid } from '@mui/x-data-grid';
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { GridColDef } from '@mui/x-data-grid';
import { LicenseData } from '../types.t';
import { useNavigate } from 'react-router-dom';

function buildColumns(navigate: ReturnType<typeof useNavigate>): GridColDef[] {
return [
    { field: 'sku', headerName: 'SKU', width: 200 },
    { field: 'ActivationDate', headerName: 'Activation Date', width: 220 },
    { field: 'ExpirationDate', headerName: 'Expiration Date', width: 220 },
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