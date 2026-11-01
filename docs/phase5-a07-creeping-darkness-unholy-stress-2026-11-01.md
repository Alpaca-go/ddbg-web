# Phase 5 · A-07 Creeping Darkness III Unholy 生成压力

基线：`main` tip `98f210c471a983c2de26a477dd417f018a3bee67`（#482 A-08 已合）。

## 卡面 SPECIAL（quest:p014）

来源：`packages/data/normalized/corebox/quest_cards.json` → `quest:p014` → `specialRuleLines`：

> Whenever an Unholy Monster is spawned, Heroes suffer {stress} +1 each.

## 已接

| 条目 | 实现 |
| --- | --- |
| 任务门控 | 仅 `dungeon.questDistribution.questId === quest:p014` |
| 触发点 | 战斗 `encounter` 存在时，比较命令前后怪物实体；初始 `startBattle` 与后续召唤均算 spawned（与 `higher-ruins-threat.ts` R11 注释一致，但走任务 SPECIAL，非 Boss 威胁） |
| Unholy 判定 | `battle.monsters` 卡面 `type_position_tags` 含 `Unholy`（大小写不敏感）；**不按名字推断**（`hero-skill.ts` 注释） |
| 压力 | 每只新生成 Unholy 各触发一次 `triggerBattlePassive` 全队 +1；经 `resolveBattlePressure` / 心脏病死亡共用路径 |
| 接线 | `packages/engine/src/creeping-darkness-unholy-stress.ts`；`command.ts` → `applyCreepingDarknessUnholySpawnStress` 包在 `applyHigherRuinsBattleSpawn` 外层 |

## 未接 / 范围外

- Rising Threat、p015 Threat is Real、Purify、Dem Bones 拾取：本 PR 未改。
- `createCoreDungeonQuest` 白名单：未扩大。
- `combatReady`：仍为 false；本 SPECIAL 不代替完整遭遇入场。
- Stygian / Phase 6 / B 几何：未碰。

## Q-xx

| 编号 | 说明 |
| --- | --- |
| （暂无） | 若运行时怪物卡缺 `type_position_tags` 且无法从池数据判定 Unholy，则**不触发**本 SPECIAL；需在数据层补标签后再验收。 |

## 验证

```bash
pnpm exec vitest run packages/engine/src/creeping-darkness-unholy-stress.test.ts
```

覆盖：p014 下 Unholy 初始部署与后续 spawn → 全队压力；非 Unholy 不涨；非 p014 回归；`startBattle` 公开命令路径。
