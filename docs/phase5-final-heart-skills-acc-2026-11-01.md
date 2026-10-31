# 最终战 Heart of Darkness · 三招 Acc 最小结算

基线 main `8e1da832`（#455 Ancestor2 Acc 已合）。

依据 `boss_ability:p037` 与 `monster_large:p020` 卡面已入库字段（R-001、R-048）。

## 卡面字段（`monster_large:p020`）

| Slot | 名称 | 目标 | 射程 | Acc | Crit | 伤害（stats 行） |
|------|------|------|------|-----|------|------------------|
| 1 | Know This | Crowded | 0–10（`verified_range`） | 12 | 1 | 3 / 2（四目标图标） |
| 2 | Puncture | Closest | 0–10（`verified_range`） | 12 | 2 | 18 / 14 |
| 3 | Dissolution | Furthest | 0–10（`verified_range`） | 12 | 2 | 18 / 14 |

Life **250**；Dodge **3**（卡面 footer）。

## 本刀接通

- 最终战形态 `heartOfDarkness` 且 `finalFormSequence.status === "fighting"` 时，于 Heart of Darkness（`monster_large:p020`）**怪物回合**显式命令：
  - `applyHeartOfDarknessKnowThis`
  - `applyHeartOfDarknessPuncture`
  - `applyHeartOfDarknessDissolution`
- **目标**：各 slot 卡面 `target` 经 `selectMonsterTarget`（与 `prepareMonsterAction` 一致）；Know This 多目标走既有 `playMonsterSkill` → `playMonsterSkillTargets`。
- **Acc/Crit/伤害**：经 `playMonsterSkill` + `resolveMonsterSkill`；`monster-skill.ts` 对 `p020` 无 `verified_monster_effects` 时剥离 `effect_lines`（同 `p018` / `p003` slot 3 Acc-only 门），只结算攻击骰。
- 卡面射程 **0–10**（numeric 为 null）已写入三招 `verified_range`（`print_front` min/max 0/10），使区间射程可核对而不自造距离整数。
- 成功后经 `recordMonsterSkill` → `finishTurn`（含 #451 Impending Doom 行动后落骰钩子）。
- **未**改各形态 `combatReady`；**未**接 Impending Doom d10→技能自动映射。

## 仍 hold

- 三招效果线（压力/光照/流血/眩晕/枯萎等）至 `verified_monster_effects` 入库前不结算。
- Impending Doom 技能映射、完整姿态选招 AI、Pit Toss、Room Tile 正式几何、Phase 6。

## 验证

- `packages/engine/src/boss/heart-of-darkness-skills-acc.test.ts`
- 回归：`heart-of-darkness-impending-doom.test.ts`

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/engine/src/boss/heart-of-darkness-skills-acc.test.ts \
  packages/engine/src/boss/heart-of-darkness-impending-doom.test.ts
```
