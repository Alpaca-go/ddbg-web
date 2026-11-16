# Weald Hag II／III：卡面核实稿

状态：**Kyries 已审核修改并核准，登记 R-267**。本稿逐面查看官方英文印刷，不从 I 级推算数值，不开放运行时或修改战役池。R-254／R-255／R-256 的原范围仅限 Hag I／Cauldron I，II／III 与 Stygian 不因此结案。II／III 能力卡正文与 I 级几乎逐字相同，本次四条能力核准已明确将生命周期、心脏病翻锅口径扩至 II／III。

2026-11-16 对照官方英文印刷与现活裁定复核后，更正 Painfully Soothing 的图标与句法，并更正 R-180／R-262 的误引。

## 来源与查看范围

印刷目录 `MG_DD_06_EN_WEALD`；逐面查看忽略缓存 `node_modules/.cache/weald-review/cards/` 中对应页面。Full II／III 已用官方英文 `monster_large_BACK.pdf`（与 FRONT 同套 EN_FILES）核对；中文版卡背不作为本审依据。

| PDF                                                 | 已查看页码／面                                  |
| --------------------------------------------------- | ----------------------------------------------- |
| `DD_EN_WEALD_CARDS_140x140_monster_large_FRONT.pdf` | p11／p12 Hag II／III；p14／p15 Empty II／III    |
| `DD_EN_WEALD_CARDS_140x140_monster_large_BACK.pdf`  | p14／p15 Full II／III                           |
| `DD_EN_WEALD_CARDS_70_120_Boss_Abilities_FRONT.pdf` | p17／p18 Hag II／III；p20／p21 Cauldron II／III |
| `DD_EN_WEALD_CARDS_70_120_Boss_Abilities_BACK.pdf`  | p17／p18 地牢与村庄威胁                         |

页码表本身无误。已补看 Description FRONT p14／p15（Hag II／III 风味，无规则条文）、其背面通用 `BOSS II／III` 图，以及 Cauldron 能力背面 p20／p21 的 `BOSS Ability` 图，均无额外规则。文字 raw 仅核对 ID，不以 parsed 中“无技能”的失败状态判断锅不可用。未提交卡图、PDF 或缓存。

## 核准属性

| 字段            | Hag II        | Hag III       | Empty II                        | Empty III | Full II | Full III |
| --------------- | ------------- | ------------- | ------------------------------- | --------- | ------- | -------- |
| raw 页码        | p011 正       | p012 正       | p014 正                         | p015 正   | p014 背 | p015 背  |
| Life            | 75            | 95            | 100                             | 136       | 14      | 19       |
| Speed           | 2             | 2             | 0                               | 0         | 0       | 0        |
| Dodge           | 1             | 1             | 0                               | 0         | 0       | 0        |
| 类型            | Human／Large  | Human／Large  | Large                           | Large     | Large   | Large    |
| 内置 Protection | 无            | 无            | 有                              | 有        | 无      | 无       |
| 抗性            | 腐蚀          | 腐蚀          | 无                              | 无        | 无      | 无       |
| 免疫            | 眩晕、Shuffle | 眩晕、Shuffle | 眩晕、流血、腐蚀、减益、Shuffle | 同左      | 同左    | 同左     |

六张卡均印 Large（Hag 为 Human／Large），卡面未另印占格数字；按大型怪通则占两格（R-015），不把「2」写成卡面字段。Speed 按生命上方右侧脚印、Dodge 按等级徽记右侧图标上的数字，分别按本面目视读取；布局与 I 级相同。R-254 已写明该读法的核准范围仅限 I 级本表，不把该裁定当作 II／III 已核准读法。锅的 Full 为同一实体背面，不新增副本。Empty 有胸甲＝内置 Protection，Full 无胸甲，不把 Empty 的胸甲继承到 Full。

## 核准技能

Crit／暴伤与 Acc／普伤分开记录；空白不补零。

