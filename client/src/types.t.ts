export type Mapping = {
    mac: string;
    dealerName: string;
    ovrc_location_id: string;
    ConnectStatus: string;
    CertificateCommonName: string;
    Name: string;
    locationId: string;
    dCode: string;
    companyName: string;
    automationAccounts?: Array<{
        accountName: string;
        excludeAssist: boolean;
    }>;
}

export type LicenseData = {
    created_time: any;
    account_id: string;
    ConsumerId: any;
    sku: string;
    ActivationDate: string;
    ExpirationDate: string;
    Code: string;
    transaction_id: string;
}

export type LicenseRequestBody = {
    skus: string[];
    createdTime: string;
    transactionId: string;
    accountId: string;
    isRecurring: boolean;
    vendor: string;
    d365CustomerId: string;
    cost: number;
    tax: number;
    taxPercent: number;
    extraDays: number;
    productName: string;
}