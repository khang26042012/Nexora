package com.khang2604.rconkhang;

import org.bukkit.plugin.java.JavaPlugin;
import org.yaml.snakeyaml.Yaml;

import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.security.SecureRandom;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public final class RconKhang extends JavaPlugin {

    private static RconKhang instance;
    private HttpServer httpServer;
    private DataManager dataManager;
    private CommandHandler commandHandler;
    private ActionLogger actionLogger;

    private String httpHost;
    private int httpPort;
    private String apiKey;
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

        // Start HTTP server async để không block main thread
        try {
            httpServer = new HttpServer(this, httpHost, httpPort, apiKey, corsOrigins, dataManager, actionLogger);
            httpServer.start();
        } catch (IOException e) {
            getLogger().severe("Failed to start HTTP server: " + e.getMessage());
        }

        getCommand("rconkhang").setExecutor(commandHandler);
        getCommand("rconkhang").setTabCompleter(commandHandler);

        getLogger().info("rconkhang enabled — HTTP listening on " + httpHost + ":" + httpPort);
        getLogger().info("API key: " + apiKey.substring(0, 8) + "... (full key in data.yml)");
    }

    @Override
    public void onDisable() {
        if (httpServer != null) httpServer.stop();
        if (dataManager != null) dataManager.save();
        getLogger().info("rconkhang disabled");
    }

    private void loadConfig() {
        reloadConfig();
        httpHost = getConfig().getString("http.host", "127.0.0.1");
        httpPort = getConfig().getInt("http.port", 8765);
        corsOrigins = new HashSet<>(getConfig().getStringList("cors.allowed-origins"));
    }

    public void reloadPlugin() {
        loadConfig();
        if (httpServer != null) httpServer.stop();
        try {
            httpServer = new HttpServer(this, httpHost, httpPort, apiKey, corsOrigins, dataManager, actionLogger);
            httpServer.start();
        } catch (IOException e) {
            getLogger().severe("Failed to restart HTTP server: " + e.getMessage());
        }
    }

    public void resetApiKey() {
        apiKey = "26042012khang";
        dataManager.setApiKey(apiKey);
        reloadPlugin();
    }

    private String generateApiKey() {
        // Kept for backwards compat — generates a random 32-byte hex key prefixed with rk_.
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        StringBuilder sb = new StringBuilder("rk_");
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    public static RconKhang get() { return instance; }
    public DataManager getDataManager() { return dataManager; }
    public ActionLogger getActionLogger() { return actionLogger; }
    public String getApiKey() { return apiKey; }
    public String getHttpHost() { return httpHost; }
    public int getHttpPort() { return httpPort; }
}
