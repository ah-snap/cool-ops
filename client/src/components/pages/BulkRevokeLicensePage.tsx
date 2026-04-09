import { useEffect, useState } from "react";
import "../../stylesheets/categories.css"
import { LicenseData } from "../../types.t";
import LicensesDisplay from "../LicensesDisplay.tsx";
import * as licenseActions from "../../actions/licenseActions.ts"


export default function BulkRevokeLicensePage() {
    const [text, setText] = useState<string>("");
    const [licenseData, setLicenseData] = useState<LicenseData[] | null>(null);

    useEffect(() => {
        const lines = text.split("\n").filter((line: string) => line.trim() !== "");

        let id = 1;
        const builtRows : LicenseData[] = lines.map((line: string) => {
            const fields = line.split("\t");
            const psp = fields[0];

            return {
                id: id++,
                transaction_id: psp,
                ExpirationDate: "",
                ActivationDate: "",
                Code: "",
                sku: "",
                created_time: "",
                account_id: "",
                ConsumerId: ""
            }
        });

        setLicenseData(builtRows)

    }, [text]);

    const textAreaChanged = (event: { target: { value: string; }; }) => {
        setText(event.target.value);
    }

    const revokeLicenses = async () => {
        if (!licenseData) return;
        const revokeRequestBody = licenseData.map(license => ({
            psp: license.transaction_id,
            code: license.Code,
        }));

        const revokedLicenses = await licenseActions.revokeLicenses(revokeRequestBody);
        if (Array.isArray(revokedLicenses) || revokedLicenses === null) {
            setLicenseData(revokedLicenses);
        }
    }


    return <div className="categoryWrapper">
        <div className="categoryContainer">
            <h1>Changes</h1>
            <textarea name="Text2" cols={100} rows={41} onChange={textAreaChanged}></textarea>
            <div>
                <button onClick={revokeLicenses}>Revoke Licenses</button>
            </div>
            
            <div style={{marginTop: 20}}>
                <h2>Licenses</h2>
            </div>
            {<LicensesDisplay licenseData={licenseData} />}
        </div>
    </div>;
}



    