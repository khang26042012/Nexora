FROM node:20-slim

# Build tools cho better-sqlite3 native module
RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# Cài đúng pnpm version (khớp với package.json packageManager)
RUN npm install -g pnpm@10.26.1

WORKDIR /app

# Copy workspace config trước (layer cache)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy tất cả package.json trong workspace
COPY apps/nexora-garden/package.json ./apps/nexora-garden/
COPY apps/portfolio/package.json ./apps/portfolio/
COPY packages/api-server/package.json ./packages/api-server/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/db/package.json ./lib/db/

# Bước 1: Cài deps không chạy scripts trước (nhanh hơn, tránh timeout)
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# Bước 2: Build riêng better-sqlite3 native binary
RUN cd node_modules/.pnpm/better-sqlite3@11.10.0/node_modules/better-sqlite3 && \
    npx node-gyp rebuild

# Copy toàn bộ source code
COPY . .

# Build tất cả packages
RUN pnpm --filter @workspace/nexora-garden run build && \
    pnpm --filter @workspace/portfolio run build && \
    pnpm --filter @workspace/api-server run build

# Railway inject $PORT tự động
EXPOSE 8080

CMD ["node", "packages/api-server/dist/index.mjs"]
