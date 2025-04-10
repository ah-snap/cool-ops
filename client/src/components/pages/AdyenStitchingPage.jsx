import React, { useState } from "react";
import "../../stylesheets/categories.css"
const ca1Price = 99.00;
const standardPrice = 249.00;

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
    
    return parsedData.filter(row => row["transaction_id"]);
}

function parseCustomerFromRow(row) {
    return {
        requestId: crypto.randomUUID(),
        externalCustomerId: row["externalCustomerId"],
        customerId: row["customerId"],
        firstName: row["firstName"],
        lastName: row["lastName"],
        organizationName: row["organizationName"],
        email: row["email"],
        addressLine1: row["addressLine1"],
        addressLine2: row["addressLine2"],
        city: row["city"],
        state: row["state"],
        zip: row["zip"],
        country: row["country"],
        partner: row["partner"],
        status: row["status"],
        currencyCode: row["currencyCode"]
    };
}

function postProcessRow(row) {
    if (row.paymenttx.amount < 200) {
        row.paymenttx.tax = Number((row.paymenttx.amount - ca1Price).toFixed(2));
        row.subscriptions.subBillingLines[0].price = ca1Price;
        row.subscriptions.subBillingLines[0].tax = row.paymenttx.tax;
        row.subscriptions.subBillingLines[0].specialPriceType = "Flat";
    }
    if (row.paymenttx.amount >= 249 && row.paymenttx.amount < 500) {
        row.paymenttx.tax = Number((row.paymenttx.amount - standardPrice).toFixed(2));
        row.subscriptions.subBillingLines[0].price = standardPrice;
        row.subscriptions.subBillingLines[0].tax = row.paymenttx.tax;
    }
    if (row.paymenttx.amount >= 500) {
        alert("High amount");
    }
    if (row.payment.cardAlias === "TBD") {
        alert("Missing card alias");
    }
}

function stitchAdyenWithRows(adyenOutput, rows) {
    const row = rows.find(r => r.originalSPSReference === adyenOutput.paymenttx.originalSPSReference);

    if (!row) {
        console.log("no row found for adyenOutput", adyenOutput);
        return;
    }

    const outputRow = {...{customer: parseCustomerFromRow(row)}, ...adyenOutput};
    
    postProcessRow(outputRow);
    return outputRow;
}

function stitchAdyenDetails(selectedRow, details) {
    if (!selectedRow || !selectedRow.payment) return selectedRow;

    selectedRow.payment.cardAlias = details.alias;
    selectedRow.payment.cardToken = details.token;

    return selectedRow;
}

function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function rowDisplay(selectedRow, saveBuilt) {
    if (!selectedRow) return;

    return <div>
        <textarea name="Output1" cols="20" rows="22" value={selectedRow.customer.customerId} ></textarea>
        <textarea name="Output2" cols="45" rows="22" value={JSON.stringify(selectedRow.customer, null, 4)} ></textarea>
        <textarea name="Output3" cols="45" rows="22" value={JSON.stringify(selectedRow.subscriptions, null, 4)} ></textarea>
        <textarea name="Output4" cols="45" rows="22" value={JSON.stringify(selectedRow.payment, null, 4)} ></textarea>
        <textarea name="Output5" cols="45" rows="22" value={JSON.stringify(selectedRow.paymenttx, null, 4)} ></textarea>
        <button onClick={() => saveBuilt(selectedRow)}>Save</button>
    </div>
}

function buildLink(rows, output) {
    const notBuiltRows = rows.filter(row => !output.find(o => o.paymenttx.originalSPSReference === row.originalSPSReference));

    if (notBuiltRows.length === 0) return;

    const url = "https://ca-live.adyen.com/ca/ca/accounts/showTx.shtml?pspReference=";
    const row = notBuiltRows[0];
    const pspReference = row.originalSPSReference;
    const txType = "Payment";
    const fullUrl = url + pspReference + "&txType=" + txType;

    return {url: fullUrl, row: row, pspReference: pspReference};
}

async function copyOutput(output) {
    const outputText = output.map(row => {
        const customerId = row.customer.customerId;
        
        const items = [row.customer, row.subscriptions, row.payment, row.paymenttx];

        return customerId + "\t" + items.map(i => JSON.stringify(i, null, 4)).map(i => '"' + i.replaceAll('"', '""') + '"').join("\t");
    }).join("\r\n");

    await navigator.clipboard.writeText(outputText);
}

