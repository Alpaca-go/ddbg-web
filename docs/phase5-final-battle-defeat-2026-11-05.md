# 最终战英雄全灭 → 战役失败（R-044）

**日期**：2026-11-05
**基线**：`ece65468`（#607 后）
**PR**：[#608](https://github.com/Alpaca-go/ddbg-web/pull/608)
**范围**：最终战（含各形态）英雄全灭的终局判定；不动胜利路径与其他战斗。

## 依据

**R-044**：Boss 任务（Face the Threat、最暗地牢任务、最终战）中任何一场战斗英雄全灭 = **战役失败**；不按逃跑处理、不补人。

## 问题（实测）

把自然战斗策略接到最终战真打时，I 级队伍在形态 1 全灭，`finishDungeonBattle` 落到 `finishFinalBattleForm` 后被拒绝（「须确认当前最终战形态实际被击败」），既没有推进形态也没有判失败，状态卡死。

## 修复

- `finishFinalBattleForm`：先识别 `encounter.turn = halted / heroesDefeated`，写入 `dungeon.campaignFailure = "bossQuestHeroesDefeated"` 并给出「最终战英雄全灭：战役失败（R-044）」事件；形态进度保持 `fighting` 不再推进。
- `applyCommand`：`finalFormSequence` 存在且 `campaignFailure` 已置位时，一律拒绝部署 / 战斗 / 结算命令（终局）。
- 网页复用既有 `campaignFailure` 文案（`battle-view` 已显示「Boss 任务英雄全灭，战役失败（R-044）」），本刀不新增面板。

## 边界

- `mutualWipeout` 不按本刀失败处理，与 `finishDungeonBattle` 既有口径一致（Q-52）。
- 失败后的「开新战役」入口未做（胜利面板有，失败页没有）；需刷新页面重新出征，后续可补。

## 验证

```bash
pnpm exec vitest run packages/engine/src/boss/final-battle-defeat.test.ts
pnpm exec vitest run packages/engine/src/boss/final-form-sequence.test.ts \
  packages/engine/src/boss/final-battle-deploy.test.ts \
  packages/engine/src/boss/final-battle-dead-heroes.test.ts \
  packages/engine/src/boss/final-battle-campaign-victory.test.ts \
  packages/engine/src/boss/final-battle-natural-save.test.ts
pnpm typecheck
```

- 新增 1 测：全灭 → `campaignFailure`、形态不推进、事件含失败文案、终局后拒绝部署/战斗/结算。
- 相关回归 6 文件 / 17 测通过。
