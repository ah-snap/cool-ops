export interface AutomationAccountInfoRow {
    Name: string;
    id: number;
    accountId: number;
    dealerId: number;
    is_domestic: boolean;
    dealerName: string;
    external_id: string;
    CertificateCommonName: string | null;
    ConnectStatus: string;
    ovrc_location_id: string | null;
    DCodes: string | null;
    ovrc_created: boolean | null;
    legacy_connect_upgrade: boolean | null;
    no_connect: boolean | null;
    userId: number;
    d365CustomerID: string;
    update_command: string;
    automation_account_record: string;
    "4SightExpiry": Date | string;
    "ConnectExpiry": Date | string;
    handoff_date: Date | null;
    originalVersion: string | null;
    stripeCustomerID: string | null;
    connect_tier: string | null;
}

export interface SimpleMappingInfoRow {
    id: number;
    name: string;
    accountId: number;
    external_id: string;
    certificateCommonName: string | null;
    ConnectStatus: string;
    ovrc_location_id: string | null;
    ovrc_created: boolean | null;
    legacy_connect_upgrade: boolean | null;
    no_connect: boolean | null;
    handoff_date: Date | null;
}

export interface MongoAutomationAccount {
    [key: string]: unknown;
    accountName: string;
    csAccountId: number;
    csExternalAccountId: string;
    locationId: string;
    password: string;
    deleted: boolean;
    projectType: string;
}

export interface MongoCommonNameInfo {
    mac?: string;
    dCode?: string;
    locationId?: string;
    locationName?: string;
    csAccountId?: number;
    companyName?: string;
    automationAccounts?: MongoAutomationAccount[];
}

export type CommonNameInfoDto = Partial<AutomationAccountInfoRow> & MongoCommonNameInfo;