package com.khang2604.adminsword;

import org.bukkit.Bukkit;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;
import org.bukkit.entity.Player;
import org.bukkit.inventory.ItemStack;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * SwordCommand — xử lý /adminsword (alias /asw, /khangsword).
 *
 * Subcommands:
 *   give <player> [skin]   — đưa admin sword (skin cụ thể hoặc default)
 *   reload                 — reload config + skin registry, audit online players
 *   skin add <name> [cmd]  — thêm skin mới (cmd: custom-model-data int)
 *   skin list              — liệt kê skins
 *   skin remove <name>     — xóa skin
 */
public class SwordCommand implements CommandExecutor, TabCompleter {

    private final AdminSword plugin;
    private final SwordConfig config;
    private final SkinRegistry skinRegistry;
    private final SwordFactory factory;

    public SwordCommand(AdminSword plugin, SwordConfig config, SkinRegistry skinRegistry, SwordFactory factory) {
        this.plugin = plugin;
        this.config = config;
        this.skinRegistry = skinRegistry;
        this.factory = factory;
    }

    @Override
    public boolean onCommand(CommandSender sender, Command cmd, String label, String[] args) {
        plugin.getLogger().info("[/" + label + "] from " + sender.getName() + " args=" + java.util.Arrays.toString(args));
        if (!sender.hasPermission("adminsword.admin")) {
            sender.sendMessage("§cBạn không có quyền.");
            return true;
        }
        if (args.length == 0) {
            usage(sender, label);
            return true;
        }

        switch (args[0].toLowerCase(Locale.ROOT)) {
            case "give": return cmdGive(sender, args);
            case "reload": return cmdReload(sender);
            case "skin": return cmdSkin(sender, args);
            default:
                usage(sender, label);
                return true;
        }
    }

    private boolean cmdGive(CommandSender sender, String[] args) {
        if (args.length < 2) {
            sender.sendMessage("§cUsage: /" + "adminsword give <player> [skin]");
            return true;
        }
        // Dùng getPlayer (case-insensitive + match substring) thay vì getPlayerExact
        // vì Bedrock qua Geyser có thể có prefix PE_ không khớp chính xác.
        Player target = Bukkit.getPlayer(args[1]);
        if (target == null) {
            // Thử tìm với prefix PE_ nếu user nhập tên không có
            target = Bukkit.getPlayer("PE_" + args[1]);
        }
        if (target == null) {
            sender.sendMessage("§cKhông tìm thấy player: " + args[1] + " (online: " +
                    Bukkit.getOnlinePlayers().size() + ")");
            plugin.getLogger().warning("give: target not found: " + args[1]);
            return true;
        }
        String skin = args.length >= 3 ? args[2] : "default";
        if (skinRegistry.get(skin) == null) {
            sender.sendMessage("§cSkin '" + skin + "' chưa đăng ký. Dùng /adminsword skin list.");
            plugin.getLogger().warning("give: skin not found: " + skin);
            return true;
        }
        try {
            ItemStack sword = factory.create(skin);
            if (sword == null) {
                sender.sendMessage("§cLỗi: factory trả về null.");
                plugin.getLogger().severe("give: factory.create returned null for skin=" + skin);
                return true;
            }
            // Auto-rename cho resource pack: pack "Fantasy 3D Weapons CIT" detect
            // theo custom_name component. Ta set display name thành tên model (vd
            // "Heavenly Partisan") để vanilla 1.21.6+ select system trigger model.
            // Nếu config có resource_pack_display_name thì dùng, không thì fallback
            // về tên skin (UPPERCASE).
            String packDisplay = config.getResourcePackDisplayName(skin);
            if (packDisplay != null && !packDisplay.isEmpty()) {
                org.bukkit.inventory.meta.ItemMeta m = sword.getItemMeta();
                if (m != null) {
                    m.setDisplayName(packDisplay);
                    sword.setItemMeta(m);
                }
            }
            // Nếu inv đầy → drop
            if (target.getInventory().firstEmpty() == -1) {
                target.getWorld().dropItemNaturally(target.getLocation(), sword);
                sender.sendMessage("§eInv của " + target.getName() + " đầy — sword đã được drop xuống đất.");
            } else {
                target.getInventory().addItem(sword);
            }
            String msg = "§aĐã đưa Quyền Năng Của Khang (skin: " + skin + ") cho " + target.getName();
            sender.sendMessage(msg);
            target.sendMessage("§6Bạn nhận được §eQuyền Năng Của Khang §6(skin: " + skin + ")");
            plugin.getLogger().info("give OK: " + target.getName() + " <- skin " + skin +
                    " (type=" + sword.getType() + " amount=" + sword.getAmount() +
                    " meta? " + (sword.getItemMeta() != null) + ")");
        } catch (Throwable t) {
            sender.sendMessage("§cLỗi khi tạo kiếm: " + t.getClass().getSimpleName() + ": " + t.getMessage());
            plugin.getLogger().severe("give exception: " + t);
            t.printStackTrace();
        }
        return true;
    }

