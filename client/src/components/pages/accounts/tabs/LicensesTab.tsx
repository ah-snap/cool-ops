import { Mapping, LicenseData } from "../../../../types.t";
import LicensesDisplay from "../../../LicensesDisplay.tsx";
import AddMissingLicenseGrid from "../../../AddMissingLicenseGrid.tsx";

type LicensesTabProps = {
    mapping: Mapping | null;
    licenseData: LicenseData[] | null;
    psp: string | null;
    setPsp: (value: string) => void;
    date: string | null;
    setDate: (value: string) => void;
    onLicenseAdded: () => void;
};

export default function LicensesTab({ mapping, licenseData, psp, setPsp, date, setDate, onLicenseAdded }: LicensesTabProps) {
    return (
        <div className="accountsTabSection">
            <LicensesDisplay licenseData={licenseData} />
            <div>
                <input type="text" defaultValue={psp ?? ""} onChange={(e) => setPsp(e.target.value)} placeholder="PSP" />
                <input type="text" defaultValue={date ?? ""} onChange={(e) => setDate(e.target.value)} placeholder="Date" />
            </div>
            <div>
                <input type="text" defaultValue={mapping?.external_id?.toUpperCase()} readOnly className="accountsExternalIdInput" />
            </div>
            {mapping && (
                <AddMissingLicenseGrid
                    licenseRow={{ transaction_id: psp ?? "", ExpirationDate: date ?? "", sku: "" }}
                    mapping={mapping}
                    onComplete={onLicenseAdded}
                />
            )}
        </div>
    );
}
