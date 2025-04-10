import React from "react";
import "../../stylesheets/categories.css"

type Change = {
    dCode: any;
    freeConnectLicenses: number;
    success?: boolean;
}


function ChangeLines({changes, setChanges} : {  changes: Change[], setChanges: (changes: Change[]) => void }) {
    const updateChange = (index: number, update: Partial<Change>) => {
        const newChanges = [...changes];
        newChanges[index] = {...newChanges[index], ...update};
        setChanges(newChanges);
    }
    
    return changes.map((change, index) => (
        <div key={index} className="changeItem">
            <label>DCode: </label>
            <input type="text" value={change.dCode || ""} onChange={(e) => updateChange(index, { dCode: e.target.value })} style={{marginLeft: 5, marginRight: 5, width: 220, height:20}} />

            <label>Number of FreeConnectLicenses: </label>
            <input type="number" value={change.freeConnectLicenses || 3} onChange={(e) => updateChange(index, { freeConnectLicenses: parseInt(e.target.value) || 3 })} style={{marginLeft: 5, marginRight: 5, width: 220, height:20}} />

            {change.success && <span style={{color: "green", marginLeft: 10}}>✔️ Success</span>}
    </div>
    ));
}

async function updateLicenses(changes: Change[]) {
    
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
    const [changes, setChanges] = React.useState<Change[]>([]);

    const textAreaChanged = (event: { target: { value: string; }; }) => {
        console.log("Text area changed:", event.target.value);
        const text = event.target.value.trim();

        const lines = text.split("\n").filter((line: string) => line.trim() !== "");

        const builtChanges : Change[] = lines.map((line: string) => {
            const fields = line.split("\t");
            const dCode = fields[0];
            const freeConnectLicenses = fields[1] ? parseInt(fields[1]) : 3; // Default to 3 if not specified
            return {dCode, freeConnectLicenses}
        });

        setChanges(builtChanges);
    }

    async function execute() {
        const response = await updateLicenses(changes);

        for (const row of response) {
            const change = changes.find(c => c.dCode.trim() === row.accountNum.trim());
            if (change && row.freeConnectLicenses === change?.freeConnectLicenses) {
                change.success = true;
            }
        }

        setChanges([...changes]);
    }

    console.log("Render", changes);

    return <div className="categoryWrapper">
        <div className="categoryContainer">
            <h1>Changes</h1>
            <textarea name="Text2" cols={100} rows={41} onChange={textAreaChanged}></textarea>
            <ChangeLines changes={changes} setChanges={setChanges} />
            <div>
                <button onClick={() => execute()}>Execute</button>
            </div>
        </div>
    </div>;
}