| 等级／技能               | 目标     | 射程／最多目标 | Crit／暴伤 | Acc／普伤 | 效果                  |
| ------------------------ | -------- | -------------- | ---------- | --------- | --------------------- |
| II Into the Pot          | Closest  | 1／1           | 未印／未印 | 11／未印  | Self Pull 1；目标入锅 |
| III Into the Pot         | Closest  | 1／1           | 未印／未印 | 12／未印  | Self Pull 1；目标入锅 |
| II Meat Tenderizer       | Crowded  | 1／4           | 2／6       | 10／4     | 无额外效果            |
| III Meat Tenderizer      | Crowded  | 1／4           | 2／9       | 11／6     | 无额外效果            |
| II Season to Perfection  | Furthest | 2／1           | 0／4       | 11／2     | 目标减益 2t；压力 +1  |
| III Season to Perfection | Furthest | 2／1           | 0／6       | 12／3     | 目标减益 2t；压力 +1  |
| II Full：Boil            | Closest  | 0／1           | 1／12      | 14／7     | 目标压力 +1           |
| III Full：Boil           | Closest  | 0／1           | 1／16      | 16／9     | 目标压力 +1           |

Hag 两等级的四姿态选招均为 d10 1–6 用槽 2、7–10 用槽 3；灰色右栏不参与。Empty 无技能，Full 只有 Boil，且无姿态掷骰表。怪物卡技能行印 `Into the Pot`（无感叹号），能力卡标题与正文印 `Into the Pot!`；二者为同一技能的印刷差异，不是两招。

审核前问题（已结案）：Full 的 Boil 印 Closest、射程 0、1 个目标、目标压力 +1，没有写 “the Hero in the Cauldron”。R-255（仅 I 级）写「锅内英雄不可被技能选中；只能选锅」。不能由 Closest＋射程 0 推定 Boil 能打锅内英雄；是否沿用该口径须单独拍板。

**核准：不能打锅内英雄，当英雄在锅内时，英雄不再是一个可互动单位，只有锅可以**

## 核准能力与威胁

- p17／p18：Hag 每轮两行动；轮到且锅内无英雄，先 Into the Pot! 再另一技能。
- p20／p21：锅每轮一行动，开场 Empty；英雄入锅翻 Full 并清锅伤口；锅内英雄不能移动或被 Shuffle。锅伤口达到 Life 或锅内英雄到 Death’s Door，英雄放邻接区域，锅翻 Empty 并清伤口。两等级均逐面查看，未按 I 级复制结论。能力卡未写心脏病路径。本次已核准 R-255／R-256 扩至 II／III（R-267）。
- 地牢 Painfully Soothing II／III：英雄每次使用所列补给，压力 +1。对照核心盒玩家辅助卡 Provisions 图样：II 为 Potion 或 Food（印有 `or`）；III 为 Potion、Food 或 Bandages（逗号列举且保留 `or`，即三者任一）。不是 Holy Water（现活出处为 R-197／规格书 §5.2，不是 R-180）。本次已核准这组与玩家辅助卡一致的命名。印刷英语 `A, B, or C` 本身并不含糊，不再把 III 写成「并列、是否二选一」。
- 村庄 No Rest for the Wicked II：Sanitarium 少治疗 6 Life；III 少治疗 9 Life。

**以上4条全部核准通过**

## 下一步与验证

1. 本表字段与细节已由 R-267 结案；采用更正后的四目标及补给图标。下文保留的“待确认”是审核前问题，紧随其后的核准答复及 R-267 为最终结论。
2. 核准后接独立高等级目录及对应 schema，再逐项扩展现有锅生命周期、威胁与正式入口／日志；不直接放宽 I 级身份守卫。
3. 高等级房间是否复用和 Stygian 替换另查官方规则及实际卡面，不以本稿推定。

核准后新增独立 `hag_higher.json` 与 Zod schema，保留 combatReady=false；没有把数据核实当作 Boss 可玩、自然养成或人工实机验收。
