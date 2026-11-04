# 最终战不再套用普通第 4 轮撤退（R-044 / R36）

**日期**：2026-11-05
**基线**：`07e9ab30`（#604 后）
**PR**：[#605](https://github.com/Alpaca-go/ddbg-web/pull/605)
**范围**：只修最终战轮数边界；不动其他战斗与其他形态逻辑。

## 问题（实测）

用自然战斗策略把最终战 Ancestor 1 真打完时，第 4 轮结束出现 `outcome: "retreat"`：

- 当时 Boss `monster_medium:p105` 还剩 **10/50** 生命，英雄仍有人存活；
- 原因：`resolveEncounterBossScriptId` 只对 **Face the Threat（p019）** 这类 Boss 任务生效；
  最终战的 `questDistribution` 仍是 `quest:p018`（最暗任务），于是命中普通遭遇的“第 4 轮强制撤退”。

这与 **R-044 / R36** 冲突：Boss 战（含最暗任务与最终战）**不计轮数、没有逃跑**。

## 修复

`encounterForcesRetreatAfterRound` 增加终局判定：`dungeon.finalFormSequence.status === "fighting"` 时返回 `false`，不再读取普通第 4 轮上限。

- 未改普通遭遇：仍按第 4 轮撤退。
- 未改 Boss 脚本判定、`usable`、`combatReady`、任务白名单或几何。

## 验证

```bash
pnpm exec vitest run packages/engine/src/boss/encounter-rules.test.ts
pnpm typecheck
```

- 新增 1 测：最终战形态 `fighting` 时，第 4 轮与第 99 轮都不触发撤退。
- `encounter-rules` 17 测通过（含原普通/Boss 边界）。

## 后续（四形态端到端）

真实连续战斗还暴露两个缺口，另开切片处理：

1. 形态间有英雄阵亡时，下一个形态的 `deployFinalBattleForm` 会因 `hero.dead` 拒绝部署（R-044：阵亡不补人，需允许带着阵亡英雄续战）。
2. 端到端回放需要把自然战斗策略复用到三形态循环（测试辅助层）。
