package com.khang2604.adminsword;

import java.util.ArrayList;
import java.util.List;

/**
 * SwordSkin — dữ liệu của 1 skin variant cho admin sword.
 *
 * Mỗi skin có:
 *  - name: key duy nhất (vd: "default", "fire", "ice")
 *  - customModelData: int gán vào ItemMeta, dùng resource pack để map texture
 *  - displayNameOverride: optional, override default display name
 *  - loreOverride: optional, override default lore
 *  - textureBase64: optional, base64 PNG 64×64 (cho skin 1.20+ head/item).
 *    Hiện chưa được apply tự động — để dùng, cần plugin khác (vd ItemsAdder)
 *    hoặc code riêng đọc base64 và gán vào ItemMeta. Hook để mở rộng.
 */
public class SwordSkin {

    private String name;
    private int customModelData;
    private String displayNameOverride;
    private List<String> loreOverride;
    private String textureBase64;

    public SwordSkin() {}

    public SwordSkin(String name, int customModelData) {
        this.name = name;
        this.customModelData = customModelData;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public int getCustomModelData() { return customModelData; }
    public void setCustomModelData(int customModelData) { this.customModelData = customModelData; }

    public String getDisplayNameOverride() { return displayNameOverride; }
    public void setDisplayNameOverride(String s) { this.displayNameOverride = s; }

    public List<String> getLoreOverride() { return loreOverride; }
    public void setLoreOverride(List<String> l) { this.loreOverride = l; }

    public String getTextureBase64() { return textureBase64; }
    public void setTextureBase64(String s) { this.textureBase64 = s; }

    /** Lấy display name có áp dụng override, fallback về default. */
    public String resolveDisplayName(String fallback) {
        return displayNameOverride != null ? displayNameOverride : fallback;
    }

    /** Lấy lore có áp dụng override, fallback về default. */
    public List<String> resolveLore(List<String> fallback) {
        if (loreOverride != null) return new ArrayList<>(loreOverride);
        return new ArrayList<>(fallback);
    }
}
