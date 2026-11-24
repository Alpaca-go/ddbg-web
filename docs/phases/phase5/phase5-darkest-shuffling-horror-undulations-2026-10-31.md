# Shuffling Horror · Undulations 最小技能（A-4）

基线 main `4bddcfd0`（#440 已合）。

## 本刀

- 依据 `boss_ability:p033` 原文：洗混全部 Hero Stance Cards，从 front（aggressive）起随机放回。
- 最暗 quest:p016 中途 Boss 战在 `deployDarkestMidBoss` → `startBattle` 后，于 Shuffling Horror 怪物回合显式命令 `applyShufflingHorrorUndulations`（actorId = Horror 实体）。
- 更新 `darkestMidBossWiringHold`（p016）：Undulations 已接；Echoing Disassembly、召唤执行、Room Tile 几何、`combatReady` 仍 hold。
- 聚焦单测：`packages/engine/src/boss/darkest-shuffling-horror-combat-runtime.test.ts`。

## 仍 hold

- Echoing Disassembly（Cultist Priest / Malignant Growth 召唤与几何）。
- Pit Toss d10、White Cell 传送、Mammoth / Templars 技能、最终战形态、完整两行动 AI 选招。
- `darkest_boss_abilities` / encounter `combatReady: false`（未改）。

## 本机闸门

```bash
pnpm typecheck
pnpm exec vitest run packages/engine/src/boss/darkest-shuffling-horror-combat-runtime.test.ts
```
