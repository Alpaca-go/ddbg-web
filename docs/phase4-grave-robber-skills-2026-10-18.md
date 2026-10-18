# Phase 4：Grave Robber I 级战斗技能与 Pilfer（R-096 / Q-98）

状态：**I 级七战斗技能效果已接线；Pilfer 按 R-096 限定命名接通「Draw a Loot Token」抽取；翻面结算停在 Q-99。`FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS` 已移除 GRAVE ROBBER，仅余 OCCULTIST。Occultist 未动。**

## 1. 基线与来源

基线 main tip `6a8a87b`（#242：GR I 级七技能；Pilfer 曾停 Q-98）。本主题记录 Kyries 对 Q-98 的 LIMITED 裁定（R-096）并接通 Pilfer 抽取，不裁定 Q-79/Q-80，不进 Phase 5。

规则来源：官方 R19–21 / R29 / R33 / R-047；规格书 §4.1 / §6.4 / §6.5–6.7 / §7；R-001 / R-048 / R-095 / **R-096**；规范化 `hero_skill` p169–p187 与 `hero_stat` p017/p018。不使用 FAQ，不提交 PDF/图片，不改全局词典。

## 2. 技能状态表

| 技能               | id                | 接线     | 说明                                                                            |
| ------------------ | ----------------- | -------- | ------------------------------------------------------------------------------- |
| Pick to the Face I | `hero_skill:p169` | 已接     | 既有「Ignores Protection」运行时；无新增注解                                    |
| Lunge I            | `hero_skill:p172` | 已接     | 自身 Pull 2；`verified_damage_bonus` vs Blight +2；公开命令先自身位移再结算目标 |
| Flashing Daggers I | `hero_skill:p175` | 已接     | 双目标共享骰、逐名伤害；效果行空                                                |
| Shadow Fade I      | `hero_skill:p178` | 已接     | 无 Acc；Buff 2t + Push 2；`formOnly` 允许无 Acc 自身位移                        |
| Throw Dagger I     | `hero_skill:p181` | 已接     | 射程 1–2；同框 +1 vs Blight / +2 vs Mark；布局继承目标标记                      |
| Poison Dart I      | `hero_skill:p184` | 已接     | 射程 1–2；Blight 2·3t                                                           |
| Toxin Trickery I   | `hero_skill:p187` | 已接     | 无 Acc；Buff 2t + 换行 Remove Bleed/Blight                                      |
| Pilfer             | Hamlet Skill      | **已接（抽取）** | R-096：`79084a2922`=Loot Token（仅 Pilfer）；抽 1 枚入 claimed；翻面见 Q-99 |

条件伤害新增 `blighted`（读真实 `statusStacks` 中的 Blight，同 Finish Him 的 Stun 模式）。缺合法状态堆整次拒绝（R-048）。

## 3. Pilfer（R-096）

- 公开命令 `useHamletSkill / pilfer`；存档 schema 接受该技能名（同 Scout Ahead / Experimental Vapours 模式）。
- 仅已核实盗墓者 I–III（三面 Pilfer 文案相同）。
- 效果：种子 RNG 从 `lootPool.available` 抽 1 枚 → `claimedIds`；消耗当天行动；不收费、不占建筑。
- 空堆拒绝并引用 Q-99；不发明翻面金币/补给。
- 出征保留既有 `lootPool`（含村庄期间 claimed），不再无条件 `createLootState()` 抹掉（R-047）。
- 词典 `79084a2922` 保持 `unreviewed`；卡面 `verification.reasons` 仍含该图标（LIMITED，不改全局）。

## 4. 名单与 UI

- `FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS` = `["OCCULTIST"]`。
- 网页目录去掉 GR「Pilfer 未接线」标签；Occ 仍标技能效果未接线。

## 5. 验收

专项：数据黄金值 + 引擎每战斗技能 + Pilfer 抽取/拒绝/schema/名单。本机 typecheck、eslint、完整 Vitest。
