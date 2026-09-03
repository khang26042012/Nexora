package com.khang2604.rconkhang;

import com.google.gson.JsonObject;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;
import org.bukkit.event.player.PlayerQuitEvent;
import org.bukkit.plugin.java.JavaPlugin;

import java.util.*;

public final class RconKhang extends JavaPlugin implements Listener {

    private static RconKhang instance;
    private HttpServer httpServer;
    private WebSocketClient wsClient;
    private DataManager dataManager;
    private CommandHandler commandHandler;
    private ActionLogger actionLogger;
    private ActionDispatcher dispatcher;

    private String httpHost;
    private int httpPort;
    private String apiKey;
    private String wsUrl;
    private Set<String> corsOrigins = new HashSet<>();

    @Override
    public void onEnable() {
        instance = this;
        saveDefaultConfig();
        loadConfig();

        dataManager = new DataManager(getDataFolder());
        apiKey = dataManager.getApiKey();
        if (apiKey == null || apiKey.isEmpty()) {
            apiKey = "26042012khang";
            dataManager.setApiKey(apiKey);
            getLogger().info("Initialized default API key (check plugins/rconkhang/data.yml)");
        }

        actionLogger = new ActionLogger(200);
        commandHandler = new CommandHandler(this);
        dispatcher = new ActionDispatcher(this, dataManager, actionLogger);

        // HTTP server: optional, for local debug.
        if (getConfig().getBoolean("http.enabled", false)) {
            try {
                httpServer = new HttpServer(this, httpHost, httpPort, apiKey, corsOrigins, dataManager, actionLogger);
                httpServer.start();
                getLogger().info("HTTP server (debug) on " + httpHost + ":" + httpPort);
            } catch (Exception e) {
                getLogger().warning("HTTP server failed: " + e.getMessage());
            }
        }

        // WebSocket: primary transport to backend.
        if (wsUrl != null && !wsUrl.isEmpty()) {
            wsClient = new WebSocketClient(this, wsUrl, apiKey, (reqId, action, payload) -> {
                if ("__push-snapshot__".equals(action)) {
                    dispatcher.dispatch(action, payload, wsClient, reqId);
                } else {
                    dispatcher.dispatch(action, payload, wsClient, reqId);
                }
            });
            wsClient.start();
        } else {
            getLogger().warning("ws.url chưa cấu hình trong config.yml — plugin sẽ không kết nối backend.");
        }

        getCommand("rconkhang").setExecutor(commandHandler);
        getCommand("rconkhang").setTabCompleter(commandHandler);
        getServer().getPluginManager().registerEvents(this, this);

        getLogger().info("rconkhang enabled (API key starts: " + apiKey.substring(0, Math.min(8, apiKey.length())) + "...)");
    }

    @Override
    public void onDisable() {
        if (httpServer != null) httpServer.stop();
        if (wsClient != null) wsClient.stop();
        if (dataManager != null) dataManager.save();
        getLogger().info("rconkhang disabled");
    }

    private void loadConfig() {
        reloadConfig();
        httpHost = getConfig().getString("http.host", "127.0.0.1");
        httpPort = getConfig().getInt("http.port", 8765);
        corsOrigins = new HashSet<>(getConfig().getStringList("cors.allowed-origins"));
        wsUrl = getConfig().getString("ws.url", "");
    }

    public void reloadPlugin() {
        loadConfig();
        if (httpServer != null) httpServer.stop();
        if (getConfig().getBoolean("http.enabled", false)) {
            try {
                httpServer = new HttpServer(this, httpHost, httpPort, apiKey, corsOrigins, dataManager, actionLogger);
                httpServer.start();
            } catch (Exception ignored) {}
        }
        if (wsClient != null) wsClient.stop();
        if (wsUrl != null && !wsUrl.isEmpty()) {
            wsClient = new WebSocketClient(this, wsUrl, apiKey, (reqId, action, payload) -> {
                dispatcher.dispatch(action, payload, wsClient, reqId);
            });
            wsClient.start();
        }
    }

    public void resetApiKey() {
        apiKey = "26042012khang";
        dataManager.setApiKey(apiKey);
        reloadPlugin();
    }

    @EventHandler
    public void onPlayerJoin(PlayerJoinEvent e) {
        if (wsClient == null || !wsClient.isOpen()) return;
        Player p = e.getPlayer();
        JsonObject o = new JsonObject();
        o.addProperty("name", p.getName());
        o.addProperty("uuid", p.getUniqueId().toString());
        o.addProperty("world", p.getWorld().getName());
        o.addProperty("x", p.getLocation().getBlockX());
        o.addProperty("y", p.getLocation().getBlockY());
        o.addProperty("z", p.getLocation().getBlockZ());
        wsClient.sendEvent("player-join", o);
    }

    @EventHandler
    public void onPlayerQuit(PlayerQuitEvent e) {
        if (wsClient == null || !wsClient.isOpen()) return;
        Player p = e.getPlayer();
        JsonObject o = new JsonObject();
        o.addProperty("name", p.getName());
        o.addProperty("uuid", p.getUniqueId().toString());
        wsClient.sendEvent("player-quit", o);
    }

    public String getHttpHost() { return httpHost; }
    public int getHttpPort() { return httpPort; }

    public static RconKhang get() { return instance; }
    public DataManager getDataManager() { return dataManager; }
    public ActionLogger getActionLogger() { return actionLogger; }
    public String getApiKey() { return apiKey; }
    public String getWsUrl() { return wsUrl; }
    public WebSocketClient getWsClient() { return wsClient; }
}
