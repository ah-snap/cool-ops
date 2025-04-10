import React from "react";
import "../../stylesheets/categories.css"

function ChangeLine({change, index, changes, setChanges}) {
    return <div key={index} className="changeItem">
        <label>DCode: </label>
        <input type="text" value={change.dCode || ""} onChange={(e) => {
            const newChanges = [...changes];
            newChanges[index] = {...newChanges[index], dCode: e.target.value};
            setChanges(newChanges);
        }} style={{marginLeft: 5, marginRight: 5, width: 220, height:20}} />
        <label>Number of FreeConnectLicenses: </label>
        <input type="number" value={change.freeConnectLicenses || 3} onChange={(e) => {
            const newChanges = [...changes];
            newChanges[index] = {...newChanges[index], freeConnectLicenses: parseInt(e.target.value) || 0};
            setChanges(newChanges);
        }} style={{marginLeft: 5, marginRight: 5, width: 220, height:20}} />
        {change.success && <span style={{color: "green", marginLeft: 10}}>✔️ Success</span>}
    </div>
}

function ChangeLines({changes, setChanges}) {
    return changes.map((change, index) => (
        <ChangeLine key={index} change={change} index={index} changes={changes} setChanges={setChanges} />
    ));
}

async function updateLicenses(changes) {
    
    if (changes.length === 0) {
        alert("No changes to execute.");
        return;
    }

    const payload = changes.map(change => ({
        dCode: change.dCode.trim(),
        freeConnectLicenses: change.freeConnectLicenses
    }));

    const response = await fetch("http://localhost:3003/api/showroomDemoLicenses", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    })

    return await response.json();
}


export default function ShowroomDemoLicensesPage() {
    const [changes, setChanges] = React.useState([]);

    const textAreaChanged = (event) => {
        console.log("Text area changed:", event.target.value);
        const text = event.target.value.trim();

        const lines = text.split("\n").filter(line => line.trim() !== "");

        setChanges(lines.map(line => {
            const fields = line.split("\t");
            const dCode = fields[0];
            const freeConnectLicenses = fields[1] ? parseInt(fields[1]) : 3; // Default to 3 if not specified
            return {dCode, freeConnectLicenses}
        }));
    }

    async function execute() {
        const response = await updateLicenses(changes);

        for (const row of response) {
            const change = changes.find(c => c.dCode.trim() === row.accountNum.trim());
            if (row.freeConnectLicenses === change.freeConnectLicenses) {
                change.success = true;
            }
        }

        setChanges([...changes]);
    }

    console.log("Render", changes);

    return <div className="categoryWrapper">
        <div className="categoryContainer">
            <h1>Changes</h1>
            <textarea name="Text2" cols="100" rows="41" onChange={textAreaChanged}></textarea>
            <ChangeLines changes={changes} setChanges={setChanges} />
            <div>
                <button onClick={() => execute(changes)}>Execute</button>
            </div>
        </div>
    </div>;
}
