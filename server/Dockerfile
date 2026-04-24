FROM oven/bun:1.2 AS bun-base

WORKDIR /app

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
