import React, { useState } from "react";
import "../../stylesheets/categories.css"
import { Mapping } from "../../types.t";
import MappingDisplay from "../MappingDisplay.tsx";

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
        const response = await fetch(`http://localhost:3003/api/commonNames/${commonNameOrMac}`);
        const data = await response.json();
        setEnableButton(true);
        if (data.error) {
            alert(data.error);
            return;
        }
        if (data.length === 0) {
            alert("No results found");
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
                {mapping && <MappingDisplay mapping={mapping} />}
                {!enableButton && commonNameOrMac ? "Loading..." : null}
            </div>
        </div>
    </div>;
}

export default MappingPage;

