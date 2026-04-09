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