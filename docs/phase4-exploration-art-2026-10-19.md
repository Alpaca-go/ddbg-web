# Phase 4 · 探索棋盘美术切片：QuestMap / 房间代币 / 遗迹房间牌

状态：**首刀**——地牢探索 UI 可在本地缓存存在时显示 TTS 来源的 QuestMap 底图、已揭示房间代币图与遗迹房间牌面；无缓存时占位并保留文字标注。美术二进制不入库。

## 权威美术来源

- Steam Workshop TTS 存档 JSON（Workshop id `3657612854`）。
- 仅用 JSON 内链接：`Custom_Tile` / `CustomImage.ImageURL`、`CustomDeck.FaceURL`（deck **447** 遗迹房间牌），**不用**印刷 PDF 出图。

## 已映射 TTS 对象

| 引擎键                        | TTS 来源                                                                                       | 缓存文件名                |
| ----------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------- |
| `quest_map:p001`–`p014`       | `Dungeon Tiles`（12）+ `Darkest Dungeon Tiles`（2）内 `Custom_Tile` 按 `ContainedObjects` 顺序 | `quest-map-p00N.png`      |
| 房间代币 `empty` / `lair` / … | 各 `Infinite_Bag`（`Empty`、`Lair`、`Curio` 等）下首张 `Custom_Tile`                           | `token-{kind}.png`        |
| `room:p001`–`p012`（遗迹）    | `Room Cards (Darkest Dungeon)` · CustomDeck **447** · cell = 印刷 `rooms_FRONT` 页码 + 12      | `face-447.png` + CSS 切格 |

已提交映射：`apps/web/src/card-art/exploration-art-map.json`（仅 URL / 索引 / 身份键）。

重生成：

```bash
node tools/pipeline/scripts/build-tts-exploration-art-map.mjs \
  --tts /path/to/3657612854.json
```

## 本地缓存

与英雄技能卡面共用目录与 Vite 挂载（`/tts-card-art/*`）：

```bash
node tools/pipeline/scripts/cache-tts-card-art.mjs
# 或 DDBG_TTS_CARD_ART_CACHE=/abs/path node tools/pipeline/scripts/cache-tts-card-art.mjs
```

脚本会下载 `exploration-art-map.json` 中的 quest 整图、token 整图与 deck 447 atlas（若尚未缓存英雄图则仍处理 `hero-skill-face-map.json`）。

## UI 接入面

- `/?phase=3` 地牢沙盒 / `/?phase=3&play=1` 正式探索：**QuestMap** SVG 叠加在对应页底图上；已揭示且未清理的房间槽显示代币图（`foreignObject` + 与卡面相同的缓存探测占位）。
- 抽房间牌后 **`dungeon-room-card`**：左侧缩略遗迹房间牌（deck 447），右侧保留名称 / 页码 / 转录文字。

## 待确认（映射 JSON `pendingConfirmation` 摘要）

- QuestMap 14 张图顺序仅按 TTS 袋内对象顺序对齐 `dungeon_layouts` 页码，未逐页与印刷 FRONT 对照。
- `room:p013`（Fanatic）不在 deck 447 的 12 张牌内，未映射。
- **战斗 Room Tile 板块**（`room_tile_geometry`）在本 TTS 存档中无稳定身份键，本刀未接；走廊段 `Base Room Tiles`（`0-1`、`1-2`…）未接（Web 地图无走廊几何）。
- Stygian / 他地点房间牌（deck 450 等）、Boss 全量、怪物 atlas：范围外。

## 范围外

战斗站位色块见 [phase4-battle-position-art-2026-10-19.md](phase4-battle-position-art-2026-10-19.md)。印刷 PDF 裁切管线、Phase 5、热链 Steam CDN（仅本机缓存经 Vite 提供）。
