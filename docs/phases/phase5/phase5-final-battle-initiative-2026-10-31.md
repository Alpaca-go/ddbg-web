# 最终战开战先攻 / 新一轮

相对 #429（`deployFinalBattleForm` → `fighting` 占位几何）：只接通 **显式 `startBattle`** 与普通遭遇战相同的先攻洗入 / 第 1 轮，不声称最终战完整可玩。

## 已接

- **`command.ts`**：`hamletReturn` 仍保留供 `readFinalBattlePlanAfterDarkestVictory` 读取；当 `finalFormSequence.status === "fighting"` 且 `dungeon.phase === inBattle` 已有 BattleState 时，放行遭遇战命令（含 `startBattle`、`drawInitiative` 等），不再被「回村步骤」硬拒。
- **`deployFinalBattleForm`（续）**：多支援卡占位部署时为每张卡分配互不重叠的姿态轨（actor 用数据 `stance`，支援依次占用剩余轨），使 `startBattle` 姿态校验可过；**不**改 `combatReady`。
- **形态切换**：#429 已在再部署时清除 `encounter` / `pending` / `shuffleIntents`；本刀要求玩家再发 **`startBattle`** 重洗先攻并开第 1 轮，不得把上一形态已结束的 encounter 当已开战。
- **网页**：部署后进入 `BattleView`，沿用既有「开始战斗」按钮派发 `startBattle`（不自动开战，避免印刷「部署即开战」歧义）。
- **测试**：`final-battle-initiative.test.ts` + 既有 deploy / form-sequence 单测。

## hold / 未接

- 各形态 `initiativeCards` / 多行动 / 技能 AI、`combatReady: true` 前的完整 Boss 运行时。
- Ancestor Room 正式几何、`ancestorGlory` 邻接（仍 #429 占位）。
- 形态间除先攻重洗外的其它生成规则、Stygian、自然战役全程存档验收。

## 待确认

- **Q**：最终战是否应在 `deployFinalBattleForm` 后自动 `startBattle`（当前保持显式命令，与 #429 文案一致）。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run packages/engine/src/boss/final-battle-initiative.test.ts packages/engine/src/boss/final-battle-deploy.test.ts packages/engine/src/boss/final-form-sequence.test.ts
```
