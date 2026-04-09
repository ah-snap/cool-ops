import React from "react";
import "../../stylesheets/categories.css"
import { isServerError, parseApiResponse } from "../../actions/apiClient.ts";
import { apiUrl } from "../../config.ts";

type Row = {
    psp: string;
    externalAccountId: string;
    accountName: string;
    status: string;
}


function AccountLines({rows, setRows} : {  rows: Row[], setRows: (rows: Row[]) => void }) {
    const updateRow = (index: number, update: Partial<Row>) => {
        const newRows = [...rows];
        newRows[index] = {...newRows[index], ...update};
        setRows(newRows);
    }

    const lookupExternalAccountId = async (psp: string, index: number) => {
        const response = await fetch(apiUrl(`/adyen/${psp}`));
        const data = await parseApiResponse<{ shopperInfo?: { shopperReference?: string; }; paymentOverview?: { status?: string; }; }>(response);
        if (isServerError(data)) {
            alert(data.error);
            return;
        }

        console.log("Response from server:", data);
        updateRow(index, { externalAccountId: data.shopperInfo?.shopperReference || "", status: data.paymentOverview?.status || "" });
    }
    
    return rows.map((row, index) => (
        <div key={index} className="changeItem">
            <label>PSP: </label>
            <input type="text" value={row.psp || ""} onChange={(e) => updateRow(index, { psp: e.target.value })} style={{marginLeft: 5, marginRight: 5, width: 220, height:20}} />

            <label>External Account ID: </label>
            <input type="text" value={row.externalAccountId || ""} onChange={(e) => updateRow(index, { externalAccountId: e.target.value })} style={{marginLeft: 5, marginRight: 5, width: 220, height:20}} />

            <label>Status: </label>
            <input type="text" value={row.status || ""} onChange={(e) => updateRow(index, { status: e.target.value })} style={{marginLeft: 5, marginRight: 5, width: 220, height:20}} />

            <button onClick={() => lookupExternalAccountId(row.psp, index)}>Lookup</button>
            {/* {change.success && <span style={{color: "green", marginLeft: 10}}>✔️ Success</span>} */}
    </div>
    ));
}

function OutputBox({rows} : {rows : Row[]}) {
    // const referenceIds = rows.map(row => row.externalAccountId).filter(id => id !== "")
    //     .map(id => `'${id}'`).join("\n,");

    // const sql = `
    //     SELECT
    //         A.Name
    //     FROM security_16..Account A
    //     WHERE A.ExternalAccountId IN (${referenceIds})`;

    const lookup = rows.map(row => {
        const psp = row.psp;
        const externalAccountId = row.externalAccountId;
        return `${psp}\t${externalAccountId}`;
    }).join("\n");
    
    return (
        <div className="outputBox">
            <h2>Output</h2>
            {/* <pre>{sql}</pre> */}
            <pre>{lookup}</pre>
        </div>
    )   
}

export default function PSPLookup() {
    const [rows, setRows] = React.useState<Row[]>([]);

    const textAreaChanged = (event: { target: { value: string; }; }) => {
        console.log("Text area changed:", event.target.value);
        const text = event.target.value.trim();

        const lines = text.split("\n").filter((line: string) => line.trim() !== "");

        const builtRows : Row[] = lines.map((line: string) => {
            const fields = line.split("\t");
            const psp = fields[0];
            if (fields.length < 2) return {psp, externalAccountId: "", accountName: "", status: ""};
            const externalAccountId = fields[1];
            const accountName = fields[2] || ""; // Default to empty string if not specified
            return {psp, externalAccountId, accountName, status: ""};
        });

        setRows(builtRows);
    }

    console.log("Render", rows);

    return <div className="categoryWrapper">
        <div className="categoryContainer">
            <h1>Changes</h1>
            <textarea name="Text2" cols={100} rows={41} onChange={textAreaChanged}></textarea>
            <AccountLines rows={rows} setRows={setRows} />
            {/* <div> */}
                {/* <button onClick={() => execute()}>Execute</button> */}
            {/* </div> */}
            <OutputBox rows={rows} />
        </div>
    </div>;
}
