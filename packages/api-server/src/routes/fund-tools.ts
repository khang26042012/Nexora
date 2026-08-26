import { Router, Request, Response } from "express";
import crypto from "node:crypto";

const router = Router();

// Cấu hình 3 host từ 3 script Python
const HOST_CONFIGS: Record<string, { name: string; serverId: string; secret: string }> = {
  "aecf0f75": { // KhangSMP2
    name: "KhangSMP2",
    serverId: "5I4Es07BMsOLTgzsAmHLq",
    secret: "h9Ys1qeFK1cXKWCMm4Z2aLugnfml0bc0hM1bsPfBG0KjCU4n"
  },
  "406f63f4": { // KhangSMP
    name: "KhangSMP",
    serverId: "cVUtOgUmTkA1UhUgTZ88n",
    secret: "hA3Y3rcytUMnCsnTciajL9RorCH0ntZtkCIb8hUmp2vbLR8Q"
  },
  "7dc32cbc": { // Khang
    name: "Khang",
    serverId: "KBeAUbzCNCz0zpv0WE4nT",
    secret: "sNzPWcNsN43CbsFnteiRdDtSqqToIHlNQ0ZF2b2DJIFW15hY"
  }
};

const ALL_PLAYERS = [
  "PE_AgedSundew379", "PE_anhthe9978", "PE_AquaTurtle547", "PE_Ariokun4742",
  "PE_bunmeomeo", "PE_GiantPlate559", "PE_haimilo6233", "PE_hnamdz5508",
  "PE_khoi2345678l", "PE_nguyensamset", "PE_NiftyTwo7202", "PE_TimePeak2063",
  "PE_VexedRook7643", "PE_ZEVITVN", "PE_KhangKYT", "FE_KhangkiT"
];

const PANEL_URL = "https://dash.nvnmc.cloud";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function hmacHex(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function getRandomPlayer(): string {
  return ALL_PLAYERS[Math.floor(Math.random() * ALL_PLAYERS.length)];
}

// Hàm sinh link đóng góp trực tiếp cho 1 host với fallback signature chuẩn
async function generateLinkForHost(hostKey: string, playerName: string) {
  const config = HOST_CONFIGS[hostKey];
  if (!config) throw new Error(`Không tìm thấy cấu hình cho host ${hostKey}`);

  const ts = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomUUID();
  const mcUuid = crypto.randomUUID();

  // Tạo cả 2 định dạng JSON body (Standard Python json.dumps vs Compact JSON)
  const bodyData = {
    server_id: config.serverId,
    minecraft_uuid: mcUuid,
    minecraft_name: playerName,
    playtime_seconds: 900
  };

  const bodyCompact = JSON.stringify(bodyData); // {"server_id":"...","minecraft_uuid":"..."}
  const bodyStandard = `{"server_id": "${config.serverId}", "minecraft_uuid": "${mcUuid}", "minecraft_name": "${playerName}", "playtime_seconds": 900}`; // With spaces like Python default

  // Danh sách kết hợp body + candidate payload formulas
  const attempts = [
    { body: bodyCompact, payload: `${ts}.${nonce}.${bodyCompact}` },
    { body: bodyStandard, payload: `${ts}.${nonce}.${bodyStandard}` },
    { body: bodyCompact, payload: `${ts}${nonce}${bodyCompact}` },
    { body: bodyStandard, payload: `${ts}${nonce}${bodyStandard}` },
    { body: bodyCompact, payload: `${bodyCompact}${ts}${nonce}` },
    { body: bodyCompact, payload: `${nonce}.${ts}.${bodyCompact}` },
    { body: bodyCompact, payload: `${ts}|${nonce}|${bodyCompact}` }
  ];

  let startUrl = "";
  let lastErr = "";

  for (const { body, payload } of attempts) {
    const sig = hmacHex(config.secret, payload);
    try {
      const res = await fetch(`${PANEL_URL}/api/server-contributions/session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Plugin-Timestamp": ts.toString(),
          "X-Plugin-Nonce": nonce,
          "X-Plugin-Signature": sig,
          "X-Plugin-Version": "NvnServerSupport/1.0.0",
          "User-Agent": USER_AGENT
        },
        body
      });

      if (res.ok) {
        const json = await res.json();
        startUrl = json.url || "";
        if (startUrl) break;
      } else {
        lastErr = await res.text();
      }
    } catch (e: any) {
      lastErr = e.message;
    }
  }

  if (!startUrl) {
    return { success: false, error: `Không tạo được session: ${lastErr.slice(0, 100)}` };
  }

  // Bước 2: Lấy CSRF token từ startUrl
  try {
    const startRes = await fetch(startUrl, {
      headers: { "User-Agent": USER_AGENT }
    });
    const html = await startRes.text();
    const setCookie = startRes.headers.get("set-cookie") || "";

    const csrfMatch = html.match(/name="_token"\s+value="([^"]+)"/);
    if (!csrfMatch) {
      return { success: false, error: "Không tìm thấy CSRF token trên Panel" };
    }
    const csrfToken = csrfMatch[1];
    const tokenId = startUrl.split("/").pop();

    // Bước 3: Generate link đóng góp
    const genUrl = `${PANEL_URL}/server-contributions/generate/${tokenId}`;
    const postBody = new URLSearchParams({
      _token: csrfToken,
      provider_id: "1" // Link4m
    }).toString();

    const genRes = await fetch(genUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
        "Cookie": setCookie
      },
      body: postBody,
      redirect: "manual"
    });

    const location = genRes.headers.get("location");
    if (location) {
      return { success: true, link: location, player: playerName };
    } else {
      return { success: false, error: `Không nhận được redirect Location (${genRes.status})` };
    }
  } catch (e: any) {
    return { success: false, error: `Lỗi xử lý tạo link: ${e.message}` };
  }
}

router.post("/fund-tools", async (req: Request, res: Response) => {
  try {
    const { hosts, limit = 1 } = req.body;
    const targetHosts = Array.isArray(hosts) && hosts.length > 0 ? hosts : Object.keys(HOST_CONFIGS);
    const count = Math.max(1, Math.min(Number(limit) || 1, 20));

    const results = [];

    for (const hostKey of targetHosts) {
      const config = HOST_CONFIGS[hostKey];
      if (!config) continue;

      const hostResults = [];
      for (let i = 0; i < count; i++) {
        const player = getRandomPlayer();
        const resObj = await generateLinkForHost(hostKey, player);
        
        if (resObj.success) {
          hostResults.push({
            status: "success",
            player: resObj.player,
            link: resObj.link
          });
        } else {
          hostResults.push({
            status: "error",
            player,
            message: resObj.error
          });
        }
      }

      results.push({
        hostId: hostKey,
        hostName: config.name,
        status: hostResults.some(r => r.status === "success") ? "success" : "error",
        message: `Đã hoàn tất tạo ${hostResults.filter(r => r.status === "success").length}/${count} link`,
        data: hostResults
      });
    }

    res.json({ success: true, results });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Lỗi xử lý hệ thống"
    });
  }
});

export default router;
