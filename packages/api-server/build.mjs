import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";
import { rm, chmod } from "node:fs/promises";
import { existsSync, createWriteStream, renameSync, unlinkSync } from "node:fs";
import { execFileSync, execFile } from "node:child_process";
import https from "node:https";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

/* ── Tìm native ffmpeg trên host ── */
function findNativeFfmpeg() {
  try {
    const found = execFileSync("which", ["ffmpeg"], { timeout: 3_000, stdio: "pipe" }).toString().trim();
    if (found) {
      execFileSync(found, ["-version"], { timeout: 3_000, stdio: "pipe" });
      return found;
    }
  } catch {}
  for (const p of ["/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg"]) {
    try { execFileSync(p, ["-version"], { timeout: 3_000, stdio: "pipe" }); return p; } catch {}
  }
  return null;
}

/* ── Download file với redirect support ── */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const tmp = dest + ".tmp";
    const file = createWriteStream(tmp);
    const get = (u) => https.get(u, { timeout: 120_000 }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        return get(res.headers.location);
      }
      if (res.statusCode !== 200) {
        res.resume(); file.destroy();
        try { unlinkSync(tmp); } catch {}
        return reject(new Error(`HTTP ${res.statusCode} from ${u}`));
      }
      let downloaded = 0;
      res.on("data", (chunk) => {
        downloaded += chunk.length;
        if (downloaded % (5 * 1024 * 1024) < chunk.length) {
          process.stdout.write(`\r[build] ffmpeg: ${(downloaded / 1024 / 1024).toFixed(1)}MB downloaded...`);
        }
      });
      res.pipe(file);
      file.on("finish", () => {
        process.stdout.write("\n");
        try { renameSync(tmp, dest); resolve(); } catch (e) { reject(e); }
      });
      file.on("error", (e) => { try { unlinkSync(tmp); } catch {} reject(e); });
    }).on("error", (e) => { file.destroy(); try { unlinkSync(tmp); } catch {} reject(e); });
    get(url);
  });
}

/* ── Download & bundle ffmpeg vào dist/ ── */
async function downloadFfmpeg(distDir) {
  const destBin = path.join(distDir, "ffmpeg");

  if (existsSync(destBin)) {
    try {
      execFileSync(destBin, ["-version"], { timeout: 3_000, stdio: "pipe" });
      console.log("[build] ffmpeg already bundled at dist/ffmpeg ✅");
      return;
    } catch {
      unlinkSync(destBin); // binary hỏng → xóa, download lại
    }
  }

  /* Nếu host có native ffmpeg (Replit) → copy vào dist/ để server dùng luôn */
  const native = findNativeFfmpeg();
  if (native) {
    console.log("[build] native ffmpeg found:", native, "— copying to dist/ffmpeg…");
    try {
      const { copyFileSync } = await import("node:fs");
      copyFileSync(native, destBin);
      await chmod(destBin, 0o755);
      console.log("[build] ffmpeg bundled → dist/ffmpeg ✅");
      return;
    } catch (e) {
      console.warn("[build] could not copy native ffmpeg:", e.message, "— server will use native directly");
      return;
    }
  }

  /* Không có native → download static binary (cho Render/Railway) */
  const FFMPEG_URL = "https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz";
  const tarPath = path.join(distDir, "ffmpeg.tar.xz");

  console.log("[build] No native ffmpeg — downloading static binary for deployment (~40MB)…");
  console.log("[build] URL:", FFMPEG_URL);

  try {
    await downloadFile(FFMPEG_URL, tarPath);
    console.log("[build] Extracting ffmpeg binary…");

    await new Promise((resolve, reject) => {
      execFile("tar", [
        "-xJf", tarPath, "-C", distDir,
        "--wildcards", "--no-anchored", "*/ffmpeg",
        "--strip-components=2",
      ], { timeout: 180_000 }, (err) => err ? reject(err) : resolve(undefined));
    });

    try { unlinkSync(tarPath); } catch {}

    if (existsSync(destBin)) {
      await chmod(destBin, 0o755);
      console.log("[build] ffmpeg static binary bundled → dist/ffmpeg ✅");
    } else {
      console.warn("[build] ffmpeg binary not found after extract — server will download at runtime");
    }
  } catch (e) {
    try { unlinkSync(tarPath); } catch {}
    console.warn("[build] ffmpeg download failed:", e.message, "— server will download at runtime");
  }
}

async function buildAll() {
  const distDir = path.resolve(artifactDir, "dist");
  await rm(distDir, { recursive: true, force: true });

  await esbuild({
    entryPoints: [path.resolve(artifactDir, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outdir: distDir,
    outExtension: { ".js": ".mjs" },
    logLevel: "info",
    external: [
      "*.node",
      "sharp",
      "better-sqlite3",
      "sqlite3",
      "canvas",
      "bcrypt",
      "argon2",
      "fsevents",
      "re2",
      "farmhash",
      "xxhash-addon",
      "bufferutil",
      "utf-8-validate",
      "ssh2",
      "cpu-features",
      "dtrace-provider",
      "isolated-vm",
      "lightningcss",
      "pg-native",
      "oracledb",
      "mongodb-client-encryption",
      "nodemailer",
      "handlebars",
      "knex",
      "typeorm",
      "protobufjs",
      "onnxruntime-node",
      "@tensorflow/*",
      "@prisma/client",
      "@mikro-orm/*",
      "@grpc/*",
      "@swc/*",
      "@aws-sdk/*",
      "@azure/*",
      "@opentelemetry/*",
      "@google-cloud/*",
      "@google/*",
      "googleapis",
      "firebase-admin",
      "@parcel/watcher",
      "@sentry/profiling-node",
      "@tree-sitter/*",
      "aws-sdk",
      "classic-level",
      "dd-trace",
      "ffi-napi",
      "grpc",
      "hiredis",
      "kerberos",
      "leveldown",
      "miniflare",
      "mysql2",
      "newrelic",
      "odbc",
      "piscina",
      "realm",
      "ref-napi",
      "rocksdb",
      "sass-embedded",
      "sequelize",
      "serialport",
      "snappy",
      "tinypool",
      "usb",
      "workerd",
      "wrangler",
      "zeromq",
      "zeromq-prebuilt",
      "playwright",
      "puppeteer",
      "puppeteer-core",
      "electron",
    ],
    sourcemap: "linked",
    plugins: [
      esbuildPluginPino({ transports: ["pino-pretty"] })
    ],
    banner: {
      js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';

globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
    `,
    },
  });

  /* Bundle ffmpeg vào dist/ sau khi esbuild xong */
  await downloadFfmpeg(distDir);
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
