# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/tsconfig/package.json ./packages/tsconfig/package.json
COPY packages/eslint-config/package.json ./packages/eslint-config/package.json

RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_DEMO_MODE
ARG NEXT_PUBLIC_MEDIA_DRIVER
ARG MEDIA_DRIVER
ARG MEDIA_LOCAL_DIR
ARG NEXT_PUBLIC_MEDIA_BASE_URL
ARG NEXT_PUBLIC_MEDIA_BUCKET

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_DEMO_MODE=$NEXT_PUBLIC_DEMO_MODE
ENV NEXT_PUBLIC_MEDIA_DRIVER=$NEXT_PUBLIC_MEDIA_DRIVER
ENV MEDIA_DRIVER=$MEDIA_DRIVER
ENV MEDIA_LOCAL_DIR=$MEDIA_LOCAL_DIR
ENV NEXT_PUBLIC_MEDIA_BASE_URL=$NEXT_PUBLIC_MEDIA_BASE_URL
ENV NEXT_PUBLIC_MEDIA_BUCKET=$NEXT_PUBLIC_MEDIA_BUCKET

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm --workspace apps/web run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache ca-certificates
COPY infra/certs/russian-trusted-root-ca.crt \
  /usr/local/share/ca-certificates/russian-trusted-root-ca.crt
COPY infra/certs/russian-trusted-sub-ca.crt \
  /usr/local/share/ca-certificates/russian-trusted-sub-ca.crt
RUN update-ca-certificates

COPY infra/certs/max-ca-bundle.pem /app/certs/max-ca-bundle.pem

ENV NODE_EXTRA_CA_CERTS=/app/certs/max-ca-bundle.pem

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
