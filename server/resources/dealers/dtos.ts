export interface DealerInfo {
    accountNum: string;
    freeConnectLicenses: number;
    [key: string]: unknown;
}

export interface UpdateFreeConnectLicensesInput {
    dCode: string;
    freeConnectLicenses: number;
}
