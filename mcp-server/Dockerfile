FROM node:26-alpine AS deps
WORKDIR /app/mcp-server
COPY mcp-server/package.json mcp-server/package-lock.json* ./
RUN npm install

FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=deps /app/mcp-server/node_modules ./mcp-server/node_modules
COPY mcp-server/package.json ./mcp-server/package.json
COPY mcp-server/tsconfig.json ./mcp-server/tsconfig.json
COPY mcp-server/src ./mcp-server/src
COPY src ./src

RUN chown -R nextjs:nodejs /app

USER nextjs
WORKDIR /app/mcp-server
EXPOSE 3900

CMD ["npx", "tsx", "src/index.ts"]
