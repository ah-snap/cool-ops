import * as mongoRepository from "./mongoRepository.js";
import type { DealerInfo, UpdateFreeConnectLicensesInput } from "./dtos.js";

export async function getDealerByDCode(dCode: string): Promise<DealerInfo | null> {
    return mongoRepository.getDealerByDCode(dCode);
}

export async function updateFreeConnectLicenses({ dCode, freeConnectLicenses }: UpdateFreeConnectLicensesInput): Promise<DealerInfo | null> {
    return mongoRepository.updateFreeConnectLicenses({ dCode, freeConnectLicenses });
}
