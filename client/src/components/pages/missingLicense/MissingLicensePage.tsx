import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  const { commonNameOrMac: routeCommonNameOrMac } = useParams<{ commonNameOrMac?: string }>();
  const navigate = useNavigate();
  const [commonNameOrMac, setCommonNameOrMac] = useState<string>(routeCommonNameOrMac ?? "");
  const [enableButton, setEnableButton] = useState<boolean>(Boolean(routeCommonNameOrMac));
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [licenseData, setLicenseData] = useState<LicenseData[] | null>(null);
  const [psp, setPsp] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const updateCommonName = (event: { target: { value: any } }) => {
    const value = event.target.value;
    setEnableButton(value.length > 0);
    setCommonNameOrMac(value);
  };

  const runLookup = async (value: string) => {
    setMapping(null);
    setEnableButton(false);
    setLicenseData(null);

    const nextMapping = await getAccountMappingByCommonNameOrMac(value);
    await handleAccountMapping(nextMapping, setMapping);

    if (!nextMapping || 'error' in nextMapping) {
      setEnableButton(true);
      return;
    }

    const licenses = await getLicensesForAccount(nextMapping?.Name ?? "");
    await handleLicenseData(licenses, setLicenseData);

    setEnableButton(true);
  };

  const attempt = async () => {
    const trimmed = commonNameOrMac.trim();
    if (!trimmed) return;
    if (trimmed !== commonNameOrMac) {
      setCommonNameOrMac(trimmed);
    }
    const encoded = encodeURIComponent(trimmed);
    if (routeCommonNameOrMac !== trimmed) {
      navigate(`/licenses/${encoded}`, { replace: false });
    }
    await runLookup(trimmed);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    attempt();
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const trimmed = routeCommonNameOrMac?.trim();
    if (trimmed) {
      setCommonNameOrMac(trimmed);
      runLookup(trimmed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeCommonNameOrMac]);

  const updateLicenses = async () => {
    setLicenseData(null);
    const licenses = await getLicensesForAccount(mapping?.Name ?? "");
    await handleLicenseData(licenses, setLicenseData);
  };

  return <PageShell>
      <h1>Licenses</h1>
      <form onSubmit={handleSubmit}>
        <label>
          CommonName or Mac Address:
          <input ref={inputRef} type="text" value={commonNameOrMac} onChange={updateCommonName} className="missingLicenseInput" />
          <button type="submit" disabled={!enableButton}>Attempt</button>
        </label>
      </form>

      <div className="missingLicenseSection">
        <h2>Mapping</h2>
        {<MappingDisplay mapping={mapping} onRefresh={() => { const v = commonNameOrMac.trim(); if (v) runLookup(v); }} />}
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
