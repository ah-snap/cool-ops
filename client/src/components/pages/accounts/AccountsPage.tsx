import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import MappingDisplay from "../../MappingDisplay.tsx";
import { LicenseData, Mapping, ServerError } from "../../../types.t";
import { getAccountMappingByCommonNameOrMac, updateAccountType } from "../../../actions/accountActions.ts";
import { getLicensesForAccount } from "../../../actions/licenseActions.ts";
import PageShell from "../../common/layout/PageShell.tsx";
import ExtraInformationTab from "./tabs/ExtraInformationTab.tsx";
import LicensesTab from "./tabs/LicensesTab.tsx";
import AddressTab from "./tabs/AddressTab.tsx";
import "./accounts.css";

type TabKey = "extra" | "licenses" | "address" | "users";

function handleAccountMapping(value: Mapping | ServerError | null, setMapping: React.Dispatch<React.SetStateAction<Mapping | null>>): void {
  if (!value || 'error' in value) {
    alert(value?.error ?? "No account found");
    return;
  }

  setMapping(value as Mapping | null);
}

function handleLicenseData(value: LicenseData[] | ServerError | null, setLicenseData: React.Dispatch<React.SetStateAction<LicenseData[] | null>>): void {
  if (!value || 'error' in value) {
    alert(value?.error ?? "No licenses found");
    return;
  }

  setLicenseData(value as LicenseData[] | null);
}

export default function AccountsPage() {
  const { commonNameOrMac: routeCommonNameOrMac } = useParams<{ commonNameOrMac?: string }>();
  const navigate = useNavigate();
  const [commonNameOrMac, setCommonNameOrMac] = useState<string>(routeCommonNameOrMac ?? "");
  const [enableButton, setEnableButton] = useState<boolean>(Boolean(routeCommonNameOrMac));
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const [licenseData, setLicenseData] = useState<LicenseData[] | null>(null);
  const [psp, setPsp] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("extra");
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
    handleAccountMapping(nextMapping, setMapping);

    if (!nextMapping || 'error' in nextMapping) {
      setEnableButton(true);
      return;
    }

    const licenses = await getLicensesForAccount(nextMapping?.Name ?? "");
    handleLicenseData(licenses, setLicenseData);

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
      navigate(`/accounts/${encoded}`, { replace: false });
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

  const refreshMapping = () => {
    const v = commonNameOrMac.trim();
    if (v) runLookup(v);
  };

  const updateLicenses = async () => {
    setLicenseData(null);
    const licenses = await getLicensesForAccount(mapping?.Name ?? "");
    handleLicenseData(licenses, setLicenseData);
  };

  const markAs = async (newType: "Connect" | "Legacy") => {
    if (!mapping) return;
    const result = await updateAccountType(mapping.Name, newType);
    if (result && 'error' in result) {
      alert(result.error);
    } else {
      setMapping(result as Mapping);
    }
  };

  return <PageShell>
      <h1>Accounts</h1>
      <form onSubmit={handleSubmit}>
        <label>
          CommonName or Mac Address:
          <input ref={inputRef} type="text" value={commonNameOrMac} onChange={updateCommonName} className="accountsPageInput" />
          <button type="submit" disabled={!enableButton}>Attempt</button>
        </label>
      </form>

      <div className="accountsMappingSection">
        <MappingDisplay mapping={mapping} onRefresh={refreshMapping} />
      </div>

      <div className="accountsTabsSection">
        <ThemeProvider theme={createTheme({ palette: { mode: "dark" } })}>
          <Tabs value={activeTab} onChange={(_event, value) => setActiveTab(value)}>
            <Tab value="extra" label="Extra Information" />
            <Tab value="licenses" label="Licenses" />
            <Tab value="address" label="Address" />
            <Tab value="users" label="Users" />
          </Tabs>
        </ThemeProvider>

        {activeTab === "extra" && (
          <ExtraInformationTab
            mapping={mapping}
            onMarkAsConnect={() => markAs("Connect")}
            onMarkAsLegacy={() => markAs("Legacy")}
          />
        )}
        {activeTab === "licenses" && (
          <LicensesTab
            mapping={mapping}
            licenseData={licenseData}
            psp={psp}
            setPsp={setPsp}
            date={date}
            setDate={setDate}
            onLicenseAdded={updateLicenses}
          />
        )}
        {activeTab === "address" && <AddressTab mapping={mapping} />}
        {activeTab === "users" && (
          <div className="accountsTabSection">
            <p>Users tab coming soon.</p>
          </div>
        )}
      </div>
  </PageShell>;
}
