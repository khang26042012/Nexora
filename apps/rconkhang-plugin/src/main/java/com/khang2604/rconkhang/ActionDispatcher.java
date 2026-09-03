package com.khang2604.rconkhang;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.GameMode;
import org.bukkit.Location;
import org.bukkit.OfflinePlayer;
import org.bukkit.World;
import org.bukkit.command.CommandException;
import org.bukkit.entity.Player;
import org.bukkit.potion.PotionEffect;
import org.bukkit.scheduler.BukkitScheduler;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

/**
 * ActionDispatcher — nhận action từ WebSocket, thực thi trên main thread,
 * trả về kết quả dạng JsonObject. Mọi logic thao tác với Bukkit API phải chạy trên main thread.
 */
public class ActionDispatcher {
    private final RconKhang plugin;
    private final DataManager data;
    private final ActionLogger logger;

    public ActionDispatcher(RconKhang plugin, DataManager data, ActionLogger logger) {
        this.plugin = plugin;
        this.data = data;
        this.logger = logger;
    }

    /**
     * Xử lý action từ WebSocket.
     * Trả về (ok, result) — result là JsonObject gửi về backend, hoặc null nếu lỗi.
     * Hàm này tự schedule về main thread nếu đang ở thread khác.
     */
    public void dispatch(String action, JsonObject payload, WebSocketClient ws, String requestId) {
        BukkitScheduler sch = Bukkit.getScheduler();
        if (Bukkit.isPrimaryThread()) {
            execute(action, payload, ws, requestId);
        } else {
            sch.runTask(plugin, () -> execute(action, payload, ws, requestId));
        }
    }

