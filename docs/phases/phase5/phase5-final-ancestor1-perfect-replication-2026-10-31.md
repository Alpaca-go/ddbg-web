# Ancestor 1st Form · Perfect Replication 召唤最小路径

依据 `boss_ability:p034`（姿态轨未满时 Ancestor 继续行动直至填满；本刀只提供填槽召唤命令，不做完整 AI）与 `monster_medium:p105` slot 1 已核实效果线：**light −1** + **summon Perfect Reflection**（R-001、R-048）。

## 本刀接通

- 最终战形态 `ancestor1` 且 `finalFormSequence.status === "fighting"` 时，于 Ancestor 1（`monster_medium:p105`）**怪物回合**显式命令 `applyAncestor1PerfectReplication`。
- **前提**：须有空怪物姿态槽；四槽皆占则拒绝（满槽应走 `applyAncestor1TimeHealsAll`，本命令不顶替）。
- **Torch**：战斗 `battle.light` 按效果线 **−1**，钳制 **0–5**（与 `battle-skill-status` 一致；不发明探索层 light 同步）。
- **召唤**：下一可用怪物姿态位写入 Perfect Reflection（`monster_medium:p106`）；Life/Dodge 取自战斗目录；**`guard: true`** + 空 `statusStacks: []`，并经 `withAncestor1ReflectionsGuardState`（#448）。
- 同 `p106` 已在场仍允许再召唤（卡面未声明唯一；与 Gestating Heart 随机召唤一致）。
- 成功后 `finishTurn`（先攻洗入 hold）。
- **未**改各形态 `combatReady`；**未**破坏 #444 Imperfect 死亡反噬、#447 Time Heals All、#448 Guard 常驻。

## 仍 hold

- Perfect Replication 上 Acc/Crit 对 Closest 的攻击结算、Imperfect Reproduction、完整自动选招 AI、Absolute Nothingness、Swift Teleportation、Impending Doom、Pit Toss、Room Tile 正式几何、Phase 6。

## 验证

- `packages/engine/src/boss/ancestor1-perfect-replication.test.ts`
- 回归：`ancestor1-time-heals-all.test.ts`、`ancestor1-reflections-death.test.ts`、`ancestor1-reflections-guard.test.ts`

```bash
pnpm exec vitest run \
  packages/engine/src/boss/ancestor1-perfect-replication.test.ts \
  packages/engine/src/boss/ancestor1-time-heals-all.test.ts \
  packages/engine/src/boss/ancestor1-reflections-death.test.ts \
  packages/engine/src/boss/ancestor1-reflections-guard.test.ts
```
