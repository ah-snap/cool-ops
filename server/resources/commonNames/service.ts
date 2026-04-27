import * as security16 from "../../common/security16.js";
import * as repository from "./repository.js"
import * as mongoRespoisitory from "./mongoRepository.js";
import type { CommonNameInfoDto, SimpleMappingInfoRow } from "./dtos.js";


export async function getCommonNameInfo({ commonNameOrMac }: { commonNameOrMac: string; }): Promise<CommonNameInfoDto> {
    const [sqlResult, mongoResult] = await Promise.all([
        security16.withPool(() => repository.getCommonNameInfo({ commonNameOrMac })),
        mongoRespoisitory.getAutomationAccountsByCommonName(commonNameOrMac)
    ]);

    try {
        if (sqlResult.length === 0 && mongoResult.automationAccounts && mongoResult.automationAccounts.length > 0) {
            const followUpSql = await security16.withPool(() =>
                repository.getCommonNameInfo({ commonNameOrMac, accountName: mongoResult.automationAccounts[0].accountName })
            );
            return { ...followUpSql[0], ...mongoResult };
        } else if (sqlResult.length > 0 && sqlResult[0].CertificateCommonName && (!mongoResult.automationAccounts || mongoResult.automationAccounts.length === 0)) {
            console.log("No MongoDB results, but SQL found results. Checking for follow-up MongoDB data based on CertificateCommonName: ", sqlResult[0].CertificateCommonName);
            const followUpMongo = await mongoRespoisitory.getAutomationAccountsByCommonName(sqlResult[0].CertificateCommonName);
            return { ...sqlResult[0], ...followUpMongo };
        }
    } catch (err) {
        console.log("Error during follow-up queries for common name info:", err);
    }


    return { ...sqlResult[0], ...mongoResult };
}

export async function getSimpleMappingInfo({ commonNameOrMac }: { commonNameOrMac: string; }): Promise<SimpleMappingInfoRow | undefined> {
    const sqlResult = await security16.withPool(() => repository.getSimpleMappingInfo({ commonNameOrMac }));
    return sqlResult[0];
}