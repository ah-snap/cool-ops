import { getAwsProfileMappingsBlob, getSettingValue } from "../../common/settingsStore.ts";

export type PortForwardDefinition = {
    id: string;
    name: string;
    description: string;
    command: string;
    args: string[];
    runMode?: "persistent" | "oneshot";
    /**
     * TCP ports this forward listens on locally. Before spawning the child
     * process the manager will kill any orphaned processes holding these
     * ports (e.g. from a previous forwards-server run whose child outlived
     * the manager) so restarting doesn't fail with "address already in use"
     * errors.
     */
    listenPorts?: number[];
    resolveEnv?: () => Promise<Record<string, string>>;
    resolveArgs?: () => Promise<string[]>;
};

const snowdbSshKeyPath = process.env.PORT_FORWARD_SNOWDB_SSH_KEY_PATH || "/run/keys/snowdb.pem";
const k8sContext = process.env.PORT_FORWARD_K8S_CONTEXT || "arn:aws:eks:us-east-2:367507620554:cluster/prod-cloud-services-green";
const k8sNamespace = process.env.PORT_FORWARD_K8S_NAMESPACE || "boot-services";
const k8sService = process.env.PORT_FORWARD_K8S_SERVICE || process.env.PORT_FORWARD_K8S_POD || "cs-license-process-boot";
const k8sAddress = process.env.PORT_FORWARD_K8S_ADDRESS || "127.0.0.1";
const k8sLocalPort = process.env.PORT_FORWARD_K8S_LOCAL_PORT || "8061";
const k8sPodPort = process.env.PORT_FORWARD_K8S_POD_PORT || "80";

const security16Port = process.env.SECURITY16_PORT || "1433";
const security16InternalPort = process.env.SECURITY16_INTERNAL_PORT || "11433";

const mongoLocalPort = process.env.PORT_FORWARD_MONGO_LOCAL_PORT || "9925";
const mongoBindAddress = process.env.PORT_FORWARD_MONGO_BIND_ADDRESS || "127.0.0.1";

const snowLocalPort = process.env.PORT_FORWARD_SNOWDB_LOCAL_PORT || "5433";
const snowBindAddress = process.env.PORT_FORWARD_SNOWDB_BIND_ADDRESS || "127.0.0.1";

