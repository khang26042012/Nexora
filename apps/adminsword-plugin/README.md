# AdminSword — Quyền Năng Của Khang

Custom netherite sword với infinite damage + skin registry cho Paper 1.20.4.

## Features
- **Infinite damage** (`Integer.MAX_VALUE` attribute) — one-shot mọi entity.
- **Tên đặc biệt** `§6§l⚡ Quyền Năng Của Khang §8[INFINITE]` (hỗ trợ match nhiều kiểu chữ, kể cả `PE_KhangKYT` cho Bedrock).
- **Skin registry**: mỗi skin gắn 1 `custom-model-data` int, dùng resource pack để render texture. Có sẵn `default`, `fire`, `ice`.
- **Khóa cứng**: không thể bỏ vào rương, không thể vứt, không rơi khi chết.
- **Permission gating**: chỉ `adminsword.use` mới giữ/equip được (default: op).

## Commands
```
/adminsword give <player> [skin]   — Give the admin sword (skin: default/fire/ice/...)
/adminsword reload                  — Reload config + skin registry
/adminsword skin add <name> [cmd]   — Register new skin (auto CMD nếu không truyền)
/adminsword skin list               — List all registered skins
/adminsword skin remove <name>      — Remove a skin
```
Aliases: `/asw`, `/khangsword`.

## Permissions
- `adminsword.admin` — dùng commands (default: op)
- `adminsword.use` — giữ / equip admin sword (default: op)

## Custom skin — mở rộng

Có 3 cách thêm skin:

### 1. Edit `plugins/AdminSword/skins.yml`
```yaml
flame:
  custom-model-data: 2001
  display-name-override: "§c§l🔥 Quyền Năng Của Khang §8[FLAME]"
  lore-override:
    - "§7Flame edition §8| §cAdmin Only"
```
Sau đó `/adminsword reload`.

### 2. Trong config.yml gốc (mặc định)
```yaml
skins:
  - name: flame
    custom-model-data: 2001
    display-name-override: "§c§l🔥 Quyền Năng Của Khang §8[FLAME]"
```

### 3. Từ code Java khác
```java
import com.khang2604.adminsword.AdminSword;
import com.khang2604.adminsword.SwordSkin;

AdminSword.get().getSkinRegistry().register("flame", new SwordSkin()
    .setName("flame")
    .setCustomModelData(2001)
    .setDisplayNameOverride("§c§l🔥 Quyền Năng Của Khang §8[FLAME]"));
```

## Resource pack (cho custom texture)
Để texture custom hiển thị, client cần resource pack có `assets/minecraft/models/item/netherite_sword.json` override:

```json
{
  "parent": "item/handheld",
  "textures": {
    "layer0": "item/netherite_sword"
  },
  "overrides": [
    {
      "predicate": { "custom_model_data": 1001 },
      "model": "item/adminsword_fire"
    },
    {
      "predicate": { "custom_model_data": 1002 },
      "model": "item/adminsword_ice"
    }
  ]
}
```

Và `assets/minecraft/models/item/adminsword_fire.json`:
```json
{ "parent": "item/handheld", "textures": { "layer0": "item/adminsword_fire" } }
```

Nếu không có resource pack, sword vẫn hiển thị vanilla netherite texture + glint + custom name.

## Build
```
cd apps/adminsword-plugin
mvn -B clean package -DskipTests
```
Output: `target/adminsword-1.0.0.jar`.

## Compatibility
- Paper 1.20.4 (tested API).
- 1.21+ có thể cần điều chỉnh `Attribute.GENERIC_ATTACK_DAMAGE` → `Attribute.ATTACK_DAMAGE` (Bukkit đã auto-handle via reflection trong factory).
