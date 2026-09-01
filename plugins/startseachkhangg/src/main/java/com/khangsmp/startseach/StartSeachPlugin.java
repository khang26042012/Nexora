package com.khangsmp.startseach;

import org.bukkit.Bukkit;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.ConsoleCommandSender;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.io.*;
import java.lang.management.ManagementFactory;
import java.lang.management.OperatingSystemMXBean;
import java.lang.reflect.Method;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.TimeUnit;

public class StartSeachPlugin extends JavaPlugin implements CommandExecutor {

    private static final String OUTPUT_FILE = "startseach_result.json";
    private final Gson gson = new GsonBuilder().setPrettyPrinting().create();
    
    // WebSocket client
    private WebSocket webSocket;
    private HttpClient httpClient;
    private BukkitTask autoScanTask;
    private volatile boolean wsConnected = false;
    
    // Latest scan result cache for /info command
    private Map<String, Object> latestStats = null;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        
        // Register commands
        Objects.requireNonNull(getCommand("startseach")).setExecutor(this);
        Objects.requireNonNull(getCommand("info")).setExecutor(this);
        
        // Initialize HTTP client for WebSocket
        try {
            httpClient = HttpClient.newBuilder()
                .connectTimeout(java.time.Duration.ofSeconds(10))
                .build();
        } catch (Exception e) {
            getLogger().warning("Failed to initialize HTTP client: " + e.getMessage());
        }
        
        // Start WebSocket connection and auto-scan
        startWebSocket();
        startAutoScan();
        
