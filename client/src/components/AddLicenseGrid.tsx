import React from "react";
import { useEffect, useState } from "react";
import { LicenseData, LicenseRequestBody } from "../types.t";
import KeyValueRow from "./KeyValueRow.tsx";


async function licenseProcessCall(requestBody: LicenseRequestBody) {
    const request = {
        method: "POST",
        body: JSON.stringify(requestBody),
        headers: {
            "X-BACKWARDS-USER": '{"userId": 2906087, "accountId": 2630480, "internal": true}',
            "Content-Type": "application/json"
        }
    };
    const response = await fetch(`http://localhost:8061/v1/customers/C561682/licenses`, request);
    const data = await response.json();
    console.log("Request", request, "Response", response, "Data", data);
    console.log(data);

    return data;
}

function populateLicenseAsAddAssist(licenseRow: LicenseData): LicenseRequestBody {
    //Control4 Assist | Control4 Assist Premium
    return {
        productName: "Control4 Assist Premium",
        transactionId: `ASSIST_FREE-${crypto.randomUUID()}-Assist`,
        skus: ["C4-ASSIST-PREMIUM"],
        createdTime: licenseRow.created_time.replace("T", " ").replace(".", ",").replace("Z", ""),
        accountId: licenseRow.account_id,
        isRecurring: false,
        vendor: "D365",
        d365CustomerId: `C${licenseRow.ConsumerId}`,
        cost: 0,
        tax: 0,
        taxPercent: 0,
        extraDays: 0,
    }
}


export default function AddLicenseGrid({ licenseRow }: { licenseRow: LicenseData }) {
    const [requestBody, setRequestBody] = useState<LicenseRequestBody | null>(null);

    useEffect(() => {
        if (licenseRow) {
            setRequestBody(populateLicenseAsAddAssist(licenseRow));
        }
    }, [licenseRow]);

    if (!requestBody) {
        return <div className="mappingDisplay">Loading...</div>;
    }

    return (
        <div className="mappingDisplay">
            <h3>Adding this license <button onClick={() => licenseProcessCall(requestBody)}>Submit</button></h3>
            <table>
                <tbody>
                    <KeyValueRow label="SKU" value={requestBody.skus && requestBody.skus.join(", ")} />
                    <KeyValueRow label="Product Name" value={requestBody.productName} />
                    <KeyValueRow label="Transaction ID" value={requestBody.transactionId} />
                    <KeyValueRow label="Account ID" value={requestBody.accountId} />
                    <KeyValueRow label="Created Time" value={requestBody.createdTime} />
                    <KeyValueRow label="Is Recurring" value={requestBody.isRecurring ? "true" : "false"} />
                    <KeyValueRow label="Vendor" value={requestBody.vendor} />
                    <KeyValueRow label="D365 Customer Id" value={requestBody.d365CustomerId} />
                </tbody>
            </table>
        </div>
    );
}