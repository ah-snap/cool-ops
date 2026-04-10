export type PortForwardDefinition = {
  id: string;
  name: string;
  description: string;
  command: string;
  args: string[];
};

const mongoSshKeyPath = process.env.PORT_FORWARD_MONGO_SSH_KEY_PATH || `${process.env.HOME || "/root"}/.ssh/prodovrckey.pem`;

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
  }
];