function getStoredString(key) {
    return localStorage.getItem(key) || "";
}

function getStoredArray(key) {
    const saved = localStorage.getItem(key);
    return JSON.parse(saved) || [];
}

export default function AdyenStitchingPage() {
    const [rowsText, setRowsText] = useState(() => getStoredString("adyenRows"));
    const [adyenOutputText, setAdyenOutputText] = useState(() => getStoredString("adyenOutput"));
    const [adyenDetailText, setAdyenDetailText] = useState(() => getStoredString("adyenDetails"));
    const [rows, setRows] = useState(() => getStoredArray("adyenRows"));
    const [output, setOutput] = useState(() => getStoredArray("meenakshiOutputRows"));
    const [selectedRow, setSelectedRow] = useState(null);
    const [nextLink, setNextLink] = useState(null);


    const saveRowsText = (text) => {
        localStorage.setItem("adyenRows", text);
        setRowsText(text);
    }

    const rowsChange = (e) => {
        const text = e.target.value;
        saveRowsText(text);

        const parsedData = parseDBText(text);
        setRows(parsedData);
    }

    const adyenOutputChanged = (text) => {
        localStorage.setItem("adyenOutput", text);
        setAdyenOutputText(text);

        if (!isJsonString(text)) return;

        const adyenOutput = JSON.parse(text);    

        const selectedRow = stitchAdyenWithRows(adyenOutput, rows)

        if (adyenOutput.details) {
            adyenDetailOutputChanged(JSON.stringify(adyenOutput.details, null, 4));

            const populated = stitchAdyenDetails(selectedRow, adyenOutput.details);
            setSelectedRow(populated);
        } else {
            setSelectedRow(selectedRow);
        }
    }

    const adyenDetailOutputChanged = (text) => {
        localStorage.setItem("adyenDetails", text);
        setAdyenDetailText(text);

        if (!isJsonString(text)) return;

        const detailOutput = JSON.parse(text);
        const details = detailOutput[0];

        const populated = stitchAdyenDetails(selectedRow, details);
        setSelectedRow(populated);
    }

    const saveBuilt = (row) => {
        output.push(row);
        setOutput(output);
        localStorage.setItem("meenakshiOutputRows", JSON.stringify(output));
        adyenOutputChanged("")
        adyenDetailOutputChanged("")
        setSelectedRow(null);
    }

    const nextButtonClicked = () => {
        const linkUrl = buildLink(rows, output);
        setNextLink(linkUrl);
    }

    const fixOutput = (output) => {
            output.forEach(row => {
            postProcessRow(row);
        });

        let filteredOutput = [];

        output.forEach(row => {
            postProcessRow(row);
            if (filteredOutput.find(r => r.customer.customerId === row.customer.customerId)) return;
            filteredOutput.push(row);
        });

        setOutput(filteredOutput);
        localStorage.setItem("meenakshiOutputRows", JSON.stringify(output));
    };

    return <div className="categoryWrapper" >
        <div className="categoryContainer" style={{width: "100%"}}>
            <textarea name="Text1" cols="280" rows="10" defaultValue={rowsText} onChange={rowsChange}></textarea>
            <textarea name="Text2" cols="100" rows="41" value={adyenOutputText} onChange={e => adyenOutputChanged(e.target.value)}></textarea>
            <textarea name="Text3" cols="100" rows="41" value={adyenDetailText} onChange={e => adyenDetailOutputChanged(e.target.value)}></textarea>
            {!selectedRow && <span style={{background: "white"}}> 
                <button onClick={nextButtonClicked}>Next</button>
                {nextLink && <a onClick={() => setNextLink(null)} href={nextLink.url} target="_blank" rel="noreferrer">{nextLink.pspReference}</a>}
            </span>}
            <br/>
            {rowDisplay(selectedRow, saveBuilt)}
            <p>Output rows ready: {output.length}</p>
            {output.map((row, i) => <div key={i}>{row.customer.customerId} -- {row.paymenttx.originalSPSReference}</div>)}
            <button onClick={() => copyOutput(output)}>Copy</button>
            <button onClick={() => fixOutput(output)}>Fix output</button>
        </div>
    </div>;
}



