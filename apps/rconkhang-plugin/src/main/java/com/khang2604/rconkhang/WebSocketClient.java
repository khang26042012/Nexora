package com.khang2604.rconkhang;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.JsonElement;

import org.java_websocket.handshake.ServerHandshake;
import org.java_websocket.framing.CloseFrame;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.*;

/**
 * Plugin <-> Backend WebSocket client.
 * Connects to backend's /ws/plugin with X-Plugin-Key header.
 * Receives { id, action, payload } requests, dispatches via RequestHandler (id-aware),
 * sends { id, ok, result|error } response.
 * Sends { type: "event", event, data } for state changes.
 * Auto-reconnects with exponential backoff.
 */
public class WebSocketClient {
    public interface RequestHandler {
        void onRequest(String requestId, String action, JsonObject payload);
    }

    private final RconKhang plugin;
    private final String serverUrl;
    private final String apiKey;
    private final RequestHandler handler;
    private final Gson gson = new Gson();

    private org.java_websocket.client.WebSocketClient client;
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "rconkhang-ws-reconnect");
        t.setDaemon(true);
        return t;
    });
    private int backoffMs = 1000;
    private volatile boolean stopping = false;

    public WebSocketClient(RconKhang plugin, String serverUrl, String apiKey, RequestHandler handler) {
        this.plugin = plugin;
        this.serverUrl = serverUrl;
        this.apiKey = apiKey;
        this.handler = handler;
    }

    public void start() {
        stopping = false;
        connect();
    }

    public void stop() {
        stopping = true;
        scheduler.shutdownNow();
        if (client != null) {
            try { client.close(CloseFrame.NORMAL, "plugin-disable"); } catch (Exception ignored) {}
        }
    }

    public boolean isOpen() {
        return client != null && client.isOpen();
    }

    public void sendEvent(String event, JsonObject data) {
        if (!isOpen()) return;
        JsonObject frame = new JsonObject();
        frame.addProperty("type", "event");
        frame.addProperty("event", event);
        frame.add("data", data);
        client.send(gson.toJson(frame));
    }

    private void connect() {
        if (stopping) return;
        try {
            Map<String, String> headers = new HashMap<>();
            headers.put("X-Plugin-Key", apiKey);
            client = new org.java_websocket.client.WebSocketClient(new URI(serverUrl), new org.java_websocket.drafts.Draft_6455(), headers) {
                @Override
                public void onOpen(ServerHandshake h) {
                    plugin.getLogger().info("WS connected to backend");
                    backoffMs = 1000;
                    JsonObject hello = new JsonObject();
                    hello.addProperty("type", "hello");
                    hello.addProperty("server", plugin.getServer().getName());
                    hello.addProperty("version", plugin.getDescription().getVersion());
                    send(gson.toJson(hello));
                    scheduler.schedule(() -> {
                        if (isOpen()) handler.onRequest("snapshot", "__push-snapshot__", new JsonObject());
                    }, 2, TimeUnit.SECONDS);
                }

                @Override
                public void onMessage(String raw) {
                    handleMessage(raw);
                }

                @Override
                public void onClose(int code, String reason, boolean remote) {
                    plugin.getLogger().warning("WS closed: code=" + code + " reason=" + reason + " remote=" + remote);
                    scheduleReconnect();
                }

                @Override
                public void onError(Exception ex) {
                    plugin.getLogger().warning("WS error: " + ex.getMessage());
                }
            };
            client.setConnectionLostTimeout(30);
            client.connect();
        } catch (Exception e) {
            plugin.getLogger().severe("WS connect failed: " + e.getMessage());
            scheduleReconnect();
        }
    }

    private void scheduleReconnect() {
        if (stopping) return;
        int delay = Math.min(backoffMs, 30000);
        plugin.getLogger().info("Reconnecting in " + delay + "ms");
        scheduler.schedule(this::connect, delay, TimeUnit.MILLISECONDS);
        backoffMs = Math.min(backoffMs * 2, 30000);
    }

    private void handleMessage(String raw) {
        try {
            JsonObject msg = JsonParser.parseString(raw).getAsJsonObject();
            if (msg.has("id") && msg.has("action")) {
                String id = msg.get("id").getAsString();
                String action = msg.get("action").getAsString();
                JsonObject payload = msg.has("payload") && msg.get("payload").isJsonObject()
                        ? msg.get("payload").getAsJsonObject() : new JsonObject();
                handler.onRequest(id, action, payload);
            }
        } catch (Exception e) {
            plugin.getLogger().warning("WS message parse error: " + e.getMessage());
        }
    }

    public void respond(String id, boolean ok, Object result, String errorMsg) {
        if (!isOpen()) return;
        JsonObject resp = new JsonObject();
        resp.addProperty("id", id);
        resp.addProperty("ok", ok);
        if (ok && result != null) {
            if (result instanceof JsonElement) resp.add("result", (JsonElement) result);
            else resp.add("result", gson.toJsonTree(result));
        } else if (!ok) {
            resp.addProperty("error", errorMsg != null ? errorMsg : "error");
        }
        client.send(gson.toJson(resp));
    }
}
