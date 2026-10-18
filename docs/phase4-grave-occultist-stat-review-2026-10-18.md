# Phase 4：Grave Robber / Occultist 属性与防御核对（诚实部分结果）

状态：**Kyries 本轮选定 Grave Robber + Occultist 作为下一批属性/防御候选。Life/Dodge/Speed 已由印刷 raw 交叉核实；完整左右防御栏仍有未审词典图标，按 R-048 不得臆测命名。两名均未入库、未扩白名单/网页目录。**

## 1. 基线与来源

基线 main tip `c09b94a`（#237 已合并）。正式可用额外替补仍仅为赏金猎人 + 瘟疫医生（R-088 / R-094）。本主题只核对 Kyries 选定的两名核心盒候选，不发明数值或图标，不裁定 Q-79/Q-80，不进 Phase 5，不改存档 schema / 命令名。

规则来源：官方 R10（Life/Dodge/Movement）、R21（抗性/免疫图例）、R29、R31、R33；规格书 §2.4 / §4.6 / §6.5 / §7 / §9.4；R-001 / R-008 / R-039 / R-048 / R-088 / R-094。不使用 FAQ、旧仓库或电子游戏抗性表。

印刷来源（本机只读，不提交）：

- `02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_100x180_Hero_STAT_FRONT.pdf` p17–p20
- 同目录 `DD_EN_COREBOX_CARDS_100x180_Hero_STAT_BACK.pdf` p17 / p19
- raw：`packages/data/extract/corebox/raw/hero_stat.json` 的 `hero_stat:p017`–`p020`
- 词典：`packages/data/dictionary/icon-dictionary-v1.8.json`（不改）

本云环境无印刷 PDF / 图标裁切缓存；坐标与数字均来自已入库 raw JSON。Musketeer 按 R-008 不纳入。

## 2. 印刷核实：Life / Dodge / Speed

Life `9534ad5184`、Dodge `7a472f5d6f`、Speed `4648c9e5ec` 均为词典 confirmed。逐面读数字 span、数移动栏靴子；不套等级递增公式。BACK p18 / p20 为空卡背，不生成属性面。

| 规范化 id（拟）          | 英雄/等级         | 来源                | Life | Dodge | Speed | 数字证据 |
| ------------------------ | ----------------- | ------------------- | ---- | ----- | ----- | -------- |
| `hero_stat:p017:front`   | GRAVE ROBBER I    | FRONT p17           | 11   | 1     | 3     | Life/Dodge 框内唯一数字；三枚靴子 |
| `hero_stat:p017:back`    | GRAVE ROBBER II   | BACK p17            | 15   | 2     | 3     | 同上 |
| `hero_stat:p018:front`   | GRAVE ROBBER III  | FRONT p18           | 19   | 3     | 3     | 同上 |
| `hero_stat:p019:front`   | OCCULTIST I       | FRONT p19           | 10   | 1     | 2     | 同上；两枚靴子 |
| `hero_stat:p019:back`    | OCCULTIST II      | BACK p19            | 14   | 2     | 2     | 同上 |
| `hero_stat:p020:front`   | OCCULTIST III     | FRONT p20           | 18   | 3     | 3     | 三枚靴子（III 升至 3，不可沿用 I/II） |

代表性 bbox（TrimBox mm，原点左上；GR 三面 Life/Dodge/Speed 框一致）：

| 面 | Life | Dodge | Speed（自左至右） |
| -- | ---- | ----- | ----------------- |
| GR I–III | `[33.55,108.01,48.85,123.31]` | `[14.52,107.94,29.96,123.38]` | `[52.05,111.16,62.09,121.21]`、`[64.45,111.16,74.49,121.21]`、`[77.0,111.16,87.04,121.21]` |
| Occ I | `[39.1,108.01,54.4,123.31]` | `[20.07,107.94,35.51,123.38]` | `[57.6,110.91,67.64,120.96]`、`[70.0,110.91,80.04,120.96]` |
| Occ II | `[39.25,108.01,54.55,123.31]` | `[20.22,107.94,35.66,123.38]` | `[58.0,110.91,68.04,120.96]`、`[71.15,110.91,81.19,120.96]` |
| Occ III | `[33.55,108.01,48.85,123.31]` | `[14.52,107.94,29.96,123.38]` | `[52.05,110.66,62.09,120.71]`、`[64.45,110.66,74.49,120.71]`、`[77.0,110.66,87.04,120.71]` |

英雄属性 schema 仅含 Life / Dodge / Speed；印刷属性卡无独立 Stress / Protection 字段可入库（与赏金猎人 / 瘟疫医生先例一致）。

## 3. 左右防御栏（R21 / R-048）

抗性/免疫完整框按既有守门：`Resistances        Immunities` 标签与 `Hamlet Skill:` 之间、按中线分左右栏；职业徽记 `61fd969d50`、死门骰槽、装饰不算防御。

