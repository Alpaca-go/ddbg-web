# Collector I · Show Collection / Life Steal 结算验收

**日期**：2026-11-04  
**基线**：main @ [#577](https://github.com/Alpaca-go/ddbg-web/pull/577)（R-176 正式目录）  
**裁定**：[R-176](rulings.md#r-176)、Collect All 边界见 [HANDOFF-2026-11-04-collector-i.md](HANDOFF-2026-11-04-collector-i.md)

## 范围

- 仅 **Collector I**（`monster_medium:p092`）与 **`deployCollectorI` → `startBattle` → `prepareMonsterAction` / `playMonsterSkill`** 公开命令链。
- 场上 **无 Collected** 时仍由 Collect All 接管（R39 / §14.5），不进入 R-176 选招表。
- 场上 **已有 Collected** 时走 R-176：`d10` 1–5 → Show Collection（slot 1），6–10 → Life Steal（slot 2）；Speed 2 已在正式目录（本刀不断言移动，只断言卡面与结算）。

## 卡面（印刷 / 已核实）

| 技能 | Acc | Crit | 射程 | 目标 | 伤害 | verified 效果 |
| ---- | --- | ---- | ---- | ---- | ---- | ------------- |
| Show Collection | 9 | 0 | 1 | Crowded | 1–2 | 目标 +1 压力 |
| Life Steal | 8 | 1 | 2 | Crowded | 5–9 | Self 治疗 9；目标 2 流血 2t + Mark 2t |

缺 `verified_monster_effects` 或 damage 命名时 **`playMonsterSkill` 整次拒绝**（R-048），不猜补数；Crowded 多目标数以卡面 `target_hero` 图标为准，不自推定。

## 测试

`packages/engine/src/boss/collector-i-skills-acc.test.ts`：卡面断言 + 真实部署路径 Collect All / R-176 选招 / 两招命中结算 + 效果计划漂移拒绝。

```bash
pnpm typecheck
pnpm exec vitest run packages/engine/src/boss/collector-i-skills-acc.test.ts
pnpm lint
```

## 仍 hold

与 [HANDOFF-2026-11-04-collector-i.md](HANDOFF-2026-11-04-collector-i.md) 一致：`combatReady`、任务白名单、Collector II/III、Fanatic、`selectRoomTile` 等未改。
