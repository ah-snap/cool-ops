import React, { useState } from "react";
import "../../stylesheets/categories.css"
import { Mapping } from "../../types.t";
import MappingDisplay from "../MappingDisplay.tsx";
import { markAccountAsConnect } from "../../actions/accountActions.ts";
import { isServerError, parseApiResponse } from "../../actions/apiClient.ts";
import { apiUrl } from "../../config.ts";

function MappingPage() {
    const [commonNameOrMac, setCommonNameOrMac] = useState<string>("");
    const [enableButton, setEnableButton] = useState<boolean>(false);
    const [mapping, setMapping] = useState<Mapping | null>(null);

    const updateCommonName = (event: { target: { value: any; }; }) => {
        const value = event.target.value;
        setEnableButton(value.length > 0);
        setCommonNameOrMac(value);
    }

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
        
    }

    return <div className="categoryWrapper">
        <div className="categoryContainer">
            <h1>Mapping</h1>
            <label>
                CommonName or Mac Address: 
                <input type="text" value={commonNameOrMac} onChange={updateCommonName} style={{marginLeft: 5, marginRight: 5, width: 220, height:20}} />
                <button disabled={!enableButton} onClick={attempt}>Attempt</button>
            </label>

            <div style={{marginTop: 20}}>
                {<MappingDisplay mapping={mapping} />}
                <div>
                    <button onClick={async () => {
                        if (mapping) {
                            const result = await markAccountAsConnect(mapping.Name);
                            if (result && 'error' in result) {
                                alert(result.error);
                            } else {
                                setMapping(result as Mapping);
                            }
                        }
                    }}>Mark as Connect</button>

                </div>
            </div>
        </div>
    </div>;
}

export default MappingPage;

