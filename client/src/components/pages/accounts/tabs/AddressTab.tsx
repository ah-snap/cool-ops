import { useEffect, useState } from "react";
import { Mapping, AccountRegistration } from "../../../../types.t";
import { isServerError } from "../../../../actions/apiClient.ts";
import * as accountRegistrationActions from "../../../../actions/accountRegistrationActions.ts";
import RotatedFieldGrid, { RotatedFieldRow, RotatedFieldType } from "../../../common/RotatedFieldGrid.tsx";

const ADDRESS_FIELDS: { field: keyof AccountRegistration; label: string; editable?: boolean; type?: RotatedFieldType }[] = [
    { field: "Id", label: "ID" },
    { field: "AccountId", label: "Account ID" },
    { field: "Company", label: "Company", editable: true, type: "string" },
    { field: "Address", label: "Address", editable: true, type: "string" },
    { field: "City", label: "City", editable: true, type: "string" },
    { field: "State", label: "State", editable: true, type: "string" },
    { field: "Zip", label: "Zip", editable: true, type: "string" },
    { field: "Country", label: "Country", editable: true, type: "string" },
    { field: "Phone", label: "Phone", editable: true, type: "string" },
    { field: "AllowsPromotions", label: "Allows Promotions", editable: true, type: "boolean" },
    { field: "AllowsControllerUpdates", label: "Allows Controller Updates", editable: true, type: "boolean" },
    { field: "InstallZoning", label: "Install Zoning", editable: true, type: "string" },
    { field: "InstallManufacturingStage", label: "Install Manufacturing Stage", editable: true, type: "string" },
    { field: "lat", label: "Latitude", editable: true, type: "number" },
    { field: "long", label: "Longitude", editable: true, type: "number" },
    { field: "address_text", label: "Address Text", editable: true, type: "string" },
];

export default function AddressTab({ mapping }: { mapping: Mapping | null }) {
    const [registrations, setRegistrations] = useState<AccountRegistration[]>([]);
    const [loading, setLoading] = useState(false);

    const accountId = mapping?.accountId ?? null;

    useEffect(() => {
        if (!accountId) {
            setRegistrations([]);
            return;
        }

        let cancelled = false;
        setLoading(true);

        accountRegistrationActions.getAccountRegistration(accountId).then((result) => {
            if (cancelled) return;
            setLoading(false);

            if (isServerError(result)) {
                setRegistrations([]);
                alert(result.error);
                return;
            }

            setRegistrations(result);
        });

        return () => { cancelled = true; };
    }, [accountId]);

    const onSave = async (field: string, value: unknown) => {
        if (!accountId) return;

        const result = await accountRegistrationActions.patchAccountRegistration(accountId, { [field]: value });

        if (isServerError(result)) {
            throw new Error(result.error);
        }

        setRegistrations(result);
    };

    const registration = registrations[0] ?? null;
    const recordCount = registrations.length;

    const fieldRows: RotatedFieldRow[] = [
        {
            field: "recordCount",
            label: "Record Count",
            value: recordCount,
            valueStyle: recordCount !== 1 ? { color: "#f44336", fontWeight: 600 } : undefined,
        },
        ...ADDRESS_FIELDS.map(({ field, label, editable, type }) => ({
            field,
            label,
            value: registration ? registration[field] : "",
            editable,
            type,
        })),
    ];

    return (
        <div className="accountsTabSection">
            <RotatedFieldGrid
                rows={fieldRows}
                onSave={registration ? onSave : undefined}
                noRowsLabel={loading ? "Loading address..." : "No address found"}
            />
        </div>
    );
}
