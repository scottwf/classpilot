FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:26-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Records what's actually running, since the same image gets deployed to
# both the prod and staging containers -- see AppShell's footer / src/lib/build-info.ts.
# .git is present in the build context for this (not dockerignored) but
# never makes it into the runner stage below, so the shipped image doesn't
# carry repo history.
RUN apk add --no-cache git \
  && COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo unknown) \
  && BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown) \
  && BUILT_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  && printf '{"commitShort":"%s","branch":"%s","builtAt":"%s"}\n' "$COMMIT" "$BRANCH" "$BUILT_AT" > public/build-info.json
RUN npm run build

FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
