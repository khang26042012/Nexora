FROM node:22-slim

# Build tools + ffmpeg (cần cho video trim/download)
RUN apt-get update && \
    apt-get install -y python3 make g++ ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Pin pnpm + cài node-gyp global
RUN npm install -g pnpm@10.26.1 node-gyp

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

# Cài deps (không chạy scripts)
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# Build better-sqlite3 native binary trực tiếp bằng node-gyp
RUN cd node_modules/.pnpm/better-sqlite3@11.10.0/node_modules/better-sqlite3 && \
    node-gyp configure && \
    node-gyp build

# Copy source code
COPY . .

# Build từng package
RUN pnpm --filter @workspace/nexora-garden run build && \
    pnpm --filter @workspace/portfolio run build && \
    pnpm --filter @workspace/api-server run build

# OpenShift compatibility: tạo data dir + cấp quyền group root (writeable cho UID động)
RUN mkdir -p /app/packages/api-server/data && \
    chgrp -R 0 /app && \
    chmod -R g=u /app

# Chạy non-root (UID 1001) — Railway/Leapcell/OpenShift đều OK
USER 1001

EXPOSE 8080
CMD ["node", "packages/api-server/dist/index.mjs"]
