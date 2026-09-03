package com.khang2604.adminsword;

import org.bukkit.Material;
import org.bukkit.NamespacedKey;
import org.bukkit.Registry;
import org.bukkit.attribute.Attribute;
import org.bukkit.attribute.AttributeModifier;
import org.bukkit.enchantments.Enchantment;
import org.bukkit.inventory.EquipmentSlot;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.persistence.PersistentDataContainer;
import org.bukkit.persistence.PersistentDataType;
import org.bukkit.plugin.java.JavaPlugin;

import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * SwordFactory — tạo ItemStack cho admin sword, gắn:
 *  - display name + lore (theo skin override)
 *  - unbreakable, hide attributes, hide enchantments (tùy config)
 *  - custom model data (để resource pack render skin)
 *  - PersistentDataContainer marker (để nhận diện ngay cả khi đổi tên)
 *  - AttributeModifier: attack damage (Integer.MAX_VALUE), attack speed (config)
 *
 * Đánh dấu item bằng PDC key "adminsword:id" + "adminsword:skin" để listener nhận
 * diện nhanh không cần compare display name.
 */
public class SwordFactory {

    public static final String PDC_MARKER = "adminsword:id";
    public static final String PDC_SKIN = "adminsword:skin";
    public static final String MARKER_VALUE = "quyen-nang-cua-khang";

    private final JavaPlugin plugin;
    private final SwordConfig config;
    private final SkinRegistry skinRegistry;
    private final NamespacedKey markerKey;
    private final NamespacedKey skinKey;
    private final NamespacedKey resourcePackMarkerKey;

    public SwordFactory(JavaPlugin plugin, SwordConfig config, SkinRegistry skinRegistry) {
        this.plugin = plugin;
        this.config = config;
        this.skinRegistry = skinRegistry;
        this.markerKey = new NamespacedKey(plugin, "id");
        this.skinKey = new NamespacedKey(plugin, "skin");
        // Key này sẽ xuất hiện trong minecraft:custom_data component trên client
        // → resource pack dùng minecraft:select trên custom_data để swap model.
        // Key phải ở namespace "adminsword" để client thấy JSON {"adminsword":"khang"}.
        this.resourcePackMarkerKey = new NamespacedKey("adminsword", "adminsword");
    }

    /**
     * Tạo admin sword. Nếu skinName null/empty → dùng default.
     */
    public ItemStack create(String skinName) {
        SwordSkin skin = skinName == null || skinName.isEmpty()
                ? skinRegistry.getOrDefault("default")
                : skinRegistry.getOrDefault(skinName);
        if (skin == null) skin = new SwordSkin("default", config.getDefaultCustomModelData());

        ItemStack item = new ItemStack(config.getMaterial(), 1);
        ItemMeta meta = item.getItemMeta();
        if (meta == null) return item;

        // Display name + lore (theo skin override)
        meta.setDisplayName(skin.resolveDisplayName(config.getDisplayName()));
        meta.setLore(skin.resolveLore(config.getLore()));

        // Glow: add hidden enchant (chỉ để có glint).
        // 1.20.4+ dùng Registry.ENCHANTMENT lookup; 1.21 cũng tương thích.
        try {
            Enchantment glow = Registry.ENCHANTMENT.get(NamespacedKey.minecraft("unbreaking"));
            if (glow != null) meta.addEnchant(glow, 1, true);
        } catch (Throwable ignored) {}
        if (config.isHideEnchants()) {
            meta.addItemFlags(org.bukkit.inventory.ItemFlag.HIDE_ENCHANTS);
        }
        if (config.isHideAttributes()) {
            meta.addItemFlags(org.bukkit.inventory.ItemFlag.HIDE_ATTRIBUTES);
        }
        if (config.isUnbreakable()) {
            meta.setUnbreakable(true);
            meta.addItemFlags(org.bukkit.inventory.ItemFlag.HIDE_UNBREAKABLE);
        }

        // Custom model data (cho skin variants)
        if (skin.getCustomModelData() > 0) {
            meta.setCustomModelData(skin.getCustomModelData());
        }

        // Attribute: attack damage (cap 1,073,741,823 ~ 1B để tránh Paper clamp).
        // Warden HP = 500, Wither = 300, Ender Dragon = 200 → 100K damage dư sức one-shot.
        // 1.21+ dùng Attribute.ATTACK_DAMAGE + EquipmentSlotGroup; 1.20.x dùng GENERIC_*
        // + EquipmentSlot. Reflection để 1 jar chạy cả 2 version.
        applyDamageAttribute(meta, capDamage(config.getDamage()) - 1.0);
        applySpeedAttribute(meta, config.getAttackSpeed() - 4.0);

        // PDC marker (nhận diện nhanh)
        PersistentDataContainer pdc = meta.getPersistentDataContainer();
        pdc.set(markerKey, PersistentDataType.STRING, MARKER_VALUE);
        pdc.set(skinKey, PersistentDataType.STRING, skin.getName() == null ? "default" : skin.getName());
        // Resource pack marker: key ở namespace "adminsword" + key "adminsword" →
        // client thấy trong minecraft:custom_data component: {"adminsword":"khang"}
        // → pack Java match với minecraft:select when: {"adminsword":"khang"}
        pdc.set(resourcePackMarkerKey, PersistentDataType.STRING, "khang");

        item.setItemMeta(meta);
        return item;
    }

