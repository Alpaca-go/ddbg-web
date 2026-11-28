# Cove 板块首批印刷目录（2026-11-28）

状态：**十二面印刷来源均已 verified（FRONT/BACK 各 6 页）。几何提案见 [几何审阅 2026-11-28](./cove-room-tile-geometry-review-2026-11-28.md)；`geometryVerified` 仍 false，未接线部署或牌堆。**

依据：`MG_DD_05_EN_COVE` 的 `DD_COVE_TILES_FRONT.pdf` / `DD_COVE_TILES_BACK.pdf`（各 6 页）；R-001、R-048。

## 来源

| 路径                                                             | 说明                               |
| ---------------------------------------------------------------- | ---------------------------------- |
| `packages/data/extract/extension/cove/raw/dungeon_tile.json`     | 6 页 sheet；FRONT+BACK 双 PDF 提取 |
| `packages/data/normalized/extension/cove/room_tile_catalog.json` | `ddbg-cove-room-tile-catalog-v0`   |
| 房间名称绑定                                                     | `room.json` 十二张房间卡           |

重跑（本地 EN_FILES 根目录）：

```bash
# 将双 PDF 置于 MG_DD_05_EN_COVE/ 后重跑提取（geometry 分支已提交更新 raw）
python3 tools/pipeline/extract-print/scripts/ddbg_extract/stage1.py  # 或沿用仓库已提交的 raw
pnpm exec vitest run packages/data/tests/cove/tiles/room-tile.build.test.ts
```

## 十二张身份与分类

| 板块 ID             | 房间名                 | 分类     | FRONT 核准         | 预期印刷面 |
| ------------------- | ---------------------- | -------- | ------------------ | ---------- |
| `room_tile:cove:01` | Eldritch Augmentation  | 普通     | FRONT p1 · 数字 1  | verified   |
| `room_tile:cove:02` | Flooded Room           | 普通     | BACK p1 · 数字 2   | verified   |
| `room_tile:cove:03` | The Hoarders           | 普通     | FRONT p2 · 数字 3  | verified   |
| `room_tile:cove:04` | Buried Treasures       | 普通     | BACK p2 · 数字 4   | verified   |
| `room_tile:cove:05` | Twin Idols             | 普通     | FRONT p3 · 数字 5  | verified   |
| `room_tile:cove:06` | Lairs in Tunnels       | 普通     | BACK p3 · 数字 6   | verified   |
| `room_tile:cove:07` | Shipwreck              | 普通     | FRONT p4 · 数字 7  | verified   |
| `room_tile:cove:08` | Sea Rites              | 普通     | BACK p4 · 数字 8   | verified   |
| `room_tile:cove:09` | Temple of the Deep One | 普通     | FRONT p5 · 数字 9  | verified   |
| `room_tile:cove:10` | Siren's Room           | **Boss** | BACK p5 · 数字 10  | verified   |
| `room_tile:cove:11` | Shambler's Room        | **Boss** | FRONT p6 · 数字 11 | verified   |
| `room_tile:cove:12` | Drowned Crew Room      | **Boss** | BACK p6 · 数字 12  | verified   |

偶数号 BACK 已按 `DD_COVE_TILES_BACK.pdf` 对照；几何提案见几何审阅稿，未写入 normalized 几何目录。

## 停点

- 全部条目：`geometryVerified=false`、`geometryComplete=false`、`usable=false`、`runtimeReady=false`。
- 全部十二张：`geometryVerified=false`；`pendingReview` 含 R-048 几何停点及 Q-186（普通）/ Boss 专属刀说明。

## 内容包

- `cardContentPack` → `cove`；`CoveQuestSources.roomTileCatalog` 为可选字段，**未**接入 `sourcesForContentPacks` 过滤或棋盘部署。
- 普通板块 `poolEligible=true` 仅表示目录登记可进未来普通牌堆资格位，当前未接线。

## 明确未做

Stygian 板块、零容量运行时、usable 翻转、出征板块选择器、Boss 部署几何、存档迁移、引擎邻接结算。
