package com.khang2604.adminsword;

import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.plugin.java.JavaPlugin;

import java.io.File;
import java.io.IOException;
import java.util.*;
import java.util.logging.Level;

/**
 * SkinRegistry — quản lý các skin variant cho admin sword.
 *
 * Public API cho phép code khác mở rộng:
 *
 *   AdminSword.get().getSkinRegistry().register("flame", new SwordSkin()
 *       .setName("flame")
 *       .setCustomModelData(2001)
 *       .setDisplayNameOverride("§c§l🔥 Quyền Năng Của Khang §8[FLAME]"));
 *
 * Persist: plugins/AdminSword/skins.yml (được save khi onDisable hoặc /adminsword reload).
 */
public class SkinRegistry {

    private final JavaPlugin plugin;
    private final Map<String, SwordSkin> skins = new LinkedHashMap<>();
    private File skinsFile;

    public SkinRegistry(JavaPlugin plugin) {
        this.plugin = plugin;
        this.skinsFile = new File(plugin.getDataFolder(), "skins.yml");
    }

    /** Load skin list từ config.yml phần `skins:` (mặc định ban đầu). */
    public void loadFromConfig() {
        FileConfiguration c = plugin.getConfig();
        for (Map<?, ?> raw : c.getMapList("skins")) {
            SwordSkin s = fromMap(raw);
            if (s != null && s.getName() != null) skins.put(s.getName().toLowerCase(), s);
        }
        // Sau đó merge với skins.yml (override wins)
        if (skinsFile.exists()) {
            FileConfiguration sc = YamlConfiguration.loadConfiguration(skinsFile);
            for (String key : sc.getKeys(false)) {
                SwordSkin s = fromMap(sc.getConfigurationSection(key).getValues(false));
                if (s != null) {
                    s.setName(key);
                    skins.put(key.toLowerCase(), s);
                }
            }
        }
        if (skins.isEmpty()) {
            // Fallback: luôn có "default" nếu config rỗng
            SwordSkin def = new SwordSkin("default", 0);
            def.setDisplayNameOverride(AdminSword.get().getSwordConfig().getDisplayName());
            skins.put("default", def);
        }
    }

    /** Save to skins.yml. */
    public void saveToFile() {
        try {
            if (!plugin.getDataFolder().exists()) plugin.getDataFolder().mkdirs();
            YamlConfiguration out = new YamlConfiguration();
            for (SwordSkin s : skins.values()) {
                String key = s.getName();
                out.set(key + ".custom-model-data", s.getCustomModelData());
                if (s.getDisplayNameOverride() != null) out.set(key + ".display-name-override", s.getDisplayNameOverride());
                if (s.getLoreOverride() != null) out.set(key + ".lore-override", s.getLoreOverride());
                if (s.getTextureBase64() != null) out.set(key + ".texture-base64", s.getTextureBase64());
            }
            out.save(skinsFile);
        } catch (IOException ex) {
            plugin.getLogger().log(Level.SEVERE, "Failed to save skins.yml", ex);
        }
    }

    /** Register 1 skin mới. Trả về skin cũ nếu đã tồn tại (overwrite). */
    public SwordSkin register(SwordSkin s) {
        if (s == null || s.getName() == null || s.getName().isEmpty()) return null;
        return skins.put(s.getName().toLowerCase(), s);
    }

    public SwordSkin register(String name, int customModelData) {
        return register(new SwordSkin(name, customModelData));
    }

    public boolean remove(String name) {
        return skins.remove(name.toLowerCase()) != null;
    }

    public SwordSkin get(String name) {
        if (name == null) return null;
        return skins.get(name.toLowerCase());
    }

    public SwordSkin getOrDefault(String name) {
        SwordSkin s = get(name);
        return s != null ? s : skins.get("default");
    }

    public Map<String, SwordSkin> all() {
        return Collections.unmodifiableMap(skins);
    }

    public Set<String> names() {
        return skins.keySet();
    }

    // ── helper ──
    @SuppressWarnings("unchecked")
    private SwordSkin fromMap(Map<?, ?> raw) {
        try {
            Object nameObj = raw.get("name");
            if (nameObj == null) return null;
            String name = String.valueOf(nameObj);
            int cmd = raw.containsKey("custom-model-data")
                    ? ((Number) raw.get("custom-model-data")).intValue() : 0;
            SwordSkin s = new SwordSkin(name, cmd);
            Object dn = raw.get("display-name-override");
            if (dn != null) s.setDisplayNameOverride(String.valueOf(dn));
            Object lo = raw.get("lore-override");
            if (lo instanceof List) s.setLoreOverride((List<String>) lo);
            Object tb = raw.get("texture-base64");
            if (tb != null) s.setTextureBase64(String.valueOf(tb));
            return s;
        } catch (Exception ex) {
            plugin.getLogger().log(Level.WARNING, "Failed to parse skin entry: " + raw, ex);
            return null;
        }
    }
}
