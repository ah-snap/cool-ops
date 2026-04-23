export interface CreateLegacyAccountResultRow {
    accountId: number;
    accountName: string;
    userId: number;
    email: string;
}

export interface CreateLegacyAccountInput {
    accountName: string;
    firstName: string;
    lastName: string;
    email: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    phone: string;
    country: string;
    companyName: string;
}

export interface MarkAccountAsConnectInput {
    accountName: string;
}

export interface UpdateAccountTypeInput {
    accountName: string;
    newType: "Connect" | "Legacy";
}

export type ConnectTier =
    | "UNSET"
    | "UPGRADABLE"
    | "UPGRADING"
    | "UPGRADE_DECLINED"
    | "FREE"
    | "PAID"
    | "NEW"
    | "PAYING";

export const CONNECT_TIER_VALUES: ConnectTier[] = [
    "UNSET",
    "UPGRADABLE",
    "UPGRADING",
    "UPGRADE_DECLINED",
    "FREE",
    "PAID",
    "NEW",
    "PAYING",
];

export interface UpdateConnectTierInput {
    accountName: string;
    connectTier: ConnectTier | null;
}

export interface AccountPatch {
    accountType?: "Connect" | "Legacy";
    connectTier?: ConnectTier | null;
}