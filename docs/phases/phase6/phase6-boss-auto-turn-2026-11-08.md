# Phase 6：中途 Boss 一键自动回合（2026-11-08）

状态：**引擎已接**（Q-158 的 Phase 6 部分）。新增 `autoMonsterTurn` 命令，把「按姿态 d10 选招 → 定位 → 按目标优先级选目标 → 施放」串成一次公开命令；玩家仍需决定的地方（怪物落点、位移方向）原样返回 `pendingChoice`。UI 按钮留到 S4 解冻后接。

## 起点核实

- 三只中途 Boss 的姿态 + d10 选招表已在 `verified-large-monster-fields.ts` / `verified-monster-stances.ts` 入库，`prepareMonsterAction` 已经能用它自动选招与选目标。
- 逐招实测（Templars 6 招、Shuffling Horror 3 招、Mammoth 3 招）：`prepareMonsterAction → moveMonsterToRange → playMonsterSkill` 基本都能跑通。
- 两个特例：
  - **Mammoth Revivify**（Self）由 `prepareMonsterAction` 里的 Mammoth 分支走 `applyMammothCystRevivify`，不经过通用 `playMonsterSkill`；
  - **Templar Warlord Revelation** 的移动会产生 `monsterMove` 待选（落点由被选为目标的玩家决定），不能替玩家选。

## 实现

- `packages/engine/src/battle-monster-auto.ts`：`autoMonsterTurn(state, { actorId })`
  1. 若不是当前怪物回合 → 拒绝；
  2. 没有 `monsterAction` → 调 `prepareMonsterAction`（含姿态 d10 选招、目标优先级、Self 技能分支）；Self 技能已结算并结束回合时直接返回；
  3. 未定位 → 调 `moveMonsterToRange`；出现待选则原样返回，不替玩家选；
  4. 调 `playMonsterSkill`。
- `command.ts`：命令联合类型 + 分发；`packages/data/src/quest-save.ts`：`savedCommandSchema` 允许该命令（存档可回放）。
- 既有 `applyTemplar*` / `applyShufflingHorror*` / `applyMammothCyst*` 显式命令保留，用作测试与回退。

## 测试

`packages/engine/src/monster-auto-turn.test.ts`（5 条）：

- Templars I：Impaler 与 Warlord 的回合都能一键跑完（需要落点时停在 `monsterMove` 待选，玩家选完继续）；
- Shuffling Horror / Mammoth Cyst：自动回合完成；
- Mammoth Revivify：选招命中 slot 3 时走自身技能分支并结束回合；
- 需要玩家决定的位移：返回 `pendingChoice`、不施放、不结束回合；
- 非当前怪物回合：拒绝。

相关回归：`quest-save`、`campaign-quest-save`、`battle-monster`、`battle-monster-retarget`、`monster-stance`、`monster-skill` 全部通过；`pnpm typecheck` 通过。

## 边界

- 不实现目标/位移/特技的额外「AI 策略」：选招用已批准的姿态 d10 表，目标用既有卡面优先级（Closest / Furthest / Crowded）。
- 需要玩家决定的选择（落点、位移方向、Shuffle 方向）不替玩家选。
- 不改 Boss 部署、战斗准入或既有显式命令。

## UI（2026-11-08 已接）

- `apps/web/src/battle-view.tsx` 的怪物回合控制区新增按钮：
  - 未选招时显示「怪物自动回合」，已有选招时显示「自动完成怪物回合」；
  - 只在当前怪物卡有 `stanceGroups`、且不是 The Invokers 强制移动时出现（否则隐藏，避免给出会失败的按钮）；
  - 需要玩家选落点时，命令返回 `pendingChoice`，现有待选 UI 照常处理，选完再点一次自动按钮收尾。
- `apps/web/e2e/formal-battle.spec.ts` 的收尾循环优先点自动按钮，两条真实战斗都覆盖了这条路径（1 passed / 48s）。
- S4 的骰盘/结束回合 UI 未动。
