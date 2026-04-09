import React from "react";
import "../../stylesheets/categories.css"
import { LicenseData, Mapping } from "../../types.t";
import AddMissingLicenseGrid from "../AddMissingLicenseGrid.tsx";
import { isServerError, parseApiResponse } from "../../actions/apiClient.ts";
import { apiUrl } from "../../config.ts";

type Row = {
    psp: string;
    externalAccountId: string;
    accountName: string;
    status: string;
    data?: any;
}


function AddLicenseControl({row, onComplete} : { row: Row, onComplete?: () => void }) {
    console.log("AddLicenseControl", row);

    const mapping : Mapping = {
        external_id: row.externalAccountId,
        userId: row.data[0].userId, // Assuming a static user ID for now
        accountId: row.data[0].accountId, // Assuming a static account ID for now
        ovrc_location_id: row.data[0].ovrc_location_id, // Assuming a default location ID
        d365CustomerID: "C" + row.data[0].consumerId, // Assuming a default D365 customer ID
        mac: "00:00:00:00:00:00", // Assuming a default MAC address
        dealerName: "Default Dealer", // Assuming a default dealer name
        Name: "Default Mapping Name", // Assuming a default mapping name
        ConnectStatus: "Active", // Assuming a default connect status
        CertificateCommonName: "default_common_name", // Assuming a default common name
        locationId: row.data[0].ovrc_location_id, // Assuming a default location ID
        dCode: "default_dcode", // Assuming a default dCode
        companyName: "Default Company", // Assuming a default company name
    };

    const data = row.data || [];
    const maxExpirationDate = data.reduce((max: string, item: any) => {
        return item.ExpirationDate > max ? item.ExpirationDate : max;
    }, "");
    const oneYearInFuture = new Date();
    oneYearInFuture.setFullYear(oneYearInFuture.getFullYear() + 1);

    const date = maxExpirationDate > oneYearInFuture.toISOString().split("T")[0] ? maxExpirationDate : oneYearInFuture.toISOString().split("T")[0];

    const licenseRow: LicenseData = {
        created_time: "",
        account_id: mapping?.accountId?.toString(),
        ConsumerId: null,
        sku: row.psp || "",
        ActivationDate: new Date().toISOString().split("T")[0],
        ExpirationDate: date,
        transaction_id: row.psp || "",
        Code: row.externalAccountId || "",
    }

    return <div className="categoryWrapper">
        <div className="categoryContainer">
            <div style={{marginTop: 20}}>
                <h2>Add License</h2>
                <AddMissingLicenseGrid licenseRow={licenseRow} mapping={mapping} onComplete={onComplete} />
            </div>
        </div>
    </div>;
}


function AccountLines({rows, setRows} : {  rows: Row[], setRows: (rows: Row[]) => void }) {
    const updateRow = (index: number, update: Partial<Row>) => {
        setRows((currentRows: Row[]) => {
            const newRows : Row[] = [...currentRows];
            newRows[index] = {...newRows[index], ...update};
            return newRows;
         });
    }

    const calculateStatus = (data : any, psp : string) => {
        if (!data || !data.length) return "Unknown";

        const pspInData = data.some((item: any) => item.psp?.startsWith(psp));
        if (pspInData) return "License Present";

        const maxExpirationDate = data.filter(r => r.sku === "C4-Connect").reduce((max: string, item: any) => {
            return item.ExpirationDate > max ? item.ExpirationDate : max;
        }, "");

        const oneMonthinFuture = new Date();
        oneMonthinFuture.setMonth(oneMonthinFuture.getMonth() + 1);

        if (maxExpirationDate > oneMonthinFuture.toISOString().split("T")[0]) {
            return "Other License Purchased";
        }

        return "No License Found";
    }

    const lookupExternalAccountId = async (externalAccountId: string, psp: string, index: number) => {
        const response = await fetch(apiUrl(`/licenses/${externalAccountId}/${psp}`));
        const data = await parseApiResponse<any[]>(response);
        console.log("Response from server:", externalAccountId, psp, data);
        if (isServerError(data)) {
            console.log("Error from server:", data.error);
            alert(data.error);
            return;
        }

        
        updateRow(index, { status: calculateStatus(data, psp), data: data });
    }

    const lookupAll = () => {
        rows.forEach((row, index) => {
            if (row.externalAccountId && row.psp) {
                lookupExternalAccountId(row.externalAccountId, row.psp, index);
            }
        });
    }

    const rowsControls = rows.map((row, index) => (
        <div key={index} className="changeItem">
            <label>PSP: </label>
            <input type="text" value={row.psp || ""} onChange={(e) => updateRow(index, { psp: e.target.value })} style={{marginLeft: 5, marginRight: 5, width: 220, height:20}} />

            <label>External Account ID: </label>
            <input type="text" value={row.externalAccountId || ""} onChange={(e) => updateRow(index, { externalAccountId: e.target.value })} style={{marginLeft: 5, marginRight: 5, width: 220, height:20}} />

            <label>Status: </label>
            <input type="text" value={row.status || ""} onChange={(e) => updateRow(index, { status: e.target.value })} style={{marginLeft: 5, marginRight: 5, width: 220, height:20}} />

            <button onClick={() => lookupExternalAccountId(row.externalAccountId, row.psp, index)}>Lookup</button>
            {/* { row.status === "No license Found" && <AddLicenseControl row={row} /> } */}
            { row.data && row.status === "No License Found" && <AddLicenseControl row={row} onComplete={() => updateRow(index, {status: "Added License"})}/> }
            {/* {change.success && <span style={{color: "green", marginLeft: 10}}>✔️ Success</span>} */}
        </div>
    ));

    return <>
        <div>
            <button onClick={lookupAll} style={{marginTop: 10, marginBottom: 10}}>Lookup All</button>
        </div>
        
        {rowsControls}
    </>;
}

