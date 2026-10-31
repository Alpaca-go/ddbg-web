# 最终战 Ancestor 2 · 三招 Acc 最小结算

基线 main `2a5f1d31`（#454 Absolute Nothingness 已合）。

依据 `boss_ability:p035` 与 `monster_large:p018` 卡面已入库字段（R-001、R-048）。

## 卡面字段（`monster_large:p018`）

| Slot | 名称 | 目标 | 射程 | Acc | Crit | 伤害（stats 行） |
|------|------|------|------|-----|------|------------------|
| 1 | Refashion Them | Crowded | 1 | 12 | 2 | 16 / 9（双目标图标） |
| 2 | Unmake Them All | Furthest | 2 | 12 | 1 | 8 / 4 |
| 3 | Embrace Futility | Closest | 0 | 12 | 0 | 4 / 2 |

## 本刀接通

- 最终战形态 `ancestor2` 且 `finalFormSequence.status === "fighting"` 时，于 Ancestor 2（`monster_large:p018`）**怪物回合**显式命令：
  - `applyAncestor2RefashionThem`
  - `applyAncestor2UnmakeThemAll`
  - `applyAncestor2EmbraceFutility`
- **目标**：各 slot 卡面 `target` 经 `selectMonsterTarget`（与 `prepareMonsterAction` 一致）；Refashion 双目标走既有 `playMonsterSkill` → `playMonsterSkillTargets`。
- **Acc/Crit/伤害**：经 `playMonsterSkill` + `resolveMonsterSkill`；`monster-skill.ts` 对 `p018` 无 `verified_monster_effects` 时剥离 `effect_lines`（同 `monster_large:p003` slot 3 Acc-only 门），只结算攻击骰。
- 成功后经 `recordMonsterSkill` → `finishTurn`（含 #452 Swift Teleportation 钩子）。
- **未**改各形态 `combatReady`；**未**改 Absolute Nothingness / Impending Doom 映射。

## 仍 hold

- 三招效果线（流血/压力/光照/减益/位移等）至 `verified_monster_effects` 入库前不结算。
- 完整姿态选招 AI、Impending Doom 技能映射、Pit Toss、Room Tile 正式几何、Phase 6。

## 验证

- `packages/engine/src/boss/ancestor2-skills-acc.test.ts`
- 回归：`ancestor2-swift-teleportation.test.ts`、`ancestor2-absolute-nothingness.test.ts`

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/engine/src/boss/ancestor2-skills-acc.test.ts \
  packages/engine/src/boss/ancestor2-swift-teleportation.test.ts \
  packages/engine/src/boss/ancestor2-absolute-nothingness.test.ts
```
