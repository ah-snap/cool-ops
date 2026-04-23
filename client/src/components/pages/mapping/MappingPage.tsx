import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Mapping } from "../../../types.t";
import MappingDisplay from "../../MappingDisplay.tsx";
import * as accountActions from "../../../actions/accountActions.ts";
import { isServerError, parseApiResponse } from "../../../actions/apiClient.ts";
import { apiUrl } from "../../../config.ts";
import PageShell from "../../common/layout/PageShell.tsx";
import "./mapping.css";

function MappingPage() {
  const { commonNameOrMac: routeCommonNameOrMac } = useParams<{ commonNameOrMac?: string }>();
  const navigate = useNavigate();
  const [commonNameOrMac, setCommonNameOrMac] = useState<string>(routeCommonNameOrMac ?? "");
  const [enableButton, setEnableButton] = useState<boolean>(Boolean(routeCommonNameOrMac));
  const [mapping, setMapping] = useState<Mapping | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const updateCommonName = (event: { target: { value: any } }) => {
    const value = event.target.value;
    setEnableButton(value.length > 0);
    setCommonNameOrMac(value);
  };

  const lookup = async (value: string) => {
    setMapping(null);
    setEnableButton(false);
    const response = await fetch(apiUrl(`/commonNames/${value}`));
    const data = await parseApiResponse<Mapping>(response);
    setEnableButton(true);
    if (isServerError(data)) {
      alert(data.error);
      return;
    }
    setMapping(data);
  };

  const attempt = async () => {
    const trimmed = commonNameOrMac.trim();
    if (!trimmed) return;
    if (trimmed !== commonNameOrMac) {
      setCommonNameOrMac(trimmed);
    }
    const encoded = encodeURIComponent(trimmed);
    if (routeCommonNameOrMac !== trimmed) {
      navigate(`/mapping/${encoded}`, { replace: false });
    }
    await lookup(trimmed);
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
      lookup(trimmed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeCommonNameOrMac]);

  const updateAccountType = async (accountName: string, newType: "Connect" | "Legacy") => {
    const result = await accountActions.updateAccountType(accountName, newType);
    if (result && 'error' in result) {
      alert(result.error);
    } else {
      setMapping(result as Mapping);
    }
  };


  return <PageShell>
      <h1>Mapping</h1>
      <form onSubmit={handleSubmit}>
        <label>
          CommonName or Mac Address:
          <input ref={inputRef} type="text" value={commonNameOrMac} onChange={updateCommonName} className="mappingPageInput" />
          <button type="submit" disabled={!enableButton}>Attempt</button>
        </label>
      </form>


      <div className="mappingPageContent">
        {<MappingDisplay mapping={mapping} onRefresh={() => { const v = commonNameOrMac.trim(); if (v) lookup(v); }} />}
        <div>
          <button onClick={async () => {
            if (mapping) {
              updateAccountType(mapping.Name, "Connect");
            }
          }}>Mark as Connect</button>
          <button onClick={async () => {
            if (mapping) {
              updateAccountType(mapping.Name, "Legacy");
            }
          }}>Mark as Legacy</button>
        </div>
      </div>
  </PageShell>;
}

export default MappingPage;
