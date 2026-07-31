export interface SettingRow {
    id: string;
    key: string;
    secure: boolean;
    value: unknown;
}

export interface SettingResponse {
    id: string;
    key: string;
    secure: boolean;
    value: unknown;
}

export interface UpdateSettingInput {
    value: unknown;
}

export interface ExportedSetting {
    key: string;
    value: unknown;
}
