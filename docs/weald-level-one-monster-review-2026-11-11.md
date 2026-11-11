# Weald I 级普通怪物审阅稿

状态：**属性、技能、抗性/免疫与大型卡灰栏均已确认（R-230、R-232）**。召唤部署待接线；其他地点卡面与几何仍在 Q-186 中待审。
Life 对照核心规则书 R24；已确认的运行语义由 R-230、R-232 单独登记，原始图标的全局命名记录保持原状。
来源为当前版 Weald monsters_medium FRONT/BACK p1–14、monster_large FRONT/BACK p1–2，不使用 FAQ。

## 范围与实体卡

| 怪物             | medium 实体页 | 实体数 | 战斗卡                                |
| ---------------- | ------------- | -----: | ------------------------------------- |
| Ectoplasm        | p1–3          |      3 | medium p1                             |
| Large Ectoplasm  | p4、p5        |      2 | large p1–2；medium 两张都是大型参考卡 |
| Rabid Gnasher    | p6–8          |      3 | medium p6                             |
| Fungal Scratcher | p9–11         |      3 | medium p9                             |
| Fungal Artillery | p12–14        |      3 | medium p12                            |

共 5 种、14 张当地牌堆实体卡。large 的两张战斗板不是额外加入牌堆的两份。卡背均为通用红门，等级和字段读取正面。
Brigand Matchman p23 是 Boss 相关单位；Crone、Unclean Giant、Hateful Virago 是高等级条目，本批不接入。

## 属性与姿态确认

| 怪物             | Life | Dodge | Speed | 姿态选招                                                                        |
| ---------------- | ---: | ----: | ----: | ------------------------------------------------------------------------------- |
| Ectoplasm        |    6 |     0 |     1 | A/D/R/S：1（1–5）、2（6–8）、3（9–10）                                          |
| Large Ectoplasm  |   22 |     0 |     1 | 首组 A/D/R/S：1（1–4）、2（5–8）、3（9–10）；右侧灰栏为双格卡面延伸，不参与选招 |
| Rabid Gnasher    |    7 |     2 |     3 | A/D/R/S：1                                                                      |
| Fungal Scratcher |   14 |     0 |     1 | A/D：1（1–5）、2（6–10）；R/S：3                                                |
| Fungal Artillery |    9 |     1 |     1 | A/D：3；R/S：1（1–5）、2（6–10）                                                |

A/D/R/S 分别为 Aggressive、Defensive、Ranged、Support。Speed 来自当前印刷头部蓝框靴印，不是黄色 Dodge 格里的数字。
抗性/免疫按 R-232 逐卡核准，原始图标引用继续保留。

## 技能确认

R-230：Crit 标签是暴击阈值，旁数为暴击伤害；Acc 标签是命中阈值，旁数为普通伤害。d10 不大于相应阈值时读取对应伤害，仍应用核心 Dodge、光照等修正。射程与最多目标按下表确认。

| 怪物／技能                         | Crit 标签/旁数 | Acc 标签/旁数 | 射程／最多目标 | 印刷目标文字与效果                                                                  |
| ---------------------------------- | -------------- | ------------- | -------------- | ----------------------------------------------------------------------------------- |
| Ectoplasm 1 Slime                  | 1 / 7          | 9 / 4         | 1 / 1          | Closest；无额外效果行                                                               |
| Ectoplasm 2 Cytokinesis            | 1 / 2          | 9 / 1         | 1 / 1          | Closest；召唤 1 Ectoplasm                                                           |
| Ectoplasm 3 Ectoplasmic Profusion  | 1 / 2          | 9 / 1         | 1 / 3          | Crowded；召唤 1 Large Ectoplasm，并给全体命中目标压力 +1                            |
| Large Ectoplasm 1 Big Slime        | 1 / 9          | 9 / 6         | 1 / 1          | Closest；无额外效果行                                                               |
| Large Ectoplasm 2 Slime Smack      | 3 / 6          | 9 / 3         | 1 / 2          | Crowded；眩晕 1t                                                                    |
| Large Ectoplasm 3 Cytokinesis      | 1 / 6          | 9 / 3         | 1 / 1          | Closest；召唤 1 Large Ectoplasm                                                     |
| Rabid Gnasher 1 Rabid Rush         | 2 / 4          | 9 / 2         | 2 / 1          | Furthest；自身 Pull 2；目标流血 1/3t，并给予疾病                                    |
| Fungal Scratcher 1 Groping Swipe   | 1 / 7          | 8 / 4         | 1 / 1          | Closest；无额外效果行                                                               |
| Fungal Scratcher 2 Rend the Marked | 1 / 6          | 9 / 4         | 1 / 1          | Marked → Closest：先选被 Mark 的英雄，无人被 Mark 才选最近英雄；对 Mark 单位伤害 +3 |
| Fungal Scratcher 3 Harmless Swipe  | 0 / 6          | 5 / 3         | 2 / 1          | Furthest；自身 Pull 1                                                               |
| Fungal Artillery 1 Mark Prey       | 1 / 2          | 10 / 1        | 2 / 1          | Closest；目标 Mark 2t、Debuff 2t                                                    |
| Fungal Artillery 2 Rain of Blight  | 1 / 2          | 10 / 1        | 2 / 2          | Crowded；目标腐蚀 2/2t，并给予疾病                                                  |
| Fungal Artillery 3 Escape Cloud    | 1 / 2          | 10 / 1        | 1 / 1          | Closest；自身 Push 2；目标腐蚀 1/3t                                                 |

