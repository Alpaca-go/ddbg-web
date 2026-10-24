# Phase 4：Jester / Arbalest / Abomination I 级战斗技能（2026-10-24）

状态：**Abomination / Jester / Arbalest 各七张 I 级已核实、效果可战斗、可替补（R-102 / R-103）。不进 Phase 5，不接 II/III 新图标。**

基线：main `7c48af1`（#289）；Q-101→R-102、Q-102→R-103（2026-10-24）。

规则来源：官方 R19–21 / R29、规格书 §6.5–6.7；R-001 / R-048 / R-095。不使用 FAQ。

## 1. Jester I 级

| 技能           | id                | 接线 | 说明                                          |
| -------------- | ----------------- | ---- | --------------------------------------------- |
| Battle Ballad  | `hero_skill:p118` | 已接 | 既有 Buff / 自身位移路径                      |
| Dirk Stab      | `hero_skill:p106` | 已接 | R-102：`a2e7252e06`→Guard；Ignores = 无视守护 |
| Finale         | `hero_skill:p112` | 已接 | 伤害 + 自身 Push 3                            |
| Harvest        | `hero_skill:p109` | 已接 | 既有流血路径                                  |
| Inspiring Tune | `hero_skill:p121` | 已接 | 压力 −1（自身/目标/邻格）                     |
| Solo           | `hero_skill:p115` | 已接 | 无 Acc；Buff + 自身 Pull                      |
| Slice Off      | `hero_skill:p124` | 已接 | 近战伤害                                      |

`heroHasUnwiredCombatSkills("JESTER")` = false。

## 2. Arbalest I 级

| 技能                | id                | 接线 | 说明                                                         |
| ------------------- | ----------------- | ---- | ------------------------------------------------------------ |
| Battlefield Bandage | `hero_skill:p163` | 已接 | 治疗 + 清流血                                                |
| Blindfire           | `hero_skill:p160` | 已接 | 随机目标伤害                                                 |
| Bola                | `hero_skill:p157` | 已接 | 自身 Push 1 + 目标 Push 2                                    |
| Rallying Flare      | `hero_skill:p166` | 已接 | R-103：`d93aef1e33`→target_hero_or_monster；×2 可选英雄/怪物 |
| Sniper Shot         | `hero_skill:p148` | 已接 | 远程伤害                                                     |
| Sniper’s Mark       | `hero_skill:p154` | 已接 | Mark（2t 为 null 时不放标记，按印刷）                        |
| Suppressive Fire    | `hero_skill:p151` | 已接 | 伤害 + 压力                                                  |

`heroHasUnwiredCombatSkills("ARBALEST")` = false。

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
- `formal-heroes.ts`：`FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS` 移除 JESTER / ARBALEST / ABOMINATION（现 7 名扩展）
- `apps/web/battle-data-plugin.ts`：战役目录打包已核实核心 trio I 级（含 p220）
- `packages/engine/src/core-trio-skills.test.ts`：专项回归

## 5. 裁定

- **R-102**（Q-101）：`a2e7252e06`→Guard；Dirk Stab Ignores 无视守护
- **R-103**（Q-102）：`d93aef1e33`→target_hero_or_monster；Rallying Flare 射程旁 ×N 目标
