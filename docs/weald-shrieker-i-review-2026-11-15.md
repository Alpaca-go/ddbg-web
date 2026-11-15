# Weald Shrieker I：卡面与板块审阅

状态：**待 Kyries 核准**。2026-11-15 用户明确“先跳过实机测试部分，优先完善 weald 拓展包的内容”；保留 Hag／Pounder 实测缺口，继续 Shrieker 内容核实。本稿不授予 combatReady，不改生产数值或 Boss 抽选停点。

## 已实际查看的来源

官方印刷目录 `DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_06_EN_WEALD`：

| PDF                                                 | 页面   | 用途                                      |
| --------------------------------------------------- | ------ | ----------------------------------------- |
| `DD_EN_WEALD_RULES.pdf`                             | W3     | 部署、先攻、清场，已对照图像              |
| `DD_EN_WEALD_CARDS_140x140_monster_large_FRONT.pdf` | p4／p7 | Shrieker I／Nest I 整卡图                 |
| `DD_EN_WEALD_CARDS_70_120_Boss_Abilities_FRONT.pdf` | p4     | 行动次数、Nest 与 Call the Murder         |
| 同类 `BACK.pdf`                                     | p4     | 地牢／村庄威胁；图像与 raw 文字交叉核对   |
| `DD_EN_WEALD_CARDS_63x88_rooms_FRONT.pdf`           | p11    | 房间与 Nest 星区文字                      |
| `DD_WEALD_TILES_FRONT.pdf`                          | p6     | 实际印刷编号 11，本批重新渲染 1800px 查看 |

私有整卡图位于 `node_modules/.cache/weald-review/cards/`；本批板块图位于 `node_modules/.cache/shrieker-review-2026-11-15/tile11.png`。图像不提交。描述卡的叙事“吓跑它”不构成半血逃跑或额外胜利条件。

## 官方规则已有结论

W3／规格书 W-05：找到对应房间与板块；Shrieker 战斗卡放 Aggressive、Nest 放 Ranged，模型放相应区域；混洗 **3 张怪物／4 张英雄先攻**；击败 Shrieker 后移除 Nest。不能把 Nest 当普通怪物副本入池。

| 内容           | raw ID                                     |
| -------------- | ------------------------------------------ |
| I 级描述卡     | `boss_ability:weald:p001`                  |
| I 级能力／威胁 | `boss_ability:weald:p004`                  |
| Shrieker I     | `monster_large:weald:p004`                 |
| Nest I         | `monster_large:weald:p007`                 |
| 房间           | `room:weald:p011`                          |
| 板块           | `DD_WEALD_TILES_FRONT.pdf` p6，印刷编号 11 |

描述身份已存在，不代表能力已运行。II／III 级 large p5／p6、p8／p9 与对应能力 p5／p6 不从 I 级类推。

## 战斗卡转录提案

以下按既有 R-230／R-232／R-254 读法核对图像；具体卡面仍待本批确认，不改全局图标词典。

| 字段     | Shrieker I               | Nest I                             |
| -------- | ------------------------ | ---------------------------------- |
| 类型     | Eldritch—Beast—Large     | Large                              |
| Life     | 49                       | 20                                 |
| Speed    | 生命上方 3 枚脚印，拟 3  | 未见脚印；待核准，不因空白自动补 0 |
| Dodge    | 等级 I 右方数字 2        | 未印数字；待核准是否为 0           |
| 抗性     | 减益、流血、Pull         | 未见独立抗性                       |
| 免疫     | 腐蚀                     | 减益、流血、腐蚀、Push、Pull       |
| 左侧选招 | 1–5 → 1；6–9 → 2；10 → 3 | 无普通技能／选招                   |
| 右侧灰栏 | 按 R-232 不作第二组技能  | 不伪造技能或行动                   |

