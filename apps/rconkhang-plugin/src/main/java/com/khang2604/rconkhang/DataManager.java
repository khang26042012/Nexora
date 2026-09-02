package com.khang2604.rconkhang;

import org.yaml.snakeyaml.Yaml;

import java.io.*;
import java.util.*;

public class DataManager {
    private final File dataFile;
    private Map<String, Object> data = new LinkedHashMap<>();
    private final Yaml yaml = new Yaml();

    public DataManager(File dataFolder) {
        if (!dataFolder.exists()) dataFolder.mkdirs();
        this.dataFile = new File(dataFolder, "data.yml");
        load();
    }

    @SuppressWarnings("unchecked")
    private void load() {
        if (!dataFile.exists()) {
            data = new LinkedHashMap<>();
            data.put("apiKey", "");
            data.put("bans", new ArrayList<Map<String, Object>>());
            data.put("ipBans", new ArrayList<String>());
            save();
            return;
        }
        try (FileReader r = new FileReader(dataFile)) {
            Object loaded = yaml.load(r);
            if (loaded instanceof Map) {
                data = (Map<String, Object>) loaded;
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public void save() {
        try (FileWriter w = new FileWriter(dataFile)) {
            yaml.dump(data, w);
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public String getApiKey() {
        Object v = data.get("apiKey");
        return v == null ? null : v.toString();
    }

    public void setApiKey(String key) {
        data.put("apiKey", key);
        save();
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getBans() {
        Object v = data.get("bans");
        if (v instanceof List) return (List<Map<String, Object>>) v;
        return new ArrayList<>();
    }

    public void addBan(String playerName, String uuid, String reason, long expiresAt, String adminName) {
        List<Map<String, Object>> bans = getBans();
        // Remove existing ban cho cùng player
        bans.removeIf(b -> b.get("uuid").equals(uuid) || b.get("name").equalsIgnoreCase(playerName));
        Map<String, Object> ban = new LinkedHashMap<>();
        ban.put("name", playerName);
        ban.put("uuid", uuid);
        ban.put("reason", reason);
        ban.put("bannedAt", System.currentTimeMillis());
        ban.put("expiresAt", expiresAt); // -1 = permanent
        ban.put("by", adminName);
        bans.add(ban);
        data.put("bans", bans);
        save();
    }

    public boolean removeBan(String playerNameOrUuid) {
        List<Map<String, Object>> bans = getBans();
        boolean removed = bans.removeIf(b ->
            b.get("uuid").equals(playerNameOrUuid) ||
            b.get("name").toString().equalsIgnoreCase(playerNameOrUuid)
        );
        if (removed) {
            data.put("bans", bans);
            save();
        }
        return removed;
    }

    @SuppressWarnings("unchecked")
    public List<String> getIpBans() {
        Object v = data.get("ipBans");
        if (v instanceof List) return (List<String>) v;
        return new ArrayList<>();
    }

    public void addIpBan(String ip, String reason, String adminName) {
        List<String> ips = getIpBans();
        if (!ips.contains(ip)) {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("ip", ip);
            entry.put("reason", reason);
            entry.put("bannedAt", System.currentTimeMillis());
            entry.put("by", adminName);
            ips.add(ip);
            data.put("ipBans", ips);
            save();
        }
    }

    public boolean removeIpBan(String ip) {
        List<String> ips = getIpBans();
        boolean removed = ips.remove(ip);
        if (removed) {
            data.put("ipBans", ips);
            save();
        }
        return removed;
    }
}
