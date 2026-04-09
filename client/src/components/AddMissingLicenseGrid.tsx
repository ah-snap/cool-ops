import { useEffect, useState } from "react";
import { AddLicenseRow, LicenseData, LicenseRequestBody, Mapping } from "../types.t";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import * as licenseActions from '../actions/licenseActions.ts';


const connectSku = "C4-CONNECT";
const assistSku = "C4-ASSIST";
const assistPremiumSku = "C4-ASSIST-PREMIUM";

const subscription_ids: Record<string, string> = {
    "C4-CONNECT": "63f7eb4a-f24b-4198-9d0e-ed4345e3f61b",
    "C4-ASSIST": "678e934d-518c-4455-b19a-50c9544bc65d",
    "C4-ASSIST-PREMIUM": "d7cc23d6-7349-4662-b52f-26ae80e422db",
}


function populateLicenseAsNewLicense({psp, date, accountId, d365CustomerId, userId, ovrcLocationId, expirationDate, skus}
    : {psp: string, date?: string, accountId: number, d365CustomerId: string, userId: number, ovrcLocationId: string, expirationDate: string, skus: string[]}): LicenseRequestBody {
    const productName = skus.length > 0 ? (skus.includes(connectSku) ? "Control4 Connect" : "Control4 Assist") : "4Sight";
    return {
        productName: productName,
        transactionId: psp,
        skus: [...(skus.includes(connectSku) ? ["C4-4Sight-E"] : (!skus.length ? ["C4-4Sight-E"] : [])), ...skus],
        createdTime: date,//"2025-05-05 13:35:10, 000",
        accountId: accountId,
        isRecurring: false,
        vendor: "D365",
        d365CustomerId: d365CustomerId,
        userId: userId,
        cost: 249,
        tax: 0,
        taxPercent: 0,
        extraDays: 0,
        transactionText: `INSERT INTO snow.subscription.system_subscription_transaction
                    (transaction_source_id, transaction_id_from_source, c4_user_id, skus)
                    VALUES
                    ('3c42963c-bc03-4093-8fa1-cfc2b87d6f1d', '${psp}', ${userId}, '${skus.join(',')}');`,
        systemSubscriptionText: skus.map((sku : string) => `
            INSERT INTO snow.subscription.system_subscription (subscription_id, account_id, location_id, expiration_date, deleted, canceled, status, system_subscription_transaction_id, external_customer_id)
            SELECT
                '${subscription_ids[sku]}'
                ,${accountId}
                ,'${ovrcLocationId}'
                ,'${expirationDate}'
                ,FALSE 
                ,FALSE
                ,'ACTIVE'
                ,system_subscription_transaction_id
                ,'${d365CustomerId}'
            from snow.subscription.system_subscription_transaction
            WHERE transaction_id_from_source = '${psp}';`).join("\n")
    }
}

function LicenseRequestGrid({ requestBody }: { requestBody: LicenseRequestBody }) {
    const columns: GridColDef[] = [     
        { field: "label", headerName: "Label", width: 200 },
        { field: "value", headerName: "Value", width: 500, flex: 1 }
    ];

    const rows = [
        { id: 1, label: "SKU", value: requestBody.skus?.join(", ") || "" },
        { id: 2, label: "Product Name", value: requestBody.productName },
        { id: 3, label: "Transaction ID", value: requestBody.transactionId },
        { id: 4, label: "Account ID", value: requestBody.accountId },
        { id: 5, label: "Created Time", value: requestBody.createdTime },
        { id: 6, label: "Is Recurring", value: requestBody.isRecurring ? "true" : "false" },
        { id: 7, label: "Vendor", value: requestBody.vendor },
        { id: 8, label: "D365 Customer Id", value: requestBody.d365CustomerId },
        { id: 9, label: "Transaction Text", value: requestBody.transactionText ?? "" },
        { id: 10, label: "System Subscription Text", value: requestBody.systemSubscriptionText ?? "" }
    ];

    return (
        <div style={{ height: "auto", width: "50%" }}>
            <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
                <DataGrid rows={rows} columns={columns} getRowHeight={() => "auto"} hideFooter sx={{
                    '.MuiDataGrid-cell': {
                    whiteSpace: 'normal',
                    lineHeight: 'normal', // Adjust line height for better appearance
                    },
                }} />
                <button onClick={() => {
                    const sqlText = requestBody.transactionText + "\n" + requestBody.systemSubscriptionText;
                    navigator.clipboard.writeText(sqlText).catch(err => console.error("Failed to copy SQL: ", err));
                }}>Copy Sql</button>
            </ThemeProvider>
        </div>
    );
}

export default function AddMissingLicenseGrid({ licenseRow, mapping, onComplete }: { licenseRow: AddLicenseRow, mapping: Mapping, onComplete?: () => void }) {
    const [requestBody, setRequestBody] = useState<LicenseRequestBody | null>(null);
    const [skus, setSkus] = useState<string[]>([]);


    useEffect(() => {
        if (licenseRow && mapping) {

            const buildRequest = (skus : string[]) => {
                return {
                        psp: licenseRow.transaction_id,
                        date: licenseRow.created_time,
                        accountId: mapping.accountId,
                        d365CustomerId: mapping.d365CustomerID,
                        userId: mapping.userId,
                        ovrcLocationId: mapping.ovrc_location_id,
                        expirationDate: licenseRow.ExpirationDate,
                        skus: skus || [connectSku]
                    };
            }

            const request = buildRequest(skus);
            setRequestBody(populateLicenseAsNewLicense(request));
        }
    }, [licenseRow, mapping, skus]);

    const toggleSku = (sku: string) => {
        setSkus(skus => {
            if (skus.includes(sku)) {
                return skus.filter(s => s !== sku);
            } else {
                return [...skus, sku];
            }
        });
    };

    if (!requestBody) {
        return <div className="mappingDisplay">Loading...</div>;
    }

    return (
        <div className="mappingDisplay">
            <h3>Adding this license <button onClick={() => licenseActions.licenseProcessCall(requestBody, onComplete)}>Submit</button></h3>
            {/* <button onClick={() => insertVendorTransaction({ mapping, skus, setVendorTransactionId })}>Insert Subscription Code and Vendor Transaction</button> */}
            {/* {mapping && <textarea style={{width: "100%", height: "200px"}} readOnly value={JSON.stringify(buildInsertTransactionCall({ mapping, skus }), null, 2)} />} */}
            {/* {mapping && <textarea style={{width: "100%", height: "400px"}} readOnly value={JSON.stringify(buildInsertSubscriptionCodeCall({ licenseRow, mapping, skus, vendorTransactionId }), null, 2)} />} */}
            <button onClick={() => toggleSku(connectSku)}>Add Connect</button>
            <button onClick={() => toggleSku(assistSku)}>Add Assist</button>
            <button onClick={() => toggleSku(assistPremiumSku)}>Add Assist Premium</button>
            <button onClick={() => setSkus([connectSku])}>No Extra SKU</button>
            <button onClick={() => setSkus([])}>4Sight</button>
            <LicenseRequestGrid requestBody={requestBody} />
            {/* <AddSnowLicenseDisplay requestBody={requestBody} /> */}
        </div>
    );
}