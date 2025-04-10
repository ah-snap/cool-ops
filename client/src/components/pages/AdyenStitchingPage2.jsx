import React, { useState } from "react";
import "../../stylesheets/categories.css"

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

function buildLink(row) {
    const pspReference = row.paymenttx.originalSPSReference;
    const url = `https://ca-live.adyen.com/ca/ca/accounts/showRecurringContract.shtml?txType=Payment&pspReference=${pspReference}&accountKey=MerchantAccount.SnapOneSNOW`;

    return {url: url, row: row, pspReference: pspReference};
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

export default function AdyenStitchingPage2() {
    const [outputV1, setOutputV1] = useState(() => getStoredArray("meenakshiOutputRows"));
    const [outputV2, setOutputV2] = useState([]);
    const [adyenDetailText, setAdyenDetailText] = useState(() => getStoredString("adyenDetails"));
    const [selectedRow, setSelectedRow] = useState(() => getStoredArray("meenakshiOutputRows")[0]);
    const [nextLink, setNextLink] = useState(null);

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
        setOutputV2([...outputV2, row]);
        localStorage.setItem("meenakshiOutputRowsV2", JSON.stringify(outputV2));
        adyenDetailOutputChanged("")
    }

    const nextButtonClicked = () => {
        const index = outputV1.indexOf(outputV1.find(row => row.paymenttx.originalSPSReference === selectedRow.paymenttx.originalSPSReference));

        saveBuilt(selectedRow);
        console.log("next", index);
        if (index === -1) return;
        if (index === outputV1.length - 1) return;

        const nextRow = outputV1[index + 1];
        console.log("next row", nextRow);
        setSelectedRow(nextRow);
    }

    const replaceDetails = (row, details) => {
        const detailOutput = JSON.parse(details);
        const populated = stitchAdyenDetails(row, detailOutput[0]);
        setSelectedRow(populated);
    };

    const fillFromClipboard = () => {
        navigator.clipboard.readText().then(text => {
            adyenDetailOutputChanged(text);
        });
    }

    const replaceButtonText = selectedRow?.payment.cardAlias ? "Replace Existing" : "Populate";

    return <div className="categoryWrapper" >
        <div className="categoryContainer" style={{width: "100%"}}>
            {/* <textarea name="Text1" cols="280" rows="10" defaultValue={""}></textarea> */}
            <textarea name="Text2" cols="100" rows="41" value={selectedRow && JSON.stringify(selectedRow.payment, null, 2)}></textarea>
            <textarea name="Text3" cols="100" rows="41" value={adyenDetailText} onChange={e => adyenDetailOutputChanged(e.target.value)}></textarea>
            <button onClick={() => replaceDetails(selectedRow, adyenDetailText)}>{replaceButtonText}</button>
            <button onClick={() => fillFromClipboard()}>Fill From Clipboard</button>
            <button onClick={() => nextButtonClicked()}>Next</button>
            {selectedRow && <a href={buildLink(selectedRow).url} target="_blank" rel="noreferrer">{selectedRow.paymenttx.originalSPSReference}</a>}
            <p>Output rows ready: {outputV2.length}</p>
            {outputV2.map((row, i) => <div key={i}>{row.customer.customerId} -- {row.paymenttx.originalSPSReference}</div>)}
            <button onClick={() => copyOutput(outputV2)}>Copy</button>
        </div>
    </div>;
}



