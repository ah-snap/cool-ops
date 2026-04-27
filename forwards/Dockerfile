FROM oven/bun:1.2 AS bun-base

RUN ARCH=$(uname -m) \
	&& case "$ARCH" in \
		x86_64)   AWS_ARCH="x86_64";  SSM_ARCH="ubuntu_64bit" ;; \
		aarch64)  AWS_ARCH="aarch64"; SSM_ARCH="ubuntu_arm64" ;; \
		*) echo "Unsupported architecture: $ARCH" && exit 1 ;; \
	esac \
	&& apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates curl gnupg jq unzip openssh-client socat psmisc \
	&& mkdir -p /etc/apt/keyrings \
	&& curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.31/deb/Release.key | gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg \
	&& echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.31/deb/ /" | tee /etc/apt/sources.list.d/kubernetes.list \
	&& apt-get update \
	&& apt-get install -y --no-install-recommends kubectl \
	&& curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-${AWS_ARCH}.zip" -o /tmp/awscliv2.zip \
	&& unzip /tmp/awscliv2.zip -d /tmp \
	&& /tmp/aws/install \
	&& curl -fsSL "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/${SSM_ARCH}/session-manager-plugin.deb" -o /tmp/session-manager-plugin.deb \
	&& apt-get install -y /tmp/session-manager-plugin.deb \
	&& rm -rf /var/lib/apt/lists/* /tmp/session-manager-plugin.deb /tmp/awscliv2.zip /tmp/aws

FROM bun-base

WORKDIR /app

COPY package.json tsconfig.json ./
RUN bun install --production

COPY . .

ENV PORT=3004
EXPOSE 3004

CMD ["bun", "run", "start"]

FROM bun-base AS dev

WORKDIR /app

ENV NODE_ENV=development

COPY package.json tsconfig.json ./
RUN bun install

COPY . .

ENV PORT=3004
EXPOSE 3004

CMD ["bun", "--watch", "--hot", "index.ts"]
