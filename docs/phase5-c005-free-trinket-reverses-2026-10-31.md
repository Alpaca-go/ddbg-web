# C-005 续：十张自由饰品反面时点（2026-10-31）

依据印刷 TRINKETS（`battle-free-trinkets.ts` 的 `definitions.faces`）、R26 / 规格书 §11.2 / R-028、R-048。本刀只接**已有 defenceTrinketReaction / core-trinket-free 原语**可复用的反面，不抢扩展、不发明数值。

## 本刀接通

| 卡牌 | 反面 | 路径 | 说明 |
| --- | --- | --- | --- |
| Bloodthirst Ring p015 | When hit: Suffer 3 Bleed 2t | `defenceTrinketReaction`（受击/防御窗） | 与 Damage Stone 受伤反面同类；`useTrinket` 拒绝并提示在防御窗选用 |
| Book of Holiness p017 | Turn a hit against you into a Crit. | `defenceTrinketReaction` → `outcome = "crit"` | 生产路径已在 `trinket-reactions.ts`；本刀补 battle-free 拒绝文案与回归测 |
| Book of Relaxation p018 | `@dodge -2`（印刷 **−2**） | `defenceTrinketReaction` Dodge 修正 | 与 Speed Stone 反面同类，**非**角色回合间隙主动 `@stress` 对称；不在 `freeFaces` / `useTrinket` 主动白名单 |
| Book of Sanity p036 | Suffer damage 6 | 角色回合间隙 `useTrinket` + `useCoreTrinket` | 对齐 `core-trinket-free.ts` inverted 分支（R-128 非攻击伤害、Protection 不减半） |

`battle-free-trinkets.ts` 导出 `FREE_TRINKET_INVERTED_ACTIVE_USE` 与 `FREE_TRINKET_INVERTED_DEFENCE_REACTION`，与 `core-trinket-free.ts` 的 `freeFaces` 主动面一致；受击窗反面不再误标「尚未接通」。

## 仍 hold（本刀未做）

| 卡牌 | 原因 |
| --- | --- |
| Dark Crown / Solar Crown p028 / p035 | 「When the result is determined」意志结果窗：虽有 virtue 饰品钩子，与自由十张 UI/命令边界未在本刀统一验收 |
| Cleansing Crystal p038 反面 | Gain negative quirk：获得怪癖窗未按 R-048 接 battle-free 独立命令（core 路径另有实现，本切片不扩） |
| Recovery Charm / Candle p030 / p037 | 战斗外专用入口（inverted 主动在 hamlet/探索已走 core；battle-free 不重复） |

## 非目标

- combatReady、几何、Stygian、Rising Threat、扩展 Boss、#438 多目标重选枚举
- Dark Crown / Solar Crown 意志结果窗零发明接入
- 卡面漂移整次拒绝策略不变

## 待确认

- Q：自由十张反面是否将来统一只走 `useCoreTrinket` UI，而 `useTrinket` 仅服务日志/回放——当前双路径并行，本刀保持行为对齐。

## 测试

```bash
pnpm exec vitest run packages/engine/src/battle-free-trinkets.test.ts
pnpm exec vitest run packages/engine/src/core-trinkets.test.ts -t "Book of Holiness|Book of Relaxation|Book of Sanity|p015"
pnpm typecheck
```

本刀 `battle-free-trinkets.test.ts` 新增 p015/p017/p018 受击窗各 1 条、p036 主动伤害 1 条；正面与其它已开放反面回归不变。
