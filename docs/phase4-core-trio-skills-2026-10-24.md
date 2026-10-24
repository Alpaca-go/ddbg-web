# Phase 4：Jester / Arbalest / Abomination I 级战斗技能（2026-10-24）

状态：**Abomination 七张 I 级已核实技能效果可战斗、可替补；Jester / Arbalest 各六张已接，各一张整卡仍 R-048 拒绝。不进 Phase 5，不接 II/III。**

基线：main `f89cad1`（#288 九面 STAT 入库）。

规则来源：官方 R19–21 / R29、规格书 §6.5–6.7；R-001 / R-048 / R-095。不使用 FAQ。

## 1. Jester I 级

| 技能           | id                | 接线     | 说明                                                           |
| -------------- | ----------------- | -------- | -------------------------------------------------------------- |
| Battle Ballad  | `hero_skill:p118` | 已接     | 既有 Buff / 自身位移路径                                       |
| Dirk Stab      | `hero_skill:p106` | **拒绝** | `icon:a2e7252e06`（`pending_a2e7252e06`）未核实 → Q-101 待确认 |
| Finale         | `hero_skill:p112` | 已接     | 伤害 + 自身 Push 3                                             |
| Harvest        | `hero_skill:p109` | 已接     | 既有流血路径                                                   |
| Inspiring Tune | `hero_skill:p121` | 已接     | 压力 −1（自身/目标/邻格）                                      |
| Solo           | `hero_skill:p115` | 已接     | 无 Acc；Buff + 自身 Pull                                       |
| Slice Off      | `hero_skill:p124` | 已接     | 近战伤害                                                       |

`heroHasUnwiredCombatSkills("JESTER")` = true（缺一张已核实 I 级）。

## 2. Arbalest I 级

| 技能                | id                | 接线     | 说明                                                    |
| ------------------- | ----------------- | -------- | ------------------------------------------------------- |
| Battlefield Bandage | `hero_skill:p163` | 已接     | 治疗 + 清流血                                           |
| Blindfire           | `hero_skill:p160` | 已接     | 随机目标伤害                                            |
| Bola                | `hero_skill:p157` | 已接     | 自身 Push 1 + 目标 Push 2                               |
| Rallying Flare      | `hero_skill:p166` | **拒绝** | `icon:d93aef1e33`（头盔/骷髅斜线）未核实 → Q-102 待确认 |
| Sniper Shot         | `hero_skill:p148` | 已接     | 远程伤害                                                |
| Sniper’s Mark       | `hero_skill:p154` | 已接     | Mark（2t 为 null 时不放标记，按印刷）                   |
| Suppressive Fire    | `hero_skill:p151` | 已接     | 伤害 + 压力                                             |

`heroHasUnwiredCombatSkills("ARBALEST")` = true。

## 3. Abomination I 级

| 技能               | id                | 接线 | 说明                                                                                            |
| ------------------ | ----------------- | ---- | ----------------------------------------------------------------------------------------------- |
| Absolution         | `hero_skill:p217` | 已接 | Self：压力 −1 + 治疗                                                                            |
| Beast’s Bile       | `hero_skill:p214` | 已接 | Blight                                                                                          |
| Manacles           | `hero_skill:p211` | 已接 | Stun + 伤害（姿态行按印刷）                                                                     |
| Rake               | `hero_skill:p223` | 已接 | 兽形 AoE 伤害                                                                                   |
| Rage               | `hero_skill:p226` | 已接 | 兽形伤害 + 自身 Buff                                                                            |
| Slam               | `hero_skill:p229` | 已接 | 兽形伤害 + 位移                                                                                 |
| Transform to Beast | `hero_skill:p220` | 已接 | 双面卡 `hero: null`；出征/替补经 `skillBelongsToFormalHero` 归属 ABOMINATION；背面 Human 同路径 |

`heroHasUnwiredCombatSkills("ABOMINATION")` = false；替补白名单（七张已核实 I 级）已含 `hero_stat:p021:front`。

## 4. 代码触点

- `formal-roster-catalog.ts`：`skillBelongsToFormalHero` / `verifiedLevel1CombatSkillsForHero` / 双面 Transform id
- `formal-heroes.ts`：`FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS` 移除 ABOMINATION（现 9 名）
- `apps/web/battle-data-plugin.ts`：战役目录打包已核实核心 trio I 级（含 p220）
- `packages/engine/src/core-trio-skills.test.ts`：专项回归

## 5. 待确认

- **Q-101**：Jester Dirk Stab `a2e7252e06` 图标语义
- **Q-102**：Arbalest Rallying Flare `d93aef1e33`（英雄/怪物双目标？）图标语义
