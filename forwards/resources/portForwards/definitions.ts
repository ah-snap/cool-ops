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
   * the manager) so restarting doesn't fail with "address already in use".
   */
  listenPorts?: number[];
};

const mongoSshKeyPath = process.env.PORT_FORWARD_MONGO_SSH_KEY_PATH || `${process.env.HOME || "/root"}/.ssh/prodovrckey.pem`;
const snowdbSshKeyPath = process.env.PORT_FORWARD_SNOWDB_SSH_KEY_PATH || "/run/keys/snowdb.pem";
const k8sContext = process.env.PORT_FORWARD_K8S_CONTEXT || "arn:aws:eks:us-east-2:367507620554:cluster/prod-cloud-services-green";
const k8sNamespace = process.env.PORT_FORWARD_K8S_NAMESPACE || "boot-services";
const k8sService = process.env.PORT_FORWARD_K8S_SERVICE || process.env.PORT_FORWARD_K8S_POD || "cs-license-process-boot";
const k8sAddress = process.env.PORT_FORWARD_K8S_ADDRESS || "127.0.0.1";
const k8sLocalPort = process.env.PORT_FORWARD_K8S_LOCAL_PORT || "8061";
const k8sPodPort = process.env.PORT_FORWARD_K8S_POD_PORT || "80";

const prodAccessProfile = process.env.PROD_ACCESS_PROFILE || "prod_access";
const ovrcProdSsmProfile = process.env.OVRC_PROD_SSM_PROFILE || "ovrc_prod_ssm";

const security16Host = process.env.SECURITY16_FORWARDING_HOST || "localhost";
const security16Port = process.env.SECURITY16_PORT || "1433";
const security16InternalPort = process.env.SECURITY16_INTERNAL_PORT || "11433";

const mongoLocalPort = process.env.PORT_FORWARD_MONGO_LOCAL_PORT || "9925";
const mongoBindAddress = process.env.PORT_FORWARD_MONGO_BIND_ADDRESS || "127.0.0.1";

const snowLocalPort = process.env.PORT_FORWARD_SNOWDB_LOCAL_PORT || "5433";
const snowHost = process.env.SNOWDB_HOST || "localhost";
const snowBindAddress = process.env.PORT_FORWARD_SNOWDB_BIND_ADDRESS || "127.0.0.1";
const snowForwardUser = process.env.SNOWDB_FORWARD_USER || "";

export const portForwardDefinitions: PortForwardDefinition[] = [
  {
    id: "aws-credentials-refresh",
    name: "Update AWS Credentials",
    description:
      "Runs AWS SSO credential refresh and updates shared ~/.aws/credentials profiles (one-shot).",
    command: "bash",
    args: ["/app/resources/portForwards/scripts/updateAwsCreds.sh"],
    runMode: "oneshot"
  },
  {
    id: "security16-sql",
    name: "Security_16 SQL (1433)",
    description:
      `AWS SSM port-forward to Security_16 SQL Server (${security16Host}:1433) using ${prodAccessProfile} profile. ` +
      `Relayed through socat so the forward is reachable on 0.0.0.0 (sibling containers + host publish).`,
    command: "bash",
    args: ["/app/resources/portForwards/scripts/startSecurity16Sql.sh"],
    listenPorts: [Number(security16Port), Number(security16InternalPort)]
  },
  {
    id: "mongo-socks-9925",
    name: `Mongo SOCKS Proxy (${mongoLocalPort})`,
    description:
      `SSH dynamic SOCKS proxy on localhost:${mongoLocalPort} via AWS SSM jump host using ${ovrcProdSsmProfile} profile.`,
    command: "ssh",
    args: [
      "-i",
      mongoSshKeyPath,
      "-N",
      "-o",
      `ProxyCommand=aws ssm start-session --target i-0225b0afc753aaf54 --profile ${ovrcProdSsmProfile} --document-name AWS-StartSSHSession --parameters portNumber=22 --region us-east-1`,
      "-o",
      "StrictHostKeyChecking=no",
      "-o",
      "UserKnownHostsFile=/dev/null",
      "-o",
      "AddressFamily=inet",
      "ubuntu@localhost",
      "-D",
      `${mongoBindAddress}:${mongoLocalPort}`
    ],
    listenPorts: [Number(mongoLocalPort)]
  },
  {
    id: "snowdb-postgres-5433",
    name: `SnowDB Postgres (${snowLocalPort})`,
    description:
      `SSH local port-forward to SnowDB Postgres (${snowHost}:5432) on localhost:${snowLocalPort}.`,
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
      "-L",
      `${snowBindAddress}:${snowLocalPort}:${snowHost}:5432`,
      `${snowForwardUser}`
    ],
    listenPorts: [Number(snowLocalPort)]
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