## 核对材料与确认范围

整卡正反面与图标裁切：本地 `node_modules/.cache/weald-review/cards/index.html`，重建方式见[导入记录](weald-location-intake-2026-11-11.md)。
本批直接图像为 `monster_medium-weald-p001`、`p004`、`p005`、`p006`、`p009`、`p012` 和 `monster_large-weald-p001` 的 front/back PNG；副本还需对照原 PDF 对应页。

本批属性与技能按 R-230 接入，抗性/免疫及大型卡灰栏按 R-232 确认。召唤语义已确认，但落点、容量、可用单位与战役部署链未接线前整招停点，不只执行其中的伤害或压力。

## 抗性与免疫确认（R-232）

Kyries 已确认下表。核准限于本批具体卡，不改全局图标词典。

| 怪物             | 抗性 | 免疫 | 原始抗性图标 |
| ---------------- | ---- | ---- | ------------ |
| Ectoplasm        | 腐蚀 | 无   | `8e690fc7b2` |
| Large Ectoplasm  | 眩晕 | 无   | `86bf0146dc` |
| Rabid Gnasher    | 眩晕 | 无   | `86bf0146dc` |
| Fungal Scratcher | 腐蚀 | 无   | `8e690fc7b2` |
| Fungal Artillery | 腐蚀 | 无   | `8e690fc7b2` |

Large Ectoplasm 右侧灰栏只是大型卡盖住姿态轨第二格的卡面延伸；它没有技能号或骰表，不是另一套技能规则。大型怪在房间及姿态轨均占两格，读取所占两格中优先级较高的姿态，再按左侧彩色表选招（R17、R24、R-015、R-232）。此项已结案，不再送审。

## 本次代码进展

- 规范化输出：`packages/data/normalized/extension/weald/monster_medium.json` 与 `monster_large.json`，只包含本批条目，来源指向 Weald。
- 附加 R-230、R-232 的属性、抗性/免疫、姿态及 13 项逐技能核准记录；保留原始图标与效果行。原始卡面的图标命名审阅状态保持原样。
- `buildWealdMonsterCatalog` 核对每张卡的来源、页码、副本、属性、抗性、技能记录与原始效果签名后，构造五种已核准的纯战斗结构；参考卡不重复加入。它不修改源数据或自动登记正式牌堆。
- 通用结算器读取核准攻击投影，支持已确认的伤害、目标数、位移、状态、疾病与 Mark 条件伤害。原始效果签名或核准记录漂移即拒绝；三个召唤技能在部署接通前整体拒绝。
- 核心规范化默认路径和核准映射保持原有行为；Weald 复用结构转换，跳过核心逐卡核准表。
- 修复 Rabid Gnasher Life 提取：原算法把右下角较大的技能编号 `1` 误当 Life，现以本批中型卡头部范围定位实际心形 `7`。提取参数只作用于 Weald medium p1–14，不改变核心默认参数或其他卡。
- `pnpm --filter @ddbg/pipeline normalize` 同时重建核心与本批 Weald 数据；改用 Node 启动器传递环境变量，支持 Windows，无须手动编辑生成 JSON。

## 上批验证记录（6d57afbb）

- Node 24.21.0、pnpm 12.9.1；typecheck、lint、build 通过。
- 全量：483 个测试文件通过，3,685 测通过、1 测沿用既有跳过，耗时 1,160.34 秒。
- 四个针对性测试文件共 30 测通过：核心生成结果不变、Weald 导入完整性、I 级规范化身份/来源/副本校验、待审卡的引擎拒绝边界。
- Windows 下实际运行 normalize 命令，两个生成校验文件 18 测通过。
- 本批未新增 UI 或开放战役入口；Playwright 阶段冒烟仍按开发计划在对应可玩阶段补充。

## 本次验证（R-230–R-232）

- Node 24.21.0、pnpm 12.9.1；typecheck、lint、build 全部通过。
- 全量：487 个测试文件通过，3,725 测通过、1 测沿用既有跳过，耗时 1,210.03 秒。
- 68 项针对性检查覆盖规范化、目录构造、选招边界、伤害阈值、目标数、Mark 优先级、状态/疾病、源字段漂移与召唤整招停点；另有 2 项旧译名存档兼容校验。
- 七份受影响的核心规范化 JSON 共有 328 处中文变更，字段均为 `meaning_zh`；数值、结构、英文键保持不变。
- 旧译名快照可在新目录下严格回放；任意说明文字与种子篡改仍拒绝。兼容仅作用于 `meaning_zh` 中的指定译名。
- 本批 UI 改动仅统一中文译名，尚未开放地点战役入口；阶段浏览器冒烟继续按开发计划执行。
