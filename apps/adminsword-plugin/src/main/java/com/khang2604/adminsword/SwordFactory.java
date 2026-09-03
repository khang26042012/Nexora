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

    public SwordFactory(JavaPlugin plugin, SwordConfig config, SkinRegistry skinRegistry) {
        this.plugin = plugin;
        this.config = config;
        this.skinRegistry = skinRegistry;
        this.markerKey = new NamespacedKey(plugin, "id");
        this.skinKey = new NamespacedKey(plugin, "skin");
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

        // Attribute: attack damage (Integer.MAX_VALUE = one-shot)
        try {
            AttributeModifier damageMod = new AttributeModifier(
                    UUID.nameUUIDFromBytes("asw-dmg".getBytes()),
                    "adminsword.attack_damage",
                    (double) config.getDamage() - 1.0,   // base = 1, +modifier
                    AttributeModifier.Operation.ADD_NUMBER,
                    EquipmentSlot.HAND
            );
            meta.addAttributeModifier(Attribute.GENERIC_ATTACK_DAMAGE, damageMod);
        } catch (Throwable t) {
            // 1.21+ không dùng GENERIC_ATTACK_DAMAGE → fallback ignore
            plugin.getLogger().fine("Could not set attack damage attribute: " + t.getMessage());
        }

        // Attribute: attack speed
        try {
            AttributeModifier speedMod = new AttributeModifier(
                    UUID.nameUUIDFromBytes("asw-spd".getBytes()),
                    "adminsword.attack_speed",
                    config.getAttackSpeed() - 4.0,  // base = -4
                    AttributeModifier.Operation.ADD_NUMBER,
                    EquipmentSlot.HAND
            );
            meta.addAttributeModifier(Attribute.GENERIC_ATTACK_SPEED, speedMod);
        } catch (Throwable t) {
            plugin.getLogger().fine("Could not set attack speed attribute: " + t.getMessage());
        }

        // PDC marker (nhận diện nhanh)
        PersistentDataContainer pdc = meta.getPersistentDataContainer();
        pdc.set(markerKey, PersistentDataType.STRING, MARKER_VALUE);
        pdc.set(skinKey, PersistentDataType.STRING, skin.getName() == null ? "default" : skin.getName());

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
}
