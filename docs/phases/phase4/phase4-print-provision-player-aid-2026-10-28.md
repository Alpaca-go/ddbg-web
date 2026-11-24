# Phase 4 · 玩家辅助卡 · 印刷 map 与桌面 reference

状态：**本 PR（#327 后续）**——在 Provisions（`player_aid:p001` FRONT）基础上，接齐 Rooms / Exploration / Conditions 的页序 PNG map 与桌面 reference。

## 规则与数据依据

| 项                                                                     | 出处                                             |
| ---------------------------------------------------------------------- | ------------------------------------------------ |
| 辅助卡 8 张 = Provisions / Exploration、Rooms / Conditions 双面各 4 份 | 规格书 §18、**R-049**                            |
| AID-Prov / AID-Expl                                                    | FRONT/BACK p1（4 副本）；引擎 `player_aid:p001`  |
| AID-Rooms / AID-Cond                                                   | FRONT/BACK p5（4 副本）；引擎 `player_aid:p005`  |
| 补给六面效果                                                           | **R12**、AID-Prov ↔ §18.1                        |
| 裁切                                                                   | 70×120 mm TrimBox（198.43×340.16 pt）；**R-048** |

## 盘点（raw extract ↔ 规格书页序）

| 面          | raw id                  | PDF 页               | 标题 span   | map 状态                   |
| ----------- | ----------------------- | -------------------- | ----------- | -------------------------- |
| Provisions  | `player_aid:p001` FRONT | PLAYER_AIDS_FRONT p1 | Provisions  | ✅ enabled                 |
| Exploration | `player_aid:p001` BACK  | PLAYER_AIDS_BACK p1  | Exploration | ✅ enabled（同卡 back 面） |
| Rooms       | `player_aid:p005` FRONT | PLAYER_AIDS_FRONT p5 | Rooms       | ✅ enabled                 |
| Conditions  | `player_aid:p005` BACK  | PLAYER_AIDS_BACK p5  | Conditions  | ✅ enabled（同卡 back 面） |

副本页 p2–4 / p6–8 与代表页同 `face_phash`（reconciliation 已说明）；map 只绑代表页 PNG，不重复绑 8 行。

## 本 PR 已接

| 路径                                                      | 用途                                             |
| --------------------------------------------------------- | ------------------------------------------------ |
| `player-aid-print-art-map.json`                           | `p001` + `p005` 双卡 FRONT/BACK 页序             |
| `resolve-print-player-aid-art.ts`                         | lookup（含 Exploration / Conditions back）       |
| `build-print-player-aid-art-map.mjs`                      | 从 raw 再生 map                                  |
| `TabletopProvisionPlayerAid`                              | 出征准备 + 地牢探索（补给）                      |
| `TabletopExplorationPlayerAid` / `TabletopRoomsPlayerAid` | 地牢探索牌堆侧（`TabletopDungeonPlayerAidRefs`） |
| `TabletopConditionsPlayerAid`                             | 战斗阶段牌堆侧（状态参考）                       |

本地 PNG（不入库）：

```bash
node tools/pipeline/scripts/export-print-card-art.mjs --input "<EN_FILES>"
node tools/pipeline/scripts/build-print-player-aid-art-map.mjs
```

## 待确认（未接 / 不猜）

| 项                                          | 说明                                                                                                                                                                               |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DD_COREBOX_DICE_D6_Provision.pdf` dice_net | 引擎面 key 已接；展开图→桌面骰面 raster / 面序 **未批**，不接 map；候选面序与证据见 [phase4-print-provision-dice-net-2026-10-28.md](phase4-print-provision-dice-net-2026-10-28.md) |
| 辅助卡 icon 行内小图                        | 仍走词典 confirmed hash；不在此 map 裁切                                                                                                                                           |

## 测试

- `pnpm exec vitest run apps/web/src/card-art/resolve-print-player-aid-art.test.ts apps/web/src/tabletop/sections/tabletop-provision-player-aid.test.tsx apps/web/src/tabletop/sections/tabletop-player-aid-references.test.tsx`
- `pnpm typecheck`

## 范围外

任务卡 hold、Phase 5/6、#319/#321；D6 Provision 展开图 raster。
