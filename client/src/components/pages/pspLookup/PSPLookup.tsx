import React from "react";
import { isServerError, parseApiResponse } from "../../../actions/apiClient.ts";
import { apiUrl } from "../../../config.ts";
import PageShell from "../../common/layout/PageShell.tsx";
import "./pspLookup.css";

type Row = {
  psp: string;
  externalAccountId: string;
  accountName: string;
  status: string;
};

function AccountLines({ rows, setRows }: { rows: Row[]; setRows: (rows: Row[]) => void }) {
  const updateRow = (index: number, update: Partial<Row>) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], ...update };
    setRows(newRows);
  };

  const lookupExternalAccountId = async (psp: string, index: number) => {
    const response = await fetch(apiUrl(`/adyen/${psp}`));
    const data = await parseApiResponse<{ shopperInfo?: { shopperReference?: string }; paymentOverview?: { status?: string } }>(response);
    if (isServerError(data)) {
      alert(data.error);
      return;
    }

    updateRow(index, { externalAccountId: data.shopperInfo?.shopperReference || "", status: data.paymentOverview?.status || "" });
  };

  return rows.map((row, index) => (
    <div key={index} className="changeItem">
      <label>PSP: </label>
      <input type="text" value={row.psp || ""} onChange={(e) => updateRow(index, { psp: e.target.value })} className="pspLookupInput" />

      <label>External Account ID: </label>
      <input type="text" value={row.externalAccountId || ""} onChange={(e) => updateRow(index, { externalAccountId: e.target.value })} className="pspLookupInput" />

      <label>Status: </label>
      <input type="text" value={row.status || ""} onChange={(e) => updateRow(index, { status: e.target.value })} className="pspLookupInput" />

      <button onClick={() => lookupExternalAccountId(row.psp, index)}>Lookup</button>
    </div>
  ));
}

function OutputBox({ rows }: { rows: Row[] }) {
  const lookup = rows.map((row) => `${row.psp}\t${row.externalAccountId}`).join("\n");

  return (
    <div className="outputBox">
      <h2>Output</h2>
      <pre>{lookup}</pre>
    </div>
  );
}

export default function PSPLookup() {
  const [rows, setRows] = React.useState<Row[]>([]);

  const textAreaChanged = (event: { target: { value: string } }) => {
    const text = event.target.value.trim();
    const lines = text.split("\n").filter((line: string) => line.trim() !== "");

    const builtRows: Row[] = lines.map((line: string) => {
      const fields = line.split("\t");
      const psp = fields[0];
      if (fields.length < 2) return { psp, externalAccountId: "", accountName: "", status: "" };
      const externalAccountId = fields[1];
      const accountName = fields[2] || "";
      return { psp, externalAccountId, accountName, status: "" };
    });

    setRows(builtRows);
  };

  return <PageShell>
      <h1>Changes</h1>
      <textarea name="Text2" cols={100} rows={41} onChange={textAreaChanged}></textarea>
      <AccountLines rows={rows} setRows={setRows} />
      <OutputBox rows={rows} />
  </PageShell>;
}