    private void execute(String action, JsonObject p, WebSocketClient ws, String id) {
        try {
            switch (action) {
                case "list-players": {
                    JsonObject out = new JsonObject();
                    JsonArray arr = new JsonArray();
                    for (Player pl : Bukkit.getOnlinePlayers()) {
                        JsonObject o = new JsonObject();
                        o.addProperty("name", pl.getName());
                        String uuid = pl.getUniqueId() != null ? pl.getUniqueId().toString() : "";
                        o.addProperty("uuid", uuid);
                        o.addProperty("world", pl.getWorld().getName());
                        o.addProperty("x", pl.getLocation().getBlockX());
                        o.addProperty("y", pl.getLocation().getBlockY());
                        o.addProperty("z", pl.getLocation().getBlockZ());
                        o.addProperty("ping", pl.getPing());
                        o.addProperty("health", pl.getHealth());
                        o.addProperty("gameMode", pl.getGameMode().name());
                        arr.add(o);
                    }
                    out.add("players", arr);
                    ws.respond(id, true, out, null);
                    return;
                }
                case "list-bans": {
                    JsonObject out = new JsonObject();
                    JsonArray bans = new JsonArray();
                    for (Map<String, Object> b : data.getBans()) {
                        JsonObject o = new JsonObject();
                        for (Map.Entry<String, Object> e : b.entrySet()) {
                            o.addProperty(e.getKey(), String.valueOf(e.getValue()));
                        }
                        bans.add(o);
                    }
                    JsonArray ipBans = new JsonArray();
                    for (String ip : data.getIpBans()) ipBans.add(ip);
                    out.add("bans", bans);
                    out.add("ipBans", ipBans);
                    ws.respond(id, true, out, null);
                    return;
                }
                case "ban": {
                    String name = p.has("name") ? p.get("name").getAsString() : null;
                    String reason = p.has("reason") ? p.get("reason").getAsString() : "Banned by admin";
                    long days = p.has("days") ? p.get("days").getAsLong() : -1L;
                    if (name == null || name.isEmpty()) { ws.respond(id, false, null, "Thiếu name"); return; }
                    long expiresAt = days < 0 ? -1L : System.currentTimeMillis() + days * 86_400_000L;
                    String uuid = "";
                    Player online = Bukkit.getPlayerExact(name);
                    if (online != null) uuid = online.getUniqueId().toString();
                    if (uuid.isEmpty()) {
                        OfflinePlayer off = Bukkit.getOfflinePlayer(name);
                        if (off.hasPlayedBefore() && off.getUniqueId() != null) uuid = off.getUniqueId().toString();
                    }
                    data.addBan(name, uuid, reason, expiresAt, "admin-panel");
                    logAction("ban", name, reason);
                    JsonObject out = new JsonObject();
                    out.addProperty("name", name);
                    out.addProperty("uuid", uuid);
                    out.addProperty("expiresAt", expiresAt);
                    out.addProperty("permanent", days < 0);
                    ws.respond(id, true, out, null);
                    if (ws != null) ws.sendEvent("bans-update", snapshotBans());
                    return;
                }
                case "unban": {
                    String name = p.has("name") ? p.get("name").getAsString() : null;
                    if (name == null) { ws.respond(id, false, null, "Thiếu name"); return; }
                    boolean ok = data.removeBan(name);
                    logAction("unban", name, ok ? "OK" : "Not found");
                    JsonObject out = new JsonObject();
                    out.addProperty("removed", ok);
                    ws.respond(id, true, out, null);
                    if (ok && ws != null) ws.sendEvent("bans-update", snapshotBans());
                    return;
                }
                case "kick": {
                    String name = p.has("name") ? p.get("name").getAsString() : null;
                    String reason = p.has("reason") ? p.get("reason").getAsString() : "Kicked by admin";
                    if (name == null) { ws.respond(id, false, null, "Thiếu name"); return; }
                    Player pl = Bukkit.getPlayerExact(name);
                    if (pl == null) { ws.respond(id, false, null, "Player không online"); return; }
                    pl.kickPlayer(reason);
                    logAction("kick", name, reason);
                    JsonObject out = new JsonObject();
                    out.addProperty("name", name);
                    ws.respond(id, true, out, null);
                    if (ws != null) ws.sendEvent("log", makeLog("kick", name, reason));
                    return;
                }
                case "clear-effects": {
                    String name = p.has("name") ? p.get("name").getAsString() : null;
                    if (name == null) { ws.respond(id, false, null, "Thiếu name"); return; }
                    Player pl = Bukkit.getPlayerExact(name);
                    if (pl == null) { ws.respond(id, false, null, "Player không online"); return; }
                    for (PotionEffect eff : pl.getActivePotionEffects()) pl.removePotionEffect(eff.getType());
                    pl.setFoodLevel(20);
                    pl.setSaturation(20f);
                    pl.setHealth(pl.getMaxHealth());
                    pl.setFireTicks(0);
                    logAction("clear-effects", name, "");
                    JsonObject out = new JsonObject();
                    out.addProperty("name", name);
                    ws.respond(id, true, out, null);
                    if (ws != null) ws.sendEvent("log", makeLog("clear-effects", name, ""));
                    return;
                }
                case "whisper": {
                    String name = p.has("name") ? p.get("name").getAsString() : null;
                    String message = p.has("message") ? p.get("message").getAsString() : null;
                    if (name == null || message == null) { ws.respond(id, false, null, "Thiếu name hoặc message"); return; }
                    Player pl = Bukkit.getPlayerExact(name);
                    if (pl == null) { ws.respond(id, false, null, "Player không online"); return; }
                    pl.sendMessage(ChatColor.translateAlternateColorCodes('&', message));
                    logAction("whisper", name, message);
                    JsonObject out = new JsonObject();
                    out.addProperty("name", name);
                    ws.respond(id, true, out, null);
                    if (ws != null) ws.sendEvent("log", makeLog("whisper", name, message));
                    return;
                }
                case "teleport": {
                    String name = p.has("name") ? p.get("name").getAsString() : null;
                    String target = p.has("target") ? p.get("target").getAsString() : null;
                    Double x = p.has("x") ? p.get("x").getAsDouble() : null;
                    Double y = p.has("y") ? p.get("y").getAsDouble() : null;
                    Double z = p.has("z") ? p.get("z").getAsDouble() : null;
                    String world = p.has("world") ? p.get("world").getAsString() : null;
                    if (name == null) { ws.respond(id, false, null, "Thiếu name"); return; }
                    Player pl = Bukkit.getPlayerExact(name);
                    if (pl == null) { ws.respond(id, false, null, "Player không online"); return; }
                    Location loc = null;
                    if (target != null) {
                        Player t = Bukkit.getPlayerExact(target);
                        if (t == null) { ws.respond(id, false, null, "Target không online"); return; }
                        loc = t.getLocation();
                    } else if (x != null && y != null && z != null) {
                        World w = (world != null) ? Bukkit.getWorld(world) : pl.getWorld();
                        if (w == null) { ws.respond(id, false, null, "World không tồn tại"); return; }
                        loc = new Location(w, x, y, z);
                    } else { ws.respond(id, false, null, "Cần target hoặc x,y,z"); return; }
                    pl.teleport(loc);
                    logAction("teleport", name, target != null ? "→ " + target : String.format("→ %.1f,%.1f,%.1f", x, y, z));
                    JsonObject out = new JsonObject();
                    out.addProperty("name", name);
                    out.addProperty("target", target);
                    ws.respond(id, true, out, null);
                    if (ws != null) ws.sendEvent("log", makeLog("teleport", name, target != null ? "→ " + target : ""));
                    return;
                }
                case "ban-ip": {
                    String ip = p.has("ip") ? p.get("ip").getAsString() : null;
                    String reason = p.has("reason") ? p.get("reason").getAsString() : "Banned by admin";
                    if (ip == null) { ws.respond(id, false, null, "Thiếu ip"); return; }
                    data.addIpBan(ip, reason, "admin-panel");
                    logAction("ban-ip", ip, reason);
                    JsonObject out = new JsonObject();
                    out.addProperty("ip", ip);
                    ws.respond(id, true, out, null);
                    if (ws != null) ws.sendEvent("bans-update", snapshotBans());
                    return;
                }
                case "unban-ip": {
                    String ip = p.has("ip") ? p.get("ip").getAsString() : null;
                    if (ip == null) { ws.respond(id, false, null, "Thiếu ip"); return; }
                    boolean ok = data.removeIpBan(ip);
                    logAction("unban-ip", ip, ok ? "OK" : "Not found");
                    JsonObject out = new JsonObject();
                    out.addProperty("removed", ok);
                    ws.respond(id, true, out, null);
                    if (ok && ws != null) ws.sendEvent("bans-update", snapshotBans());
                    return;
                }
                case "__push-snapshot__": {
                    // Initial snapshot after WS connects.
                    JsonObject snap = new JsonObject();
                    JsonArray arr = new JsonArray();
                    for (Player pl : Bukkit.getOnlinePlayers()) {
                        JsonObject o = new JsonObject();
                        o.addProperty("name", pl.getName());
                        o.addProperty("uuid", pl.getUniqueId().toString());
                        o.addProperty("world", pl.getWorld().getName());
                        o.addProperty("x", pl.getLocation().getBlockX());
                        o.addProperty("y", pl.getLocation().getBlockY());
                        o.addProperty("z", pl.getLocation().getBlockZ());
                        o.addProperty("ping", pl.getPing());
                        o.addProperty("health", pl.getHealth());
                        o.addProperty("gameMode", pl.getGameMode().name());
                        arr.add(o);
                    }
                    snap.add("players", arr);
                    JsonArray bans = new JsonArray();
                    for (Map<String, Object> b : data.getBans()) {
                        JsonObject o = new JsonObject();
                        for (Map.Entry<String, Object> e : b.entrySet()) o.addProperty(e.getKey(), String.valueOf(e.getValue()));
                        bans.add(o);
                    }
                    snap.add("bans", bans);
                    JsonArray ipBans = new JsonArray();
                    for (String ip : data.getIpBans()) ipBans.add(ip);
                    snap.add("ipBans", ipBans);
                    JsonArray log = new JsonArray();
                    for (Map<String, Object> l : logger.getAll()) {
                        JsonObject o = new JsonObject();
                        for (Map.Entry<String, Object> e : l.entrySet()) o.addProperty(e.getKey(), String.valueOf(e.getValue()));
                        log.add(o);
                    }
                    snap.add("log", log);
                    ws.sendEvent("snapshot", snap);
                    return;
                }
                default:
                    ws.respond(id, false, null, "Action không hỗ trợ: " + action);
            }
        } catch (Exception e) {
            plugin.getLogger().warning("Action " + action + " failed: " + e.getMessage());
            ws.respond(id, false, null, e.getMessage());
        }
    }

    private void logAction(String action, String target, String detail) {
        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("ts", System.currentTimeMillis());
        entry.put("action", action);
        entry.put("target", target);
        entry.put("detail", detail);
        entry.put("by", "admin-panel");
        logger.add(entry);
    }

    private JsonObject makeLog(String action, String target, String detail) {
        JsonObject o = new JsonObject();
        o.addProperty("ts", System.currentTimeMillis());
        o.addProperty("action", action);
        o.addProperty("target", target);
        o.addProperty("detail", detail);
        o.addProperty("by", "admin-panel");
        return o;
    }

    private JsonObject snapshotBans() {
        JsonObject out = new JsonObject();
        JsonArray bans = new JsonArray();
        for (Map<String, Object> b : data.getBans()) {
            JsonObject o = new JsonObject();
            for (Map.Entry<String, Object> e : b.entrySet()) o.addProperty(e.getKey(), String.valueOf(e.getValue()));
            bans.add(o);
        }
        out.add("bans", bans);
        JsonArray ipBans = new JsonArray();
        for (String ip : data.getIpBans()) ipBans.add(ip);
        out.add("ipBans", ipBans);
        return out;
    }
}
