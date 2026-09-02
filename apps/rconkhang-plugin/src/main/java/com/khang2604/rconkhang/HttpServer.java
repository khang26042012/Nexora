package com.khang2604.rconkhang;

import com.sun.net.httpserver.*;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.Executors;

import org.bukkit.Bukkit;
import org.bukkit.entity.Player;

public class HttpServer {
    private final RconKhang plugin;
    private final String host;
    private final int port;
    private final String apiKey;
    private final Set<String> corsOrigins;
    private final DataManager dataManager;
    private final ActionLogger actionLogger;
    private com.sun.net.httpserver.HttpServer server;

    public HttpServer(RconKhang plugin, String host, int port, String apiKey,
                      Set<String> corsOrigins, DataManager dataManager, ActionLogger actionLogger) throws IOException {
        this.plugin = plugin;
        this.host = host;
        this.port = port;
        this.apiKey = apiKey;
        this.corsOrigins = corsOrigins;
        this.dataManager = dataManager;
        this.actionLogger = actionLogger;
    }

    public void start() throws IOException {
        server = com.sun.net.httpserver.HttpServer.create(new InetSocketAddress(host, port), 0);
        server.setExecutor(Executors.newFixedThreadPool(4));
        server.createContext("/health", new HealthHandler());
        server.createContext("/players", new PlayersHandler());
        server.createContext("/ban", new BanHandler());
        server.createContext("/unban", new UnbanHandler());
        server.createContext("/kick", new KickHandler());
        server.createContext("/clear-effects", new ClearEffectsHandler());
        server.createContext("/whisper", new WhisperHandler());
        server.createContext("/teleport", new TeleportHandler());
        server.createContext("/ban-ip", new BanIpHandler());
        server.createContext("/unban-ip", new UnbanIpHandler());
        server.createContext("/bans", new BansHandler());
        server.createContext("/log", new LogHandler());
        server.createContext("/", new RootHandler());
        server.start();
    }

    public void stop() {
        if (server != null) server.stop(0);
    }

    private boolean checkAuth(HttpExchange ex) throws IOException {
        String header = ex.getRequestHeaders().getFirst("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            respond(ex, 401, "{\"error\":\"Missing Authorization header\"}");
            return false;
        }
        if (!header.substring(7).equals(apiKey)) {
            respond(ex, 403, "{\"error\":\"Invalid API key\"}");
            return false;
        }
        return true;
    }

    private void applyCors(HttpExchange ex) {
        String origin = ex.getRequestHeaders().getFirst("Origin");
        if (origin != null && corsOrigins.contains(origin)) {
            ex.getResponseHeaders().add("Access-Control-Allow-Origin", origin);
            ex.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            ex.getResponseHeaders().add("Access-Control-Allow-Headers", "Authorization, Content-Type");
        }
    }

