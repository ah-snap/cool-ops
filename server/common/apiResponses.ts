import type { Response } from "express";

export interface ApiErrorResponse {
    error: string;
    details?: unknown;
}

function toApiError(error: unknown): ApiErrorResponse {
    if (typeof error === "string") {
        return { error };
    }

    if (error instanceof Error) {
        return {
            error: error.message,
            details: {
                name: error.name,
                stack: error.stack,
            },
        };
    }

    return {
        error: "Unexpected error",
        details: error,
    };
}

export function sendApiError(res: Response, error: unknown, statusCode = 500): void {
    res.status(statusCode).send(toApiError(error));
}
