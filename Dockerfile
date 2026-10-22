# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM dependencies AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 picker && useradd --system --uid 1001 --gid picker picker
COPY --from=builder --chown=picker:picker /app/.next/standalone ./
COPY --from=builder --chown=picker:picker /app/.next/static ./.next/static
COPY --from=builder --chown=picker:picker /app/public ./public
COPY --from=builder --chown=picker:picker /app/db/migrations ./db/migrations
COPY --from=builder --chown=picker:picker /app/scripts/migrate.mjs /app/scripts/import-legacy.mjs ./scripts/
COPY --chown=picker:picker scripts/docker-entrypoint.sh ./scripts/
USER picker
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["sh", "scripts/docker-entrypoint.sh"]
CMD ["node", "server.js"]
