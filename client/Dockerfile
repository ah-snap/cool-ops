# syntax=docker/dockerfile:1.7

FROM node:25-alpine3.22 AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund --prefer-offline --progress=false

FROM node:25-alpine3.22 AS dev

WORKDIR /app

COPY . .
COPY docker/dev-entrypoint.sh /usr/local/bin/dev-entrypoint.sh
RUN chmod +x /usr/local/bin/dev-entrypoint.sh

EXPOSE 5173

CMD ["/usr/local/bin/dev-entrypoint.sh"]

FROM node:25-alpine3.22 AS build

WORKDIR /app

ARG REACT_APP_API_BASE_URL=http://localhost:3003/api
ARG REACT_APP_D365_BASE_URL=http://localhost:8061
ENV REACT_APP_API_BASE_URL=${REACT_APP_API_BASE_URL}
ENV REACT_APP_D365_BASE_URL=${REACT_APP_D365_BASE_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM nginx:1.30-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
