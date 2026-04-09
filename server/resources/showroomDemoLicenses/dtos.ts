export interface AssignLicenseLine {
    dCode: string;
    freeConnectLicenses: string | number;
}

export interface CompanyLicenseAssignment {
    accountNum: string;
    freeConnectLicenses: number;
    [key: string]: unknown;
}
