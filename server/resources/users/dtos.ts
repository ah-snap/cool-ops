export interface UserSqlRow {
    control4_email: string | null;
    user_id: number;
    splitKey: string;
    certificateCommonName: string | null;
    d_code: string | null;
    isTestPassword: number | boolean | null;
}

export interface OvrcOwnerForDCode {
    d_code: string;
    ovrc_email: string | null;
    freeConnectLicenses?: number | null;
}

/**
 * The joined row returned to the client — one per (user, d_code) pair.
 * Mirrors the datalake query's projection.
 */
export interface UserRow {
    control4_email: string | null;
    user_id: number | null;
    splitKey: string | null;
    certificateCommonName: string | null;
    d_code: string | null;
    ovrc_email: string | null;
    isTestPassword: boolean | null;
}
