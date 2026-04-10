export type PortForwardDefinition = {
  id: string;
  name: string;
  description: string;
  command: string;
  args: string[];
};

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
  }
];
