FROM oven/bun:1.2 AS bun-base

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates curl unzip awscli \
	&& curl -fsSL "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/ubuntu_64bit/session-manager-plugin.deb" -o /tmp/session-manager-plugin.deb \
	&& apt-get install -y /tmp/session-manager-plugin.deb \
	&& rm -rf /var/lib/apt/lists/* /tmp/session-manager-plugin.deb

FROM bun-base

WORKDIR /app

COPY package.json bun.lock tsconfig.json ./
RUN bun install --production

COPY . .

ENV PORT=3003
EXPOSE 3003

CMD ["bun", "run", "start"]

FROM bun-base AS dev

WORKDIR /app

ENV NODE_ENV=development

COPY package.json bun.lock tsconfig.json ./
RUN bun install

COPY . .

ENV PORT=3003
EXPOSE 3003

CMD ["bun", "--watch", "--hot", "index.ts"]
