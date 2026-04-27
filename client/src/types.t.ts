export type Mapping = {
    id: number;
    d365CustomerID: string;
    accountId: number;
    mac: string;
    dealerName: string;
    dealerId: number;
    ovrc_location_id: string;
    ConnectStatus: string;
    CertificateCommonName: string;
    Name: string;
    locationId: string;
    userId: number;
    dCode: string;
    companyName: string;
    external_id: string;
    automationAccounts?: Array<{
        accountName: string;
        excludeAssist: boolean;
    }>;
    originalVersion?: string;
    excludeAssist?: boolean;
    is_domestic: boolean;
    DCodes?: string;
    firmwareVersion?: string;
    connect_tier?: string | null;
    error?: any;
}

export type SimpleAccountMapping = {
    id: number;
    accountId: number;
    ovrc_location_id: string;
    external_id: string;
    certificateCommonName: string;
    name: string;
}

export type LicenseData = {
    id?: number;
    created_time: any;
    account_id: string;
    ConsumerId: any;
    sku: string;
    ActivationDate: string;
    ExpirationDate: string;
    Code: string;
    transaction_id: string;
}

export type AddLicenseRow = {
    transaction_id: any;
    ExpirationDate: string;
    sku: string;
    created_time?: string;
}

export type LicenseRequestBody = {
    skus: string[];
    createdTime?: string;
    transactionId: string;
    accountId: number;
    isRecurring: boolean;
    vendor: string;
    d365CustomerId: string;
    cost: number;
    tax: number;
    taxPercent: number;
    extraDays: number;
    productName: string;
    transactionText?: string;
    systemSubscriptionText?: string;
    userId: number;
}

export type SnowLicenseAndTransactionRequestBody = {
    transaction_id: string;
    c4_user_id: number;
    skus: string[];
    subscription_id: string;
    account_id: number;
    location_id: string;
    expiration_date: string;
    external_customer_id: string;
}

export type ServerError = {
    error: string;
    details?: unknown;
}

export type UserRow = {
    control4_email: string | null;
    user_id: number | null;
    splitKey: string | null;
    certificateCommonName: string | null;
    d_code: string | null;
    ovrc_email: string | null;
    isTestPassword: boolean | null;
}

export type DealerInfo = {
    accountNum: string;
    freeConnectLicenses: number;
    [key: string]: unknown;
}

export type RevokeLicensesItem = {
    code?: string;
    psp?: string;
}

export type LicenseDetailsTargetType = "code" | "psp";

export type LicenseDetailsPayload = {
    sourceType: LicenseDetailsTargetType;
    sourceValue: string;
    securitySubscriptionCodes: Record<string, unknown>[];
    securityVendorTransactions: Record<string, unknown>[];
    snowSystemSubscriptions: Record<string, unknown>[];
    snowSystemSubscriptionTransactions: Record<string, unknown>[];
    snowSubscriptions: Record<string, unknown>[];
}

export type LicenseDetailsActionResult = {
    security: {
        rowsAffected?: number[];
    };
    snow: {
        rowCount?: number;
        deletedSubscriptions?: number;
        deletedTransactions?: number;
    };
}