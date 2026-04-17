import React, { useState } from "react";
import { Mapping } from "../../../types.t";
import MappingDisplay from "../../MappingDisplay.tsx";
import * as accountActions from "../../../actions/accountActions.ts";
import { isServerError, parseApiResponse } from "../../../actions/apiClient.ts";
import { apiUrl } from "../../../config.ts";
import PageShell from "../../common/layout/PageShell.tsx";
import "./mapping.css";

function MappingPage() {
  const [commonNameOrMac, setCommonNameOrMac] = useState<string>("");
  const [enableButton, setEnableButton] = useState<boolean>(false);
  const [mapping, setMapping] = useState<Mapping | null>(null);

  const updateCommonName = (event: { target: { value: any } }) => {
    const value = event.target.value;
    setEnableButton(value.length > 0);
    setCommonNameOrMac(value);
  };

  const attempt = async () => {
    setMapping(null);
    setEnableButton(false);
    const response = await fetch(apiUrl(`/commonNames/${commonNameOrMac}`));
    const data = await parseApiResponse<Mapping>(response);
    setEnableButton(true);
    if (isServerError(data)) {
      alert(data.error);
      return;
    }
    setMapping(data);
  };

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
      <label>
        CommonName or Mac Address:
        <input type="text" value={commonNameOrMac} onChange={updateCommonName} className="mappingPageInput" />
        <button disabled={!enableButton} onClick={attempt}>Attempt</button>
      </label>


      <div className="mappingPageContent">
        {<MappingDisplay mapping={mapping} />}
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
