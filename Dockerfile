FROM node:20-slim

# Build tools cho better-sqlite3 native module
RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# Pin đúng pnpm version (khớp package.json)
RUN npm install -g pnpm@10.26.1

WORKDIR /app

# Copy workspace config (layer cache)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/nexora-garden/package.json ./apps/nexora-garden/
COPY apps/portfolio/package.json ./apps/portfolio/
COPY packages/api-server/package.json ./packages/api-server/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/db/package.json ./lib/db/

# Cài deps (không chạy scripts — tránh timeout native build lẫn lộn)
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# Rebuild tất cả native modules (better-sqlite3, v.v.)
RUN pnpm rebuild

# Copy source code
COPY . .

# Build từng package
RUN pnpm --filter @workspace/nexora-garden run build && \
    pnpm --filter @workspace/portfolio run build && \
    pnpm --filter @workspace/api-server run build

EXPOSE 8080
CMD ["node", "packages/api-server/dist/index.mjs"]
