import React from "react";
import AssistLine from "../AssistLine.tsx";
import "../../stylesheets/categories.css";

type Row = {
    macOrCommonName: string;
    requestedExpirationDate: string;
    sku: string;
    status: string;
    error?: any;
}


function AccountLines({rows} : {  rows: Row[] }) {
    return <>
        {rows.map((row, index) => (
            <AssistLine key={index} sku={row.sku || ""} mac={row.macOrCommonName || ""} expirationDate={row.requestedExpirationDate || ""} />
        ))}
    </>;
}

export default function BulkWhiteLabelAssist() {
    const [rows, setRows] = React.useState<Row[]>([]);

    const textAreaChanged = (event: { target: { value: string; }; }) => {
        console.log("Text area changed:", event.target.value);
        const text = event.target.value.trim();

        const lines = text.split("\n").filter((line: string) => line.trim() !== "");

        const builtRows : Row[] = lines.map((line: string) => {
            const fields = line.split("\t");
            const sku = fields[2];
            const macOrCommonName = fields[3];
            const requestedExpirationDate = fields[4];
            const status = fields[5];

            return {
                macOrCommonName,
                requestedExpirationDate,
                sku,
                status
            }
            
        });

        setRows(builtRows.filter((row): row is Row => row !== null));
    }

    return <div className="categoryWrapper">
        <div className="categoryContainer">
            <h1>Changes</h1>
            <textarea name="Text2" cols={100} rows={41} onChange={textAreaChanged}></textarea>
            <AccountLines rows={rows} />
        </div>
    </div>;
}

