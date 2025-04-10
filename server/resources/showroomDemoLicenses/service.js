import * as mongoRepository from "./mongoRepository.js";

export async function assignLicenses(lines) {
    return await mongoRepository.assignLicenses(lines);
}

