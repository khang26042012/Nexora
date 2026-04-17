#!/usr/bin/env node
/**
 * setup-sqlite.mjs
 * Copy prebuilt better_sqlite3.node vào đúng vị trí trong pnpm store.
 * Chạy trước dev/build để tránh phải rebuild từ source (mất 2-3 phút).
 *
 * Nếu binary không khớp (Node version khác) sẽ tự động rebuild.
 */

import { existsSync, copyFileSync, mkdirSync } from "fs";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

// Vị trí binary trong pnpm store
const SQLITE_VERSION = "11.10.0";
const STORE_PATH = path.join(
  ROOT,
  "node_modules/.pnpm",
  `better-sqlite3@${SQLITE_VERSION}`,
  "node_modules/better-sqlite3/build/Release"
);
const TARGET = path.join(STORE_PATH, "better_sqlite3.node");

// Prebuilt binary (committed vào git)
const PREBUILT = path.join(__dirname, "prebuilt/better_sqlite3.node");

// Nếu binary đã tồn tại → skip
if (existsSync(TARGET)) {
  console.log("[sqlite] better_sqlite3.node already exists ✅");
  process.exit(0);
}

// Thử copy từ prebuilt
if (existsSync(PREBUILT)) {
  try {
    mkdirSync(STORE_PATH, { recursive: true });
    copyFileSync(PREBUILT, TARGET);

    // Verify: thử load thực sự
    const { createRequire } = await import("module");
    const require = createRequire(import.meta.url);
    require(TARGET);

    console.log("[sqlite] ✅ Prebuilt binary copied & verified (instant!)");
    process.exit(0);
  } catch (e) {
    console.warn("[sqlite] ⚠️  Prebuilt binary incompatible, rebuilding from source...");
    console.warn("         Lý do:", e.message);
  }
}

// Fallback: build từ source
console.log("[sqlite] 🔧 Building better-sqlite3 from source (1-2 phút)...");
try {
  const SQLITE_DIR = path.join(
    ROOT,
    "node_modules/.pnpm",
    `better-sqlite3@${SQLITE_VERSION}`,
    "node_modules/better-sqlite3"
  );
  const NODE_DIR =
    "/nix/store/9cyx2v23dip6p9q98384k9v06c96qskb-nodejs-24.13.0";

  mkdirSync(path.join(SQLITE_DIR, "build/node_gyp_bins"), { recursive: true });
  execSync(
    `npx node-gyp --nodedir="${NODE_DIR}" configure && npx node-gyp --nodedir="${NODE_DIR}" build --release`,
    { cwd: SQLITE_DIR, stdio: "inherit" }
  );
  console.log("[sqlite] ✅ Built from source successfully");
} catch (err) {
  console.error("[sqlite] ❌ Build failed:", err.message);
  process.exit(1);
}
