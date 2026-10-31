# Ancestor 1st Form · Time Heals All（最小）

基线 main `ec043e9e`（#446 Gestating Heart Summon 已合）。

## 本刀接通

- 依据 `boss_ability:p034`：「If all Monster Stances are occupied, during his turn, the Ancestor will use the Time Heals All Skill.」
- 最终战形态 `ancestor1` 且 `finalFormSequence.status === "fighting"` 时，于 Ancestor 1（`monster_medium:p105`）**怪物回合**显式命令 `applyAncestor1TimeHealsAll`。
- **前置**：四条怪物姿态轨（`aggressive` / `defensive` / `ranged` / `support`）均被存活怪物占满；否则拒绝（与 Gestating Summon 占位模型一致，`final-monster-*`）。
- **目标**：技能 slot 3 卡面 **Most Wounded**；对存活友方怪物（含 Ancestor / Reflections）复用 `selectMonsterTarget`（同 `prepareMonsterAction` 的 Collected Vestal 友方分支：按伤口数、平手按姿态顺序；不含英雄 Guard/Mark）。
- **治疗**：效果线 **heal 10**（`monster_medium:p105` 目录确认；`wounds = max(0, wounds - 10)`，不超过 Life max）。
- 成功后 `finishTurn`；**先攻洗入 hold**。
- 未改 `darkest_boss_content.json` / 形态 `combatReady`（仍为 false）。**#444 Reflections 反噬、#445/#446 Gestating 未改逻辑**。

## 仍 hold

- Perfect / Imperfect Replication 完整执行、Reflections Guard「at all times」、Absolute Nothingness、Swift Teleportation、Impending Doom、Pit Toss、Room Tile 正式几何、Time Heals All 射程 1 与移动、姿态未满时的自动填槽 AI、Phase 6。

## 验证

- `packages/engine/src/boss/ancestor1-time-heals-all.test.ts`
- `packages/engine/src/boss/ancestor1-reflections-death.test.ts`（回归）

```bash
pnpm typecheck
pnpm exec vitest run packages/engine/src/boss/ancestor1-time-heals-all.test.ts packages/engine/src/boss/ancestor1-reflections-death.test.ts
```
