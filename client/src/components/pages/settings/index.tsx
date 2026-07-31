import { useState } from "react";
import useSettings, { SettingsKeys } from "../../../hooks/useSettings";
import { AwsProfileMapping } from "../../../types.t";
import styles from "./settings.module.css"
import ExportImportBar, { type ExportSection } from "./ExportImportBar";
import AwsProfileDiscoveryPanel, { type AwsMappingRow } from "./AwsProfileDiscoveryPanel";

// Groups the server-stored setting keys by page section, both for the
// export/import section toggles and as the single source of truth for which
// keys belong to which section (common-to-all-engineers vs. AWS profile
// mappings/creds that tend to be specific to one engineer's setup).
const SECTIONS: ExportSection[] = [
    { id: "mongo", title: "Mongo", keys: [SettingsKeys.mongoConnectionString] },
    {
        id: "security16",
        title: "Security_16",
        keys: [
            SettingsKeys.security16User,
            SettingsKeys.security16Password,
            SettingsKeys.security16Database,
            SettingsKeys.security16Host,
            SettingsKeys.security16ForwardingHost,
        ],
    },
    {
        id: "snowdb",
        title: "SnowDB (Postgres)",
        keys: [
            SettingsKeys.pgUser,
            SettingsKeys.pgPassword,
            SettingsKeys.pgHost,
            SettingsKeys.pgPort,
            SettingsKeys.pgDatabase,
            SettingsKeys.snowdbHost,
            SettingsKeys.snowdbForwardUser,
        ],
    },
    {
        id: "awsPortForwards",
        title: "AWS / Port Forwards",
        keys: [
            SettingsKeys.portForwardAwsSsoLoginProfile,
            SettingsKeys.portForwardAwsSsoUseDeviceCode,
            SettingsKeys.ovrcProdSsmProfile,
            SettingsKeys.portForwardAwsCodeArtifactProfile,
            SettingsKeys.portForwardAwsCodeArtifactDomain,
        ],
    },
    {
        id: "awsMappings",
        title: "AWS Account Profile Mappings",
        keys: [
            SettingsKeys.cloudExperiencesDevMapping,
            SettingsKeys.cloudExperiencesProdMapping,
            SettingsKeys.cloudServicesDevMapping,
            SettingsKeys.cloudServicesProdMapping,
            SettingsKeys.ovrcDevMapping,
            SettingsKeys.ovrcProdMapping,
            SettingsKeys.ovrcStageMapping,
            SettingsKeys.ovrcInteropProdMapping,
            SettingsKeys.ovrcInteropStageMapping,
        ],
    },
    { id: "requests", title: "Requests", keys: [SettingsKeys.requestsUrl, SettingsKeys.requestsApiKey] },
];

