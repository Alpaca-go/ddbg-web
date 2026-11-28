# Cove 十二张板块几何核对提案（2026-11-28）

状态：**逐面几何提案已填入审阅表，待 Kyries 核对。`geometryVerified` / `geometryComplete` 保持 false，未写入 `room_tile_geometry.json`。**

**完整表（身份表 + 12 面标准字段）** → [cove-room-tile-geometry-filled-2026-11-28.md](./cove-room-tile-geometry-filled-2026-11-28.md)（印刷图 `tiles/FRONT-*.png`、`BACK-*.png`，R-048，仅印刷事实）。

依据：`MG_DD_05_EN_COVE` 的 `DD_COVE_TILES_FRONT.pdf` / `DD_COVE_TILES_BACK.pdf`（各 6 页）；R-001、R-048、R-235（高低地语义待 Cove 裁）。

## 来源与格式对标

| 路径                                                               | 说明                                            |
| ------------------------------------------------------------------ | ----------------------------------------------- |
| `packages/data/extract/extension/cove/raw/dungeon_tile.json`       | 本 PR 重跑提取（含 BACK 六页）                  |
| `packages/data/normalized/extension/cove/room_tile_catalog.json`   | 十二面 `source=verified`；几何仍停点            |
| [板块身份审阅](./cove-room-tile-review-2026-11-28.md)              | 与 #829 目录对齐                                |
| `packages/data/normalized/extension/weald/room_tile_geometry.json` | 字段对标                                        |
| **本刀填表**                                                       | [geometry-filled-2026-11-28](./cove-room-tile-geometry-filled-2026-11-28.md) |

## 各面「待确认」出现次数（填表内合计，非仅存疑项去重）

| `room_tile:cove:NN` | 名称                   | Boss | 待确认计数 |
| ------------------- | ---------------------- | :--: | ---------: |
| 01                  | Eldritch Augmentation  |      |          3 |
| 02                  | Flooded Room           |      |          5 |
| 03                  | The Hoarders           |      |          7 |
| 04                  | Buried Treasures       |      |          4 |
| 05                  | Twin Idols             |      |          9 |
| 06                  | Lairs in Tunnels       |      |          5 |
| 07                  | Shipwreck              |      |          7 |
| 08                  | Sea Rites              |      |          3 |
| 09                  | Temple of the Deep One |      |          5 |
| 10                  | Siren's Room           |  ✓   |          2 |
| 11                  | Shambler's Room        |  ✓   |          3 |
| 12                  | Drowned Crew Room      |  ✓   |          4 |

**合计 59 处「待确认」**（含邻接 blocked 提案、部署单轴、特殊区效果、零容量/柱命名等）。**无面带「容量」单元格标待确认**（ pip 数均给出整数提案）。

## 摘要主题（详见填表）

| 主题 | 说明 |
| ---- | ---- |
| 邻接 / 墙 | 多面依赖黑柱、void、L 墙；角邻 `cornerOnly` 已提案但未核准 |
| 部署 | 一面多红/黄框时单格只填一字母，其余列待确认或写入「本面其他待确认」 |
| 特殊区 | 橙星 A/B、绿星、红八星均标印刷位置；房间卡效果文案统为待确认 |
| 高低地 | 02-F、03-A、04 向下三角、05-F、08-D/F、09-C、10 上行三角等按印刷提案 |
| Boss 10–12 | 格式同普通面；不进普通板块池 |

## 仍待 Kyries 裁定（填表后）

1. 各面正式区划（含零容量与黑色 void 是否单独 `areaId`）。
2. 全部邻接、角点、墙（不以共边默认可通行）。
3. 橙星 / 绿星 / 红八星与房间卡绑区（Q-186）。
4. Cove 是否完全沿用 R-235 高低地图标。
5. Boss 10–12 几何审阅与运行时分离。

## 明确未做

`room_tile_geometry.json`、引擎邻接/移动、出征板块选择、Stygian、`usable` / `runtimeReady` 接线。