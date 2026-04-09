FROM node:20-slim

# Build tools cho better-sqlite3 native module
RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# Cài pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace config trước (layer cache — chỉ re-install khi thay đổi deps)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy tất cả package.json trong workspace
COPY apps/nexora-garden/package.json ./apps/nexora-garden/
COPY apps/portfolio/package.json ./apps/portfolio/
COPY packages/api-server/package.json ./packages/api-server/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/db/package.json ./lib/db/

# Cài dependencies — better-sqlite3 tự build nhờ onlyBuiltDependencies
RUN pnpm install --no-frozen-lockfile

# Copy toàn bộ source code
COPY . .

# Build tất cả packages
RUN pnpm --filter @workspace/nexora-garden run build && \
    pnpm --filter @workspace/portfolio run build && \
    pnpm --filter @workspace/api-server run build

# Port mặc định (Northflank inject $PORT)
EXPOSE 8080

CMD ["node", "packages/api-server/dist/index.mjs"]
