import React, { useState } from "react";
import "../../stylesheets/categories.css"
import AddLicenseGrid from "../AddLicenseGrid.tsx";
import MappingDisplay from "../MappingDisplay.tsx";
import { LicenseData, Mapping } from "../../types.t";

function LicensesDisplay({ licenseData } : { licenseData: LicenseData[] }) {
    const [addingFromRow, setAddingFromRow] = React.useState<LicenseData | null>(null);

    return <div className="mappingDisplay">
        <table>
            <thead>
                <tr>
                    <th>SKU</th>
                    <th>ActivationDate</th>
                    <th>ExpirationDate</th>
                    <th>Code</th>
                    <th>Transaction Id</th>
                    <th>Add</th>
                </tr>
            </thead>
            <tbody>
                {licenseData.map(license => <tr key={license.Code}>
                    <td>{license.sku}</td>
                    <td>{license.ActivationDate}</td>
                    <td>{license.ExpirationDate}</td>
                    <td>{license.Code}</td>
                    <td>{license.transaction_id}</td>
                    <td><button onClick={() => addingFromRow === license ? setAddingFromRow(null) : setAddingFromRow(license)}>Add</button></td>
                </tr>
                )}
            </tbody>
        </table>

        {addingFromRow && <AddLicenseGrid licenseRow={addingFromRow} />}
    </div>
}


export default function LicensesPage() {
    const [commonNameOrMac, setCommonNameOrMac] = useState<string>("");
    const [enableButton, setEnableButton] = useState<boolean>(false);
    const [mapping, setMapping] = useState<Mapping | null>(null);
    const [licenseData, setLicenseData] = useState(null);

    const updateCommonName = (event: { target: { value: any; }; }) => {
        const value = event.target.value;
        setEnableButton(value.length > 0);
        setCommonNameOrMac(value);
    }

    const loadLicenses = async (mapping : Mapping) => {
        const response = await fetch(`http://localhost:3003/api/licenses/${mapping.Name}`);
        const data = await response.json();
        if (data.error) {
            alert(data.error);
            return;
        }
        setLicenseData(data);
    }

    const attempt = async () => {
        setMapping(null);
        setEnableButton(false);
        setLicenseData(null);
        const response = await fetch(`http://localhost:3003/api/commonNames/${commonNameOrMac}`);
        const data = await response.json();
        setEnableButton(true);
        if (data.error) {
            console.log(data.error);
            alert(data.error);
            return;
        }
        if (data.length === 0) {
            alert("No results found");
            return;
        }
        setMapping(data);
        
        await loadLicenses(data);
    }

    return <div className="categoryWrapper">
        <div className="categoryContainer">
            <h1>Licenses</h1>
            <label>
                CommonName or Mac Address: 
                <input type="text" value={commonNameOrMac} onChange={updateCommonName} style={{marginLeft: 5, marginRight: 5, width: 220, height:20}} />
                <button disabled={!enableButton} onClick={attempt}>Attempt</button>
            </label>

            <div style={{marginTop: 20}}>
                <h2>Mapping</h2>
                {mapping && <MappingDisplay mapping={mapping} />}
                {!enableButton && commonNameOrMac ? "Loading..." : null}
            </div>
            <div style={{marginTop: 20}}>
                <h2>Licenses</h2>
                {licenseData && <LicensesDisplay licenseData={licenseData} />}
                {!enableButton && commonNameOrMac ? "Loading..." : null}
            </div>
        </div>
    </div>;
}

