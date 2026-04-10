export type PortForwardDefinition = {
  id: string;
  name: string;
  description: string;
  command: string;
  args: string[];
};

const mongoSshKeyPath = process.env.PORT_FORWARD_MONGO_SSH_KEY_PATH || `${process.env.HOME || "/root"}/.ssh/prodovrckey.pem`;
const snowdbSshKeyPath = process.env.PORT_FORWARD_SNOWDB_SSH_KEY_PATH || "/run/keys/snowdb.pem";
const k8sContext = process.env.PORT_FORWARD_K8S_CONTEXT || "";
const k8sNamespace = process.env.PORT_FORWARD_K8S_NAMESPACE || "boot-services";
const k8sService = process.env.PORT_FORWARD_K8S_SERVICE || process.env.PORT_FORWARD_K8S_POD || "cs-license-process-boot";
const k8sAddress = process.env.PORT_FORWARD_K8S_ADDRESS || "127.0.0.1";
const k8sLocalPort = process.env.PORT_FORWARD_K8S_LOCAL_PORT || "8061";
const k8sPodPort = process.env.PORT_FORWARD_K8S_POD_PORT || "80";

export const portForwardDefinitions: PortForwardDefinition[] = [
  {
    id: "security16-sql",
    name: "Security_16 SQL (1433)",
    description:
      "AWS SSM port-forward to Security_16 SQL Server (10.201.1.20:1433) using prod_access profile.",
    command: "aws",
    args: [
      "ssm",
      "start-session",
      "--region",
      "us-east-2",
      "--target",
      "i-03c11f3bcfd51b0d9",
      "--document-name",
      "AWS-StartPortForwardingSessionToRemoteHost",
      "--parameters",
      "host=10.201.1.20,portNumber=1433,localPortNumber=1433",
      "--profile",
      "prod_access"
    ]
  },
  {
    id: "mongo-socks-9925",
    name: "Mongo SOCKS Proxy (9925)",
    description:
      "SSH dynamic SOCKS proxy on localhost:9925 via AWS SSM jump host using ovrc_prod_ssm profile.",
    command: "ssh",
    args: [
      "-i",
      mongoSshKeyPath,
      "-N",
      "-o",
      "ProxyCommand=aws ssm start-session --target i-0225b0afc753aaf54 --profile ovrc_prod_ssm --document-name AWS-StartSSHSession --parameters portNumber=22 --region us-east-1",
      "-o",
      "StrictHostKeyChecking=no",
      "-o",
      "UserKnownHostsFile=/dev/null",
      "-o",
      "AddressFamily=inet",
      "ubuntu@localhost",
      "-D",
      "127.0.0.1:9925"
    ]
  },
  {
    id: "snowdb-postgres-5433",
    name: "SnowDB Postgres (5433)",
    description:
      "SSH local port-forward to SnowDB Postgres (prod-snow.cluster-cvzzsmsbqjep.us-east-1.rds.amazonaws.com:5432) on localhost:5433.",
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
      "127.0.0.1:5433:prod-snow.cluster-cvzzsmsbqjep.us-east-1.rds.amazonaws.com:5432",
      "ec2-user@ec2-54-237-232-127.compute-1.amazonaws.com"
    ]
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
    ]
  }
];
