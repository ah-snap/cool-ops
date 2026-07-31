import { AwsProfileMapping, Settings, SettingsUpdate } from "../types.t";
import useLocalStorageSettings from "./useLocalStorageSettings";
import useServerStoredSettings from "./useServerStoredSettings";

// Server-side setting keys (see server/resources/settings/settingDefinitions.ts).
export const SettingsKeys = {
    testValue: "testValue",
    testNumber: "testNumber",

    mongoConnectionString: "mongoConnectionString",
    security16User: "security16User",
    security16Password: "security16Password",
    security16Database: "security16Database",
    security16Host: "security16Host",
    adyenCookie: "adyenCookie",
    pgUser: "PGUSER",
    pgPassword: "PGPASSWORD",
    pgHost: "PGHOST",
    pgPort: "PGPORT",
    pgDatabase: "PGDATABASE",
    portForwardAwsSsoLoginProfile: "PORT_FORWARD_AWS_SSO_LOGIN_PROFILE",
    portForwardAwsSsoUseDeviceCode: "PORT_FORWARD_AWS_SSO_USE_DEVICE_CODE",
    ovrcProdSsmProfile: "OVRC_PROD_SSM_PROFILE",
    portForwardAwsCodeArtifactProfile: "PORT_FORWARD_AWS_CODEARTIFACT_PROFILE",
    portForwardAwsCodeArtifactDomain: "PORT_FORWARD_AWS_CODEARTIFACT_DOMAIN",
    snowdbHost: "SNOWDB_HOST",
    security16ForwardingHost: "SECURITY16_FORWARDING_HOST",
    snowdbForwardUser: "SNOWDB_FORWARD_USER",
    requestsUrl: "REQUESTS_URL",
    requestsApiKey: "REQUESTS_API_KEY",

    cloudExperiencesDevMapping: "CloudExperiencesDevMapping",
    cloudExperiencesProdMapping: "CloudExperiencesProdMapping",
    cloudServicesDevMapping: "CloudServicesDevMapping",
    cloudServicesProdMapping: "CloudServicesProdMapping",
    ovrcDevMapping: "OvrCDevMapping",
    ovrcProdMapping: "OvrCProdMapping",
    ovrcStageMapping: "OvrCStageMapping",
    ovrcInteropProdMapping: "OvrCInteropProdMapping",
    ovrcInteropStageMapping: "OvrCInteropStageMapping",
} as const;

const emptyMapping: AwsProfileMapping = {
    credentialProfile: "",
    configProfile: "",
    role: "",
    accountId: "",
    region: "us-east-1",
};

