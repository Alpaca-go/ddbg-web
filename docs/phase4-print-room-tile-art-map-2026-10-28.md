# Phase 4 · 战斗 Room Tile 整面印刷 map

状态：**9 张获批遗迹几何面**已写入 `room-tile-print-art-map.json`，战斗 UI 用整页 TrimBox 底图（R-048：页码 / PDF 来自 `room_tile_geometry.json`，不裁分区）。

## 已映射（有 geometry 证据）

| 范围 | 说明 |
| --- | --- |
| `room_tile:p001` | Ritual Chamber，FRONT p1（R-054 / R-055） |
| `room_tile:p002:back` … `room_tile:p005:front` | R-065 批次遗迹 2–5 共 8 面 |

共 **9** 条；与 `geometryVerified=true` 且 `usable=true` 的生产目录一致。

## 待确认 / 未映射

- 遗迹 **p006–p012** 正反面：无获批几何，不接 map。
- **最暗地牢 / 其它地点** Room Tile：核心盒 extract 有 raw，本项目无 Kyries 几何批，不接 map。
- **PNG**：`export_room_tile_faces.py` 从 `DD_COREBOX_TILES_*.pdf` 按 geometry 导整页；二进制在 `.cache/print-card-art/manual/room-tile-faces/`（gitignore）。

## 命令

```bash
node tools/pipeline/scripts/build-print-room-tile-art-map.mjs
node tools/pipeline/scripts/export-print-room-tile-faces.mjs --input "<EN_FILES>"
```

全量导出链已接入 `export-print-all.mjs`（在 `check-print-art-map-refs` 之前）。

## UI

- `resolve-print-room-tile-art.ts` → `/print-card-art/manual/room-tile-faces/…`
- `BattleRoomTileBoard`：底图 + 透明逻辑格叠层；地牢战斗用 `dungeon.roomCards.active.tileId`。