        getLogger().info("StartSeachKhangg enabled. WebSocket: " + getConfig().getString("websocket_url", "disabled"));
    }

    @Override
    public void onDisable() {
        // Stop auto-scan task
        if (autoScanTask != null) {
            autoScanTask.cancel();
        }
        // Close WebSocket
        if (webSocket != null) {
            try {
                webSocket.sendClose(WebSocket.NORMAL_CLOSURE, "Plugin disabled");
            } catch (Exception ignored) {}
        }
        getLogger().info("StartSeachKhangg disabled.");
    }

    private void startWebSocket() {
        String wsUrl = getConfig().getString("websocket_url", "");
        if (wsUrl == null || wsUrl.isEmpty()) {
            getLogger().info("WebSocket URL not configured, skipping WS connection.");
            return;
        }
        
        if (httpClient == null) {
            getLogger().warning("HTTP client not initialized, cannot connect WebSocket.");
            return;
        }
        
        try {
            webSocket = httpClient.newWebSocketBuilder()
                .buildAsync(URI.create(wsUrl), new WebSocket.Listener() {
                    @Override
                    public void onOpen(WebSocket ws) {
                        wsConnected = true;
                        getLogger().info("WebSocket connected to " + wsUrl);
                        ws.request(1);
                    }
                    
                    @Override
                    public CompletionStage<?> onText(WebSocket ws, CharSequence data, boolean last) {
                        // Server may send ack or commands - just consume
                        ws.request(1);
                        return null;
                    }
                    
                    @Override
                    public CompletionStage<?> onClose(WebSocket ws, int statusCode, String reason) {
                        wsConnected = false;
                        getLogger().info("WebSocket closed: " + statusCode + " " + reason);
                        // Schedule reconnect after 30 seconds
                        Bukkit.getScheduler().runTaskLater(StartSeachPlugin.this, () -> startWebSocket(), 600L);
                        return null;
                    }
                    
                    @Override
                    public void onError(WebSocket ws, Throwable error) {
                        wsConnected = false;
                        getLogger().warning("WebSocket error: " + error.getMessage());
                    }
                }).join();
        } catch (Exception e) {
            getLogger().warning("Failed to connect WebSocket: " + e.getMessage());
            // Retry after 30 seconds
            Bukkit.getScheduler().runTaskLater(this, () -> startWebSocket(), 600L);
        }
    }

    private void startAutoScan() {
        int intervalSec = getConfig().getInt("scan_interval_seconds", 60);
        if (intervalSec <= 0) {
            getLogger().info("Auto-scan disabled (scan_interval_seconds=0). Use 'startseach' command manually.");
            return;
        }
        
        long intervalTicks = intervalSec * 20L;
        autoScanTask = Bukkit.getScheduler().runTaskTimerAsynchronously(this, () -> {
            Map<String, Object> stats = collectStats();
            latestStats = stats;
            
            // Save to file
            saveToFile(stats);
            
            // Send via WebSocket
            sendViaWebSocket(stats);
        }, intervalTicks, intervalTicks);
        
        getLogger().info("Auto-scan started every " + intervalSec + " seconds.");
    }

    private void sendViaWebSocket(Map<String, Object> stats) {
        if (!wsConnected || webSocket == null) {
            return; // Silent fail - will retry next cycle
        }
        
        try {
            String json = gson.toJson(stats);
            webSocket.sendText(json, true);
        } catch (Exception e) {
            getLogger().warning("Failed to send stats via WebSocket: " + e.getMessage());
        }
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (command.getName().equalsIgnoreCase("startseach")) {
            if (!(sender instanceof ConsoleCommandSender)) {
                sender.sendMessage("\u00a7cThis command can only be run from the server console.");
                return true;
            }
            
            getLogger().info("Manual scan triggered via console.");
            Map<String, Object> stats = collectStats();
            latestStats = stats;
            saveToFile(stats);
            sendViaWebSocket(stats);
            
            // Print summary to console (minimal)
            getLogger().info("Scan complete. Players: " + stats.get("player_slots_formatted") 
                + ", TPS: " + stats.get("tps") 
                + ", RAM: " + stats.get("system_ram_used_mb") + "/" + stats.get("system_ram_total_mb") + " MB");
            return true;
        }
        
        if (command.getName().equalsIgnoreCase("info")) {
            // /info command - can be used by players with permission
            if (latestStats == null) {
                sender.sendMessage("\u00a7e\u26a0 No stats available yet. Waiting for first scan...");
                return true;
            }
            
            sender.sendMessage("\u00a76=== Server Info ===");
            sender.sendMessage("\u00a7ePlayers: \u00a7f" + latestStats.get("player_slots_formatted"));
            sender.sendMessage("\u00a7eTPS: \u00a7f" + latestStats.get("tps"));
            sender.sendMessage("\u00a7eUptime: \u00a7f" + latestStats.get("uptime_formatted"));
            sender.sendMessage("\u00a7eRAM: \u00a7f" + latestStats.get("system_ram_used_mb") + "/" + latestStats.get("system_ram_total_mb") + " MB (" + latestStats.get("system_ram_usage_percent") + "%)");
            sender.sendMessage("\u00a7eCPU: \u00a7f" + latestStats.get("cpu_load_percent") + "% (" + latestStats.get("cpu_cores") + " cores)");
            sender.sendMessage("\u00a7eDisk: \u00a7f" + latestStats.get("disk_used_gb") + "/" + latestStats.get("disk_total_gb") + " GB");
            sender.sendMessage("\u00a7eVersion: \u00a7fMC " + latestStats.get("minecraft_version"));
            sender.sendMessage("\u00a76==================");
            return true;
        }
        
        return false;
    }

    private Map<String, Object> collectStats() {
        Map<String, Object> result = new LinkedHashMap<>();
        List<String> keywords = new ArrayList<>();

        try {
            // Server Info
            result.put("server_name", Bukkit.getServer().getName());
            result.put("server_version", Bukkit.getVersion());
            result.put("bukkit_version", Bukkit.getBukkitVersion());
            result.put("minecraft_version", extractMcVersion(Bukkit.getVersion()));
            result.put("max_players", Bukkit.getMaxPlayers());
            result.put("online_players", Bukkit.getOnlinePlayers().size());
            result.put("player_slots_formatted", Bukkit.getOnlinePlayers().size() + "/" + Bukkit.getMaxPlayers());
            keywords.add("server:" + Bukkit.getServer().getName());
            keywords.add("version:" + extractMcVersion(Bukkit.getVersion()));

            // TPS
            double tps = getTPS();
            result.put("tps", Math.round(tps * 100.0) / 100.0);
            keywords.add("tps:" + Math.round(tps));

            // Uptime
            long uptimeMs = ManagementFactory.getRuntimeMXBean().getUptime();
            long uptimeSec = uptimeMs / 1000;
            result.put("uptime_seconds", uptimeSec);
            result.put("uptime_formatted", formatUptime(uptimeSec));
            keywords.add("uptime:" + uptimeSec);

            // System RAM from cgroup (container-aware)
            long sysRamTotalBytes = 0;
            long sysRamUsedBytes = 0;
            
            // Try cgroup v2 first
            try {
                String memMax = Files.readString(Paths.get("/sys/fs/cgroup/memory.max")).trim();
                String memCurrent = Files.readString(Paths.get("/sys/fs/cgroup/memory.current")).trim();
                if (!memMax.equals("max")) {
                    sysRamTotalBytes = Long.parseLong(memMax);
                }
                sysRamUsedBytes = Long.parseLong(memCurrent);
            } catch (Exception e) {
                // Fallback to cgroup v1
                try {
                    String memLimit = Files.readString(Paths.get("/sys/fs/cgroup/memory/memory.limit_in_bytes")).trim();
                    String memUsage = Files.readString(Paths.get("/sys/fs/cgroup/memory/memory.usage_in_bytes")).trim();
                    long limit = Long.parseLong(memLimit);
                    if (limit < Long.MAX_VALUE - 1000000) { // Not unlimited
                        sysRamTotalBytes = limit;
                    }
                    sysRamUsedBytes = Long.parseLong(memUsage);
                } catch (Exception e2) {
                    // Final fallback: /proc/meminfo
                    try {
                        List<String> meminfoLines = Files.readAllLines(Paths.get("/proc/meminfo"));
                        long memTotalKb = 0, memAvailableKb = 0;
                        for (String line : meminfoLines) {
                            if (line.startsWith("MemTotal:")) {
                                memTotalKb = Long.parseLong(line.replaceAll("[^0-9]", ""));
                            } else if (line.startsWith("MemAvailable:")) {
                                memAvailableKb = Long.parseLong(line.replaceAll("[^0-9]", ""));
                            }
                        }
                        sysRamTotalBytes = memTotalKb * 1024;
                        sysRamUsedBytes = (memTotalKb - memAvailableKb) * 1024;
                    } catch (Exception e3) {
                        // Last resort: JVM heap
                        Runtime rt = Runtime.getRuntime();
                        sysRamTotalBytes = rt.maxMemory();
                        sysRamUsedBytes = rt.totalMemory() - rt.freeMemory();
                    }
                }
            }
            
            long sysRamTotalMb = sysRamTotalBytes / (1024 * 1024);
            long sysRamUsedMb = sysRamUsedBytes / (1024 * 1024);
            int sysRamPercent = sysRamTotalBytes > 0 ? (int) Math.round((double) sysRamUsedBytes / sysRamTotalBytes * 100) : 0;
            
            result.put("system_ram_used_mb", sysRamUsedMb);
            result.put("system_ram_total_mb", sysRamTotalMb);
            result.put("system_ram_usage_percent", sysRamPercent);
            keywords.add("ram:" + sysRamUsedMb + "/" + sysRamTotalMb + "mb");

            // JVM Heap RAM (separate)
            Runtime runtime = Runtime.getRuntime();
            long jvmTotal = runtime.totalMemory();
            long jvmFree = runtime.freeMemory();
            long jvmMax = runtime.maxMemory();
            long jvmUsed = jvmTotal - jvmFree;
            result.put("jvm_heap_used_mb", jvmUsed / (1024 * 1024));
            result.put("jvm_heap_max_mb", jvmMax / (1024 * 1024));

            // CPU
            OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
            int cpuCores = osBean.getAvailableProcessors();
            result.put("cpu_cores", cpuCores);
            result.put("cpu_arch", osBean.getArch());
            result.put("os_name", osBean.getName());
            result.put("os_version", osBean.getVersion());

            double cpuLoad = getCpuLoad(osBean);
            if (cpuLoad >= 0) {
                result.put("cpu_load_percent", Math.round(cpuLoad * 100));
                keywords.add("cpu:" + Math.round(cpuLoad * 100) + "%");
            }
            keywords.add("cores:" + cpuCores);

            // Disk - use config value or auto-detect
            double cfgDiskTotalGb = getConfig().getDouble("disk_total_gb", 0);
            String diskPath = getConfig().getString("disk_path", "/home/container");
            File diskDir = new File(diskPath);
            if (!diskDir.exists()) {
                diskDir = getDataFolder().getParentFile().getParentFile();
                diskPath = diskDir.getAbsolutePath();
            }
            
            long diskTotal = 0;
            long diskFree = 0;
            long diskUsed = 0;
            String diskSource = "unknown";
            
            if (cfgDiskTotalGb > 0) {
                diskTotal = (long)(cfgDiskTotalGb * 1024 * 1024 * 1024);
                diskSource = "config (manual: " + cfgDiskTotalGb + " GB)";
                
                // Get actual used space via du command
                try {
                    Process duProcess = Runtime.getRuntime().exec(new String[]{"du", "-sb", diskPath});
                    BufferedReader duReader = new BufferedReader(new InputStreamReader(duProcess.getInputStream()));
                    String duLine = duReader.readLine();
                    duReader.close();
                    duProcess.waitFor();
                    if (duLine != null && !duLine.isEmpty()) {
                        String bytesStr = duLine.split("\\s+")[0];
                        diskUsed = Long.parseLong(bytesStr);
                        diskFree = diskTotal - diskUsed;
                        if (diskFree < 0) diskFree = 0;
                        diskSource += " + du";
                    }
                } catch (Exception e) {
                    // Fallback to df
                    try {
                        Process dfProcess = Runtime.getRuntime().exec(new String[]{"df", "-B1", diskPath});
                        BufferedReader dfReader = new BufferedReader(new InputStreamReader(dfProcess.getInputStream()));
                        String dfLine;
                        boolean skipped = false;
                        while ((dfLine = dfReader.readLine()) != null) {
                            if (!skipped) { skipped = true; continue; }
                            String[] parts = dfLine.trim().split("\\s+");
                            if (parts.length >= 4) {
                                diskUsed = Long.parseLong(parts[2]);
                                diskFree = diskTotal - diskUsed;
                                if (diskFree < 0) diskFree = 0;
                                diskSource += " + df";
                            }
                        }
                        dfReader.close();
                    } catch (Exception e2) {
                        diskUsed = 0;
                        diskFree = diskTotal;
                    }
                }
            } else {
                // Auto-detect mode
                try {
                    Process dfProcess = Runtime.getRuntime().exec(new String[]{"df", "-B1", diskPath});
                    BufferedReader dfReader = new BufferedReader(new InputStreamReader(dfProcess.getInputStream()));
                    String dfLine;
                    boolean headerSkipped = false;
                    while ((dfLine = dfReader.readLine()) != null) {
                        if (!headerSkipped) { headerSkipped = true; continue; }
                        String[] parts = dfLine.trim().split("\\s+");
                        if (parts.length >= 4) {
                            diskTotal = Long.parseLong(parts[1]);
                            diskUsed = Long.parseLong(parts[2]);
                            diskFree = Long.parseLong(parts[3]);
                        }
                    }
                    dfReader.close();
                    dfProcess.waitFor();
                    diskSource = "df " + diskPath;
                } catch (Exception e) {
                    diskTotal = diskDir.getTotalSpace();
                    diskFree = diskDir.getUsableSpace();
                    diskUsed = diskTotal - diskFree;
                    diskSource = "File API";
                }
            }
            
            double diskTotalGb = Math.round(diskTotal / (1024.0 * 1024 * 1024) * 100) / 100.0;
            double diskUsedGb = Math.round(diskUsed / (1024.0 * 1024 * 1024) * 100) / 100.0;
            double diskFreeGb = Math.round(diskFree / (1024.0 * 1024 * 1024) * 100) / 100.0;
            result.put("disk_total_gb", diskTotalGb);
            result.put("disk_used_gb", diskUsedGb);
            result.put("disk_free_gb", diskFreeGb);
            result.put("disk_source", diskSource);
            keywords.add("disk:" + diskUsedGb + "/" + diskTotalGb + "gb");

            // Network
            Map<String, Object> networkInfo = getNetworkInfo();
            result.put("network", networkInfo);
            String hostname = (String) networkInfo.get("hostname");
            if (hostname != null && !hostname.isEmpty()) {
                keywords.add("host:" + hostname);
            }

            // Timestamp & ID
            String scanId = UUID.randomUUID().toString().substring(0, 8);
            result.put("scan_id", scanId);
            result.put("scan_timestamp", Instant.now().toString());
            result.put("keywords", keywords);

        } catch (Exception e) {
            getLogger().warning("Error collecting stats: " + e.getMessage());
            result.put("error", e.getMessage());
        }

        return result;
    }

    private void saveToFile(Map<String, Object> stats) {
        try {
            Path outputPath = Paths.get(getDataFolder().getParentFile().getParent(), OUTPUT_FILE);
            String json = gson.toJson(stats);
            Files.writeString(outputPath, json, StandardCharsets.UTF_8);
        } catch (Exception e) {
            getLogger().warning("Failed to save stats to file: " + e.getMessage());
        }
    }

    private String extractMcVersion(String version) {
        // Extract MC version from string like "Paper (26.2)" or "1.20.4-R0.1-SNAPSHOT"
        if (version == null) return "unknown";
        // Try pattern like "(MC: X.Y.Z)" or just version number
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("(\\d+\\.\\d+(?:\\.\\d+)?)").matcher(version);
        if (m.find()) return m.group(1);
        return version;
    }

    private double getTPS() {
        try {
            Method tpsMethod = Bukkit.getServer().getClass().getMethod("getTPS");
            double[] tps = (double[]) tpsMethod.invoke(Bukkit.getServer());
            return tps[0]; // Average over last minute
        } catch (Exception e) {
            // Fallback for older versions
            return 20.0;
        }
    }

    private double getCpuLoad(OperatingSystemMXBean osBean) {
        // Try getSystemCpuLoad first (Java 14+ / com.sun.management)
        try {
            Method method = osBean.getClass().getMethod("getSystemCpuLoad");
            Double load = (Double) method.invoke(osBean);
            if (load != null && load >= 0) return load;
        } catch (Exception ignored) {}
        
        // Fallback: try getProcessCpuLoad
        try {
            Method method = osBean.getClass().getMethod("getProcessCpuLoad");
            Double load = (Double) method.invoke(osBean);
            if (load != null && load > 0) return load;
        } catch (Exception ignored) {}
        
        // Final fallback: read /proc/stat twice with 500ms delay
        try {
            long[] cpu1 = readProcStat();
            if (cpu1 == null) return -1;
            Thread.sleep(500);
            long[] cpu2 = readProcStat();
            if (cpu2 == null) return -1;
            
            long totalDiff = (cpu2[0] + cpu2[1] + cpu2[2] + cpu2[3]) - (cpu1[0] + cpu1[1] + cpu1[2] + cpu1[3]);
            long idleDiff = cpu2[3] - cpu1[3];
            if (totalDiff <= 0) return -1;
            return 1.0 - ((double) idleDiff / totalDiff);
        } catch (Exception e) {
            return -1;
        }
    }
    
    private long[] readProcStat() {
        try {
            List<String> lines = Files.readAllLines(Paths.get("/proc/stat"));
            for (String line : lines) {
                if (line.startsWith("cpu ")) {
                    String[] parts = line.trim().split("\\s+");
                    if (parts.length >= 5) {
                        // cpu user nice system idle
                        long user = Long.parseLong(parts[1]);
                        long nice = Long.parseLong(parts[2]);
                        long system = Long.parseLong(parts[3]);
                        long idle = Long.parseLong(parts[4]);
                        return new long[]{user, nice, system, idle};
                    }
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    private Map<String, Object> getNetworkInfo() {
        Map<String, Object> info = new LinkedHashMap<>();
        try {
            info.put("hostname", InetAddress.getLocalHost().getHostName());
        } catch (Exception e) {
            info.put("hostname", "unknown");
        }
        
        List<Map<String, String>> interfaces = new ArrayList<>();
        try {
            Enumeration<NetworkInterface> nets = NetworkInterface.getNetworkInterfaces();
            while (nets.hasMoreElements()) {
                NetworkInterface netInt = nets.nextElement();
                if (netInt.isLoopback() || !netInt.isUp()) continue;
                
                Map<String, String> iface = new LinkedHashMap<>();
                iface.put("name", netInt.getName());
                iface.put("display", netInt.getDisplayName());
                
                StringBuilder addrs = new StringBuilder();
                Enumeration<InetAddress> inetAddrs = netInt.getInetAddresses();
                while (inetAddrs.hasMoreElements()) {
                    InetAddress addr = inetAddrs.nextElement();
                    if (!addr.isLoopbackAddress() && addr.getHostAddress().indexOf(':') < 0) { // IPv4 only
                        if (addrs.length() > 0) addrs.append(", ");
                        addrs.append(addr.getHostAddress());
                    }
                }
                iface.put("addresses", addrs.toString());
                if (addrs.length() > 0) {
                    interfaces.add(iface);
                    if (!info.containsKey("ip")) {
                        info.put("ip", addrs.toString().split(",")[0].trim());
                    }
                }
            }
        } catch (Exception e) {
            // Ignore
        }
        info.put("interfaces", interfaces);
        return info;
    }

    private String formatUptime(long totalSeconds) {
        long days = totalSeconds / 86400;
        long hours = (totalSeconds % 86400) / 3600;
        long mins = (totalSeconds % 3600) / 60;
        long secs = totalSeconds % 60;
        
        StringBuilder sb = new StringBuilder();
        if (days > 0) sb.append(days).append("d ");
        if (hours > 0 || days > 0) sb.append(hours).append("h ");
        if (mins > 0 || hours > 0 || days > 0) sb.append(mins).append("m ");
        sb.append(secs).append("s");
        return sb.toString();
    }
}
