package com.khang2604.adminsword;

import org.bukkit.entity.Item;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.EventPriority;
import org.bukkit.event.Listener;
import org.bukkit.event.entity.EntityDeathEvent;
import org.bukkit.event.entity.PlayerDeathEvent;
import org.bukkit.event.inventory.*;
import org.bukkit.event.player.PlayerDropItemEvent;
import org.bukkit.event.player.PlayerInteractEvent;
import org.bukkit.event.player.PlayerPickupItemEvent;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.ItemStack;
import org.bukkit.plugin.java.JavaPlugin;

import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;

/**
 * SwordListener — handle các hành vi bị chặn với admin sword.
 *
 * Mục tiêu: admin sword không thể:
 *  - Bỏ vào chest/barrel/hopper/dispenser/any storage (InventoryClickEvent)
 *  - Vứt xuống đất (PlayerDropItemEvent)
 *  - Rơi khi chết (PlayerDeathEvent keepInventory hoặc xóa drops)
 *  - Bị player khác nhặt vào inventory (Item + pickup cancel)
 *
 * Ngoài ra còn:
 *  - Khi cầm admin sword, áp dụng hiệu ứng phụ (tuỳ chọn)
 *  - Khi không còn permission "adminsword.use", ép remove (audit)
 */
public class SwordListener implements Listener {

    private final JavaPlugin plugin;
    private final SwordConfig config;
    private final SkinRegistry skinRegistry;
    private final SwordFactory factory;

    public SwordListener(JavaPlugin plugin, SwordConfig config, SkinRegistry skinRegistry) {
        this.plugin = plugin;
        this.config = config;
        this.skinRegistry = skinRegistry;
        this.factory = AdminSword.get().getFactory();
    }

    // ─────────────────────────────────────────────────────────────────────
    // 1) Chặn click di chuyển admin sword vào storage / inventory khác
    // ─────────────────────────────────────────────────────────────────────
    @EventHandler(priority = EventPriority.HIGHEST, ignoreCancelled = true)
    public void onInventoryClick(InventoryClickEvent event) {
        if (!config.isPreventStorage() && !config.isPreventMoveIntoInventory()) return;
        ItemStack cursor = event.getCursor();
        ItemStack current = event.getCurrentItem();

        // Trường hợp 1: đang đặt admin sword vào 1 inventory khác
        if (cursor != null && factory.isAdminSword(cursor)) {
            Inventory top = event.getView().getTopInventory();
            Inventory inv = event.getClickedInventory();
            // Click vào top inventory (chest, barrel, hopper, dispenser, ...) hoặc vào
            // inventory của player khác (chỉ xảy ra với 1 số plugin UI).
            if (inv != null && inv.equals(top) && inv.getType() != InventoryType.CRAFTING) {
                if (config.isPreventStorage()) {
                    event.setCancelled(true);
                    notify((Player) event.getWhoClicked(), "§cKhông thể bỏ Quyền Năng Của Khang vào rương.");
                    return;
                }
            }
        }

        // Trường hợp 2: admin sword đang nằm trong storage, click nhặt ra
        if (current != null && factory.isAdminSword(current)) {
            Inventory top = event.getView().getTopInventory();
            Inventory inv = event.getClickedInventory();
            if (inv != null && inv.equals(top) && inv.getType() != InventoryType.CRAFTING) {
                if (config.isPreventStorage()) {
                    event.setCancelled(true);
                    notify((Player) event.getWhoClicked(), "§cQuyền Năng Của Khang không thể bị lấy khỏi rương.");
                }
            }
        }
    }

    /**
     * Chặn shift-click (nhanh) di chuyển admin sword vào top inventory.
     */
    @EventHandler(priority = EventPriority.HIGHEST, ignoreCancelled = true)
    public void onInventoryClickShift(InventoryClickEvent event) {
        if (!config.isPreventStorage()) return;
        ItemStack current = event.getCurrentItem();
        if (current == null || !factory.isAdminSword(current)) return;
        if (event.getAction() != InventoryAction.MOVE_TO_OTHER_INVENTORY) return;
        Inventory top = event.getView().getTopInventory();
        Inventory bottom = event.getView().getBottomInventory();
        Inventory inv = event.getClickedInventory();
        // Shift từ player inv → top = storage
        if (inv != null && inv.equals(bottom) && top.getType() != InventoryType.CRAFTING) {
            event.setCancelled(true);
            notify((Player) event.getWhoClicked(), "§cKhông thể bỏ Quyền Năng Của Khang vào rương.");
        }
    }

