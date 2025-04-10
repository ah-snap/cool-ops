import React from "react";

export default function MappingDisplay({ mapping }: { mapping: any }) {
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
                    <td>{mapping.dCode}</td>
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