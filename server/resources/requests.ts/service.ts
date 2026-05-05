import * as security16 from "../../common/security16.js";
import * as repository from "./repository.js";
import * as snowdbRepository from "./snowdbRepository.js";
import * as store from "./store.js";
import type { ListOptions, StoredRequest } from "./store.js";
import type {
    ExpiredLicenseRow,
    LicenseDetailsPayload,
    LicenseDetailsTargetInput,
    LicenseTransactionRow,
    PotentiallyMissingPspRow,
    StripeValidationRow,
    SubscriptionCodeValues,
} from "./dtos.js";


export interface WhiteLabelRequestPayload {
    requestDate?: string;
    sCode?: string;
    licenseType?: string;
    mac?: string;
}

export async function createWhiteLabelRequest(payload: WhiteLabelRequestPayload): Promise<StoredRequest<WhiteLabelRequestPayload>> {
    console.log("Creating white label request with data", payload);
    const record = store.createRequest<WhiteLabelRequestPayload>("whiteLabel", payload);
    // TODO: kick off real fulfillment work here; for now mark as pending so a UI
    // can display it and a future worker can update status/result.
    return record as StoredRequest<WhiteLabelRequestPayload>;
}

export function listRequests(options: ListOptions = {}) {
    return store.listRequests(options);
}

export function getRequest(id: string) {
    return store.getRequest(id);
}

export function updateRequest(
    id: string,
    updates: Partial<Pick<StoredRequest, "status" | "result" | "error">>,
) {
    return store.updateRequest(id, updates);
}

export function deleteRequest(id: string) {
    return store.deleteRequest(id);
}
