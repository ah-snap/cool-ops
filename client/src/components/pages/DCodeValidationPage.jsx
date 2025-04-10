import React, { useState } from "react";
import "../../stylesheets/categories.css"

function parseDBText(text) {
    function splitCsv(line) {
      let matches = line.match(/(\s*"[^"]+"\s*|\s*[^,]+|,)(?=,|$)/g);
      if (!matches) return [];
      for (let n = 0; n < matches.length; ++n) {
          matches[n] = matches[n].trim();
          if (matches[n] === ',') matches[n] = '';
      }

      return matches;
    }

    if (!text) return [];

    const lines = text.replaceAll("\r", "").split("\n");
    const data = lines.map((line) => splitCsv(line));
    const headers = data[0];
    const parsedData = data.slice(1).map((line) => {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = line[index] && line[index].replace(/^"|"$/g, '');
        });
        return obj;
    });
    
    return parsedData;
}

function parseCustomerFromRow(row) {
    return {
        accountId: row["AccountId"],
        userId: row["UserId"],
        certificateCommonName: row["CertificateCommonName"],
        dCodesString: row["D_CODES"],
        locationId: row["ovrc_location_id"],
    };
}

function parseLocationFromRow(row) {
    return {
        dealerId: row["dealerId"],
        locationId: row["locationId"],
        dCode: row["dCode"],
    };
}

export default function DCodeValidationPage() {
    const [rowsText, setRowsText] = useState("");
    const [mongoText, setMongoText] = useState("");
    const [mongoRows, setMongoRows] = useState([]);
    const [rows, setRows] = useState("");
    const [output, setOutput] = useState([]);
    const [nextLink, setNextLink] = useState(null);


    const rowsChange = (e) => {
        const text = e.target.value;

        const parsedData = parseDBText(text);
        setRows(parsedData.map(row => parseCustomerFromRow(row)));
    }

    const adyenOutputChanged = (text) => {
        setMongoText(text);

        const parsedData = parseDBText(text);

        setMongoRows(parsedData.map(row => parseLocationFromRow(row)));
    }

    const nextButtonClicked = () => {
        const stateOrder = [
            "No Mongo Row",
            "No DCode",
            "Incorrect DCode",
            "Correct DCode"
        ]

        rows.forEach(row => {
            const rowIdentifier = `commonName: ${row.certificateCommonName}, locationId: ${row.locationId}`;
            
            const mongoRow = mongoRows.find(mongoRow => mongoRow.locationId === row.locationId);
            if (!mongoRow) {
                row.output = `No mongo row for ${rowIdentifier}`;
                row.state = "No Mongo Row";
                return;
            }

            var dCode = mongoRow.dCode;

            if (!row.dCodesString) {
                row.output = `Dealer for ${rowIdentifier} is not mapped.  DCode should be ${dCode}`;
                row.state = "No DCode";
                return;
            }

            var dCodesFromSecurity16 = row.dCodesString.split(",").map(d => d.trim());
            if (!dCodesFromSecurity16.includes(dCode)) {
                row.output = `Dealer for ${rowIdentifier} is incorrectly mapped.  DCode should be ${dCode}, but is not one of ${row.dCodesString}`;
                row.state = "Incorrect DCode";
                return;
            }

            row.output = `++ Dealer for ${rowIdentifier} is correctly mapped.  DCode is ${dCode}`;
            row.state = "Correct DCode";
        });

        const output = stateOrder.map(state => rows.filter(row => row.state === state).map(row => row.output).join("\n")).join("\n\n");

        setOutput(output);
    }


    return <div className="categoryWrapper" >
        <div className="categoryContainer" style={{width: "100%"}}>
            <textarea name="Text1" cols="280" rows="10" defaultValue={rowsText} onChange={rowsChange}></textarea>
            <textarea name="Text2" cols="100" rows="41" defaultValue={mongoText} onChange={e => adyenOutputChanged(e.target.value)}></textarea>
            <textarea name="Text3" cols="100" rows="41" value={output}></textarea>
            <button onClick={nextButtonClicked}>Next</button>
            {nextLink && <a onClick={() => setNextLink(null)} href={nextLink.url} target="_blank" rel="noreferrer">{nextLink.pspReference}</a>}
        </div>
    </div>;
}