### 3.1 已由 confirmed 图标支持的部分

| 面 | 左栏（抗性） | 右栏（免疫） | 词典状态 |
| -- | ------------ | ------------ | -------- |
| GR I `p017:front` | `40bb356305` → Blight | 空 | confirmed |
| GR II `p017:back` | `e61ed317de`（未审）、`de6f50b39b` → Debuff | 空 | 见 §3.2 |
| GR III `p018:front` | `b942cddccd` → Bleed、`e61ed317de`（未审）、`de6f50b39b` → Debuff | 空 | 见 §3.2 |
| Occ I `p019:front` | `8cbe7d6703`（未审） | 空 | 见 §3.2 |
| Occ II `p019:back` | `b942cddccd` → Bleed、`a8c4b25b4e`（未审） | 空 | 见 §3.2 |
| Occ III `p020:front` | `b942cddccd` → Bleed、`e61ed317de`（未审）、`de6f50b39b` → Debuff | 空 | 见 §3.2 |

六面右栏均为空。GR I 是唯一防御栏全部图标已 confirmed 的面。

### 3.2 阻断入库的未审图标（待 Kyries 限定批准）

按 R-088 / R-094 先例，未审图标可在**具体 id + face + 左右栏位置**做限定解释，不改全局词典、不清除整卡 `verification.unreviewed`。本环境无卡面图像，**不**按 bbox 尺寸、电子游戏抗性或 FAQ 猜测含义。

| iconId | 词典 v1.8 | 出现位置（左栏，按横向顺序） | 需要 Kyries 限定映射的含义 |
| ------ | --------- | ---------------------------- | -------------------------- |
| `e61ed317de` | unreviewed `unknown_e61ed317de` | GR II 第一枚；GR III 第二枚；Occ III 第二枚 | 待目视对照 R21 后限定命名 |
| `8cbe7d6703` | unreviewed `unknown_8cbe7d6703` | Occ I 唯一抗性 | 待目视；无此映射则 Occ I 条件防御无法成立 |
| `a8c4b25b4e` | unreviewed `unknown_a8c4b25b4e` | Occ II 第二枚（Bleed 之后） | 待目视对照 R21 后限定命名 |

坐标（供本机渲染复核）：

| 位置 | iconId | bbox |
| ---- | ------ | ---- |
| GR II 左栏 #1 | `e61ed317de` | `[19.4,136.88,24.34,142.52]` |
| GR III 左栏 #2 | `e61ed317de` | `[22.93,136.88,27.87,142.52]` |
| Occ I 左栏 #1 | `8cbe7d6703` | `[22.22,136.52,28.57,143.23]` |
| Occ II 左栏 #2 | `a8c4b25b4e` | `[25.75,136.52,32.46,143.23]` |
| Occ III 左栏 #2 | `e61ed317de` | `[22.93,136.88,27.87,142.52]` |

关联待确认：**Q-97**（pending）。在 Kyries 对上表三枚图标给出与 R-088/R-094 同级的限定批准之前，不写 `attributesVerified`、不扩 `replacementHeroCandidates` / `battle-data-plugin`、不记 R-095。

## 4. I 级技能与村庄（本轮不接线）

规范化 `hero_skill.json` 中两名 I 级技能均为 7/7、`verification.unverified=false`（转录状态，≠效果已接通）：

| 英雄 | I 级 id（每三页一技能） | 村庄能力原文（属性卡，未批准效果） |
| ---- | ----------------------- | ---------------------------------- |
| GRAVE ROBBER | p169 / p172 / p175 / p178 / p181 / p184 / p187 | Hamlet Skill: Pilfer — Draw a `{icon:79084a2922}`（该图标仍 unreviewed） |
| OCCULTIST | p190 / p193 / p196 / p199 / p202 / p205 / p208 | Hamlet Skill: Dark Ritual — 复合压力/治疗行，未接运行时 |

赏金猎人 / 瘟疫医生先例：属性+防御入库后，仍须逐卡技能与村庄能力接通，才扩正式目录。本轮即使属性获批，也不发明技能效果接线。

## 5. 本轮实现边界

- **未改** `approvedHeroStats` / `higherHeroDefenceApprovals` / 引擎白名单 / 网页目录 / `hero_stat.json`。
- 正式额外候选仍为 `{BOUNTY HUNTER, PLAGUE DOCTOR}`；全灭后可准备人数仍为 2，相对驿站 III 余额 4 仍缺 2。
- 测试锁：`replacement-candidates` 继续排除 GRAVE ROBBER / OCCULTIST。
- 下一步（Kyries 目视批准 Q-97 后）：按 R-088/R-094 模式入库六面 + 限定防御 → 记 R-095 → 再开主题接技能/村庄 → 最后扩白名单与 `virtual:quest-battle-data`。

## 6. 验收

文档与裁定索引更新；无生产数据/引擎改动。本机闸门见提交记录。保持 Phase 4。
