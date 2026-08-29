package com.nexora.secret.metrics;

import com.google.gson.JsonObject;
import org.bukkit.Bukkit;
import org.bukkit.World;

import java.lang.management.ManagementFactory;
import java.lang.management.OperatingSystemMXBean;

public class MetricsCollector {

    private final String serverName;
    private final String serverVersion;
    private final long startTime;

    public MetricsCollector(String serverName, String serverVersion) {
        this.serverName = serverName;
        this.serverVersion = serverVersion;
        this.startTime = System.currentTimeMillis();
    }

    public String collectMetrics() {
        JsonObject root = new JsonObject();
        
        try {
            root.addProperty("serverName", serverName);
            root.addProperty("version", serverVersion);
            root.addProperty("status", "online");
            root.addProperty("uptimeSeconds", (System.currentTimeMillis() - startTime) / 1000);

            // Players
            JsonObject players = new JsonObject();
            players.addProperty("online", Bukkit.getOnlinePlayers().size());
            players.addProperty("max", Bukkit.getMaxPlayers());
            root.add("players", players);

            // TPS
            JsonObject tps = new JsonObject();
            double[] bukkitTps = Bukkit.getTPS();
            tps.addProperty("oneMin", round(bukkitTps[0], 1));
            tps.addProperty("fiveMin", round(bukkitTps[1], 1));
            tps.addProperty("fifteenMin", round(bukkitTps[2], 1));
            root.add("tps", tps);

            // MSPT
            root.addProperty("mspt", round(Bukkit.getAverageTickTime(), 2));

            // Entities and Chunks
            int totalEntities = 0;
            int totalChunks = 0;
            for (World world : Bukkit.getWorlds()) {
                try {
                    totalEntities += world.getEntityCount();
                    totalChunks += world.getLoadedChunks().length;
                } catch (Exception ignored) {}
            }
            root.addProperty("entities", totalEntities);
            root.addProperty("chunks", totalChunks);

            // RAM — Virtual scaling: actual 4GB → display as 6GB max
            Runtime runtime = Runtime.getRuntime();
            long usedBytes = runtime.totalMemory() - runtime.freeMemory();
            int actualUsedMB = (int) (usedBytes / (1024 * 1024));
            
            // Scale factor: 6144MB (6GB virtual) / 4096MB (4GB actual) = 1.5
            final int VIRTUAL_RAM_MAX_MB = 6144;
            final double RAM_SCALE_FACTOR = 1.5;
            int scaledUsedMB = (int) Math.min(VIRTUAL_RAM_MAX_MB, actualUsedMB * RAM_SCALE_FACTOR);
            int ramPercent = (int) ((scaledUsedMB * 100.0) / VIRTUAL_RAM_MAX_MB);

            JsonObject ram = new JsonObject();
            ram.addProperty("usedMB", scaledUsedMB);
            ram.addProperty("maxMB", VIRTUAL_RAM_MAX_MB);
            ram.addProperty("percent", Math.min(100, Math.max(0, ramPercent)));
            root.add("ram", ram);

            // CPU — Virtual scaling: actual 200% → display as max 400%
            // On shared hosting, CPU can exceed 100%. We scale so 200% actual = 400% displayed.
            JsonObject cpu = new JsonObject();
            double cpuPercent = 0;
            try {
                OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
                if (osBean instanceof com.sun.management.OperatingSystemMXBean sunOsBean) {
                    double load = sunOsBean.getProcessCpuLoad();
                    cpuPercent = load * 100; // Can be >100 on multi-core/shared
                }
            } catch (Exception ignored) {}
            
            // Scale: multiply by 2.0 so 200% actual → 400% displayed
            final double CPU_SCALE_FACTOR = 2.0;
            int scaledCpuPercent = (int) Math.round(cpuPercent * CPU_SCALE_FACTOR);
            cpu.addProperty("percent", Math.max(0, scaledCpuPercent));
            root.add("cpu", cpu);

            // Network (placeholder - not easily accessible from Bukkit API)
            JsonObject network = new JsonObject();
            network.addProperty("inboundKBs", 0.0);
            network.addProperty("outboundKBs", 0.0);
            root.add("network", network);

        } catch (Exception e) {
            // If anything fails, still return valid JSON with defaults
            root.addProperty("serverName", serverName);
            root.addProperty("version", serverVersion);
            root.addProperty("status", "online");
            root.addProperty("uptimeSeconds", (System.currentTimeMillis() - startTime) / 1000);
            
            JsonObject players = new JsonObject();
            players.addProperty("online", 0);
            players.addProperty("max", 0);
            root.add("players", players);
            
            JsonObject tpsObj = new JsonObject();
            tpsObj.addProperty("oneMin", 0.0);
            tpsObj.addProperty("fiveMin", 0.0);
            tpsObj.addProperty("fifteenMin", 0.0);
            root.add("tps", tpsObj);
            
            root.addProperty("mspt", 0.0);
            root.addProperty("entities", 0);
            root.addProperty("chunks", 0);
            
            JsonObject ramObj = new JsonObject();
            ramObj.addProperty("usedMB", 0);
            ramObj.addProperty("maxMB", 6144); // Virtual 6GB
            ramObj.addProperty("percent", 0);
            root.add("ram", ramObj);
            
            JsonObject cpuObj = new JsonObject();
            cpuObj.addProperty("percent", 0); // Scaled value, 0 when error
            root.add("cpu", cpuObj);
            
            JsonObject netObj = new JsonObject();
            netObj.addProperty("inboundKBs", 0.0);
            netObj.addProperty("outboundKBs", 0.0);
            root.add("network", netObj);
        }

        return root.toString();
    }

    private double round(double value, int places) {
        double scale = Math.pow(10, places);
        return Math.round(value * scale) / scale;
    }
}