package com.nexora.secret;

import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;
import com.nexora.secret.metrics.MetricsCollector;
import com.nexora.secret.ws.WebSocketClient;

public class SecretPlugin extends JavaPlugin {

    private WebSocketClient wsClient;
    private MetricsCollector metricsCollector;
    private BukkitTask sendTask;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        
        String wsUrl = getConfig().getString("websocket.url", "wss://phantrongkhangg.up.railway.app/ws-metrics");
        boolean enabled = getConfig().getBoolean("websocket.enabled", true);
        int interval = getConfig().getInt("websocket.interval", 2);
        String serverName = getConfig().getString("server.name", "NexoraMC");
        String serverVersion = getConfig().getString("server.version", "Paper 1.21.4");

        if (!enabled) {
            getLogger().info("Metrics sending is disabled in config.");
            return;
        }

        metricsCollector = new MetricsCollector(serverName, serverVersion);
        wsClient = new WebSocketClient(wsUrl, getLogger());
        wsClient.connect();

        // Schedule periodic metrics sending (convert seconds to ticks: 1s = 20 ticks)
        long intervalTicks = Math.max(20L, interval * 20L);
        sendTask = getServer().getScheduler().runTaskTimerAsynchronously(this, () -> {
            if (wsClient != null && wsClient.isOpen()) {
                try {
                    String json = metricsCollector.collectMetrics();
                    wsClient.send(json);
                } catch (Exception e) {
                    getLogger().warning("Failed to collect/send metrics: " + e.getMessage());
                }
            }
        }, intervalTicks, intervalTicks);

        getLogger().info("Secret plugin enabled. Sending metrics to " + wsUrl + " every " + interval + "s");
    }

    @Override
    public void onDisable() {
        if (sendTask != null) {
            sendTask.cancel();
        }
        if (wsClient != null) {
            wsClient.close();
        }
        getLogger().info("Secret plugin disabled.");
    }
}