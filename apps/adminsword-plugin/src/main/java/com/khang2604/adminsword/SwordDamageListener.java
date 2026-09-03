package com.khang2604.adminsword;

import org.bukkit.attribute.Attribute;
import org.bukkit.entity.Entity;
import org.bukkit.entity.LivingEntity;
import org.bukkit.entity.Player;
import org.bukkit.entity.Warden;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntityDamageByEntityEvent;
import org.bukkit.event.entity.EntityDamageEvent;
import org.bukkit.event.entity.EntityDeathEvent;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.PlayerInventory;
import org.bukkit.plugin.java.JavaPlugin;

/**
 * SwordDamageListener — khi player dùng admin sword đánh entity, force damage
 * cao để đảm bảo one-shot mọi entity, kể cả Warden (500 HP) với armor/protection/absorption.
 *
 * Tại sao cần thêm listener này (ngoài attribute modifier)?
 *  - Paper 1.21+ có damage cap bên trong (~Integer.MAX_VALUE nhưng thực tế bị
 *    scaling ở bước armor/protection/absorption).
 *  - Warden có resistance ở anger_level 4+ (không phải effect, là builtin scale).
 *  - Attribute modifier cũng có cap thực tế (sau khi tính damage event).
 *
 * Cách hoạt động:
 *  - Kiểm tra attacker đang cầm admin sword (PDC marker).
 *  - Nếu event damage < target max HP, force damage = target max HP * 2 (chắc chắn one-shot).
 *  - Chạy ở priority HIGHEST, ignoreCancelled = false để đảm bảo chạy sau cùng.
 *
 * KHÔNG can thiệp nếu:
 *  - Attacker không phải player
 *  - Player không cầm admin sword (chính hoặc offhand)
 *  - Target là player khác (chỉ ép one-shot mob)
 */
public class SwordDamageListener implements Listener {

    private final JavaPlugin plugin;
    private final SwordFactory factory;

    public SwordDamageListener(JavaPlugin plugin, SwordFactory factory) {
        this.plugin = plugin;
        this.factory = factory;
    }

    @EventHandler(priority = EventPriority.HIGHEST, ignoreCancelled = false)
    public void onDamage(EntityDamageByEntityEvent event) {
        // Chỉ xử lý khi attacker là player
        if (!(event.getDamager() instanceof Player)) return;
        Player attacker = (Player) event.getDamager();

        // Check admin sword (main hoặc offhand)
        PlayerInventory inv = attacker.getInventory();
        ItemStack main = inv.getItemInMainHand();
        ItemStack off = inv.getItemInOffHand();
        boolean hasAdminSword = factory.isAdminSword(main) || factory.isAdminSword(off);
        if (!hasAdminSword) return;

        // Không can thiệp PvP
        Entity target = event.getEntity();
        if (target instanceof Player) return;

        // Chỉ áp dụng cho LivingEntity (mob/creature)
        if (!(target instanceof LivingEntity)) return;
        LivingEntity living = (LivingEntity) target;

        // Lấy HP hiện tại (không tính absorption)
        double currentHp = living.getHealth();

        // Lấy max HP từ attribute (chuẩn xác cho Warden scale 1-3)
        double maxHp = 1.0;
        Attribute maxHpAttr = null;
        try {
            maxHpAttr = Attribute.valueOf("MAX_HEALTH");
        } catch (IllegalArgumentException ex) {
            try {
                maxHpAttr = Attribute.valueOf("GENERIC_MAX_HEALTH");
            } catch (IllegalArgumentException ex2) {
                // ignore
            }
        }
        if (maxHpAttr != null) {
            try {
                maxHp = living.getAttribute(maxHpAttr).getValue();
            } catch (Throwable ignored) {}
        }

        // Nếu damage hiện tại >= max HP → chắc chắn one-shot rồi, không cần force
        if (event.getDamage() >= currentHp + maxHp) return;

        // Force damage = maxHp * 4 (cộng thêm buffer cho absorption, resistance, armor)
        // Warden HP = 500, * 4 = 2000 damage (gấp 4 lần HP) → chắc chắn one-shot
        double forcedDamage = Math.max(event.getDamage(), maxHp * 4.0);

        // Đối với Warden: scale damage cao hơn vì Warden có builtin damage reduction khi
        // anger_level thấp (không phải effect, là internal scaling)
        if (living instanceof Warden) {
            forcedDamage = Math.max(forcedDamage, currentHp * 2.0 + 200.0);
        }

        if (forcedDamage > event.getDamage()) {
            event.setDamage(forcedDamage);
            if (plugin.getConfig().getBoolean("debug", false)) {
                plugin.getLogger().info("[adminsword] Forced damage on " + target.getType()
                        + " from " + event.getDamage() + " to " + forcedDamage
                        + " (maxHP=" + maxHp + ", currentHP=" + currentHp + ")");
            }
        }
    }

    /**
     * Lưu ý: EntityDamageEvent (không phải byEntity) không cần xử lý — admin sword
     * chỉ áp dụng cho melee attack, không cần can thiệp cho damage khác (fall, fire, etc.)
     */
    @EventHandler(priority = EventPriority.MONITOR, ignoreCancelled = true)
    public void onDeathLog(EntityDeathEvent event) {
        if (!plugin.getConfig().getBoolean("debug", false)) return;
        LivingEntity e = event.getEntity();
        if (e instanceof Player) return;
        // Best-effort log
    }
}
