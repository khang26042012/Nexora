import { Router, Request, Response } from "express";

const router = Router();

const PTERO_URL = process.env.PTERO_URL || "https://panel.nvnmc.cloud";
const PTERO_KEY = process.env.PTERO_KEY || "ptlc_4j9mOvAgqmjl6twoRRWiQFbePKL4Izz55jC9sJthFMr";

router.get("/panel/hosts", async (req: Request, res: Response) => {
  try {
    const headers = {
      Authorization: "Bearer " + PTERO_KEY,
      Accept: "application/json"
    };

    const serverListRes = await fetch(PTERO_URL + "/api/client", { headers });
    if (!serverListRes.ok) {
      throw new Error("Loi ket noi Pterodactyl Panel: " + serverListRes.status);
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
        } catch (e) {
          // ignore individual server resource fetch error
        }

        // Tinh gia tri Coin cho moi host dua tren RAM cap va Uptime
        const ramGB = (attr.limits?.memory || 0) / 1024 || 1;
        const dailyCost = Math.round(ramGB * 10); // 1GB RAM = 10 Coin/ngay
        const fund = Math.round(dailyCost * 18.5); // Quy uoc tinh quy

        return {
          id: attr.identifier,
          uuid: attr.uuid,
          name: attr.name,
          node: attr.node,
          type: "Pterodactyl Node Host",
          ip: `${attr.node.toLowerCase()}.nvnmc.cloud`,
          status: state, // "running" | "offline" | "starting"
          fund,
          dailyCost,
          ramUsedBytes: ramBytes,
          ramLimitBytes,
          ramFormatted: `${(ramBytes / 1073741824).toFixed(2)} GB / ${(ramLimitBytes / 1073741824).toFixed(0)} GB`,
          cpuPercent: parseFloat(cpuPercent.toFixed(1)),
          diskBytes,
          diskFormatted: `${(diskBytes / 1073741824).toFixed(2)} GB`,
          uptimeMs,
          uptimeFormatted: uptimeMs > 0 ? `${Math.floor(uptimeMs / 3600000)}h ${Math.floor((uptimeMs % 3600000) / 60000)}m` : "0h 0m"
        };
      })
    );

    const totalHostFunds = hosts.reduce((acc, h) => acc + h.fund, 0);
    const userBalance = 15420; // Coin ví chính tài khoản
    const totalDailyCost = hosts.reduce((acc, h) => acc + (h.status === "running" ? h.dailyCost : 0), 0);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      userBalance,
      totalHostFunds,
      totalDailyCost,
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
