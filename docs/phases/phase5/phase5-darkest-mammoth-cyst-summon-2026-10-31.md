# Mammoth Cyst · Summon White Cell Stalk 最小召唤（A-4）

基线 main `cbaabb80`（#442 Echoing 已合）。

## 本刀

- 依据 `boss_ability:p030` 原文：场上**没有** White Cell Stalk 时，Mammoth Cyst **代替 Skill** 召唤一只（`monster_medium:p104`）；已在场则拒绝。
- 最暗 quest:p018 中途 Boss 战于 Mammoth 怪物回合显式命令 `applyMammothCystSummonWhiteCell`（actorId = `monster_large:p016` 实体）；Life/Dodge 从战斗目录读取，姿态占位沿用 `darkest-mid-boss-*`（与部署骨架同构，**非** Room Tile 印刷几何）。
- 成功后 `finishTurn` 消耗行动（「instead of using a Skill」）。
- 更新 p018 `wiringHold`：Summon White Cell 已接；White Cell Teleport / Pit Toss / Room Tile / `combatReady` / 完整 AI 仍 hold。
- 单测：`packages/engine/src/boss/darkest-mammoth-cyst-combat-runtime.test.ts`。

## 仍 hold

- White Cell Stalk **Teleport**（`boss_ability:p031` / d10 落点）、Templar Pit Toss、Shuffling Horror 再改、最终战、完整 AI、Room Tile 正式几何、召唤先攻洗入。
- `darkest_boss_abilities` / encounter `combatReady: false`（未改）。

## 本机闸门

```bash
pnpm typecheck
pnpm exec vitest run packages/engine/src/boss/darkest-mammoth-cyst-combat-runtime.test.ts packages/engine/src/boss/darkest-mid-boss-runtime.test.ts
```
