import * as mongoRepository from "./mongoRepository.js";
import type { AssignLicenseLine, CompanyLicenseAssignment } from "./dtos.js";

export async function assignLicenses(lines: AssignLicenseLine[]): Promise<CompanyLicenseAssignment[]> {
    return await mongoRepository.assignLicenses(lines);
}