    /** Kiểm tra item có phải admin sword (nhanh, dùng PDC). */
    public boolean isAdminSword(ItemStack item) {
        if (item == null || item.getType() == Material.AIR) return false;
        ItemMeta meta = item.getItemMeta();
        if (meta == null) return false;
        PersistentDataContainer pdc = meta.getPersistentDataContainer();
        if (pdc.has(markerKey, PersistentDataType.STRING)) {
            return MARKER_VALUE.equals(pdc.get(markerKey, PersistentDataType.STRING));
        }
        // Fallback: compare display name (trường hợp item cũ do mất PDC khi copy world)
        return config.isAdminSword(meta.getDisplayName());
    }

    /** Lấy skin name của 1 admin sword (PDC). Null nếu không phải. */
    public String getSkinName(ItemStack item) {
        if (!isAdminSword(item)) return null;
        ItemMeta meta = item.getItemMeta();
        if (meta == null) return null;
        PersistentDataContainer pdc = meta.getPersistentDataContainer();
        return pdc.get(skinKey, PersistentDataType.STRING);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Attribute helpers — Paper 1.21+ dùng API mới, Paper 1.20.x dùng API cũ.
    // Reflection để 1 jar chạy cả 2 phiên bản.
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Cap damage ở ~1B (Integer.MAX_VALUE / 2) để Paper không clamp về 0 hoặc overflow.
     * 1B damage >> HP của bất kỳ entity nào (Warden = 500, max scaled = 1024 HP).
     */
    private double capDamage(int damage) {
        if (damage <= 1) return 2.0;
        if (damage > 1_000_000_000) return 1_000_000_000.0;
        return damage;
    }

    /**
     * Thêm attack damage modifier, tương thích Paper 1.20.4 (EquipmentSlot) và 1.21+
     * (EquipmentSlotGroup). Dùng reflection cho EquipmentSlotGroup để 1 jar build
     * với paper-api 1.20.4 vẫn chạy được trên Paper 26.2.
     */
    private void applyDamageAttribute(ItemMeta meta, double amount) {
        // Try Paper 1.21+ API first (Attribute.ATTACK_DAMAGE + EquipmentSlotGroup)
        boolean applied = false;
        try {
            Attribute attackDmg = Attribute.valueOf("ATTACK_DAMAGE");
            // Reflection: load EquipmentSlotGroup class (chỉ có trên 1.21+)
            Class<?> groupClass = Class.forName("org.bukkit.inventory.EquipmentSlotGroup");
            Object hand = groupClass.getField("HAND").get(null);
            // Constructor 1.21+: lookup 4-arg ctor (UUID, double, Operation, EquipmentSlotGroup)
            AttributeModifier mod = newAttributeModifierViaGroup(
                    UUID.nameUUIDFromBytes("asw-dmg".getBytes()),
                    "adminsword.attack_damage",
                    amount,
                    AttributeModifier.Operation.ADD_NUMBER,
                    hand
            );
            meta.addAttributeModifier(attackDmg, mod);
            applied = true;
        } catch (Throwable ignored) {
            // Fall through to legacy API
        }
        if (applied) return;
        // Fallback: Paper 1.20.x API (Attribute.GENERIC_ATTACK_DAMAGE + EquipmentSlot)
        try {
            Attribute genericDmg = Attribute.valueOf("GENERIC_ATTACK_DAMAGE");
            AttributeModifier mod = new AttributeModifier(
                    UUID.nameUUIDFromBytes("asw-dmg".getBytes()),
                    "adminsword.attack_damage",
                    amount,
                    AttributeModifier.Operation.ADD_NUMBER,
                    EquipmentSlot.HAND
            );
            meta.addAttributeModifier(genericDmg, mod);
        } catch (Throwable t) {
            plugin.getLogger().warning("Could not set attack damage attribute: " + t.getMessage());
        }
    }

    /**
     * Thêm attack speed modifier, tương thích 1.20.4 và 1.21+.
     */
    private void applySpeedAttribute(ItemMeta meta, double amount) {
        boolean applied = false;
        try {
            Attribute attackSpd = Attribute.valueOf("ATTACK_SPEED");
            Class<?> groupClass = Class.forName("org.bukkit.inventory.EquipmentSlotGroup");
            Object hand = groupClass.getField("HAND").get(null);
            AttributeModifier mod = newAttributeModifierViaGroup(
                    UUID.nameUUIDFromBytes("asw-spd".getBytes()),
                    "adminsword.attack_speed",
                    amount,
                    AttributeModifier.Operation.ADD_NUMBER,
                    hand
            );
            meta.addAttributeModifier(attackSpd, mod);
            applied = true;
        } catch (Throwable ignored) {
            // Fallback
        }
        if (applied) return;
        try {
            Attribute genericSpd = Attribute.valueOf("GENERIC_ATTACK_SPEED");
            AttributeModifier mod = new AttributeModifier(
                    UUID.nameUUIDFromBytes("asw-spd".getBytes()),
                    "adminsword.attack_speed",
                    amount,
                    AttributeModifier.Operation.ADD_NUMBER,
                    EquipmentSlot.HAND
            );
            meta.addAttributeModifier(genericSpd, mod);
        } catch (Throwable t) {
            plugin.getLogger().warning("Could not set attack speed attribute: " + t.getMessage());
        }
    }

    /**
     * Tạo AttributeModifier dùng EquipmentSlotGroup (1.21+ API) bằng reflection. Lý do:
     *  - Plugin build với paper-api 1.20.4 không có class EquipmentSlotGroup ở compile time
     *    (compile error).
     *  - Khi deploy trên Paper 1.21+ / 26.2, class EquipmentSlotGroup tồn tại nhưng
     *    constructor signature là 4-arg (UUID, double, Operation, EquipmentSlotGroup)
     *    hoặc 5-arg (UUID, String, double, Operation, EquipmentSlotGroup) — paper-api
     *    1.20.4 chỉ biết 5-arg với EquipmentSlot (cũ) → ép kiểu tĩnh không được.
     *  - Reflection tìm đúng constructor tại runtime, không cần recompile.
     *
     * @param uuid unique id
     * @param name human-readable name
     * @param amount attribute value
     * @param op operation
     * @param group EquipmentSlotGroup (vd HAND) — object đã lấy qua Class.forName
     * @return AttributeModifier instance
     */
    @SuppressWarnings("unchecked")
    private AttributeModifier newAttributeModifierViaGroup(UUID uuid, String name,
                                                            double amount,
                                                            AttributeModifier.Operation op,
                                                            Object group) throws Exception {
        Class<?> groupClass = Class.forName("org.bukkit.inventory.EquipmentSlotGroup");
        Constructor<?>[] ctors = AttributeModifier.class.getConstructors();
        // Prefer 4-arg (UUID, double, Operation, EquipmentSlotGroup) if available.
        for (Constructor<?> c : ctors) {
            Class<?>[] p = c.getParameterTypes();
            if (p.length == 4
                    && p[0] == UUID.class
                    && p[1] == double.class
                    && p[2] == AttributeModifier.Operation.class
                    && groupClass.isAssignableFrom(p[3])) {
                return (AttributeModifier) c.newInstance(uuid, amount, op, group);
            }
        }
        // Fallback: 5-arg (UUID, String, double, Operation, EquipmentSlotGroup)
        for (Constructor<?> c : ctors) {
            Class<?>[] p = c.getParameterTypes();
            if (p.length == 5
                    && p[0] == UUID.class
                    && p[1] == String.class
                    && p[2] == double.class
                    && p[3] == AttributeModifier.Operation.class
                    && groupClass.isAssignableFrom(p[4])) {
                return (AttributeModifier) c.newInstance(uuid, name, amount, op, group);
            }
        }
        throw new NoSuchMethodException("No AttributeModifier ctor accepting EquipmentSlotGroup found");
    }
}
