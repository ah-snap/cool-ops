import type { ServerError } from "../types.t";

type ErrorLikePayload = {
    error?: unknown;
    message?: unknown;
    details?: unknown;
};

function extractErrorMessage(payload: ErrorLikePayload | null, fallback: string): string {
    if (typeof payload?.error === "string") {
        return payload.error;
    }

    if (payload?.error && typeof payload.error === "object" && "message" in payload.error) {
        const maybeMessage = (payload.error as { message?: unknown }).message;
        if (typeof maybeMessage === "string") {
            return maybeMessage;
        }
    }

    if (typeof payload?.message === "string") {
        return payload.message;
    }

    return fallback;
}

export async function parseApiResponse<T>(response: Response): Promise<T | ServerError> {
    let payload: ErrorLikePayload | null = null;

    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    const hasErrorKey = Boolean(payload && typeof payload === "object" && "error" in payload);

    if (!response.ok || hasErrorKey) {
        return {
            error: extractErrorMessage(payload, `Request failed (${response.status})`),
            details: payload?.details,
        };
    }

    return payload as T;
}

export function isServerError(value: unknown): value is ServerError {
    return Boolean(value && typeof value === "object" && "error" in value);
}
