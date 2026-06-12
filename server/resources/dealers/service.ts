import * as mongoRepository from "./mongoRepository.js";
import type { DealerInfo, UpdateFreeConnectLicensesInput } from "./dtos.js";

export async function getDealerByDCodeOrEmail(dCode?: string, email?: string): Promise<DealerInfo | null> {
    return mongoRepository.getDealerByDCodeOrEmail(dCode, email);
}

export async function updateFreeConnectLicenses({ dCode, freeConnectLicenses }: UpdateFreeConnectLicensesInput): Promise<DealerInfo | null> {
    return mongoRepository.updateFreeConnectLicenses({ dCode, freeConnectLicenses });
}
