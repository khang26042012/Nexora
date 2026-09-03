package com.khang2604.adminsword;

import org.bukkit.Material;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.plugin.java.JavaPlugin;

import java.util.ArrayList;
import java.util.List;

/**
 * SwordConfig — đọc config.yml, cung cấp các helper cho display name / match names /
 * damage / lore / lock flags.
 *
 * Config có thể reload bất kỳ lúc nào qua /adminsword reload.
 */
public class SwordConfig {

    private final JavaPlugin plugin;
    private String displayName;
    private final List<String> matchNames = new ArrayList<>();
    private Material material;
    private int damage;
    private double attackSpeed;
    private List<String> lore;
    private boolean hideEnchants;
    private boolean hideAttributes;
    private boolean unbreakable;
    private int defaultCustomModelData;
    /** Map skin name → display name override cho resource pack (vd: "Heavenly Partisan"). */
    private java.util.Map<String, String> resourcePackDisplayNames = new java.util.HashMap<>();
    /** Default pack display name nếu skin không có entry riêng. */
    private String defaultResourcePackDisplayName;
    private boolean preventStorage;
    private boolean preventDrop;
    private boolean preventDeathDrop;
    private boolean preventMoveIntoInventory;
    private boolean debug;

    public SwordConfig(JavaPlugin plugin) {
        this.plugin = plugin;
        reload();
    }

    public void reload() {
        plugin.reloadConfig();
        FileConfiguration c = plugin.getConfig();

        this.displayName = colorize(c.getString("sword.display-name",
                "§6§l⚡ Quyền Năng Của Khang §8[INFINITE]"));

        this.matchNames.clear();
        for (String n : c.getStringList("sword.match-names")) {
            String clean = stripColor(n).toLowerCase().trim();
            if (!clean.isEmpty()) this.matchNames.add(clean);
        }
        if (this.matchNames.isEmpty()) this.matchNames.add("quyền năng của khang");

        try {
            this.material = Material.valueOf(c.getString("sword.material", "NETHERITE_SWORD").toUpperCase());
        } catch (IllegalArgumentException ex) {
            plugin.getLogger().warning("Invalid sword.material, fallback NETHERITE_SWORD");
            this.material = Material.NETHERITE_SWORD;
        }

        this.damage = c.getInt("sword.damage", Integer.MAX_VALUE);
        this.attackSpeed = c.getDouble("sword.attack-speed", -2.4);

        this.lore = new ArrayList<>();
        for (String l : c.getStringList("sword.lore")) this.lore.add(colorize(l));

        this.hideEnchants = c.getBoolean("sword.hide-enchantments", false);
        this.hideAttributes = c.getBoolean("sword.hide-attributes", true);
        this.unbreakable = c.getBoolean("sword.unbreakable", true);
        this.defaultCustomModelData = c.getInt("sword.default-custom-model-data", 0);

        // Resource pack display names: map skin → tên model trong pack (vd "Heavenly Partisan")
        // Pack dùng vanilla 1.21.6+ select system match theo custom_name, nên phải set
        // display name thành tên model để pack tự trigger texture.
        this.resourcePackDisplayNames.clear();
        if (c.isConfigurationSection("sword.resource-pack-display-names")) {
            for (String key : c.getConfigurationSection("sword.resource-pack-display-names").getKeys(false)) {
                this.resourcePackDisplayNames.put(key.toLowerCase(), c.getString("sword.resource-pack-display-names." + key));
            }
        }
        this.defaultResourcePackDisplayName = c.getString("sword.resource-pack-display-name-default", null);

        this.preventStorage = c.getBoolean("sword.prevent-storage", true);
        this.preventDrop = c.getBoolean("sword.prevent-drop", true);
        this.preventDeathDrop = c.getBoolean("sword.prevent-death-drop", true);
        this.preventMoveIntoInventory = c.getBoolean("sword.prevent-move-into-inventory", true);

        this.debug = c.getBoolean("debug", false);
    }

    // ── helpers ──
    public String getDisplayName() { return displayName; }
    public List<String> getMatchNames() { return matchNames; }
    public Material getMaterial() { return material; }
    public int getDamage() { return damage; }
    public double getAttackSpeed() { return attackSpeed; }
    public List<String> getLore() { return lore; }
    public boolean isHideEnchants() { return hideEnchants; }
    public boolean isHideAttributes() { return hideAttributes; }
    public boolean isUnbreakable() { return unbreakable; }
    public int getDefaultCustomModelData() { return defaultCustomModelData; }
    public boolean isPreventStorage() { return preventStorage; }
    public boolean isPreventDrop() { return preventDrop; }
    public boolean isPreventDeathDrop() { return preventDeathDrop; }
    public boolean isPreventMoveIntoInventory() { return preventMoveIntoInventory; }
    public boolean isDebug() { return debug; }

    /**
     * Lấy display name override cho resource pack. Trả về null nếu không có config
     * (giữ display name mặc định của skin). Lookup theo skin name (lowercase),
     * fallback về default nếu có.
     */
    public String getResourcePackDisplayName(String skinName) {
        if (skinName == null) return defaultResourcePackDisplayName;
        String v = resourcePackDisplayNames.get(skinName.toLowerCase());
        return v != null ? v : defaultResourcePackDisplayName;
    }

    /**
     * Match nếu display name (sau khi strip color & lowercase) chứa bất kỳ entry
     * nào trong match-names. Dùng để nhận diện admin sword bất kể skin/lore override.
     */
    public boolean isAdminSword(String itemDisplayName) {
        if (itemDisplayName == null || itemDisplayName.isEmpty()) return false;
        String clean = stripColor(itemDisplayName).toLowerCase();
        for (String alias : matchNames) {
            if (clean.contains(alias)) return true;
        }
        return false;
    }

    /**
     * Convert §-color codes to internal legacy section character.
     * Minecraft tự parse "§6" — giữ nguyên cho paper API.
     */
    public static String colorize(String s) {
        if (s == null) return "";
        // Paper auto-handles §-codes in ItemMeta display name; pass-through.
        return s;
    }

    /** Strip tất cả §-color codes (dùng để compare). */
    public static String stripColor(String s) {
        if (s == null) return "";
        // Strip Minecraft §-color codes (e.g. §a, §6, §l, §r, §x, §#abcdef).
        // Match: section char + any of [0-9a-fk-orxA-FK-ORX] OR section char + hex (6 chars).
        return s.replaceAll("§[0-9a-fk-orxA-FK-ORX]", "")
                .replaceAll("§#[0-9A-Fa-f]{6}", "");
    }
}
