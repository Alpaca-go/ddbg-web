# Phase 4 · 探索棋盘美术切片：QuestMap / 房间代币 / 遗迹房间牌

状态：**部分 supersede**——2026-10-19 本刀起，**房间牌**与 **QuestMap** 已切印刷 PNG（见 [phase4-print-exploration-art-map-2026-10-19.md](phase4-print-exploration-art-map-2026-10-19.md)）。**房间代币**仍用 TTS。美术二进制不入库。

## 当前权威来源

| 引擎键                        | 来源                                                              |
| ----------------------------- | ----------------------------------------------------------------- |
| `quest_map:p001`–`p014`       | 印刷 QuestMap FRONT 页序 PNG → `exploration-print-art-map.json`   |
| `room:p001`–`p025`（遗迹）    | 印刷 `rooms_FRONT` 页序 PNG → 同上                                |
| 房间代币 `empty` / `lair` / … | TTS `Custom_Tile` → `exploration-art-map.json`（仅 `roomTokens`） |

## 已提交映射

- `apps/web/src/card-art/exploration-print-art-map.json` — 印刷 `pngRel`（106 行 CSV；UI 用 39 张 room + quest_map）。
- `apps/web/src/card-art/exploration-art-map.json` — 7 种房间代币 TTS URL / `cacheName`。

重生成代币映射：

```bash
node tools/pipeline/scripts/build-tts-exploration-art-map.mjs \
  --tts /path/to/3657612854.json
```

## 本地缓存

- 印刷：`node tools/pipeline/scripts/export-print-card-art.mjs` → `.cache/print-card-art/`，Vite `/print-card-art/*`。
- 代币 TTS：`node tools/pipeline/scripts/cache-tts-card-art.mjs` → `.cache/tts-card-art/token-*.png`。

## UI 接入面

- `/?phase=3` 地牢沙盒 / `/?phase=3&play=1`：**QuestMap** 印刷底图 + SVG 标注；已揭示房间槽显示 TTS 代币图。
- **`dungeon-room-card`**：左侧 `RoomCardFace` 印刷房间牌；无缓存占位。

## 待确认（`pendingConfirmation` 摘要）

- **room_token ×7**：冲压板整页、无单枚 PNG（R-048）；继续 TTS 直至另行导出。
- **战斗 Room Tile 板块**（`room_tile_geometry`）无稳定 TTS 身份键；走廊段未接。
- Stygian / 他地点房间牌（deck 450 等）：范围外。

## 历史（首刀 TTS，已由印刷替代 QuestMap / 房间牌）

首刀曾用 Workshop `Custom_Tile` / deck 447 atlas；QuestMap 仅按 TTS 袋顺序对齐页码、`room:p013+` 无 atlas 格。该路径已从 UI 移除，保留上文代币说明。

## 范围外

战斗站位色块见 [phase4-battle-position-art-2026-10-19.md](phase4-battle-position-art-2026-10-19.md)。Phase 5、热链 Steam CDN（仅本机缓存经 Vite 提供）。
