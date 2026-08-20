export interface AccountRegistrationRow {
    Id: number;
    AccountId: number;
    Company: string | null;
    Address: string | null;
    City: string | null;
    State: string | null;
    Zip: string | null;
    Country: string | null;
    Phone: string | null;
    AllowsPromotions: boolean | null;
    AllowsControllerUpdates: boolean | null;
    InstallZoning: string | null;
    InstallManufacturingStage: string | null;
    lat: number | null;
    long: number | null;
    address_text: string | null;
}

export interface AccountRegistrationPatch {
    Company?: string | null;
    Address?: string | null;
    City?: string | null;
    State?: string | null;
    Zip?: string | null;
    Country?: string | null;
    Phone?: string | null;
    AllowsPromotions?: boolean | null;
    AllowsControllerUpdates?: boolean | null;
    InstallZoning?: string | null;
    InstallManufacturingStage?: string | null;
    lat?: number | null;
    long?: number | null;
    address_text?: string | null;
}

export const ACCOUNT_REGISTRATION_STRING_FIELDS: (keyof AccountRegistrationPatch)[] = [
    "Company",
    "Address",
    "City",
    "State",
    "Zip",
    "Country",
    "Phone",
    "InstallZoning",
    "InstallManufacturingStage",
    "address_text",
];

export const ACCOUNT_REGISTRATION_BOOLEAN_FIELDS: (keyof AccountRegistrationPatch)[] = [
    "AllowsPromotions",
    "AllowsControllerUpdates",
];

export const ACCOUNT_REGISTRATION_NUMBER_FIELDS: (keyof AccountRegistrationPatch)[] = [
    "lat",
    "long",
];
