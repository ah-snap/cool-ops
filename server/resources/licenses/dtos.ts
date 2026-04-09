export interface LicenseTransactionRow {
    transaction_id: string;
    id: number;
    account_id: number;
    vendor_id: number;
    cost: number;
    product_name: string;
    sku: string;
    is_recurring: boolean;
    created_time: Date;
    last_update_time: Date;
    dealer_id: number;
    tax: number;
    tax_percent: number;
    cancellation_date: Date | null;
    Code: string | null;
    Duration: string | null;
    ConsumerId: number | null;
    ActivationDate: Date | null;
    ExpirationDate: Date | null;
    SubscriptionCodeBatchId: number | null;
    ProductId: number | null;
    AppliedByUserId: number | null;
    RevokedByAccountId: number | null;
    RevocationDate: Date | null;
}

export interface SubscriptionCodeValues {
    Code: string;
    Duration: string;
    ConsumerId: number;
    ActivationDate: Date;
    ExpirationDate: Date;
    SubscriptionCodeBatchId: number;
    ProductId: number;
    AppliedByUserId: number | null;
    RevokedByAccountId: number | null;
    RevocationDate: Date | null;
}

export interface ReferenceTransactionFields {
    transaction_id: string;
    account_id: number;
    vendor_id: number;
    cost: number;
    product_name: string;
    sku: string;
    is_recurring: boolean;
    created_time: Date;
    last_update_time: Date;
    dealer_id: number;
    tax: number;
    tax_percent: number;
    cancellation_date: Date | null;
}

export interface PotentiallyMissingPspRow {
    psp: string;
    accountId: number;
    externalId: string;
    ovrc_location_id: string | null;
    consumerId: number | null;
    userId: number | null;
    vendor_id: number;
    cost: number;
    product_name: string;
    sku: string;
    is_recurring: boolean;
    created_time: Date;
    last_update_time: Date;
    dealer_id: number;
    tax: number;
    tax_percent: number;
    code: string | null;
    ExpirationDate: Date | null;
}

export interface StripeValidationRow {
    event_id: string;
    created: number;
    transaction_id: number | null;
    subscription_code_id: number | null;
    consumerId: number | null;
}

export interface ExpiredLicenseRow {
    id: number;
    created_time: Date;
    account_id: number;
    ConsumerId: number;
    sku: string;
    ActivationDate: Date;
    ExpirationDate: Date;
    Code: string;
    transaction_id: string;
}