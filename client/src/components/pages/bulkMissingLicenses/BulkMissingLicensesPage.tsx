import React from "react";
import { LicenseData, Mapping } from "../../../types.t";
import AddMissingLicenseGrid from "../../AddMissingLicenseGrid.tsx";
import { isServerError, parseApiResponse } from "../../../actions/apiClient.ts";
import { apiUrl } from "../../../config.ts";
import PageShell from "../../common/layout/PageShell.tsx";
import "./bulkMissingLicenses.css";

type Row = {
  psp: string;
  externalAccountId: string;
  accountName: string;
  status: string;
  data?: Array<Record<string, unknown>>;
};

type LicenseLookupRow = {
  userId: number;
  accountId: number;
  ovrc_location_id: string;
  consumerId: string | number;
  ExpirationDate?: string;
  sku?: string;
  psp?: string;
};

function AddLicenseControl({ row, onComplete }: { row: Row; onComplete?: () => void }) {
  const firstRow = row.data?.[0] as LicenseLookupRow | undefined;
  if (!firstRow) {
    return null;
  }

  const mapping: Mapping = {
    id: 0,
    external_id: row.externalAccountId,
    userId: firstRow.userId,
    accountId: firstRow.accountId,
    dealerId: 0,
    ovrc_location_id: firstRow.ovrc_location_id,
    d365CustomerID: "C" + firstRow.consumerId,
    mac: "00:00:00:00:00:00",
    dealerName: "Default Dealer",
    Name: "Default Mapping Name",
    ConnectStatus: "Active",
    CertificateCommonName: "default_common_name",
    locationId: firstRow.ovrc_location_id,
    dCode: "default_dcode",
    companyName: "Default Company",
    is_domestic: true
  };

  const data = (row.data || []) as LicenseLookupRow[];
  const maxExpirationDate = data.reduce((max: string, item) => (item.ExpirationDate || "") > max ? String(item.ExpirationDate || "") : max, "");
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
    Code: row.externalAccountId || ""
  };

  return <PageShell>
      <div className="bulkMissingLicensesAddControl">
        <h2>Add License</h2>
        <AddMissingLicenseGrid licenseRow={licenseRow} mapping={mapping} onComplete={onComplete} />
      </div>
  </PageShell>;
}

function AccountLines({ rows, setRows }: { rows: Row[]; setRows: React.Dispatch<React.SetStateAction<Row[]>> }) {
  const updateRow = (index: number, update: Partial<Row>) => {
    setRows((currentRows: Row[]) => {
      const newRows: Row[] = [...currentRows];
      newRows[index] = { ...newRows[index], ...update };
      return newRows;
    });
  };

  const calculateStatus = (data: Array<Record<string, unknown>>, psp: string) => {
    if (!data || !data.length) return "Unknown";

    const pspInData = data.some((item) => String(item.psp || "").startsWith(psp));
    if (pspInData) return "License Present";

    const maxExpirationDate = data.filter((row) => row.sku === "C4-Connect").reduce((max: string, item) => String(item.ExpirationDate || "") > max ? String(item.ExpirationDate || "") : max, "");
    const oneMonthinFuture = new Date();
    oneMonthinFuture.setMonth(oneMonthinFuture.getMonth() + 1);

    if (maxExpirationDate > oneMonthinFuture.toISOString().split("T")[0]) {
      return "Other License Purchased";
    }

    return "No License Found";
  };

  const lookupExternalAccountId = async (externalAccountId: string, psp: string, index: number) => {
    const response = await fetch(apiUrl(`/licenses/${externalAccountId}/${psp}`));
    const data = await parseApiResponse<Array<Record<string, unknown>>>(response);
    if (isServerError(data)) {
      alert(data.error);
      return;
    }

    updateRow(index, { status: calculateStatus(data, psp), data });
  };

  const lookupAll = () => {
    rows.forEach((row, index) => {
      if (row.externalAccountId && row.psp) {
        lookupExternalAccountId(row.externalAccountId, row.psp, index);
      }
    });
  };

  return <>
    <div>
      <button onClick={lookupAll} className="bulkMissingLicensesLookupAll">Lookup All</button>
    </div>

    {rows.map((row, index) => (
      <div key={index} className="changeItem">
        <label>PSP: </label>
        <input type="text" value={row.psp || ""} onChange={(e) => updateRow(index, { psp: e.target.value })} style={{ marginLeft: 5, marginRight: 5, width: 220, height: 20 }} />

        <label>External Account ID: </label>
        <input type="text" value={row.externalAccountId || ""} onChange={(e) => updateRow(index, { externalAccountId: e.target.value })} style={{ marginLeft: 5, marginRight: 5, width: 220, height: 20 }} />

        <label>Status: </label>
        <input type="text" value={row.status || ""} onChange={(e) => updateRow(index, { status: e.target.value })} style={{ marginLeft: 5, marginRight: 5, width: 220, height: 20 }} />

        <button onClick={() => lookupExternalAccountId(row.externalAccountId, row.psp, index)}>Lookup</button>
        {row.data && row.status === "No License Found" && <AddLicenseControl row={row} onComplete={() => updateRow(index, { status: "Added License" })} />}
      </div>
    ))}
  </>;
}

function OutputBox({ rows }: { rows: Row[] }) {
  const lookup = `PSP\tExternal Account ID\tStatus\r\n` + rows.map((row) => `${row.psp}\t${row.externalAccountId}\t${row.status}`).join("\r\n");

  return (
    <div className="outputBox">
      <h2>Output</h2>
      <textarea value={lookup} readOnly className="bulkMissingLicensesOutput" />
    </div>
  );
}

export default function BulkMissingLicensesPage() {
  const [rows, setRows] = React.useState<Row[]>([]);

  const textAreaChanged = (event: { target: { value: string } }) => {
    const text = event.target.value.trim();
    const lines = text.split("\n").filter((line: string) => line.trim() !== "");

    const columnIndicies = { psp: 0, externalAccountId: 0, accountName: 0, userName: 0, paymentStatus: 0 };

    const builtRows: Array<Row | null> = lines.map((line: string) => {
      const fields = line.split("\t");
      if (fields.length < 2) return { psp: "", externalAccountId: "", accountName: "", status: "" };
      if (fields.length > 3) {
        if (columnIndicies.psp === 0 && fields.includes("PSP Reference")) {
          columnIndicies.psp = fields.indexOf("PSP Reference");
          columnIndicies.externalAccountId = fields.indexOf("Shopper Reference");
          columnIndicies.userName = fields.indexOf("User Name");
          columnIndicies.paymentStatus = fields.indexOf("Status");
          return null;
        }

        const psp = fields[columnIndicies.psp];
        const externalAccountId = fields[columnIndicies.externalAccountId];
        const userName = fields[columnIndicies.userName] || "";
        const paymentStatus = fields[columnIndicies.paymentStatus] || "";
        if (userName !== "ws_105127@Company.SnapOne") return null;
        if (!["Authorized", "SettledBulk", "SentForSettle", "SettledExternally", "SettleScheduled"].includes(paymentStatus)) return null;
        return { psp, externalAccountId, accountName: "", status: "" };
      }

      const psp = fields[0];
      const externalAccountId = fields[1];
      const accountName = fields[2] || "";
      return { psp, externalAccountId, accountName, status: "" };
    });

    setRows(builtRows.filter((row): row is Row => row !== null));
  };

  return <PageShell>
      <h1>Changes</h1>
      <textarea name="Text2" cols={100} rows={41} onChange={textAreaChanged}></textarea>
      <AccountLines rows={rows} setRows={setRows} />
      <OutputBox rows={rows} />
  </PageShell>;
}
