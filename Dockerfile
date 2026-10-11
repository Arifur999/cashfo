# syntax=docker/dockerfile:1.7
# The admin panel image: built by GitHub Actions, run on the VPS by the
# backend repo's deploy/docker-compose.yml as smartly-web.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Public settings are baked in at build time; server-only ones (API_BASE_URL)
# are read when the container runs.
ARG NEXT_PUBLIC_APP_TIME_ZONE=Asia/Dhaka
ENV NEXT_PUBLIC_APP_TIME_ZONE=$NEXT_PUBLIC_APP_TIME_ZONE
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD wget -qO- http://127.0.0.1:3000/admin/login >/dev/null || exit 1
CMD ["node", "server.js"]
