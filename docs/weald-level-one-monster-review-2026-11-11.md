# Weald I 级普通怪物审阅稿

状态：**待 Kyries 确认（Q-186）**。本稿是逐卡对照后的候选表，不是新裁定。
Kyries 已回复属性与姿态表“有更正，我会逐项说明”；待收到具体更正后修订，当前候选值不得视为确认。
Life 来自核心规则书 R24 的具名心形字段；其余未命名图标与字段仍须按 R-048 核对。
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

## 属性与姿态候选

| 怪物             | Life | Dodge 候选 | Speed 候选 | 姿态选招候选                                                                      |
| ---------------- | ---: | ---------: | ---------: | --------------------------------------------------------------------------------- |
| Ectoplasm        |    6 |          0 |          1 | A/D/R/S：1（1–3）、2（4–8）、3（9–10）                                            |
| Large Ectoplasm  |   22 |          0 |          1 | 首组 A/D/R/S：1（1–4）、2（5–8）、3（9–10）；第二组四姿态均灰色，待确认不可用含义 |
| Rabid Gnasher    |    7 |          2 |          3 | A/D/R/S：1                                                                        |
| Fungal Scratcher |   14 |          0 |          1 | A/D：1（1–5）、2（6–10）；R/S：3                                                  |
| Fungal Artillery |    9 |          0 |          1 | A/D：3；R/S：1（1–5）、2（6–10）                                                  |

A/D/R/S 分别为 Aggressive、Defensive、Ranged、Support。Speed 候选来自当前印刷头部蓝框靴印，不是黄色 Dodge 格里的数字。
抗性、免疫尚未在本稿赋予运行语义，保留 normalized 中的原始图标引用。

## 技能候选

“Crit 标签/旁数”“Acc 标签/旁数”区分具名标签与标签旁数字；旁数尚未写成伤害字段。射程/目标栏也是待确认读法，不进入运行时。

| 怪物／技能                         | Crit 标签/旁数 | Acc 标签/旁数 | 射程／最多目标候选 | 印刷目标文字与效果待审                                            |
| ---------------------------------- | -------------- | ------------- | ------------------ | ----------------------------------------------------------------- |
| Ectoplasm 1 Slime                  | 1 / 7          | 9 / 4         | 1 / 1              | Closest；无额外效果行                                             |
| Ectoplasm 2 Cytokinesis            | 1 / 2          | 9 / 1         | 1 / 1              | Closest；条件图标后有 `1 Ectoplasm`，须确认触发条件与召唤语义     |
| Ectoplasm 3 Ectoplasmic Profusion  | 1 / 2          | 9 / 1         | 1 / 3              | Crowded；`1 Large Ectoplasm` 和后续图标 `+1`，不猜测复合效果      |
| Large Ectoplasm 1 Big Slime        | 1 / 9          | 9 / 6         | 1 / 1              | Closest；无额外效果行                                             |
| Large Ectoplasm 2 Slime Smack      | 3 / 6          | 9 / 3         | 1 / 1              | Crowded；黄色菱形图标 `1t`，待核对语义                            |
| Large Ectoplasm 3 Cytokinesis      | 1 / 6          | 9 / 3         | 1 / 1              | Closest；条件图标后有 `1 Large Ectoplasm`，须确认触发条件         |
| Rabid Gnasher 1 Rabid Rush         | 2 / 4          | 9 / 2         | 2 / 1              | Furthest；自身 Pull 2；目标红滴 `1`、`3t`，另有黄色图标，逐项确认 |
| Fungal Scratcher 1 Groping Swipe   | 1 / 7          | 8 / 4         | 1 / 1              | Closest；无额外效果行                                             |
| Fungal Scratcher 2 Rend the Marked | 1 / 6          | 9 / 4         | 1 / 1              | Marked → Closest；目标效果 `+3 vs` 红色标记图标                   |
| Fungal Scratcher 3 Harmless Swipe  | 0 / 6          | 5 / 3         | 2 / 1              | Furthest；自身 Pull 1                                             |
| Fungal Artillery 1 Mark Prey       | 1 / 2          | 10 / 1        | 2 / 1              | Closest；目标标记样图标 `2t`、橙色双下箭头 `2t`                   |
| Fungal Artillery 2 Rain of Blight  | 1 / 2          | 10 / 1        | 2 / 2              | Crowded；目标绿滴 `2`、`2t`，另有黄色图标                         |
| Fungal Artillery 3 Escape Cloud    | 1 / 2          | 10 / 1        | 1 / 1              | Closest；自身 Push 2；目标绿滴 `1`、`3t`                          |

## 核对材料与确认范围

整卡正反面与图标裁切：本地 `node_modules/.cache/weald-review/cards/index.html`，重建方式见[导入记录](weald-location-intake-2026-11-11.md)。
本批直接图像为 `monster_medium-weald-p001`、`p004`、`p005`、`p006`、`p009`、`p012` 和 `monster_large-weald-p001` 的 front/back PNG；副本还需对照原 PDF 对应页。

待确认可分批进行：先属性与姿态，再技能数字/射程/目标、抗性免疫，最后复合效果。未确认字段继续保留原始文本与图标，不用候选值替换空值。
尤其需要逐项确认 Ectoplasm 两项召唤的条件、Profusion 的 `+1`、Large Ectoplasm 第二组灰色姿态，以及 Rabid Rush / Rain of Blight 的黄色图标。

## 本次代码进展

- 规范化输出：`packages/data/normalized/extension/weald/monster_medium.json` 与 `monster_large.json`，只包含本批条目，来源指向 Weald。
- 所有卡保留 `verification.unverified`；不附加 Speed、姿态、伤害、射程或效果计划，不登记生产牌堆。
- 核心规范化默认路径和核准映射保持原有行为；Weald 复用结构转换，跳过核心逐卡核准表。
- 修复 Rabid Gnasher Life 提取：原算法把右下角较大的技能编号 `1` 误当 Life，现以本批中型卡头部范围定位实际心形 `7`。提取参数只作用于 Weald medium p1–14，不改变核心默认参数或其他卡。
- `pnpm --filter @ddbg/pipeline normalize` 同时重建核心与本批 Weald 数据；改用 Node 启动器传递环境变量，支持 Windows，无须手动编辑生成 JSON。

## 验证结果

- Node 24.21.0、pnpm 12.9.1；typecheck、lint、build 通过。
- 全量：483 个测试文件通过，3,685 测通过、1 测沿用既有跳过，耗时 1,160.34 秒。
- 四个针对性测试文件共 30 测通过：核心生成结果不变、Weald 导入完整性、I 级规范化身份/来源/副本校验、待审卡的引擎拒绝边界。
- Windows 下实际运行 normalize 命令，两个生成校验文件 18 测通过。
- 本批未新增 UI 或开放战役入口；Playwright 阶段冒烟仍按开发计划在对应可玩阶段补充。