export default function useSettings(): [settings: Settings, settingsSetter: SettingsUpdate] {
    const [testValue, setTestValue] = useLocalStorageSettings(SettingsKeys.testValue, "I'm a test");
    const [testNumber, setTestNumber] = useLocalStorageSettings(SettingsKeys.testNumber, 0);

    const [mongoConnectionString, setMongoConnectionString] = useServerStoredSettings(SettingsKeys.mongoConnectionString, "");
    const [security16User, setSecurity16User] = useServerStoredSettings(SettingsKeys.security16User, "");
    const [security16Password, setSecurity16Password] = useServerStoredSettings(SettingsKeys.security16Password, "");
    const [security16Database, setSecurity16Database] = useServerStoredSettings(SettingsKeys.security16Database, "");
    const [security16Host, setSecurity16Host] = useServerStoredSettings(SettingsKeys.security16Host, "");
    const [adyenCookie, setAdyenCookie] = useServerStoredSettings(SettingsKeys.adyenCookie, "");
    const [pgUser, setPgUser] = useServerStoredSettings(SettingsKeys.pgUser, "");
    const [pgPassword, setPgPassword] = useServerStoredSettings(SettingsKeys.pgPassword, "");
    const [pgHost, setPgHost] = useServerStoredSettings(SettingsKeys.pgHost, "");
    const [pgPort, setPgPort] = useServerStoredSettings(SettingsKeys.pgPort, "");
    const [pgDatabase, setPgDatabase] = useServerStoredSettings(SettingsKeys.pgDatabase, "");
    const [portForwardAwsSsoLoginProfile, setPortForwardAwsSsoLoginProfile] = useServerStoredSettings(SettingsKeys.portForwardAwsSsoLoginProfile, "");
    const [portForwardAwsSsoUseDeviceCode, setPortForwardAwsSsoUseDeviceCode] = useServerStoredSettings(SettingsKeys.portForwardAwsSsoUseDeviceCode, "");
    const [ovrcProdSsmProfile, setOvrcProdSsmProfile] = useServerStoredSettings(SettingsKeys.ovrcProdSsmProfile, "");
    const [portForwardAwsCodeArtifactProfile, setPortForwardAwsCodeArtifactProfile] = useServerStoredSettings(SettingsKeys.portForwardAwsCodeArtifactProfile, "");
    const [portForwardAwsCodeArtifactDomain, setPortForwardAwsCodeArtifactDomain] = useServerStoredSettings(SettingsKeys.portForwardAwsCodeArtifactDomain, "");
    const [snowdbHost, setSnowdbHost] = useServerStoredSettings(SettingsKeys.snowdbHost, "");
    const [security16ForwardingHost, setSecurity16ForwardingHost] = useServerStoredSettings(SettingsKeys.security16ForwardingHost, "");
    const [snowdbForwardUser, setSnowdbForwardUser] = useServerStoredSettings(SettingsKeys.snowdbForwardUser, "");
    const [requestsUrl, setRequestsUrl] = useServerStoredSettings(SettingsKeys.requestsUrl, "");
    const [requestsApiKey, setRequestsApiKey] = useServerStoredSettings(SettingsKeys.requestsApiKey, "");

    const [cloudExperiencesDevMapping, setCloudExperiencesDevMapping] = useServerStoredSettings(SettingsKeys.cloudExperiencesDevMapping, emptyMapping);
    const [cloudExperiencesProdMapping, setCloudExperiencesProdMapping] = useServerStoredSettings(SettingsKeys.cloudExperiencesProdMapping, emptyMapping);
    const [cloudServicesDevMapping, setCloudServicesDevMapping] = useServerStoredSettings(SettingsKeys.cloudServicesDevMapping, emptyMapping);
    const [cloudServicesProdMapping, setCloudServicesProdMapping] = useServerStoredSettings(SettingsKeys.cloudServicesProdMapping, emptyMapping);
    const [ovrcDevMapping, setOvrcDevMapping] = useServerStoredSettings(SettingsKeys.ovrcDevMapping, emptyMapping);
    const [ovrcProdMapping, setOvrcProdMapping] = useServerStoredSettings(SettingsKeys.ovrcProdMapping, emptyMapping);
    const [ovrcStageMapping, setOvrcStageMapping] = useServerStoredSettings(SettingsKeys.ovrcStageMapping, emptyMapping);
    const [ovrcInteropProdMapping, setOvrcInteropProdMapping] = useServerStoredSettings(SettingsKeys.ovrcInteropProdMapping, emptyMapping);
    const [ovrcInteropStageMapping, setOvrcInteropStageMapping] = useServerStoredSettings(SettingsKeys.ovrcInteropStageMapping, emptyMapping);

    return [
        {
            testValue,
            testNumber,
            mongoConnectionString,
            security16User,
            security16Password,
            security16Database,
            security16Host,
            adyenCookie,
            pgUser,
            pgPassword,
            pgHost,
            pgPort,
            pgDatabase,
            portForwardAwsSsoLoginProfile,
            portForwardAwsSsoUseDeviceCode,
            ovrcProdSsmProfile,
            portForwardAwsCodeArtifactProfile,
            portForwardAwsCodeArtifactDomain,
            snowdbHost,
            security16ForwardingHost,
            snowdbForwardUser,
            requestsUrl,
            requestsApiKey,
            cloudExperiencesDevMapping,
            cloudExperiencesProdMapping,
            cloudServicesDevMapping,
            cloudServicesProdMapping,
            ovrcDevMapping,
            ovrcProdMapping,
            ovrcStageMapping,
            ovrcInteropProdMapping,
            ovrcInteropStageMapping,
        },
        {
            setTestValue,
            setTestNumber,
            setMongoConnectionString,
            setSecurity16User,
            setSecurity16Password,
            setSecurity16Database,
            setSecurity16Host,
            setAdyenCookie,
            setPgUser,
            setPgPassword,
            setPgHost,
            setPgPort,
            setPgDatabase,
            setPortForwardAwsSsoLoginProfile,
            setPortForwardAwsSsoUseDeviceCode,
            setOvrcProdSsmProfile,
            setPortForwardAwsCodeArtifactProfile,
            setPortForwardAwsCodeArtifactDomain,
            setSnowdbHost,
            setSecurity16ForwardingHost,
            setSnowdbForwardUser,
            setRequestsUrl,
            setRequestsApiKey,
            setCloudExperiencesDevMapping,
            setCloudExperiencesProdMapping,
            setCloudServicesDevMapping,
            setCloudServicesProdMapping,
            setOvrcDevMapping,
            setOvrcProdMapping,
            setOvrcStageMapping,
            setOvrcInteropProdMapping,
            setOvrcInteropStageMapping,
        }
    ] as const;
}