| 技能              | Crit／暴击伤害 | Acc／普通伤害 | 射程／目标提案     | 后续                       |
| ----------------- | -------------- | ------------- | ------------------ | -------------------------- |
| 1 Peck            | 2／11          | 9／8          | 1；Closest，1 目标 | Self Pull 1；目标流血 2·2t |
| 2 Call the Murder | 1／4           | 10／2         | 1；Crowded，4 目标 | Self Push 2；目标压力 +1   |
| 3 Regurgitate     | 1／2           | 9／1          | 2；Crowded，2 目标 | 目标减益 2t、疾病          |

## 能力与威胁

- **ACTIONS / Round: 3**：明确为 3，不据此增加 Nest 的普通攻击。
- **Shrieker’s Nest**：Nest 在场时，只有 Shrieker 可以进入 Nest 所在区域。房间文字也写英雄不能进入星区。后续需核对技能／位移进入，不能仅禁主动移动；Nest 自身的存在不等于新一次“进入”。
- **Call the Murder**：Nest 在场时，Shrieker 飞往 Nest 的区域，替代 Self Push 2；这样做时绿色治疗图标为 2。**治疗归属／时点、飞行与通常移动限制的关系待确认**，不自造绕墙、容量或禁入豁免。
- **Where Did It Go? I（地牢）**：获得一枚 Provision 后，选择并弃一枚公共池补给。不默认随机弃或自动弃新获得者。多枚同时获得的触发粒度与满池时顺序仍须按规则核对。
- **Murder of Magpies I（村庄）**：所有英雄掷完 supply dice 后，从 reserve 选一枚弃置，不误实现为每名英雄分别丢一枚。reserve 对应现有村庄补给阶段的状态须接线核对。

## 11 号板块几何提案

字母仅为审阅定位，不写入生产 ID。容量按点数；未看到高低地标记，拟全部 normal，待核准。

| 区域 | 位置                 | 容量 | 标记提案                   |
| ---- | -------------------- | ---- | -------------------------- |
| A    | 左上                 | 4    | 宝箱 1                     |
| B    | 上中                 | 4    | —                          |
| C    | 右上，左下有凹口     | 4    | 英雄 Ranged／Support       |
| D    | 左中                 | 3    | —                          |
| E    | 中央 Nest 图案区     | 5    | 红星、怪物四姿态、宝箱 1   |
| F    | 右中，左下有凹口     | 3    | —                          |
| G    | 左下大区，右上有凹口 | 3    | —                          |
| H    | 下中                 | 4    | —                          |
| I    | 右下                 | 4    | 宝箱 1                     |
| J    | 左下最底窄区         | 2    | 英雄 Aggressive／Defensive |

拟共边通行：**A–B、A–D、B–C、B–E、C–F、D–E、D–G、E–F、E–H、F–I、G–H、G–J、H–I、H–J**。黑色凹口不是区域，不跨凹口补 E–G 等边；角点不当共边。无零容量提案。宝箱白叹号仅记录外观，不赋新奖励。

据上述姿态标记与 W3，拟 Shrieker Aggressive／Nest Ranged 均落 E；英雄 Aggressive／Defensive 落 J、Ranged／Support 落 C。**落点、几何与星区均待本批核准**，不先部署到生产。

## 待确认与接线顺序

沿用 Q-186，未擅自登记新裁定。

1. 核准本表 I 级属性、抗性／免疫、三技能射程／目标数／后续，以及 Nest 空白 Speed／Dodge 的实际取值。
2. 核准 Nest 无普通技能时的行动处理，Call the Murder 的飞行与治疗归属／时点。
3. 核准十区、容量、共边／凹口、地形、星区与英雄／怪物落点。
4. 两段威胁对照既有补给取得／村庄 supply 阶段接线；未有明确规则的多枚与满池顺序保留待确认，不猜实现。
5. 核准后按独立 schema／normalized → 部署 → Nest 禁入／清场 → 技能 → 威胁 → 日志／页面推进。实机验收按用户指令后置，不阻断内容实现。
