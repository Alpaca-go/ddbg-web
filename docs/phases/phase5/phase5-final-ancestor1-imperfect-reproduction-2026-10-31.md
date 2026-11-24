# Ancestor 1st Form · Imperfect Reproduction 召唤最小路径

依据 `boss_ability:p034`（姿态轨未满时 Ancestor 继续行动直至填满；本刀只提供第二填槽召唤命令，不做完整 AI）与 `monster_medium:p105` slot 2 已核实效果线：**stress +2**（Most Stressed 存活英雄）+ **summon Imperfect Reflection**（R-001、R-048）。

## 本刀接通

- 最终战形态 `ancestor1` 且 `finalFormSequence.status === "fighting"` 时，于 Ancestor 1（`monster_medium:p105`）**怪物回合**显式命令 `applyAncestor1ImperfectReproduction`。
- **前提**：须有空怪物姿态槽；四槽皆占则拒绝（满槽应走 `applyAncestor1TimeHealsAll`，本命令不顶替）。
- **压力**：卡面 Most Stressed 目标经 `selectMonsterTarget`（slot 2）；效果线 **+2** 经 `applyPassiveHero`（含 R-002 被动修正与 `resolveBattlePressure`）。无存活英雄时 `selectMonsterTarget` 拒绝（与常规战斗目标选择一致，不发明跳过）。
- **召唤**：下一可用怪物姿态位写入 Imperfect Reflection（`monster_medium:p109`）；Life/Dodge 取自战斗目录；**`guard: true`** + 空 `statusStacks: []`，并经 `withAncestor1ReflectionsGuardState`（#448）。
- 同 `p109` 已在场仍允许再召唤（卡面未声明唯一）。
- 成功后 `finishTurn`（先攻洗入 hold）。
- **未**改各形态 `combatReady`；**未**破坏 #444 Imperfect 死亡反噬、#447 Time Heals All、#448 Guard 常驻、#449 Perfect Replication。

## 仍 hold

- Imperfect Reproduction 上 Acc/Crit 对 Most Stressed 的攻击结算、Perfect Replication 攻击 hold、完整自动选招 AI、Absolute Nothingness、Swift Teleportation、Impending Doom、Pit Toss、Room Tile 正式几何、Phase 6。

## 验证

- `packages/engine/src/boss/ancestor1-imperfect-reproduction.test.ts`
- 回归：`ancestor1-perfect-replication.test.ts`、`ancestor1-time-heals-all.test.ts`、`ancestor1-reflections-death.test.ts`、`ancestor1-reflections-guard.test.ts`

```bash
pnpm exec vitest run \
  packages/engine/src/boss/ancestor1-imperfect-reproduction.test.ts \
  packages/engine/src/boss/ancestor1-perfect-replication.test.ts \
  packages/engine/src/boss/ancestor1-time-heals-all.test.ts \
  packages/engine/src/boss/ancestor1-reflections-death.test.ts \
  packages/engine/src/boss/ancestor1-reflections-guard.test.ts
```
