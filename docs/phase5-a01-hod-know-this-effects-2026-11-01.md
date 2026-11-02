# A-01 · Heart of Darkness Know This 效果线最小结算

**日期**：2026-11-01  
**基线**：`6f22c1fb`（#469 Ancestor2 Unmake Them All 已合）  
**切片**：P0 A-01 · 单卡单招（`monster_large:p020` slot 1）

## 候选与取舍

| 卡                       | 招                                | 效果线                                                          | 本刀   |
| ------------------------ | --------------------------------- | --------------------------------------------------------------- | ------ |
| `p020` Heart of Darkness | Know This                         | `{target_effects} {stress} +3 , {light} -1`（图标均 confirmed） | **接** |
| `p020` Heart of Darkness | Puncture                          | 伤害为主                                                        | hold   |
| `p020` Heart of Darkness | Dissolution                       | 伤害为主                                                        | hold   |
| `p018` Ancestor 2        | Refashion Them / Embrace Futility | 多效果                                                          | hold   |
| 中途 Boss / Revivify     | —                                 | —                                                               | hold   |

依据：`monster_large` FRONT **p020**、`docs/phase5-final-heart-skills-acc-2026-11-01.md`；规则 R-001 / R-048。

## 本刀接通

- `verified-monster-effects.ts` 增 **`monster_large:p020` slot 1** 计划：`{stress}+3` + `{light}-1`（scope target），签名 `{target_effects}{stress}+3,{light}-1`（对齐 Ghoul slot 3 / Cultist Acolyte 的 light+stress 写法；光照经既有 `targetLightDelta` 作用于全局 `battle.light`）。
- `verified-heart-of-darkness-ranges.ts`：规范化层持久写入 p020 三招 `verified_range` 0–10（修复 #456 后 `writeNormalizedCorebox` 漂掉区间射程的问题）。
- 规范化层经 `writeNormalizedCorebox` 写入 `monster_large.json` 的 `verified_monster_effects` 与 `verified_range`。
- `monster-skill.ts` 对 `p020` slot 1 已有计划时**不再** Acc-only 剥离；经 `applyHeartOfDarknessKnowThis` → `playMonsterSkill` → 多目标 `playMonsterSkillTargets` 结算 Crowded 区命中后压力与火把。
- `heart-of-darkness-skills-acc.ts`：`dungeonUpdated` 对 slot 1 区分「含 verified 效果线」与「效果线 hold」（slot 2/3 仍 hold）。

- `monster-effect-plan.test.ts`：回归计数 +1；区间射程用 `min` 距离参与 `resolveMonsterSkill` 探针。
- `heart-of-darkness-skills-acc.test.ts`：Know This Crowded 命中/落空与计划断言。

## 仍 hold

- 同卡 Puncture / Dissolution；Ancestor2 余招；Gestating Heart / Pit Toss / Revivify。
- `combatReady` 仍 **false**；Room Tile / Phase 6 / 完整 Boss AI。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/data/src/normalize/normalize.test.ts \
  packages/engine/src/monster-effect-plan.test.ts \
  packages/engine/src/boss/heart-of-darkness-skills-acc.test.ts
```
