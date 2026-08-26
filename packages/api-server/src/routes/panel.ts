import { Router, Request, Response } from "express";

const router = Router();

const PTERO_URL = process.env.PTERO_URL || "https://panel.nvnmc.cloud";
const PTERO_KEY = process.env.PTERO_KEY || "ptlc_4j9mOvAgqmjl6twoRRWiQFbePKL4Izz55jC9sJthFMr";

// Quy co dinh rieng cho tung host trong he thong Pterodactyl (Ke ca host dang tat)
const HOST_FUNDS: { [identifier: string]: number } = {
  "aecf0f75": 18.50, // KhangSMP2 (16GB RAM)
  "406f63f4": 12.00, // KhangSMP (8GB RAM - Dang tat nhung con quy 12.00 Coin)
  "7dc32cbc": 5.50   // Khang (4GB RAM - Dang tat nhung con quy 5.50 Coin)
};

router.get("/panel/hosts", async (req: Request, res: Response) => {
  try {
    const headers = {
      Authorization: "Bearer " + PTERO_KEY,
      Accept: "application/json"
    };

    // 1. Truy van danh sach may chu that tu Pterodactyl Panel Client API
    const serverListRes = await fetch(PTERO_URL + "/api/client", { headers });
    if (!serverListRes.ok) {
      throw new Error("Lỗi kết nối Pterodactyl Panel API: " + serverListRes.status);
    }

    const serverListData = await serverListRes.json();
    const rawServers = serverListData.data || [];

    // 2. Lay thong so phan cung & resources thoi gian thuc tung may chu
    const hosts = await Promise.all(
      rawServers.map(async (item: any) => {
        const attr = item.attributes;
        const id = attr.identifier;
        let state = "offline";
        let ramBytes = 0;
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

        const ramLimitMB = attr.limits?.memory || 1024;
        const ramLimitBytes = ramLimitMB * 1024 * 1024;
        const cpuLimitPercent = attr.limits?.cpu || 100;
        const diskLimitMB = attr.limits?.disk || 1024;
        const diskLimitBytes = diskLimitMB * 1024 * 1024;

        // Allocation IP & Port
        const defaultAlloc = attr.relationships?.allocations?.data?.find((a: any) => a.attributes?.is_default)?.attributes || attr.relationships?.allocations?.data?.[0]?.attributes || {};
        const ipAlias = defaultAlloc.ip_alias || "nvnmc.asia";
        const port = defaultAlloc.port || 25565;

        // Chi phi coin/ngay va quy hien co
        const ramGB = ramLimitMB / 1024;
        const dailyCost = parseFloat((ramGB * 1.5).toFixed(2));
        const fund = HOST_FUNDS[id] !== undefined ? HOST_FUNDS[id] : 10.00;

        return {
          id: attr.identifier,
          uuid: attr.uuid,
          name: attr.name,
          node: attr.node,
          type: "Pterodactyl Node Host",
          ip: `${ipAlias}:${port}`,
          status: state, // "running" | "offline" | "starting"
          fund,
          dailyCost,
          ramLimitMB,
          ramLimitBytes,
          ramUsedBytes: ramBytes,
          ramFormatted: `${(ramBytes / 1073741824).toFixed(2)} GB / ${(ramLimitMB / 1024).toFixed(0)} GB`,
          cpuLimitPercent,
          cpuPercent: parseFloat(cpuPercent.toFixed(1)),
          diskLimitMB,
          diskUsedBytes: diskBytes,
          diskFormatted: `${(diskBytes / 1073741824).toFixed(2)} GB / ${(diskLimitMB / 1024).toFixed(0)} GB`,
          uptimeMs,
          uptimeFormatted: uptimeMs > 0 ? `${Math.floor(uptimeMs / 3600000)}h ${Math.floor((uptimeMs % 3600000) / 60000)}m ${Math.floor((uptimeMs % 60000) / 1000)}s` : "0h 0m 0s"
        };
      })
    );

    const totalHostFunds = hosts.reduce((acc, h) => acc + h.fund, 0);
    const userBalance = 0.38; // Vi chinh 0.38 Coin
    const totalDailyCost = hosts.reduce((acc, h) => acc + (h.status === "running" ? h.dailyCost : 0), 0);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      userBalance,
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
