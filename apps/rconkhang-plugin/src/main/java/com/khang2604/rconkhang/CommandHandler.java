package com.khang2604.rconkhang;

import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;

import java.util.*;

public class CommandHandler implements CommandExecutor, TabCompleter {
    private final RconKhang plugin;

    public CommandHandler(RconKhang plugin) { this.plugin = plugin; }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (args.length == 0) {
            sender.sendMessage("§6§l[rconkhang] §7Dùng: /" + label + " <reload|status|resetkey|key>");
            return true;
        }
        switch (args[0].toLowerCase()) {
            case "reload":
                plugin.reloadPlugin();
                sender.sendMessage("§a[rconkhang] §fConfig reloaded. WS: " + plugin.getWsUrl());
                return true;
            case "status":
                sender.sendMessage("§6§l[rconkhang] §fStatus:");
                sender.sendMessage("§7  WS: §f" + (plugin.getWsClient() != null && plugin.getWsClient().isOpen() ? "§aconnected" : "§cdisconnected"));
                sender.sendMessage("§7  WS URL: §f" + plugin.getWsUrl());
                sender.sendMessage("§7  API key: §f" + plugin.getApiKey().substring(0, 12) + "...");
                sender.sendMessage("§7  Online: §f" + org.bukkit.Bukkit.getOnlinePlayers().size() + " players");
                sender.sendMessage("§7  Bans: §f" + plugin.getDataManager().getBans().size());
                sender.sendMessage("§7  IP bans: §f" + plugin.getDataManager().getIpBans().size());
                return true;
            case "resetkey":
                plugin.resetApiKey();
                sender.sendMessage("§a[rconkhang] §fNew API key generated: §e" + plugin.getApiKey().substring(0, 12) + "...");
                return true;
            case "key":
                sender.sendMessage("§6[rconkhang] §fFull API key:");
                sender.sendMessage("§e" + plugin.getApiKey());
                return true;
            default:
                sender.sendMessage("§c[rconkhang] §fUnknown subcommand. Use reload/status/resetkey/key");
                return true;
        }
    }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        if (args.length == 1) return Arrays.asList("reload", "status", "resetkey", "key");
        return Collections.emptyList();
    }
}
