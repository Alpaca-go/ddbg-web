# Phase 4：正式开局开放八英雄名录

## 基线

#240 合并 main `1921801`（自然全灭正式存档 + 四名已核实替补入队）。正式目录与替补白名单已是八名；开局入口仍硬编码四核心。

## 选择（门控）

采用 **(a) 可选但标明未接线**：开局四人可从正式八英雄任选（各占一姿态、各三张已转录 I 级技能），与替补白名单同一集合 `FORMAL_HERO_NAMES`。

| 身份                                     | 开局可选 | 战斗技能效果                            | UI                                          |
| ---------------------------------------- | -------- | --------------------------------------- | ------------------------------------------- |
| Crusader / Hellion / Highwayman / Vestal | 是       | 已接                                    | 无额外标签                                  |
| Bounty Hunter                            | 是       | I 级七技能已接（含 Scout Ahead）        | 无额外标签                                  |
| Plague Doctor                            | 是       | I 级七技能与 Experimental Vapours 已接  | 无额外标签                                  |
| Grave Robber                             | 是       | I 级七技能已接；**Pilfer 未接（Q-98）** | 「Pilfer 未接线」；名单仍保留至 Pilfer 接通 |
| Occultist                                | 是       | **未接**（七技能效果 / Dark Ritual）    | 同上                                        |

不采用 (b)「仅替补可选」：替补路径本就可装备未接线转录技能，开局与替补门槛对齐更一致；效果仍走 R-048 拒绝，**不会静默发明数值**。若禁用未接线技能的装备，GR/Occ 无法凑齐三槽，等于实质退回 (b)。

仍排除：Jester / Arbalest / Abomination（无 `attributesVerified`，规范化属性亦未入库）。不裁定 Q-79/Q-80，不进 Phase 5。未改存档 schema / 命令名。

## 实现

- `packages/engine/src/formal-heroes.ts`：共享 `FORMAL_HERO_NAMES`、`FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS`
- `createCoreDungeonQuest`：身份校验改为正式八名，不再限四核心
- `replacementHeroCandidates`：复用同一 `isFormalHeroName`
- 网页 `DungeonQuest`：每席可选正式八名；技能下拉改用 `questBattleData`；GR/Occ 标明未接线
- `battle-data-plugin`：当前正式目录名表对齐 `FORMAL_HERO_NAMES`（旧 v1/v2 子集保留）

## 缺口（诚实）

- GR：I 级七战斗技能已接；Pilfer 因 Q-98 未接，仍在未接线名单
- Occ：I 级技能效果与 Dark Ritual 未接
- 战斗沙盒目录仍仅四核心（`virtual:battle-data`），本主题不扩沙盒

## 测试

- `formal-roster-entry.test.ts`：名录 8；BH/PD 与 GR/Occ 开局；存档往返；目录外拒绝
- `dungeon-quest-entry.test.ts`：额外四人开局编队

下一主题优先 Occ I 级技能与 Dark Ritual，或 Kyries 裁定 Q-98 后接 Pilfer。见[GR 技能记录](phase4-grave-robber-skills-2026-10-18.md)。
