import { useState } from "react";
import MappingDisplay from "../../MappingDisplay.tsx";
import { LicenseData, Mapping, ServerError } from "../../../types.t";
import AddMissingLicenseGrid from "../../AddMissingLicenseGrid.tsx";
import { getAccountMappingByCommonNameOrMac } from "../../../actions/accountActions.ts";
import { getLicensesForAccount } from "../../../actions/licenseActions.ts";
import LicensesDisplay from "../../LicensesDisplay.tsx";
import PageShell from "../../common/layout/PageShell.tsx";
import "./missingLicense.css";

function handleAccountMapping(value: Mapping | ServerError | null, setMapping: React.Dispatch<React.SetStateAction<Mapping | null>>): Mapping | ServerError | PromiseLike<Mapping | ServerError | null> | null {
  if (!value || 'error' in value) {
    alert(value?.error ?? "No mapping found");
    return value;
  }

  setMapping(value as Mapping | null);

  return value;
}

function handleLicenseData(value: LicenseData[] | ServerError | null, setLicenseData: React.Dispatch<React.SetStateAction<LicenseData[] | null>>): LicenseData[] | ServerError | PromiseLike<LicenseData[] | ServerError | null> | null {
  if (!value || 'error' in value) {
    alert(value?.error ?? "No licenses found");
    return value;
  }

  setLicenseData(value as LicenseData[] | null);

  return value;
}

export default function MissingLicensePage() {
  const [commonNameOrMac, setCommonNameOrMac] = useState<string>("");
  const [enableButton, setEnableButton] = useState<boolean>(false);
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [licenseData, setLicenseData] = useState<LicenseData[] | null>(null);
  const [psp, setPsp] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);

  const updateCommonName = (event: { target: { value: any } }) => {
    const value = event.target.value;
    setEnableButton(value.length > 0);
    setCommonNameOrMac(value);
  };

  const attempt = async () => {
    setMapping(null);
    setEnableButton(false);
    setLicenseData(null);

    const nextMapping = await getAccountMappingByCommonNameOrMac(commonNameOrMac);
    await handleAccountMapping(nextMapping, setMapping);

    if (!nextMapping || 'error' in nextMapping) {
      setEnableButton(true);
      return;
    }

    const licenses = await getLicensesForAccount(nextMapping?.Name ?? "");
    await handleLicenseData(licenses, setLicenseData);

    setEnableButton(true);
  };

  const updateLicenses = async () => {
    setLicenseData(null);
    const licenses = await getLicensesForAccount(mapping?.Name ?? "");
    await handleLicenseData(licenses, setLicenseData);
  };

  return <PageShell>
      <h1>Licenses</h1>
      <label>
        CommonName or Mac Address:
        <input type="text" value={commonNameOrMac} onChange={updateCommonName} className="missingLicenseInput" />
        <button disabled={!enableButton} onClick={attempt}>Attempt</button>
      </label>

      <div className="missingLicenseSection">
        <h2>Mapping</h2>
        {<MappingDisplay mapping={mapping} />}
      </div>
      <div className="missingLicenseSection">
        <h2>Licenses</h2>
        {<LicensesDisplay licenseData={licenseData} />}
        <div>
          <input type="text" defaultValue={psp ?? ""} onChange={(e) => setPsp(e.target.value)} placeholder="PSP" />
          <input type="text" defaultValue={date ?? ""} onChange={(e) => setDate(e.target.value)} placeholder="Date" />
        </div>
        <div>
          <input type="text" defaultValue={mapping?.external_id?.toUpperCase()} onChange={(e) => setPsp(e.target.value)} placeholder="external" readOnly={true} className="missingLicenseExternalInput" />
        </div>
        {mapping && <AddMissingLicenseGrid licenseRow={{ transaction_id: psp ?? "", ExpirationDate: date ?? "", sku: "" }} mapping={mapping} onComplete={() => updateLicenses()} />}
      </div>
  </PageShell>;
}