    /**
     * Chặn hotbar swap (phím 1-9) hoặc number key.
     * Không cần thiết vì admin sword chỉ ở player inv.
     * Nhưng chặn swap vào top inventory (vd nhấn 1 để swap từ rương).
     */
    @EventHandler(priority = EventPriority.HIGHEST, ignoreCancelled = true)
    public void onClickHotbarSwap(InventoryClickEvent event) {
        if (!config.isPreventStorage()) return;
        if (event.getAction() != InventoryAction.HOTBAR_SWAP) return;
        if (!(event.getWhoClicked() instanceof Player)) return;
        ItemStack hotbar = event.getWhoClicked().getInventory().getItem(event.getHotbarButton());
        if (hotbar == null || !factory.isAdminSword(hotbar)) return;
        Inventory top = event.getView().getTopInventory();
        if (top.getType() != InventoryType.CRAFTING) {
            event.setCancelled(true);
            notify((Player) event.getWhoClicked(), "§cKhông thể bỏ Quyền Năng Của Khang vào rương.");
        }
    }

    /**
     * Chặn drag (kéo thả) admin sword sang ô trong top inventory.
     */
    @EventHandler(priority = EventPriority.HIGHEST, ignoreCancelled = true)
    public void onDrag(InventoryDragEvent event) {
        if (!config.isPreventStorage()) return;
        ItemStack cursor = event.getOldCursor();
        if (cursor == null || !factory.isAdminSword(cursor)) return;
        Inventory top = event.getView().getTopInventory();
        if (top.getType() == InventoryType.CRAFTING) return;
        for (int slot : event.getRawSlots()) {
            if (slot < top.getSize()) {
                event.setCancelled(true);
                notify((Player) event.getWhoClicked(), "§cKhông thể bỏ Quyền Năng Của Khang vào rương.");
                return;
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2) Chặn vứt (Q) xuống đất
    // ─────────────────────────────────────────────────────────────────────
    @EventHandler(priority = EventPriority.HIGHEST, ignoreCancelled = true)
    public void onDrop(PlayerDropItemEvent event) {
        if (!config.isPreventDrop()) return;
        ItemStack item = event.getItemDrop().getItemStack();
        if (factory.isAdminSword(item)) {
            event.setCancelled(true);
            notify(event.getPlayer(), "§cKhông thể vứt Quyền Năng Của Khang.");
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // 3) Khi chết — giữ admin sword trong inventory (không cho rơi ra drops)
    // ─────────────────────────────────────────────────────────────────────
    @EventHandler(priority = EventPriority.HIGHEST)
    public void onDeath(PlayerDeathEvent event) {
        if (!config.isPreventDeathDrop()) return;
        List<ItemStack> keep = new ArrayList<>();
        event.getDrops().removeIf(item -> {
            if (factory.isAdminSword(item)) {
                keep.add(item);
                return true;
            }
            return false;
        });
        // Trả lại vào inventory sau khi respawn (vì drops đã remove)
        if (!keep.isEmpty()) {
            event.setKeepInventory(true); // đơn giản: giữ nguyên inv khi chết
            // Lưu ý: nếu server đã bật keepInventory, hành vi mặc định OK.
            // Nếu không, setKeepInventory(true) sẽ khiến tất cả items không rơi.
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // 4) Khi đã là item entity trên đất (vd 1 plugin khác spawn) —
    //    chặn player khác nhặt nếu không có permission.
    // ─────────────────────────────────────────────────────────────────────
    @EventHandler(priority = EventPriority.HIGH, ignoreCancelled = true)
    public void onPickup(org.bukkit.event.entity.EntityPickupItemEvent event) {
        if (!config.isPreventMoveIntoInventory()) return;
        if (!(event.getEntity() instanceof Player)) return;
        ItemStack item = event.getItem().getItemStack();
        if (factory.isAdminSword(item)) {
            Player p = (Player) event.getEntity();
            if (!p.hasPermission("adminsword.use")) {
                event.setCancelled(true);
                notify(p, "§cBạn không có quyền nhặt admin sword.");
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // 5) Cleanup: khi reload, kiểm tra inv của online players — nếu có admin
    //    sword mà không còn permission, gỡ ra (chống item dupe).
    // ─────────────────────────────────────────────────────────────────────
    public void auditOnlinePlayers() {
        if (plugin.getServer().getOnlinePlayers().isEmpty()) return;
        for (Player p : plugin.getServer().getOnlinePlayers()) {
            if (p.hasPermission("adminsword.use")) continue;
            for (ItemStack item : p.getInventory().getContents()) {
                if (item != null && factory.isAdminSword(item)) {
                    p.getInventory().remove(item);
                    notify(p, "§cBạn không còn quyền giữ Quyền Năng Của Khang — đã bị gỡ.");
                }
            }
        }
    }

    // ── helper ──
    private void notify(Player p, String msg) {
        if (config.isDebug()) plugin.getLogger().info("[adminsword] " + p.getName() + ": " + msg);
        p.sendMessage(msg);
    }
}
