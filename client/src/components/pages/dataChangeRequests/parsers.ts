// Parses the `data` string carried by a Data Change Request based on its `type`.
// Each concrete parser handles one request type and reports whether the raw data
// is well-formed, plus the structured payload consumers need to actually process
// the request (dCode / license count, or account-name-or-mac).

export type DataChangeRequestType =
    | "ShowroomDemoLicenses"
    | "MarkAccountAsConnect"
    | "MarkAccountAsLegacy";

export const DATA_CHANGE_REQUEST_TYPES: DataChangeRequestType[] = [
    "ShowroomDemoLicenses",
    "MarkAccountAsConnect",
    "MarkAccountAsLegacy",
];

// The server-of-record sometimes ships slightly different casing (e.g.
// `ShowRoomDemoLicenses`). Normalize so parsing / dispatch are case-insensitive.
export function normalizeType(rawType: string): DataChangeRequestType | null {
    const lc = rawType.toLowerCase();
    return DATA_CHANGE_REQUEST_TYPES.find(t => t.toLowerCase() === lc) ?? null;
}

export const DEFAULT_SHOWROOM_LICENSES = 5;

export interface ShowroomDemoLicensesParsed {
    dCode: string;
    numberOfLicenses: number;
}

export interface AccountTypeChangeParsed {
    accountNameOrMac: string;
}

export type ParsedPayload = ShowroomDemoLicensesParsed | AccountTypeChangeParsed;

export type ParseResult<T extends ParsedPayload> =
    | { valid: true; parsed: T }
    | { valid: false; reason: string };

export interface DataChangeRequestParser<T extends ParsedPayload> {
    readonly type: DataChangeRequestType;
    parse(data: string): ParseResult<T>;
}

class ShowroomDemoLicensesParser implements DataChangeRequestParser<ShowroomDemoLicensesParsed> {
    readonly type = "ShowroomDemoLicenses" as const;

    // Accepts `D<digits>` optionally followed by whitespace and a count.
    // Trailing free-form text is tolerated (see sample "D23263 3 (sorry for spamming)").
    private readonly pattern = /^\s*(D\d+)(?:\s+(\d+))?/i;

    parse(data: string): ParseResult<ShowroomDemoLicensesParsed> {
        if (!data) return { valid: false, reason: "data is empty" };
        const match = this.pattern.exec(data);
        if (!match) {
            return { valid: false, reason: "data must start with a DCode (e.g. D123456)" };
        }
        const dCode = match[1].toUpperCase();
        const rawCount = match[2];
        const numberOfLicenses = rawCount ? Number(rawCount) : DEFAULT_SHOWROOM_LICENSES;
        if (!Number.isFinite(numberOfLicenses) || numberOfLicenses < 0) {
            return { valid: false, reason: "license count must be a non-negative integer" };
        }
        return { valid: true, parsed: { dCode, numberOfLicenses } };
    }
}

class AccountTypeChangeParser implements DataChangeRequestParser<AccountTypeChangeParsed> {
    constructor(readonly type: "MarkAccountAsConnect" | "MarkAccountAsLegacy") {}

    parse(data: string): ParseResult<AccountTypeChangeParsed> {
        const trimmed = data?.trim() ?? "";
        if (!trimmed) {
            return { valid: false, reason: "data must be an account name or MAC address" };
        }
        return { valid: true, parsed: { accountNameOrMac: trimmed } };
    }
}

const PARSERS: Record<DataChangeRequestType, DataChangeRequestParser<ParsedPayload>> = {
    ShowroomDemoLicenses: new ShowroomDemoLicensesParser(),
    MarkAccountAsConnect: new AccountTypeChangeParser("MarkAccountAsConnect"),
    MarkAccountAsLegacy: new AccountTypeChangeParser("MarkAccountAsLegacy"),
};

export function getParser(type: string): DataChangeRequestParser<ParsedPayload> | null {
    const normalized = normalizeType(type);
    return normalized ? PARSERS[normalized] : null;
}

export function parseRequestData(type: string, data: string): ParseResult<ParsedPayload> {
    const parser = getParser(type);
    if (!parser) {
        return { valid: false, reason: `Unknown request type: ${type}` };
    }
    return parser.parse(data);
}

export function isShowroomParsed(parsed: ParsedPayload): parsed is ShowroomDemoLicensesParsed {
    return "dCode" in parsed;
}

export function isAccountTypeParsed(parsed: ParsedPayload): parsed is AccountTypeChangeParsed {
    return "accountNameOrMac" in parsed;
}
