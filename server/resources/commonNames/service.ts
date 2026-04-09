import * as security16 from "../../common/security16.js";
import * as repository from "./repository.js"
import * as mongoRespoisitory from "./mongoRepository.js";
import type { CommonNameInfoDto, SimpleMappingInfoRow } from "./dtos.js";


export async function getCommonNameInfo({ commonNameOrMac }: { commonNameOrMac: string; }): Promise<CommonNameInfoDto> {
    await security16.connect();

    const results = Promise.all([repository.getCommonNameInfo({ commonNameOrMac }), mongoRespoisitory.getAutomationAccountsByCommonName(commonNameOrMac)]);

    const [sqlResult, mongoResult] = await results;

    if (sqlResult.length === 0 && mongoResult.automationAccounts && mongoResult.automationAccounts.length > 0) {
        const followUpSql = await repository.getCommonNameInfo({ commonNameOrMac, accountName: mongoResult.automationAccounts[0].accountName });
        return { ...followUpSql[0], ...mongoResult  };
    } else if (sqlResult.length > 0 &&  sqlResult[0].CertificateCommonName && (!mongoResult.automationAccounts || mongoResult.automationAccounts.length === 0)) {
        console.log("No MongoDB results, but SQL found results. Checking for follow-up MongoDB data based on CertificateCommonName: ", sqlResult[0].CertificateCommonName);        
        const followUpMongo = await mongoRespoisitory.getAutomationAccountsByCommonName(sqlResult[0].CertificateCommonName);
        return { ...sqlResult[0], ...followUpMongo };
    }

    return { ...sqlResult[0], ...mongoResult  };
}
    
export async function getSimpleMappingInfo({ commonNameOrMac }: { commonNameOrMac: string; }): Promise<SimpleMappingInfoRow | undefined> {
    await security16.connect();
    console.log("Connected");

    const sqlResult = repository.getSimpleMappingInfo({ commonNameOrMac });

    return (await sqlResult)[0];
}