export interface AutomationAccountDocument {
    locationId: string;
    accountName?: string;
    csAccountId?: number;
    csExternalAccountId?: string;
    excludeAssist?: boolean;
    [key: string]: unknown;
}

export interface SetExcludeAssistInput {
    locationId: string;
    excludeAssist: boolean;
}
