# Phase 4 · 战斗站位色块切片（美术刀 C）

状态：**首刀**——战斗界面英雄/怪物四格站位轨道可在本地缓存存在时显示 TTS「Color Room Tiles」色条与正式八英雄 standee 肖像；无缓存时占位条 + 中文姿态/槽位标签。美术二进制不入库。

## 权威美术来源

- Steam Workshop TTS 存档 JSON（Workshop id `3657612854`）。
- 仅用 JSON 内链接：`Color Room Tiles` 袋内 `Custom_Tile.ImageURL`、`The Darkest Heroes/{Hero}` 下 `Custom_Token.ImageURL`。
- **不用**印刷 PDF；**不**热链 Steam CDN（经 Vite `/tts-card-art/` 读本机缓存）。

## 已映射 TTS 对象

| 用途                         | TTS 来源                                     | 缓存文件名                        |
| ---------------------------- | -------------------------------------------- | --------------------------------- |
| 进攻/防御站位色条            | `Color Room Tiles` · nickname `1-2`          | `stance-color-tile-1-2.png`       |
| 远程站位色条                 | `Color Room Tiles` · nickname `3`            | `stance-color-tile-3.png`         |
| 大型怪占格示意（未接 UI 条） | `Color Room Tiles` · `Large 1-2`             | `stance-color-tile-large-1-2.png` |
| 正式八英雄肖像               | `The Darkest Heroes` · 各英雄 `Custom_Token` | `hero-token-<slug>.png`           |

已提交映射：`apps/web/src/card-art/battle-position-art-map.json`。

重生成：

```bash
node tools/pipeline/scripts/build-tts-battle-position-art-map.mjs \
  --tts /path/to/3657612854.json
```

## 本地缓存

与技能卡面 / 探索图共用目录与 Vite 挂载：

```bash
node tools/pipeline/scripts/cache-tts-card-art.mjs
```

脚本会额外下载 `battle-position-art-map.json` 中的 color tile 与 hero token（并保留对 `hero-skill-face-map.json`、`exploration-art-map.json` 的处理）。

## UI 接入面

- `BattleView`（`/?phase=2` 沙盒、`/?phase=3&play=1` 地牢战斗）：区域邻接板下方 **`BattleStanceTrack`** 双列（英雄/怪物）× 四姿态行；每行色条 + 槽位序号 + 实体芯片（英雄带 token 图）。
- 敌我区分：列标题、芯片左边色（绿/红）、姿态中文标签。

## 待确认（映射 JSON `pendingConfirmation` 摘要）

- `支援` 行无单独 Color Room Tile，仅 CSS 占位条。
- Color Tile nickname → 姿态行对应关系仅依 TTS 袋内标签，未与印刷 stance track 逐色对照。
- `Large 1-2` 已入库 URL，本刀未绑定引擎 `stanceSlots` 宽度的 UI 条。
- 怪物卡面 atlas 见 [phase4-monster-face-art-2026-10-19.md](phase4-monster-face-art-2026-10-19.md)（本刀 #251 范围外）。

## 范围外

战斗 Room Tile 板块（`room_tile_geometry` 整板贴图）、走廊 `Base Room Tiles`、印刷 PDF 管线、Stygian、Phase 5、引擎规则语义。
