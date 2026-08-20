import { Mapping } from "../../../../types.t";
import { calculateC4Row } from "../../../MappingDisplay.tsx";
import RotatedFieldGrid, { RotatedFieldRow, RotatedFieldType } from "../../../common/RotatedFieldGrid.tsx";

const STRIPE_DASHBOARD_BASE = "https://dashboard.stripe.com/acct_18ge83JWux1wkqCb/customers/";

const EXTRA_INFO_FIELDS: { field: string; label: string; type?: RotatedFieldType; noWrap?: boolean }[] = [
    { field: "id", label: "ID" },
    { field: "Source", label: "Source" },
    { field: "Name", label: "Account Name" },
    { field: "CertificateCommonName", label: "Controller" },
    { field: "ConnectStatus", label: "Connect Status" },
    { field: "ovrc_location_id", label: "Location ID" },
    { field: "dCode", label: "DCode" },
    { field: "dealerName", label: "Dealer Name" },
    { field: "excludeAssist", label: "Exclude Assist", type: "boolean" },
    { field: "is_domestic", label: "Domestic", type: "boolean" },
    { field: "external_id", label: "External ID" },
    { field: "originalVersion", label: "OS Version" },
    { field: "XBackwardsUser", label: "X-Backwards-User", noWrap: true },
    { field: "stripeCustomerID", label: "Stripe Customer ID" },
    { field: "connect_tier", label: "Connect Tier" },
    { field: "handoff_date", label: "Handoff Date" },
    { field: "auth_token", label: "Auth Token" },
    { field: "isTestPassword", label: "Test Password", type: "boolean" },
    { field: "splitKey", label: "Split Key" },
];

type ExtraInformationTabProps = {
    mapping: Mapping | null;
    onMarkAsConnect: () => void;
    onMarkAsLegacy: () => void;
};

export default function ExtraInformationTab({ mapping, onMarkAsConnect, onMarkAsLegacy }: ExtraInformationTabProps) {
    const row = mapping ? calculateC4Row(mapping) : null;

    const fieldRows: RotatedFieldRow[] = EXTRA_INFO_FIELDS.map(({ field, label, type, noWrap }) => {
        const value = row ? (row as unknown as Record<string, unknown>)[field] : "";
        const fieldRow: RotatedFieldRow = { field, label, value, type, noWrap };

        if (field === "dCode" && value) {
            fieldRow.to = `/dealer/${encodeURIComponent(String(value))}`;
        }
        if (field === "stripeCustomerID" && value) {
            fieldRow.href = `${STRIPE_DASHBOARD_BASE}${encodeURIComponent(String(value))}`;
        }

        return fieldRow;
    });

    return (
        <div className="accountsTabSection">
            <div className="accountsExtraInfoActions">
                <button onClick={onMarkAsConnect} disabled={!mapping}>Mark as Connect</button>
                <button onClick={onMarkAsLegacy} disabled={!mapping}>Mark as Legacy</button>
            </div>
            <RotatedFieldGrid rows={fieldRows} noRowsLabel="Loading account..." />
        </div>
    );
}
