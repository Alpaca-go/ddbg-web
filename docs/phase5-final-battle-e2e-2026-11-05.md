# 最终战四形态真实战斗回放（III 级队伍）

**日期**：2026-11-05
**基线**：`f45a94e8`（#606 后）
**PR**：[#607](https://github.com/Alpaca-go/ddbg-web/pull/607)
**范围**：端到端验收「进战 → 选招 → 结算 → 形态切换 → 终局」，测试辅助层 + 1 条引擎测试；不改生产行为。

## 关键事实

- 自然任务夹具的 **I 级队伍**在最终战实测会 `heroesDefeated`（三形态打不过）——这是队伍强度问题，不是规则 bug。
- 因此 e2e 使用**战役末期 III 级队伍夹具**：四名英雄全技能升到 III（`permanentlyRemovedSkillIds` 记录 I/II 阶被替换）、装备 5 张技能（R-051：2 + HL）。**不**代表战役等级成长流程已经模拟。

## 实现

- `test-helpers/natural-battle.ts`：把 `naturalQuest` 里的战斗策略抽出为共用驱动（英雄贪心选最高伤害技能、无招则移动/换姿态；怪物 `prepareMonsterAction` → `playMonsterSkill`），由调用方提供 `state/step/settle`，行为不变。
- `natural-quest.ts`：改为调用 `playNaturalBattle`（自然存档类测试回归通过）。
- `natural-final-battle.ts`：新增 `through: "campaignVictory"`：部署首形态后用同一策略逐形态真打完，形态切换走 `finishDungeonBattle` + `deployFinalBattleForm`；`settle` 补上阵亡英雄饰品处置（R31）。
- `test-helpers/endgame-party.ts`：III 级队伍夹具 + 最终准备/补给/形态流程就绪。
- 新测试 `final-battle-campaign-victory.test.ts`：断言形态顺序 `ancestor1 → gestatingHeart → heartOfDarkness`、`campaignVictory: true`、`completedForms` 三形态、事件含「战役胜利（R9、R41）」，以及终局后拒绝命令。

## 验证

```bash
pnpm exec vitest run packages/engine/src/boss/final-battle-campaign-victory.test.ts
pnpm exec vitest run packages/engine/src/boss packages/engine/src/natural-wipeout-save.test.ts packages/engine/src/quest-save.test.ts
pnpm typecheck
```

- 新 e2e 通过（约 1.4 秒，三形态真打）。
- `boss` + 自然存档回归：99 文件 / 748 测中 746 通过；2 条为已知 Windows 并行超时（`quest-save` 20s、`natural-wipeout-save` 120s），**单独运行均通过**。
- typecheck 通过；改动文件 ESLint + Prettier 通过。

## 未覆盖（诚实边界）

- **战役等级成长流程**（英雄如何从 I 级升到 III 级、技能升级与饰品获取）未在本测试中模拟；III 级队伍是夹具输入。
- 严格存档回放：升级为夹具手术，不由命令日志派生，因此本测试不做 save roundtrip；最终战首形态的自然存档见 #597 既有测试。
- 英雄全灭的最终战失败路径（`campaignFailure`）仍未接；本测试走的是胜利路径。
