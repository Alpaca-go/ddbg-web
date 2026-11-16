# Weald Hag II／III：卡面核实稿

状态：**待 Kyries 核准，沿用 Q-186**。本稿逐面查看本地印刷缓存，不从 I 级推算，不开放运行时或修改战役池。R-254／R-255／R-256 及 R-262 已确认的通则仍按原范围执行。

## 来源与查看范围

印刷目录 `MG_DD_06_EN_WEALD`；逐面查看忽略缓存 `node_modules/.cache/weald-review/cards/` 中对应页面：

| PDF                                                 | 已查看页码／面                                  |
| --------------------------------------------------- | ----------------------------------------------- |
| `DD_EN_WEALD_CARDS_140x140_monster_large_FRONT.pdf` | p11／p12 Hag II／III；p14／p15 Empty II／III    |
| `DD_EN_WEALD_CARDS_140x140_monster_large_BACK.pdf`  | p14／p15 Full II／III                           |
| `DD_EN_WEALD_CARDS_70_120_Boss_Abilities_FRONT.pdf` | p17／p18 Hag II／III；p20／p21 Cauldron II／III |
| `DD_EN_WEALD_CARDS_70_120_Boss_Abilities_BACK.pdf`  | p17／p18 地牢与村庄威胁                         |

文字 raw 仅核对 ID，不以 parsed 中“无技能”的失败状态判断锅不可用。未提交卡图、PDF 或缓存。Description p14／p15 与本批不涉及的能力背面未逐面查看，不宣称已核实。

## 属性候选

| 字段            | Hag II        | Hag III       | Empty II                        | Empty III | Full II | Full III |
| --------------- | ------------- | ------------- | ------------------------------- | --------- | ------- | -------- |
| raw 页码        | p011 正       | p012 正       | p014 正                         | p015 正   | p014 背 | p015 背  |
| Life            | 75            | 95            | 100                             | 136       | 14      | 19       |
| Speed           | 2             | 2             | 0                               | 0         | 0       | 0        |
| Dodge           | 1             | 1             | 0                               | 0         | 0       | 0        |
| 类型            | Human／Large  | Human／Large  | Large                           | Large     | Large   | Large    |
| 占格            | 2             | 2             | 2                               | 2         | 2       | 2        |
| 内置 Protection | 无            | 无            | 有                              | 有        | 无      | 无       |
| 抗性            | 腐蚀          | 腐蚀          | 无                              | 无        | 无      | 无       |
| 免疫            | 眩晕、Shuffle | 眩晕、Shuffle | 眩晕、流血、腐蚀、减益、Shuffle | 同左      | 同左    | 同左     |

Speed 按右侧双脚印、Dodge 按左上带数字标记分别读取（R-254）；锅的 Full 为同一实体背面，不新增副本。

## 技能候选

Crit／暴伤与 Acc／普伤分开记录；空白不补零。

| 等级／技能               | 目标     | 射程／最多目标 | Crit／暴伤 | Acc／普伤 | 效果                  |
| ------------------------ | -------- | -------------- | ---------- | --------- | --------------------- |
| II Into the Pot          | Closest  | 1／1           | 未印／未印 | 11／未印  | Self Pull 1；目标入锅 |
| III Into the Pot         | Closest  | 1／1           | 未印／未印 | 12／未印  | Self Pull 1；目标入锅 |
| II Meat Tenderizer       | Crowded  | 1／3           | 2／6       | 10／4     | 无额外效果            |
| III Meat Tenderizer      | Crowded  | 1／3           | 2／9       | 11／6     | 无额外效果            |
| II Season to Perfection  | Furthest | 2／1           | 0／4       | 11／2     | 目标减益 2t；压力 +1  |
| III Season to Perfection | Furthest | 2／1           | 0／6       | 12／3     | 目标减益 2t；压力 +1  |
| II Full：Boil            | Closest  | 0／1           | 1／12      | 14／7     | 目标压力 +1           |
| III Full：Boil           | Closest  | 0／1           | 1／16      | 16／9     | 目标压力 +1           |

Hag 两等级的四姿态选招均为 d10 1–6 用槽 2、7–10 用槽 3；灰色右栏不参与。Empty 无技能，Full 只有 Boil。

## 能力与威胁候选

- p17／p18：Hag 每轮两行动；轮到且锅内无英雄，先 Into the Pot! 再另一技能。
- p20／p21：锅每轮一行动，开场 Empty；英雄入锅翻 Full 并清锅伤口；锅内英雄不能移动或被 Shuffle。锅伤口达到 Life 或锅内英雄到 Death’s Door，英雄放邻接区域，锅翻 Empty 并清伤口。两等级均逐面查看，未按 I 级复制结论。
- 地牢 Painfully Soothing II／III：英雄每次使用所列图标，压力 +1。两等级均印 Potion 和第二个黑白图标；第二图标语义待 Q-186 核准，暂不命名为补给品（R-180 已明确本作没有 Holy Water）。II 印有 or，III 用并列图标，是否同为二选一触发也保留待确认，不自行实现。
- 村庄 No Rest for the Wicked II：Sanitarium 少治疗 6 Life；III 少治疗 9 Life。

## 下一步与验证

1. Kyries 核准上述卡面字段；歧义继续 Q-186，不建立默认数值。
2. 核准后接独立高等级目录及对应 schema，再逐项扩展现有锅生命周期、威胁与正式入口／日志；不直接放宽 I 级身份守卫。
3. 高等级房间是否复用和 Stygian 替换另查官方规则及实际卡面，不以本稿推定。

本批仅文档审阅，没有改动生产代码；没有把数据核实当作 Boss 可玩、自然养成或人工实机验收。
