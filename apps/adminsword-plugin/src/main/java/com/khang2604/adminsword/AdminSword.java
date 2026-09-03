package com.khang2604.adminsword;

import org.bukkit.command.PluginCommand;
import org.bukkit.plugin.java.JavaPlugin;

import java.util.logging.Logger;

/**
 * AdminSword — custom netherite sword với infinite damage cho admin.
 *
 * Features:
 *  - Tên đặc biệt "Quyền Năng Của Khang" (hỗ trợ match-names cho Bedrock/PE).
 *  - Damage = Integer.MAX_VALUE (one-shot).
 *  - Skin registry: mỗi skin gắn 1 custom-model-data int (dùng resource pack).
 *  - Khóa cứng: chặn bỏ vào rương, vứt, rơi khi chết.
 *  - Có thể mở rộng bằng cách gọi SkinRegistry.register(name, data) từ code khác.
 *
 * Plugin command: /adminsword (alias: /asw, /khangsword)
 */
public final class AdminSword extends JavaPlugin {

    private static AdminSword instance;
    private SwordConfig config;
    private SkinRegistry skinRegistry;
    private SwordFactory factory;
    private SwordListener listener;
    private SwordCommand command;

    public static AdminSword get() { return instance; }

    @Override
    public void onEnable() {
        instance = this;
        Logger log = getLogger();

        // Load config + skin registry
        saveDefaultConfig();
        this.config = new SwordConfig(this);
        this.skinRegistry = new SkinRegistry(this);
        this.skinRegistry.loadFromConfig();

        this.factory = new SwordFactory(this, config, skinRegistry);
        this.listener = new SwordListener(this, config, skinRegistry);

        getServer().getPluginManager().registerEvents(listener, this);

        PluginCommand cmd = getCommand("adminsword");
        if (cmd != null) {
            this.command = new SwordCommand(this, config, skinRegistry, factory);
            cmd.setExecutor(command);
            cmd.setTabCompleter(command);
        } else {
            log.warning("Command 'adminsword' not declared in plugin.yml — commands disabled");
        }

        log.info("AdminSword enabled — match names: " + config.getMatchNames()
                + " — skins: " + skinRegistry.all().keySet());
    }

    @Override
    public void onDisable() {
        if (skinRegistry != null) skinRegistry.saveToFile();
        getLogger().info("AdminSword disabled");
    }

    // ── Getters for internal classes (avoid passing refs everywhere) ──
    public SwordConfig getSwordConfig() { return config; }
    public SkinRegistry getSkinRegistry() { return skinRegistry; }
    public SwordFactory getFactory() { return factory; }
    public SwordListener getListener() { return listener; }
}
