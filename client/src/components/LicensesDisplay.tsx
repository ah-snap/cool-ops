import { DataGrid } from '@mui/x-data-grid';
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { GridColDef } from '@mui/x-data-grid';
import { LicenseData } from '../types.t';


const columns: GridColDef[] = [
    { field: 'sku', headerName: 'SKU', width: 200 },
    { field: 'ActivationDate', headerName: 'Activation Date', width: 220 },
    { field: 'ExpirationDate', headerName: 'Expiration Date', width: 220 },
    { field: 'Code', headerName: 'Code', width: 200 },
    { field: 'transaction_id', headerName: 'Transaction Id', width: 350 },
];

export default function LicensesDisplay({ licenseData } : { licenseData: LicenseData[] | null }) {

    const noRowsLabel = licenseData === null ? 'Loading licenses...' : 'No licenses found';

    return <div className="mappingDisplay">
        <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
            <DataGrid rows={licenseData ?? []} columns={columns} autoHeight localeText={{ noRowsLabel }} hideFooter />
        </ThemeProvider>
    </div>
}