function OutputBox({rows} : {rows : Row[]}) {

    const lookup = `PSP\tExternal Account ID\tStatus\r\n` + rows.map(row => {
        const psp = row.psp;
        const externalAccountId = row.externalAccountId;
        return `${psp}\t${externalAccountId}\t${row.status}`;
    }).join("\r\n");
    
    return (
        <div className="outputBox">
            <h2>Output</h2>
            <textarea value={lookup} readOnly style={{width: "100%", height: "200px", fontFamily: "monospace"}} />
        </div>
    )   
}

export default function BulkMissingLicensesPage() {
    const [rows, setRows] = React.useState<Row[]>([]);

    const textAreaChanged = (event: { target: { value: string; }; }) => {
        console.log("Text area changed:", event.target.value);
        const text = event.target.value.trim();

        const lines = text.split("\n").filter((line: string) => line.trim() !== "");

        let columnIndicies = {psp: 0, externalAccountId: 0, accountName: 0, userName: 0, paymentStatus: 0};

        const builtRows : Row[] = lines.map((line: string) => {
            const fields = line.split("\t");
            if (fields.length < 2) return {psp: "", externalAccountId: "", accountName: "", status: ""};
            if (fields.length > 3) {
                if (columnIndicies.psp === 0 && fields.includes("PSP Reference")) {
                    columnIndicies.psp = fields.indexOf("PSP Reference");
                    columnIndicies.externalAccountId = fields.indexOf("Shopper Reference");
                    columnIndicies.userName = fields.indexOf("User Name");
                    columnIndicies.paymentStatus = fields.indexOf("Status");
                    console.log("Detected header row, setting column indices:", columnIndicies);
                    return null;
                } else {
                    const psp = fields[columnIndicies.psp];
                    const externalAccountId = fields[columnIndicies.externalAccountId];
                    const userName = fields[columnIndicies.userName] || ""; // Default to empty string if not specified
                    const paymentStatus = fields[columnIndicies.paymentStatus] || "";
                    if (userName !== "ws_105127@Company.SnapOne") return null;
                    if (!["Authorized", "SettledBulk", "SentForSettle", "SettledExternally", "SettleScheduled"].includes(paymentStatus)) return null;
                    return {psp, externalAccountId, status: ""};
                }
            } else {
                const psp = fields[0];
                const externalAccountId = fields[1];
                const accountName = fields[2] || ""; // Default to empty string if not specified
                return {psp, externalAccountId, accountName, status: ""};
            }
            
        });

        setRows(builtRows.filter((row): row is Row => row !== null));
    }

    console.log("Render", rows);

    return <div className="categoryWrapper">
        <div className="categoryContainer">
            <h1>Changes</h1>
            <textarea name="Text2" cols={100} rows={41} onChange={textAreaChanged}></textarea>
            <AccountLines rows={rows} setRows={setRows} />
            <OutputBox rows={rows} />
        </div>
    </div>;
}

