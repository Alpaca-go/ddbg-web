# Phase 4 · 补给（Provisions）玩家辅助卡 · 印刷 map 与桌面 reference

状态：**本 PR**——引擎补给六面 / Wild / 开局与探索消耗已接（R12）；桌面侧此前无 `player_aid` 印刷 map。本刀只接 **AID-Prov**（`player_aid:p001` FRONT）。

## 规则与数据依据

| 项 | 出处 |
| --- | --- |
| 辅助卡 8 张 = Provisions / Exploration / Rooms / Conditions 双面各 4 份 | 规格书 §18、**R-049** |
| 补给六面效果 | **R12**、AID-Prov ↔ §18.1 |
| 引擎 id | `packages/data/extract/corebox/raw/player_aid.json` → `player_aid:p001`（FRONT p1，4 副本同面） |
| 裁切 | 70×120 mm TrimBox（198.43×340.16 pt），与 70×120 任务卡同几何；**R-048** |

## 本 PR 已接

| 路径 | 用途 |
| --- | --- |
| `apps/web/src/card-art/player-aid-print-art-map.json` | `player_aid:p001` FRONT/BACK 页序 PNG |
| `apps/web/src/card-art/resolve-print-player-aid-art.ts` | lookup + `PROVISION_PLAYER_AID_ID` |
| `tools/pipeline/scripts/build-print-player-aid-art-map.mjs` | 从 raw extract 再生 map |
| `CoreboxPrintCardFace` `deck="player_aid"` | 与 curio/quest 同占位策略 |
| `TabletopProvisionPlayerAid` | 出征准备中央、地牢探索牌堆侧 reference |

本地 PNG（不入库）：

```bash
node tools/pipeline/scripts/export-print-card-art.mjs --input "<EN_FILES>"
node tools/pipeline/scripts/build-print-player-aid-art-map.mjs
```

## 待确认（未接 / 不猜）

| 项 | 说明 |
| --- | --- |
| `player_aid:p005` Rooms（AID-Rooms） | 可导出 PNG，桌面 reference **未接** |
| `player_aid:p001` BACK Exploration | 同卡背面，非补给面；探索 reference **另刀** |
| `player_aid:p005` BACK Conditions | 状态参考卡 **未接** |
| `DD_COREBOX_DICE_D6_Provision.pdf` dice_net | 引擎面 key 已接；展开图→桌面骰面 raster / 面序 **未批**，不接 map |
| 辅助卡 icon 行内小图 | 仍走词典 confirmed hash；不在此 map 裁切 |

## 测试

- `pnpm exec vitest run apps/web/src/card-art/resolve-print-player-aid-art.test.ts`
- `pnpm typecheck`

## 范围外

任务卡 hold、Phase 5 Boss、Phase 6、桌游 UI #319/#321 收口；Rooms/Exploration/Conditions 辅助卡 UI。
