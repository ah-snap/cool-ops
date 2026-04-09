export interface AdyenPspDetails {
    shopperInfo?: {
        shopperReference?: string;
        [key: string]: unknown;
    };
    paymentOverview?: {
        status?: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}