    private void respond(HttpExchange ex, int status, String body) throws IOException {
        applyCors(ex);
        if ("OPTIONS".equalsIgnoreCase(ex.getRequestMethod())) {
            ex.sendResponseHeaders(204, -1);
            ex.close();
            return;
        }
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().add("Content-Type", "application/json; charset=utf-8");
        ex.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = ex.getResponseBody()) { os.write(bytes); }
    }

    private String readBody(HttpExchange ex) throws IOException {
        try (InputStream is = ex.getRequestBody();
             ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
            byte[] buf = new byte[4096];
            int n;
            while ((n = is.read(buf)) > 0) bos.write(buf, 0, n);
            return new String(bos.toByteArray(), StandardCharsets.UTF_8);
        }
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    private String jsonStr(String s) { return "\"" + escapeJson(s) + "\""; }

    // ── Handlers ──

    class HealthHandler extends BaseHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            respond(ex, 200, "{\"status\":\"ok\",\"plugin\":\"rconkhang\",\"version\":\"" + plugin.getPluginMeta().getVersion() + "\"}");
        }
    }

    class RootHandler extends BaseHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            respond(ex, 200, "{\"name\":\"rconkhang\",\"version\":\"" + plugin.getPluginMeta().getVersion() + "\",\"endpoints\":[\"/health\",\"/players\",\"/ban\",\"/unban\",\"/kick\",\"/clear-effects\",\"/whisper\",\"/teleport\",\"/ban-ip\",\"/unban-ip\",\"/bans\",\"/log\"]}");
        }
    }

    class PlayersHandler extends BaseHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            if (!checkAuth(ex)) return;
            // Run on main thread (Bukkit API is not thread-safe)
            String[] result = new String[1];
            Bukkit.getScheduler().runTask(plugin, () -> {
                StringBuilder sb = new StringBuilder("[");
                boolean first = true;
                for (Player p : Bukkit.getOnlinePlayers()) {
                    if (!first) sb.append(",");
                    first = false;
                    sb.append("{\"name\":").append(jsonStr(p.getName()))
                      .append(",\"uuid\":").append(jsonStr(p.getUniqueId().toString()))
                      .append(",\"ip\":").append(jsonStr(p.getAddress() != null ? p.getAddress().getAddress().getHostAddress() : ""))
                      .append(",\"ping\":").append(p.getPing())
                      .append(",\"world\":").append(jsonStr(p.getWorld().getName()))
                      .append(",\"x\":").append(p.getLocation().getBlockX())
                      .append(",\"y\":").append(p.getLocation().getBlockY())
                      .append(",\"z\":").append(p.getLocation().getBlockZ())
                      .append(",\"gameMode\":").append(jsonStr(p.getGameMode().name()))
                      .append(",\"health\":").append(p.getHealth())
                      .append(",\"food\":").append(p.getFoodLevel())
                      .append("}");
                }
                sb.append("]");
                result[0] = sb.toString();
            });
            // Wait for result (HTTP handler is async, blocking here is OK)
            try {
                while (result[0] == null) Thread.sleep(20);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            respond(ex, 200, "{\"players\":" + result[0] + ",\"max\":" + Bukkit.getMaxPlayers() + ",\"count\":" + Bukkit.getOnlinePlayers().size() + "}");
        }
    }

    class BanHandler extends BaseHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            if (!"POST".equals(ex.getRequestMethod())) { respond(ex, 405, "{\"error\":\"Method not allowed\"}"); return; }
            if (!checkAuth(ex)) return;
            String body = readBody(ex);
            String name = extract(body, "name");
            String reason = extract(body, "reason");
            long days = Long.parseLong(extract(body, "days", "1"));
            String admin = extract(body, "admin", "panel");
            if (name == null) { respond(ex, 400, "{\"error\":\"name required\"}"); return; }

            long expiresAt = days == -1 ? -1 : System.currentTimeMillis() + days * 86400_000L;

            String[] result = new String[1];
            Bukkit.getScheduler().runTask(plugin, () -> {
                Player target = Bukkit.getPlayerExact(name);
                if (target == null) {
                    // Try offline ban via UUID lookup
                    @SuppressWarnings("deprecation")
                    org.bukkit.OfflinePlayer op = Bukkit.getOfflinePlayer(name);
                    if (op.hasPlayedBefore()) {
                        dataManager.addBan(op.getName() == null ? name : op.getName(), op.getUniqueId().toString(), reason, expiresAt, admin);
                        actionLogger.log(admin, "ban-offline", name, reason + " (" + (days == -1 ? "permanent" : days + "d") + ")");
                        result[0] = "{\"ok\":true,\"offline\":true}";
                    } else {
                        result[0] = "{\"error\":\"Player not found and never joined\"}";
                    }
                } else {
                    String uuid = target.getUniqueId().toString();
                    dataManager.addBan(target.getName(), uuid, reason, expiresAt, admin);
                    target.kickPlayer(buildBanScreen(reason, days));
                    actionLogger.log(admin, "ban", target.getName(), reason + " (" + (days == -1 ? "permanent" : days + "d") + ")");
                    result[0] = "{\"ok\":true,\"name\":\"" + target.getName() + "\",\"days\":" + days + "}";
                }
            });
            try { while (result[0] == null) Thread.sleep(20); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            respond(ex, result[0].startsWith("{\"error\"") ? 400 : 200, result[0]);
        }
    }

    private String buildBanScreen(String reason, long days) {
        return "§c§l=== BANNED ===\n\n" +
               "§eLý do: §f" + (reason == null ? "Không có" : reason) + "\n" +
               "§eThời hạn: §f" + (days == -1 ? "Vĩnh viễn" : days + " ngày") + "\n\n" +
               "§7Nếu bạn cho rằng đây là nhầm lẫn, hãy liên hệ admin.";
    }

    class UnbanHandler extends BaseHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            if (!"POST".equals(ex.getRequestMethod())) { respond(ex, 405, "{\"error\":\"Method not allowed\"}"); return; }
            if (!checkAuth(ex)) return;
            String body = readBody(ex);
            String name = extract(body, "name");
            String admin = extract(body, "admin", "panel");
            if (name == null) { respond(ex, 400, "{\"error\":\"name required\"}"); return; }
            boolean removed = dataManager.removeBan(name);
            if (removed) actionLogger.log(admin, "unban", name, "");
            respond(ex, 200, "{\"ok\":" + removed + "}");
        }
    }

    class KickHandler extends BaseHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            if (!"POST".equals(ex.getRequestMethod())) { respond(ex, 405, "{\"error\":\"Method not allowed\"}"); return; }
            if (!checkAuth(ex)) return;
            String body = readBody(ex);
            String name = extract(body, "name");
            String reason = extract(body, "reason", "Kicked by admin");
            String admin = extract(body, "admin", "panel");
            if (name == null) { respond(ex, 400, "{\"error\":\"name required\"}"); return; }
            String[] result = new String[1];
            Bukkit.getScheduler().runTask(plugin, () -> {
                Player target = Bukkit.getPlayerExact(name);
                if (target == null) { result[0] = "{\"error\":\"Player not online\"}"; return; }
                target.kickPlayer("§c" + reason);
                actionLogger.log(admin, "kick", name, reason);
                result[0] = "{\"ok\":true}";
            });
            try { while (result[0] == null) Thread.sleep(20); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            respond(ex, result[0].startsWith("{\"error\"") ? 400 : 200, result[0]);
        }
    }

    class ClearEffectsHandler extends BaseHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            if (!"POST".equals(ex.getRequestMethod())) { respond(ex, 405, "{\"error\":\"Method not allowed\"}"); return; }
            if (!checkAuth(ex)) return;
            String body = readBody(ex);
            String name = extract(body, "name");
            String admin = extract(body, "admin", "panel");
            if (name == null) { respond(ex, 400, "{\"error\":\"name required\"}"); return; }
            String[] result = new String[1];
            Bukkit.getScheduler().runTask(plugin, () -> {
                Player target = Bukkit.getPlayerExact(name);
                if (target == null) { result[0] = "{\"error\":\"Player not online\"}"; return; }
                for (org.bukkit.potion.PotionEffect eff : target.getActivePotionEffects()) {
                    target.removePotionEffect(eff.getType());
                }
                target.setFireTicks(0);
                actionLogger.log(admin, "clear-effects", name, "");
                result[0] = "{\"ok\":true}";
            });
            try { while (result[0] == null) Thread.sleep(20); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            respond(ex, result[0].startsWith("{\"error\"") ? 400 : 200, result[0]);
        }
    }

    class WhisperHandler extends BaseHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            if (!"POST".equals(ex.getRequestMethod())) { respond(ex, 405, "{\"error\":\"Method not allowed\"}"); return; }
            if (!checkAuth(ex)) return;
            String body = readBody(ex);
            String name = extract(body, "name");
            String message = extract(body, "message");
            String admin = extract(body, "admin", "Admin");
            if (name == null || message == null) { respond(ex, 400, "{\"error\":\"name and message required\"}"); return; }
            String[] result = new String[1];
            Bukkit.getScheduler().runTask(plugin, () -> {
                Player target = Bukkit.getPlayerExact(name);
                if (target == null) { result[0] = "{\"error\":\"Player not online\"}"; return; }
                target.sendMessage("§7[§6" + admin + "§7 → §eBạn§7] §f" + message);
                actionLogger.log(admin, "whisper", name, message);
                result[0] = "{\"ok\":true}";
            });
            try { while (result[0] == null) Thread.sleep(20); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            respond(ex, result[0].startsWith("{\"error\"") ? 400 : 200, result[0]);
        }
    }

    class TeleportHandler extends BaseHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            if (!"POST".equals(ex.getRequestMethod())) { respond(ex, 405, "{\"error\":\"Method not allowed\"}"); return; }
            if (!checkAuth(ex)) return;
            String body = readBody(ex);
            String fromName = extract(body, "from");
            String toName = extract(body, "to");
            String admin = extract(body, "admin", "panel");
            if (fromName == null || toName == null) { respond(ex, 400, "{\"error\":\"from and to required\"}"); return; }
            String[] result = new String[1];
            Bukkit.getScheduler().runTask(plugin, () -> {
                Player from = Bukkit.getPlayerExact(fromName);
                Player to = Bukkit.getPlayerExact(toName);
                if (from == null) { result[0] = "{\"error\":\"from player not online\"}"; return; }
                if (to == null) { result[0] = "{\"error\":\"to player not online\"}"; return; }
                from.teleport(to.getLocation());
                actionLogger.log(admin, "teleport", fromName + "→" + toName, "");
                result[0] = "{\"ok\":true}";
            });
            try { while (result[0] == null) Thread.sleep(20); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            respond(ex, result[0].startsWith("{\"error\"") ? 400 : 200, result[0]);
        }
    }

    class BanIpHandler extends BaseHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            if (!"POST".equals(ex.getRequestMethod())) { respond(ex, 405, "{\"error\":\"Method not allowed\"}"); return; }
            if (!checkAuth(ex)) return;
            String body = readBody(ex);
            String ip = extract(body, "ip");
            String reason = extract(body, "reason", "Banned by admin");
            String admin = extract(body, "admin", "panel");
            if (ip == null) { respond(ex, 400, "{\"error\":\"ip required\"}"); return; }
            String[] result = new String[1];
            Bukkit.getScheduler().runTask(plugin, () -> {
                // Kick all online players with this IP
                int kicked = 0;
                for (Player p : Bukkit.getOnlinePlayers()) {
                    if (p.getAddress() != null && p.getAddress().getAddress().getHostAddress().equals(ip)) {
                        p.kickPlayer("§c§lIP BANNED\n\n§7" + reason);
                        kicked++;
                    }
                }
                dataManager.addIpBan(ip, reason, admin);
                actionLogger.log(admin, "ban-ip", ip, reason + " (kicked " + kicked + ")");
                result[0] = "{\"ok\":true,\"kicked\":" + kicked + "}";
            });
            try { while (result[0] == null) Thread.sleep(20); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            respond(ex, 200, result[0]);
        }
    }

    class UnbanIpHandler extends BaseHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            if (!"POST".equals(ex.getRequestMethod())) { respond(ex, 405, "{\"error\":\"Method not allowed\"}"); return; }
            if (!checkAuth(ex)) return;
            String body = readBody(ex);
            String ip = extract(body, "ip");
            String admin = extract(body, "admin", "panel");
            if (ip == null) { respond(ex, 400, "{\"error\":\"ip required\"}"); return; }
            boolean removed = dataManager.removeIpBan(ip);
            if (removed) actionLogger.log(admin, "unban-ip", ip, "");
            respond(ex, 200, "{\"ok\":" + removed + "}");
        }
    }

    class BansHandler extends BaseHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            if (!checkAuth(ex)) return;
            StringBuilder sb = new StringBuilder("{\"bans\":[");
            boolean first = true;
            for (Map<String, Object> ban : dataManager.getBans()) {
                if (!first) sb.append(",");
                first = false;
                sb.append("{");
                boolean firstField = true;
                for (Map.Entry<String, Object> e : ban.entrySet()) {
                    if (!firstField) sb.append(",");
                    firstField = false;
                    sb.append(jsonStr(e.getKey())).append(":");
                    Object v = e.getValue();
                    if (v instanceof Number) sb.append(v);
                    else sb.append(jsonStr(v.toString()));
                }
                sb.append("}");
            }
            sb.append("],\"ipBans\":[");
            first = true;
            for (String ip : dataManager.getIpBans()) {
                if (!first) sb.append(",");
                first = false;
                sb.append(jsonStr(ip));
            }
            sb.append("]}");
            respond(ex, 200, sb.toString());
        }
    }

    class LogHandler extends BaseHandler {
        @Override
        public void handle(HttpExchange ex) throws IOException {
            if (!checkAuth(ex)) return;
            int limit = 50;
            try { limit = Integer.parseInt(ex.getRequestHeaders().getFirst("X-Limit") != null ? ex.getRequestHeaders().getFirst("X-Limit") : "50"); } catch (Exception ignore) {}
            StringBuilder sb = new StringBuilder("{\"log\":[");
            boolean first = true;
            for (Map<String, Object> entry : actionLogger.getRecent(limit)) {
                if (!first) sb.append(",");
                first = false;
                sb.append("{");
                boolean firstField = true;
                for (Map.Entry<String, Object> e : entry.entrySet()) {
                    if (!firstField) sb.append(",");
                    firstField = false;
                    sb.append(jsonStr(e.getKey())).append(":");
                    Object v = e.getValue();
                    if (v instanceof Number) sb.append(v);
                    else sb.append(jsonStr(v.toString()));
                }
                sb.append("}");
            }
            sb.append("]}");
            respond(ex, 200, sb.toString());
        }
    }

    abstract class BaseHandler implements HttpHandler {}

    // Simple JSON field extractor (cho flat object với string/number values)
    private String extract(String json, String key) { return extract(json, key, null); }

    private String extract(String json, String key, String defaultVal) {
        if (json == null) return defaultVal;
        // Tìm "key":"value" hoặc "key":value
        int idx = json.indexOf("\"" + key + "\"");
        if (idx < 0) {
            idx = json.indexOf(key + ":");
            if (idx < 0) return defaultVal;
            int start = idx + key.length() + 1;
            while (start < json.length() && Character.isWhitespace(json.charAt(start))) start++;
            int end = start;
            while (end < json.length() && json.charAt(end) != ',' && json.charAt(end) != '}' && !Character.isWhitespace(json.charAt(end))) end++;
            String val = json.substring(start, end);
            if (val.startsWith("\"") && val.endsWith("\"")) val = val.substring(1, val.length() - 1);
            return val;
        }
        int colon = json.indexOf(':', idx);
        if (colon < 0) return defaultVal;
        int start = colon + 1;
        while (start < json.length() && Character.isWhitespace(json.charAt(start))) start++;
        if (start >= json.length()) return defaultVal;
        if (json.charAt(start) == '\"') {
            int end = start + 1;
            while (end < json.length() && json.charAt(end) != '\"') {
                if (json.charAt(end) == '\\') end++;
                end++;
            }
            return json.substring(start + 1, end);
        } else {
            int end = start;
            while (end < json.length() && json.charAt(end) != ',' && json.charAt(end) != '}' && !Character.isWhitespace(json.charAt(end))) end++;
            return json.substring(start, end);
        }
    }
}
