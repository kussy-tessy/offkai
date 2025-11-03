FROM node:22 AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /workspace

# ルートレベルの設定をコピー
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./

# 各アプリ/パッケージの package.json
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/domain/package.json packages/domain/package.json

RUN NODE_ENV=development pnpm install --frozen-lockfile --recursive

# ソース全体をコピー
COPY . .

WORKDIR /workspace/apps/backend
ENV PRISMA_GENERATE_SKIP_AUTOINSTALL=true
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
# RUN pnpm --filter backend prisma:generate --schema=prisma/schema.prisma

WORKDIR /workspace
RUN pnpm --filter backend build
RUN pnpm --filter frontend build

# 本番ランタイム
FROM node:22 AS runtime
RUN corepack enable
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /workspace/apps/backend/dist ./dist
COPY --from=builder /workspace/apps/backend/node_modules ./node_modules
COPY --from=builder /workspace/apps/backend/prisma ./prisma
COPY --from=builder /workspace/apps/frontend/dist ./public

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
