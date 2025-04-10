import React from "react";
import "../../stylesheets/categories.css"

function MappingDisplay({ mapping }) {
    return <div className="mappingDisplay">
        <table>
            <thead>
                <tr>
                    <th>Source</th>
                    <th>Account Name</th>
                    <th>Controller</th>
                    <th>Connect Status</th>
                    <th>Location ID</th>
                    <th>DCode</th>
                    <th>Dealer Name</th>
                    <th>Exclude Assist</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>C4</strong></td>
                    <td>{mapping.Name}</td>
                    <td>{mapping.CertificateCommonName}</td>
                    <td>{mapping.ConnectStatus}</td>
                    <td>{mapping.ovrc_location_id}</td>
                    <td>{mapping.DCodes}</td>
                    <td>{mapping.dealerName}</td>
                    <td></td>
                </tr>
                <tr>
                    <td><strong>OvrC</strong></td>
                    <td>{mapping.automationAccounts && mapping.automationAccounts.map(m => m.accountName).join(', ')}</td>
                    <td>{mapping.mac}</td>
                    <td>{mapping.automationAccounts ? "Mapped" : "Unmapped"}</td>
                    <td>{mapping.locationId}</td>
                    <td>{mapping.dCode}</td>
                    <td>{mapping.companyName}</td>
                    <td>{mapping.automationAccounts && mapping.automationAccounts.map(m => m.excludeAssist).join(', ')}</td>
                </tr>
            </tbody>
        </table>
    </div>
}


function MappingPage() {
    const [commonNameOrMac, setCommonNameOrMac] = React.useState("");
    const [enableButton, setEnableButton] = React.useState(false);
    const [mapping, setMapping] = React.useState(null);

    const updateCommonName = event => {
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

