# Phase 4：Grave Robber / Occultist 属性与防御（R-095 / Q-97 confirmed）

状态：**Kyries 于 2026-10-18 在聊天确认 Q-97 为 LIMITED per-card mappings（同 R-088/R-094）。六面属性与限定防御已入库；正式白名单/网页目录已扩至四名额外替补。GR I 级七战斗技能已另接（见[GR 技能记录](phase4-grave-robber-skills-2026-10-18.md)）；Pilfer 因 Q-98 未接；Occ 技能与 Dark Ritual 仍未接线。**

## 1. 基线与来源

基线 main tip `87e9773`（#238 已合并：Life/Dodge/Speed print-locked，Q-97 曾 pending）。本主题按 Kyries 限定映射入库，不改全局词典，不裁定 Q-79/Q-80，不进 Phase 5，不改存档 schema / 命令名。

规则来源：官方 R10 / R21 / R29 / R31 / R33；规格书 §2.4 / §4.6 / §6.5 / §7 / §9.4；R-001 / R-008 / R-039 / R-048 / R-088 / R-094 / **R-095**。不使用 FAQ。

## 2. 印刷核实：Life / Dodge / Speed（不变）

| 规范化 id              | 英雄/等级        | Life | Dodge | Speed |
| ---------------------- | ---------------- | ---- | ----- | ----- |
| `hero_stat:p017:front` | GRAVE ROBBER I   | 11   | 1     | 3     |
| `hero_stat:p017:back`  | GRAVE ROBBER II  | 15   | 2     | 3     |
| `hero_stat:p018:front` | GRAVE ROBBER III | 19   | 3     | 3     |
| `hero_stat:p019:front` | OCCULTIST I      | 10   | 1     | 2     |
| `hero_stat:p019:back`  | OCCULTIST II     | 14   | 2     | 2     |
| `hero_stat:p020:front` | OCCULTIST III    | 18   | 3     | 3     |

批准日期：`kyries_review_2026-10-18`。`attributesVerified=true`。

## 3. 限定防御映射（R-095）

Kyries 确认**不是**全局词典升级；仅下列卡面位置：

| iconId       | 限定含义    | 获批位置                              | 明确不覆盖                     |
| ------------ | ----------- | ------------------------------------- | ------------------------------ |
| `e61ed317de` | Blight 抗性 | GR II 左#1；GR III 左#2；Occ III 左#2 | 其他卡任意位置                 |
| `8cbe7d6703` | Debuff 抗性 | Occ I 左栏唯一抗性                    | **Jester I 同 hash（未核实）** |
| `a8c4b25b4e` | Debuff 抗性 | Occ II 左#2（Bleed 之后）             | 其他卡                         |

完整左右栏（右栏均空）：

| 面      | 左栏（抗性）                          |
| ------- | ------------------------------------- |
| GR I    | Blight（confirmed `40bb356305`）      |
| GR II   | Blight（`e61ed317de`）、Debuff        |
| GR III  | Bleed、Blight（`e61ed317de`）、Debuff |
| Occ I   | Debuff（`8cbe7d6703`）                |
| Occ II  | Bleed、Debuff（`a8c4b25b4e`）         |
| Occ III | Bleed、Blight（`e61ed317de`）、Debuff |

词典 v1.8 三枚图标仍 `unreviewed`；整卡 `verification.unverified` 原因保留。

## 4. 正式目录与仍缺接线

正式 `virtual:quest-battle-data` = **24** 属性面 / **112** 技能（原 18/98 + GR/Occ 各三面属性 + 各七张 I 级转录技能）。旧六英雄目录保留为 `quest-battle-data-v2`（18/98）；五英雄 `…-v1`（15/91）；沙盒四人不变。

引擎白名单增加 `GRAVE ROBBER` / `OCCULTIST`。全灭后可准备四名已核实额外：`{BOUNTY HUNTER, PLAGUE DOCTOR, GRAVE ROBBER, OCCULTIST}`，相对驿站 III 余额 4 已齐。

**仍未接线（保持门控，不发明效果）：**

| 英雄         | I 级技能运行时                      | 村庄能力                                         |
| ------------ | ----------------------------------- | ------------------------------------------------ |
| GRAVE ROBBER | I 级七技能已接（见 GR 技能记录）    | Pilfer — Draw `{icon:79084a2922}`（Q-98 待确认） |
| OCCULTIST    | 七张转录通过 ≠ 效果已接通；逐卡待开 | Dark Ritual — 复合压力/治疗行，未接运行时        |

目录仅要求七张 I 级 `verification.unverified=false`；不因本轮属性批准假装技能/村庄完整可用。

## 5. 验收

- R-095 / Q-97 confirmed；规范化六面 + 限定防御；白名单与网页目录扩至八英雄。
- #237 短板测试改为：全灭 + 余额 4 → 准备四名 → `joinPreparedReplacements` 成功；自然死亡下四名额外各自 `createQuestSave`/`loadQuestSave` 往返。
- 本机闸门：typecheck、eslint、完整 Vitest。保持 Phase 4。