    private boolean cmdReload(CommandSender sender) {
        config.reload();
        skinRegistry.loadFromConfig();
        skinRegistry.saveToFile();
        plugin.getListener().auditOnlinePlayers();
        sender.sendMessage("§aĐã reload AdminSword config + skins. Skins: " + skinRegistry.names());
        return true;
    }

    private boolean cmdSkin(CommandSender sender, String[] args) {
        if (args.length < 2) {
            sender.sendMessage("§cUsage: /adminsword skin <add|list|remove> ...");
            return true;
        }
        switch (args[1].toLowerCase(Locale.ROOT)) {
            case "add":
                if (args.length < 3) {
                    sender.sendMessage("§cUsage: /adminsword skin add <name> [custom-model-data]");
                    return true;
                }
                String name = args[2].toLowerCase(Locale.ROOT);
                int cmd2 = args.length >= 4 ? parseInt(args[3], 0) : nextFreeCmd();
                SwordSkin s = new SwordSkin(name, cmd2);
                s.setDisplayNameOverride("§6§l⚡ Quyền Năng Của Khang §8[" + name.toUpperCase() + "]");
                skinRegistry.register(s);
                skinRegistry.saveToFile();
                sender.sendMessage("§aĐã thêm skin '" + name + "' với custom-model-data=" + cmd2);
                sender.sendMessage("§7  Tip: tạo resource pack mapping CMD " + cmd2 + " → texture mong muốn.");
                return true;
            case "list":
                sender.sendMessage("§6Skins đã đăng ký (§e" + skinRegistry.all().size() + "§6):");
                for (SwordSkin sk : skinRegistry.all().values()) {
                    sender.sendMessage("§7  - §e" + sk.getName() + " §8(cmd=" + sk.getCustomModelData() + ")");
                }
                return true;
            case "remove":
                if (args.length < 3) {
                    sender.sendMessage("§cUsage: /adminsword skin remove <name>");
                    return true;
                }
                if (args[2].equalsIgnoreCase("default")) {
                    sender.sendMessage("§cKhông thể xóa skin 'default'.");
                    return true;
                }
                if (skinRegistry.remove(args[2])) {
                    skinRegistry.saveToFile();
                    sender.sendMessage("§aĐã xóa skin '" + args[2] + "'.");
                } else {
                    sender.sendMessage("§cKhông tìm thấy skin '" + args[2] + "'.");
                }
                return true;
            default:
                sender.sendMessage("§cUsage: /adminsword skin <add|list|remove> ...");
                return true;
        }
    }

    private int nextFreeCmd() {
        int max = 0;
        for (SwordSkin s : skinRegistry.all().values()) {
            if (s.getCustomModelData() > max) max = s.getCustomModelData();
        }
        return max + 1;
    }

    private int parseInt(String s, int def) {
        try { return Integer.parseInt(s); } catch (Exception e) { return def; }
    }

    private void usage(CommandSender sender, String label) {
        sender.sendMessage("§6§lQuyền Năng Của Khang §7— §eadmin sword");
        sender.sendMessage("§7  /" + label + " give <player> [skin]");
        sender.sendMessage("§7  /" + label + " reload");
        sender.sendMessage("§7  /" + label + " skin add <name> [cmd]");
        sender.sendMessage("§7  /" + label + " skin list");
        sender.sendMessage("§7  /" + label + " skin remove <name>");
    }

    // ── Tab completion ──
    @Override
    public List<String> onTabComplete(CommandSender sender, Command cmd, String label, String[] args) {
        List<String> r = new ArrayList<>();
        if (!sender.hasPermission("adminsword.admin")) return r;
        if (args.length == 1) {
            filter(r, args[0], "give", "reload", "skin");
        } else if (args.length == 2 && args[0].equalsIgnoreCase("skin")) {
            filter(r, args[1], "add", "list", "remove");
        } else if (args.length == 2 && args[0].equalsIgnoreCase("give")) {
            for (Player p : Bukkit.getOnlinePlayers()) r.add(p.getName());
        } else if (args.length == 3 && args[0].equalsIgnoreCase("give")) {
            for (String n : skinRegistry.names()) r.add(n);
        } else if (args.length == 3 && args[0].equalsIgnoreCase("skin")
                && args[1].equalsIgnoreCase("remove")) {
            for (String n : skinRegistry.names()) r.add(n);
        }
        return r;
    }

    private void filter(List<String> out, String prefix, String... items) {
        String p = prefix.toLowerCase(Locale.ROOT);
        for (String i : items) if (i.startsWith(p)) out.add(i);
    }
}