export const portForwardDefinitions: PortForwardDefinition[] = [
    {
        id: "aws-credentials-refresh",
        name: "Update AWS Credentials",
        description:
            "Runs AWS SSO credential refresh and updates shared ~/.aws/credentials profiles (one-shot).",
        command: "bash",
        args: ["/app/resources/portForwards/scripts/updateAwsCreds.sh"],
        runMode: "oneshot",
        resolveEnv: async () => {
            const [ssoLoginProfile, useDeviceCode, codeArtifactProfile, codeArtifactDomain, profileMappings] = await Promise.all([
                getSettingValue("PORT_FORWARD_AWS_SSO_LOGIN_PROFILE"),
                getSettingValue("PORT_FORWARD_AWS_SSO_USE_DEVICE_CODE"),
                getSettingValue("PORT_FORWARD_AWS_CODEARTIFACT_PROFILE"),
                getSettingValue("PORT_FORWARD_AWS_CODEARTIFACT_DOMAIN"),
                getAwsProfileMappingsBlob(),
            ]);

            return {
                PORT_FORWARD_AWS_SSO_LOGIN_PROFILE: ssoLoginProfile || "prod_access_1",
                PORT_FORWARD_AWS_SSO_USE_DEVICE_CODE: useDeviceCode || "true",
                PORT_FORWARD_AWS_CODEARTIFACT_PROFILE: codeArtifactProfile || "prod_access",
                PORT_FORWARD_AWS_CODEARTIFACT_DOMAIN: codeArtifactDomain || "control4",
                PORT_FORWARD_AWS_PROFILE_MAPPINGS: profileMappings,
            };
        }
    },
    {
        id: "security16-sql",
        name: "Security_16 SQL (1433)",
        description:
            "AWS SSM port-forward to Security_16 SQL Server using the settings-store host and profile. " +
            "Relayed through socat so the forward is reachable on 0.0.0.0 (sibling containers + host publish).",
        command: "bash",
        args: ["/app/resources/portForwards/scripts/startSecurity16Sql.sh"],
        listenPorts: [Number(security16Port), Number(security16InternalPort)],
        resolveEnv: async () => {
            const [forwardingHost, prodAccessProfile] = await Promise.all([
                getSettingValue("SECURITY16_FORWARDING_HOST"),
                getSettingValue("PROD_ACCESS_PROFILE"),
            ]);

            return {
                SECURITY16_FORWARDING_HOST: forwardingHost || "localhost",
                PROD_ACCESS_PROFILE: prodAccessProfile || "prod_access",
            };
        }
    },
    {
        id: "mongo-socks-9925",
        name: `Mongo SOCKS Proxy (${mongoLocalPort})`,
        description:
            `SSH dynamic SOCKS proxy on localhost:${mongoLocalPort} via AWS SSM jump host using the settings-store OvrC SSM profile.`,
        command: "bash",
        args: [
            "/app/resources/portForwards/scripts/aws-portforward.sh",
            "-i",
            "prodschedule0",
            "-p",
            "ovrc_prod_ssm",
            "-P",
            "22",
            "-l",
            mongoLocalPort,
        ],
        listenPorts: [Number(mongoLocalPort)],
        resolveArgs: async () => {
            const ovrcProdSsmProfile = (await getSettingValue("OVRC_PROD_SSM_PROFILE")) || "ovrc_prod_ssm";

            return [
                "/app/resources/portForwards/scripts/aws-portforward.sh",
                "-i",
                "prodschedule0",
                "-p",
                ovrcProdSsmProfile,
                "-P",
                "22",
                "-l",
                mongoLocalPort,
            ];
        }
    },
    {
        id: "snowdb-postgres-5433",
        name: `SnowDB Postgres (${snowLocalPort})`,
        description:
            `SSH local port-forward to SnowDB Postgres on localhost:${snowLocalPort}, using the settings-store host and forward user.`,
        command: "ssh",
        args: [
            "-i",
            snowdbSshKeyPath,
            "-N",
            "-o",
            "StrictHostKeyChecking=no",
            "-o",
            "UserKnownHostsFile=/dev/null",
            "-o",
            "AddressFamily=inet",
            "-o",
            "ServerAliveInterval=30",
            "-o",
            "ServerAliveCountMax=3",
            "-o",
            "TCPKeepAlive=yes",
            "-o",
            "ExitOnForwardFailure=yes",
            "-L",
            `${snowBindAddress}:${snowLocalPort}:localhost:5432`,
            ""
        ],
        listenPorts: [Number(snowLocalPort)],
        resolveArgs: async () => {
            const [snowHost, snowForwardUser] = await Promise.all([
                getSettingValue("SNOWDB_HOST"),
                getSettingValue("SNOWDB_FORWARD_USER"),
            ]);

            return [
                "-i",
                snowdbSshKeyPath,
                "-N",
                "-o",
                "StrictHostKeyChecking=no",
                "-o",
                "UserKnownHostsFile=/dev/null",
                "-o",
                "AddressFamily=inet",
                // See mongo-socks-9925 for rationale on these keepalive options.
                "-o",
                "ServerAliveInterval=30",
                "-o",
                "ServerAliveCountMax=3",
                "-o",
                "TCPKeepAlive=yes",
                "-o",
                "ExitOnForwardFailure=yes",
                "-L",
                `${snowBindAddress}:${snowLocalPort}:${snowHost || "localhost"}:5432`,
                snowForwardUser || ""
            ];
        }
    },
    {
        id: "k8s-license-service-8061",
        name: "Kubernetes License Service (8061)",
        description:
            "kubectl port-forward to cs-license-process-boot service (port 80 -> localhost:8061) in boot-services namespace on prod cluster.",
        command: "kubectl",
        args: [
            "port-forward",
            "-n",
            k8sNamespace,
            `svc/${k8sService}`,
            "--address",
            k8sAddress,
            `${k8sLocalPort}:${k8sPodPort}`,
            `--kubeconfig=/root/.kube/config`,
            ...(k8sContext ? [`--context=${k8sContext}`] : [])
        ],
        listenPorts: [Number(k8sLocalPort)]
    }
];
