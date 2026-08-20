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
        locationId?: string;
    }>;
    originalVersion?: string;
    excludeAssist?: boolean;
    is_domestic: boolean;
    DCodes?: string;
    firmwareVersion?: string;
    connect_tier?: string | null;
    handoff_date?: string | null;
    error?: any;
}

export type AccountRegistration = {
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
    InstallZoning: boolean | null;
    InstallManufacturingStage: boolean | null;
    lat: number | null;
    long: number | null;
    address_text: string | null;
}

export type AccountRegistrationPatch = Partial<Omit<AccountRegistration, "Id" | "AccountId">>;

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
    expirationDateSnow?: string | null;
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
    isTestPassword: boolean;
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

export type AwsProfileMapping = {
    credentialProfile: string;
    configProfile: string;
    role: string;
    accountId: string;
    region: string;
}

export type Settings = {
    testValue: string;
    testNumber: number;

    mongoConnectionString: string;
    security16User: string;
    security16Password: string;
    security16Database: string;
    security16Host: string;
    adyenCookie: string;
    pgUser: string;
    pgPassword: string;
    pgHost: string;
    pgPort: string;
    pgDatabase: string;
    portForwardAwsSsoLoginProfile: string;
    portForwardAwsSsoUseDeviceCode: string;
    ovrcProdSsmProfile: string;
    portForwardAwsCodeArtifactProfile: string;
    portForwardAwsCodeArtifactDomain: string;
    snowdbHost: string;
    security16ForwardingHost: string;
    snowdbForwardUser: string;
    requestsUrl: string;
    requestsApiKey: string;

    cloudExperiencesDevMapping: AwsProfileMapping;
    cloudExperiencesProdMapping: AwsProfileMapping;
    cloudServicesDevMapping: AwsProfileMapping;
    cloudServicesProdMapping: AwsProfileMapping;
    ovrcDevMapping: AwsProfileMapping;
    ovrcProdMapping: AwsProfileMapping;
    ovrcStageMapping: AwsProfileMapping;
    ovrcInteropProdMapping: AwsProfileMapping;
    ovrcInteropStageMapping: AwsProfileMapping;
}

export type SettingsUpdate = {
    setTestValue: (value: string) => void;
    setTestNumber: (value: number) => void;

    setMongoConnectionString: (value: string) => void;
    setSecurity16User: (value: string) => void;
    setSecurity16Password: (value: string) => void;
    setSecurity16Database: (value: string) => void;
    setSecurity16Host: (value: string) => void;
    setAdyenCookie: (value: string) => void;
    setPgUser: (value: string) => void;
    setPgPassword: (value: string) => void;
    setPgHost: (value: string) => void;
    setPgPort: (value: string) => void;
    setPgDatabase: (value: string) => void;
    setPortForwardAwsSsoLoginProfile: (value: string) => void;
    setPortForwardAwsSsoUseDeviceCode: (value: string) => void;
    setOvrcProdSsmProfile: (value: string) => void;
    setPortForwardAwsCodeArtifactProfile: (value: string) => void;
    setPortForwardAwsCodeArtifactDomain: (value: string) => void;
    setSnowdbHost: (value: string) => void;
    setSecurity16ForwardingHost: (value: string) => void;
    setSnowdbForwardUser: (value: string) => void;
    setRequestsUrl: (value: string) => void;
    setRequestsApiKey: (value: string) => void;

    setCloudExperiencesDevMapping: (value: AwsProfileMapping) => void;
    setCloudExperiencesProdMapping: (value: AwsProfileMapping) => void;
    setCloudServicesDevMapping: (value: AwsProfileMapping) => void;
    setCloudServicesProdMapping: (value: AwsProfileMapping) => void;
    setOvrcDevMapping: (value: AwsProfileMapping) => void;
    setOvrcProdMapping: (value: AwsProfileMapping) => void;
    setOvrcStageMapping: (value: AwsProfileMapping) => void;
    setOvrcInteropProdMapping: (value: AwsProfileMapping) => void;
    setOvrcInteropStageMapping: (value: AwsProfileMapping) => void;
}