# Shuffling Horror · Echoing Disassembly 最小召唤（A-4）

基线 main `9bc9a1e5`（#441 Undulations 已合）。

## 本刀

- 依据 `boss_ability:p033` 原文：怪物姿态轨**未全部填满**时，Shuffling Horror 使用 Echoing Disassembly；召唤 Cultist Priest（`monster_medium:p072`）与 Malignant Growth（`monster_medium:p075`），**已在场存活**则跳过。
- 最暗 quest:p016 中途 Boss 战于 Horror 怪物回合显式命令 `applyShufflingHorrorEchoingDisassembly`（actorId = `monster_large:p017` 实体）；Life/Dodge 从战斗目录读取，姿态占位沿用 `darkest-mid-boss-*` PLACEHOLDER（与 `prepareDarkestMidBossDeployment` 支持怪骨架同构，**非** Room Tile 印刷几何）。
- 成功后 `finishTurn` 消耗行动（对标 Undulations）。
- 更新 p016 `wiringHold`：Undulations + Echoing 召唤已接；Room Tile 正式几何 / `combatReady` / 完整 AI 仍 hold。
- 单测：`packages/engine/src/boss/darkest-shuffling-horror-combat-runtime.test.ts`。

## 仍 hold

- Pit Toss d10、White Cell 传送、Mammoth / Templars 技能、最终战形态、完整两行动 AI 选招、Room Tile 正式几何。
- `darkest_boss_abilities` / encounter `combatReady: false`（未改）。

## 本机闸门

```bash
pnpm typecheck
pnpm exec vitest run packages/engine/src/boss/darkest-shuffling-horror-combat-runtime.test.ts
```
