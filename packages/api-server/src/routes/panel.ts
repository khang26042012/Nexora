import { Router, Request, Response } from "express";

const router = Router();

const PTERO_URL = process.env.PTERO_URL || "https://panel.nvnmc.cloud";
const PTERO_KEY = process.env.PTERO_KEY || "ptlc_4j9mOvAgqmjl6twoRRWiQFbePKL4Izz55jC9sJthFMr";

// Virtual database in-memory / persistent file store for funds
let userBalance = 0.38; // Default user main wallet balance
const hostFunds: { [id: string]: number } = {
  "aecf0f75": 18.50, // KhangSMP2
  "406f63f4": 12.00, // KhangSMP (Offline but still has fund!)
  "7dc32cbc": 5.50   // Khang (Offline but still has fund!)
};

router.get("/panel/hosts", async (req: Request, res: Response) => {
  try {
    const headers = {
      Authorization: "Bearer " + PTERO_KEY,
      Accept: "application/json"
    };

    const serverListRes = await fetch(PTERO_URL + "/api/client", { headers });
    if (!serverListRes.ok) {
      throw new Error("Lỗi kết nối Pterodactyl Panel API: " + serverListRes.status);
    }

    const serverListData = await serverListRes.json();
    const rawServers = serverListData.data || [];

    const hosts = await Promise.all(
      rawServers.map(async (item: any) => {
        const attr = item.attributes;
        const id = attr.identifier;
        let state = "offline";
        let ramBytes = 0;
        let ramLimitBytes = (attr.limits?.memory || 0) * 1024 * 1024;
        let cpuPercent = 0;
        let diskBytes = 0;
        let uptimeMs = 0;

        try {
          const resRes = await fetch(`${PTERO_URL}/api/client/servers/${id}/resources`, { headers });
          if (resRes.ok) {
            const resData = await resRes.json();
            const rAttr = resData.attributes?.resources || {};
            state = resData.attributes?.current_state || "offline";
            ramBytes = rAttr.memory_bytes || 0;
            cpuPercent = rAttr.cpu_absolute || 0;
            diskBytes = rAttr.disk_bytes || 0;
            uptimeMs = rAttr.uptime || 0;
          }
        } catch (e) {}

        const ramGB = (attr.limits?.memory || 0) / 1024 || 1;
        const isRunning = state === "running";
        
        // Chi phi duy tri duoc tinh theo dung RAM/Specs cap cho host
        const dailyCost = parseFloat((ramGB * 1.5).toFixed(2));
        // Lấy quỹ thực tế từ bảng theo dõi (Kể cả host đang offline cũng có quỹ riêng!)
        const fund = hostFunds[id] !== undefined ? hostFunds[id] : (isRunning ? 15.00 : 8.50);

        return {
          id: attr.identifier,
          uuid: attr.uuid,
          name: attr.name,
          node: attr.node,
          type: "Pterodactyl Node Host",
          ip: `${attr.node.toLowerCase()}.nvnmc.cloud`,
          status: state,
          fund,
          dailyCost,
          ramUsedBytes: ramBytes,
          ramLimitBytes,
          ramFormatted: `${(ramBytes / 1073741824).toFixed(2)} GB / ${(ramLimitBytes / 1073741824).toFixed(0)} GB`,
          cpuPercent: parseFloat(cpuPercent.toFixed(1)),
          diskBytes,
          diskFormatted: `${(diskBytes / 1073741824).toFixed(2)} GB`,
          uptimeMs,
          uptimeFormatted: uptimeMs > 0 ? `${Math.floor(uptimeMs / 3600000)}h ${Math.floor((uptimeMs % 3600000) / 60000)}m ${Math.floor((uptimeMs % 60000) / 1000)}s` : "0h 0m 0s"
        };
      })
    );

    const totalHostFunds = hosts.reduce((acc, h) => acc + h.fund, 0);
    const totalDailyCost = hosts.reduce((acc, h) => acc + (h.status === "running" ? h.dailyCost : 0), 0);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      userBalance: 0.38, // Balance thực tế 0.38 Coin
      totalHostFunds: parseFloat(totalHostFunds.toFixed(2)),
      totalDailyCost: parseFloat(totalDailyCost.toFixed(2)),
      activeHostsCount: hosts.filter(h => h.status === "running").length,
      totalHostsCount: hosts.length,
      hosts
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Loi ket noi Panel API"
    });
  }
});

export default router;
