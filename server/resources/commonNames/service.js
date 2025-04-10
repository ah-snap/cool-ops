import * as security16 from "../../common/security16.js";
import * as repository from "./repository.js"
import * as mongoRespoisitory from "./mongoRepository.js";


export async function getCommonNameInfo({ commonNameOrMac }) {
    console.log("Connecting to security16");
    await security16.connect();
    console.log("Connected");

    const sqlResult = repository.getCommonNameInfo({ commonNameOrMac });
    const mongoResult = mongoRespoisitory.getAutomationAccountsByCommonName(commonNameOrMac);

    await sqlResult, mongoResult;
    if ((await sqlResult).length === 0 && (await mongoResult).automationAccounts && (await mongoResult).automationAccounts.length > 0) {
        const followUpSql = await repository.getCommonNameInfo({ commonNameOrMac, accountName: (await mongoResult).automationAccounts[0].accountName });
        return { ...followUpSql[0], ...await mongoResult  };
    }

    return { ...(await sqlResult)[0], ...await mongoResult  };
}