function TextField({ label, value, onChange, secure }: { label: string; value: string; onChange: (value: string) => void; secure?: boolean; }) {
    return (
        <div className={styles.field}>
            <label>
                {label}
                <input
                    type={secure ? "password" : "text"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
            </label>
        </div>
    );
}

function MappingField({ label, value, onChange }: { label: string; value: AwsProfileMapping; onChange: (value: AwsProfileMapping) => void; }) {
    const [open, setOpen] = useState(value?.credentialProfile ? false : true);
    
    function updateField(field: keyof AwsProfileMapping, fieldValue: string) {
        onChange({ ...value, [field]: fieldValue });
    }

    return (
        <fieldset className={`${styles.mappingField} ${!open ? styles.closed : ""}`}>
            <legend onClick={() => setOpen(!open)}>{label}</legend>
            <TextField label="Credential Profile" value={value.credentialProfile} onChange={(v) => updateField("credentialProfile", v)} />
            <TextField label="Config Profile" value={value.configProfile} onChange={(v) => updateField("configProfile", v)} />
            <TextField label="Role" value={value.role} onChange={(v) => updateField("role", v)} />
            <TextField label="Account Id" value={value.accountId} onChange={(v) => updateField("accountId", v)} />
            <TextField label="Region" value={value.region} onChange={(v) => updateField("region", v)} />
        </fieldset>
    );
}

function SettingsSection({children, title} : {children: React.ReactNode, title: string}) {
    const [open, setOpen] = useState(false);
    
    return (
        <section className={`${styles.section} ${!open ? styles.closed : ""}`}>
            <h2 onClick={() => setOpen(!open)}>{title}</h2>
            {children}
        </section>
    );
}

export default function SettingsPage() {
    const [settings, settingsSetter] = useSettings();

    const awsMappings: AwsMappingRow[] = [
        { dbKey: SettingsKeys.cloudExperiencesDevMapping, label: "Cloud Experiences - Dev", value: settings.cloudExperiencesDevMapping, onChange: settingsSetter.setCloudExperiencesDevMapping },
        { dbKey: SettingsKeys.cloudExperiencesProdMapping, label: "Cloud Experiences - Prod", value: settings.cloudExperiencesProdMapping, onChange: settingsSetter.setCloudExperiencesProdMapping },
        { dbKey: SettingsKeys.cloudServicesDevMapping, label: "Cloud Services - Dev", value: settings.cloudServicesDevMapping, onChange: settingsSetter.setCloudServicesDevMapping },
        { dbKey: SettingsKeys.cloudServicesProdMapping, label: "Cloud Services - Prod", value: settings.cloudServicesProdMapping, onChange: settingsSetter.setCloudServicesProdMapping },
        { dbKey: SettingsKeys.ovrcDevMapping, label: "OvrC - Dev", value: settings.ovrcDevMapping, onChange: settingsSetter.setOvrcDevMapping },
        { dbKey: SettingsKeys.ovrcProdMapping, label: "OvrC - Prod", value: settings.ovrcProdMapping, onChange: settingsSetter.setOvrcProdMapping },
        { dbKey: SettingsKeys.ovrcStageMapping, label: "OvrC - Stage", value: settings.ovrcStageMapping, onChange: settingsSetter.setOvrcStageMapping },
        { dbKey: SettingsKeys.ovrcInteropProdMapping, label: "OvrC Interop - Prod", value: settings.ovrcInteropProdMapping, onChange: settingsSetter.setOvrcInteropProdMapping },
        { dbKey: SettingsKeys.ovrcInteropStageMapping, label: "OvrC Interop - Stage", value: settings.ovrcInteropStageMapping, onChange: settingsSetter.setOvrcInteropStageMapping },
    ];

    return (
        <div className={styles.settingsWrapper}>
            <h1>Settings Page</h1>

            <ExportImportBar sections={SECTIONS} />

            <SettingsSection title="Mongo">
                <TextField label="Mongo Connection String" value={settings.mongoConnectionString} onChange={settingsSetter.setMongoConnectionString} secure />
            </SettingsSection>

            <SettingsSection title="Security_16">
                <TextField label="User" value={settings.security16User} onChange={settingsSetter.setSecurity16User} />
                <TextField label="Password" value={settings.security16Password} onChange={settingsSetter.setSecurity16Password} secure />
                <TextField label="Database" value={settings.security16Database} onChange={settingsSetter.setSecurity16Database} />
                <TextField label="Host" value={settings.security16Host} onChange={settingsSetter.setSecurity16Host} />
                <TextField label="Forwarding Host" value={settings.security16ForwardingHost} onChange={settingsSetter.setSecurity16ForwardingHost} />
            </SettingsSection>

            <SettingsSection title="SnowDB (Postgres)">
                <TextField label="User" value={settings.pgUser} onChange={settingsSetter.setPgUser} />
                <TextField label="Password" value={settings.pgPassword} onChange={settingsSetter.setPgPassword} secure />
                <TextField label="Host" value={settings.pgHost} onChange={settingsSetter.setPgHost} />
                <TextField label="Port" value={settings.pgPort} onChange={settingsSetter.setPgPort} />
                <TextField label="Database" value={settings.pgDatabase} onChange={settingsSetter.setPgDatabase} />
                <TextField label="Forward Host" value={settings.snowdbHost} onChange={settingsSetter.setSnowdbHost} />
                <TextField label="Forward User" value={settings.snowdbForwardUser} onChange={settingsSetter.setSnowdbForwardUser} />
            </SettingsSection>

            <SettingsSection title="AWS / Port Forwards">
                <TextField label="SSO Login Profile" value={settings.portForwardAwsSsoLoginProfile} onChange={settingsSetter.setPortForwardAwsSsoLoginProfile} />
                <TextField label="SSO Use Device Code" value={settings.portForwardAwsSsoUseDeviceCode} onChange={settingsSetter.setPortForwardAwsSsoUseDeviceCode} />
                <TextField label="OvrC Prod SSM Profile" value={settings.ovrcProdSsmProfile} onChange={settingsSetter.setOvrcProdSsmProfile} />
                <TextField label="CodeArtifact Profile" value={settings.portForwardAwsCodeArtifactProfile} onChange={settingsSetter.setPortForwardAwsCodeArtifactProfile} />
                <TextField label="CodeArtifact Domain" value={settings.portForwardAwsCodeArtifactDomain} onChange={settingsSetter.setPortForwardAwsCodeArtifactDomain} />
            </SettingsSection>

            <SettingsSection title="AWS Account Profile Mappings">
                <AwsProfileDiscoveryPanel mappings={awsMappings} />
                {awsMappings.map((mapping) => (
                    <MappingField key={mapping.dbKey} label={mapping.label} value={mapping.value} onChange={mapping.onChange} />
                ))}
            </SettingsSection>

            <SettingsSection title="Requests">
                <TextField label="Requests URL" value={settings.requestsUrl} onChange={settingsSetter.setRequestsUrl} />
                <TextField label="Requests API Key" value={settings.requestsApiKey} onChange={settingsSetter.setRequestsApiKey} secure />
            </SettingsSection>
        </div>
    );
}
