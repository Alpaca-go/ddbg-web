# C-005：怪物已定目标死亡后的免费饰品重选续接（2026-10-31）

依据：核心规则书 R26（完整效果间隙）、R-048；`docs/phase5-c005-all-trinkets-2026-10-30.md` 已点名的缺口。

## 行为

- 怪物回合已 `positioned` 且保存 `monsterAction` 后，在 `useTrinket` / `useCoreTrinket` 结算免费能力导致**原攻击目标死亡**、同阵营仍有存活英雄时：
  - 命令带 `allTrinkets: true`：打开 `monsterRetarget` 待选，列出当前技能射程内合法英雄；选目标后自动 `playMonsterSkill` 续接（保留原技能槽与已保存 `skillPrefix` 骰面，若有）。
  - 无 `allTrinkets`：与旧日志一致，整次原子拒绝（不翻面、不扣费），消息仍为「怪物已定目标死亡续接尚未接通」。
- 饰品成功路径仍正常 `usedTrinketIds`、翻面与压力/生命结算；与旧「拒绝整次」区分。
- 无合法重选目标：沿用既有「跳过剩余怪物回合」路径（`monsterActionSkipped` + `finishMonsterTurn`），不卡死。
- 待确认：多目标技能在部分几何下合法目标枚举是否需与 AI 选区完全一致（当前按单卡射程 + 同区人数下限过滤）。

## 实现

- `packages/engine/src/battle-monster-retarget.ts`：`finalizeFreeTrinketDuringMonsterTurn`、`chooseMonsterRetargetAfterFreeTrinket`、`legalMonsterRetargetHeroIds`。
- 接入：`battle-free-trinkets.ts`、`core-trinket-free.ts`、`battle-fortunate-armlet.ts`；`command.ts` 的 `resolveChoice`；`battle.ts` pending 类型；`apps/web/src/battle-step.ts` 文案。

## 测试

- `battle-monster-retarget.test.ts`：重选续接、固定骰面、无合法目标跳过、旧命令拒绝。
- `battle-attack-trinkets.test.ts`：Fortunate Armlet 旧命令仍原子拒绝。
- 专项：`pnpm exec vitest run packages/engine/src/battle-monster-retarget.test.ts packages/engine/src/battle-free-trinkets.test.ts`；`pnpm typecheck` 通过。

## 限制

- 不扩未核实饰品；不碰 Rising Threat / Stygian / 最暗 AI / Room 几何 / Boss 技能。
- `skillPrefix` 续接仅在待选快照中保存；免费能力仍不能在 `pending` / `skillPrefix` 开窗期间使用（R26）。
