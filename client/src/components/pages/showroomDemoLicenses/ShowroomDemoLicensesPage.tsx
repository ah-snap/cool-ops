import React from "react";
import { isServerError, parseApiResponse } from "../../../actions/apiClient.ts";
import { apiUrl } from "../../../config.ts";
import PageShell from "../../common/layout/PageShell.tsx";
import "./showroomDemoLicenses.css";

type Change = {
  dCode: any;
  freeConnectLicenses: number;
  success?: boolean;
};

function ChangeLines({ changes, setChanges }: { changes: Change[]; setChanges: (changes: Change[]) => void }) {
  const updateChange = (index: number, update: Partial<Change>) => {
    const newChanges = [...changes];
    newChanges[index] = { ...newChanges[index], ...update };
    setChanges(newChanges);
  };

  return changes.map((change, index) => (
    <div key={index} className="changeItem">
      <label>DCode: </label>
      <input type="text" value={change.dCode || ""} onChange={(e) => updateChange(index, { dCode: e.target.value })} className="showroomDemoLicensesInput" />

      <label>Number of FreeConnectLicenses: </label>
      <input type="number" value={change.freeConnectLicenses || 3} onChange={(e) => updateChange(index, { freeConnectLicenses: parseInt(e.target.value) || 3 })} className="showroomDemoLicensesInput" />

      {change.success && <span className="showroomDemoLicensesSuccess">✔️ Success</span>}
    </div>
  ));
}

async function updateLicenses(changes: Change[]) {
  if (changes.length === 0) {
    alert("No changes to execute.");
    return;
  }

  const payload = changes.map((change) => ({
    dCode: change.dCode.trim(),
    freeConnectLicenses: change.freeConnectLicenses
  }));

  const response = await fetch(apiUrl("/showroomDemoLicenses"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return await parseApiResponse<Array<{ accountNum: string; freeConnectLicenses: number }>>(response);
}

export default function ShowroomDemoLicensesPage() {
  const [changes, setChanges] = React.useState<Change[]>([]);

  const textAreaChanged = (event: { target: { value: string } }) => {
    const text = event.target.value.trim();

    const lines = text.split("\n").filter((line: string) => line.trim() !== "");

    const builtChanges: Change[] = lines.map((line: string) => {
      const fields = line.split("\t");
      const dCode = fields[0];
      const freeConnectLicenses = fields[1] ? parseInt(fields[1]) : 3;
      return { dCode, freeConnectLicenses };
    });

    setChanges(builtChanges);
  };

  async function execute() {
    const response = await updateLicenses(changes);

    if (isServerError(response)) {
      alert(response.error);
      return;
    }

    for (const row of response) {
      const change = changes.find((c) => c.dCode.trim() === row.accountNum.trim());
      if (change && row.freeConnectLicenses === change?.freeConnectLicenses) {
        change.success = true;
      }
    }

    setChanges([...changes]);
  }

  return <PageShell>
      <h1>Changes</h1>
      <textarea name="Text2" cols={100} rows={41} onChange={textAreaChanged}></textarea>
      <ChangeLines changes={changes} setChanges={setChanges} />
      <div>
        <button onClick={() => execute()}>Execute</button>
      </div>
  </PageShell>;
}
