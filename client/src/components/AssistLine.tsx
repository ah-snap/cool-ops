import { useEffect, useState } from 'react';
import * as accountActions from '../actions/accountActions.ts'
import * as licenseActions from '../actions/licenseActions.ts'
import { LicenseData, SimpleAccountMapping } from '../types.t';
import LicensesDisplay from './LicensesDisplay.tsx';
import * as bulkAssistActions from '../actions/bulkAssistActions.ts'


export default function AssistLine({sku, mac, expirationDate} : {sku: string, mac: string, expirationDate: string}) {
    const [mapping, setMapping] = useState<SimpleAccountMapping | null>(null);
    const [licenseData, setLicenseData] = useState<LicenseData[] | null>([]);
    const [status, setStatus] = useState<string>("");
    
    useEffect(() => {
        accountActions.getSimpleMappingInfoByCommonNameOrMac(mac).then((result) => {
            if (result && 'id' in result) {
                setMapping(result as SimpleAccountMapping);
            } else {
                setMapping(null);
            }
        });
    }, [sku, mac]);

    useEffect(() => {
        if (mapping) {
            licenseActions.getLicensesForAccount(mapping.name).then((result) => {
                if (Array.isArray(result)) {
                    setLicenseData(result as LicenseData[]);
                } else {
                    setLicenseData([]);
                }
            });
        } else {
            setLicenseData([]);
        }
    }, [mapping]);

    const processRow = async () => {
        setStatus("Processing...");
        await bulkAssistActions.process({ macOrCommonName: mac, requestedExpirationDate: expirationDate, sku }, setStatus);
                licenseActions.getLicensesForAccount(mapping?.name || "").then((result) => {
            if (Array.isArray(result)) {
                setLicenseData(result as LicenseData[]);
            } else {
                setLicenseData([]);
            }
        });
    };

    
    return <div>
        <label>AccountName:</label>
        
        <input type="text" value={mapping?.name || ""} style={{marginLeft: 5, marginRight: 5, width: 220, height:20}} readOnly/>
        <label>SKU: </label>
        <input type="text" value={sku} style={{marginLeft: 5, marginRight: 5, width: 220, height:20}}  readOnly />

        <label>Mac:</label>
        <input type="text" value={mac} style={{marginLeft: 5, marginRight: 5, width: 220, height:20}} readOnly />

        <label>Expiration Date</label>
        <input type="text" value={expirationDate} style={{marginLeft: 5, marginRight: 5, width: 220, height:20}} readOnly />
        <div>
            <label>Status:</label>
            <input type="text" value={status} style={{marginLeft: 5, marginRight: 5, width: 220, height:20}} readOnly/>
        </div>
        <div>
            <button onClick={processRow}>Process Row</button>
        </div>

        <div>
            <LicensesDisplay licenseData={licenseData} />
        </div>
    </div>;
}