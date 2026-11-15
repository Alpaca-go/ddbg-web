# Weald Brigand Pounder I：印刷审阅准备

状态：**候选转录，待 Kyries 核准，沿用 Q-186**。Kyries 于 2026-11-15 明确要求保留 Hag 跨任务自然抵达的验收缺口，先准备本审阅资料。本稿不授予运行资格，不改 normalized、规则引擎、描述池抽取结果或未注册停点。

## 已实际查看的来源

印刷目录为 `DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_06_EN_WEALD`。仅用官方印刷品与规则书，不用 FAQ、TTS 或旧仓库实现作裁定。

| PDF                                                  | 已查看页面                    | 用途                                 |
| ---------------------------------------------------- | ----------------------------- | ------------------------------------ |
| `DD_EN_WEALD_RULES.pdf`                              | W4，重新渲染查看              | 部署、先攻、击败清场                 |
| `DD_EN_WEALD_CARDS_70_120_Boss_Abilities_FRONT.pdf`  | p7、p10                       | 描述身份、能力                       |
| `DD_EN_WEALD_CARDS_70_120_Boss_Abilities_BACK.pdf`   | p7、p10（另旋转查看村庄半面） | 通用 Boss 背面、地牢与村庄威胁       |
| `DD_EN_WEALD_CARDS_70_120_monsters_medium_FRONT.pdf` | p20、p23                      | Pounder I、Matchman I                |
| `DD_EN_WEALD_CARDS_70_120_monsters_medium_BACK.pdf`  | p20、p23                      | 均为通用 Boss I 背面，不增加战斗单位 |
| `DD_EN_WEALD_CARDS_63x88_rooms_FRONT.pdf`            | p12                           | 12—Brigand Pounder 房间缩略图        |
| `DD_WEALD_TILES_BACK.pdf`                            | p6                            | 12 号板块                            |

查看既有私有整卡图 `node_modules/.cache/weald-review/cards/`；本批补充渲染在 `node_modules/.cache/pounder-review-2026-11-15/`。图像不提交。p11 实际为 Shrieker，不能因开发顺序把 p11 当作 Pounder 房间。

## 官方规则书已有结论（W4／规格书 W-05）

1. 找出对应房间卡和板块。
2. Pounder 战斗卡进入 Aggressive，模型放在相应印刷区域。
3. 初始混洗 **1 张怪物先攻、4 张英雄先攻**。
4. 击败 Pounder 后移除场上所有 Brigands。

本段不指定开局额外放 Matchman／Fusilier，不据增援文字预放三只附属怪。召唤后的站位、区域、先攻加入时点须另按核心召唤规则与实际卡面核对。

## 身份与牌堆边界

| 内容                  | raw ID                            | 边界                                                  |
| --------------------- | --------------------------------- | ----------------------------------------------------- |
| Pounder I Description | `boss_ability:weald:p007`         | 已在完整 I 级描述池；仅身份已登记                     |
| Pounder I 能力／威胁  | `boss_ability:weald:p010`         | 本稿待核准                                            |
| Pounder I 战斗卡      | `monster_medium:weald:p020`       | 类型／位置行解析缺失；不补 Human、Front、Large 等标签 |
| Matchman I            | `monster_medium:weald:p023`       | 卡背为 Boss I；不因此推定独立 Boss 身份或加入普通池   |
| Boss 房间             | `room:weald:p012`                 | 不能加入九张普通房间堆                                |
| 对应板块              | `dungeon_tile:weald:p006` 的 back | 12 号；几何未核准                                     |

本次只审 I 级。p21–22、p24–25 为后续等级，不从 I 级推算；本稿不核准其数值。

## 战斗卡候选读数

以下数字已对照图像，但仍须 Kyries 核准；没有标签的图标不凭位置补名。

| 字段                | Pounder I（p20）                                                       | Matchman I（p23）                                        |
| ------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------- |
| Life                | 55                                                                     | 7                                                        |
| Speed（靴印）       | 0                                                                      | 2                                                        |
| 类型行              | 图面未见普通类型／位置行，保持待确认                                   | Human                                                    |
| Dodge／胸前常驻图标 | 白色胸甲状图标需确认是否为内置 Protection；未见可直接录入的 Dodge 数字 | Life 上方脚印样图标需确认 Dodge 读法，未印数字不自动填 0 |
| Resistances         | 标题下未见抗性图标                                                     | 黄色点状图标、蓝色双箭头；语义请逐项核对                 |
| Immunities          | 黄色点状、红滴、绿滴、橙色双折线、蓝色双箭头；语义请逐项核对           | 标题下未见免疫图标                                       |
| 唯一技能            | BOOOOOOM!                                                              | Fire in the Hole!                                        |
| 选区／目标          | Crowded，距离 0–5，四个英雄目标图标                                    | Brigand Pounder，距离 0，红色怪物目标图标                |
| Crit／Acc           | Crit 0／暴伤 19；Acc 9／普伤 9                                         | 未见 Crit／Acc 数值行，不伪造命中掷骰                    |
| 效果                | 自身分支的压力样图标 +2，待确认作用对象及原语                          | Trigger BOOOOOOM!，待确认触发炮击的完整时序              |
| 页脚                | A／D／R 下划线标记；S 下红色特殊标记                                   | A／D／R 下划线标记；S 下技能 1                           |

Pounder 页脚的特殊标记不能擅自解释成「四姿态都用技能 1」，也不能把没有普通选招行改成普通怪物默认 AI。Matchman 页脚需确认 A／D／R 的横线是否表示不行动。

## 能力与威胁候选转录（p10）

- **ACTIONS / Round: 1**。
- **Reinforcements**：轮到 Pounder 时召唤 Brigand Matchman 与 2 名 Brigand Fusiliers，括号条件为场上尚不存在。待确认按每个单位／所需数量补足的具体语义；不先决定只要其中一只在场就整次不召唤，也不先决定每回合额外生成三只。
- **Bullseye Guillotine I**：怪物进入怪物姿态轨 Ranged 槽时，获得蓝色双折线图标 2t 与橙色回转箭头图标 1t。候选为 Buff 与 Riposte，仍请核对图标。还需核对是进入触发，不能当成持续站在 Ranged 每回合自动刷新。
- **Bombardment I**：每天结束、从村庄板移走英雄之前，掷 d10 对应建筑。有英雄则受到 5 点红色伤害图标；无人则建筑在可能时降级；Caretaker 在该处则无事发生。请核对英雄与 Caretaker 同处时的优先级是否已有核心规则可直接约束，不能由代码分支顺序裁定。

Brigand Fusilier 来源为核心同级卡。正式接线前需核对实体副本、召唤资格、初始姿态、区域与选招，不复制或改名当地普通怪，也不因描述卡入池而跳过来源校验。

## 12 号板块几何候选

采用本表局部字母，仅为审阅定位，尚未写入生产区域 ID。以下区域容量、共边和角点均待核准；黑色凹口不作为区域。

| 区域 | 图上位置                     | 候选容量                         | 印刷标记候选                    |
| ---- | ---------------------------- | -------------------------------- | ------------------------------- |
| A    | 最上排左                     | 3                                | 无                              |
| B    | 最上排中                     | 3                                | 怪物 Aggressive                 |
| C    | 最上排右                     | 3                                | 怪物 Ranged／Support            |
| D    | 左侧第二区，右边是竖长黑凹口 | 3                                | 怪物 Defensive                  |
| E    | 正中央大区                   | 3                                | 无                              |
| F    | C 下方右侧区                 | 3                                | 无                              |
| G    | F 下方靠右小区，左边是黑凹口 | 2                                | 无                              |
| H    | D 下方、左下第二排           | 3                                | 无                              |
| I    | E 下方、H 右侧中区           | 待确认：未读到容量点，不填默认值 | 怪物 Ranged                     |
| J    | 最下排左侧宽区               | 4                                | 英雄 Defensive、Ranged／Support |
| K    | 最下排中央窄区               | 3                                | 英雄 Aggressive                 |
| L    | 最下排右                     | 3                                | 英雄 Ranged                     |

- 候选可通行共边：A–B、A–D、B–C、B–E、C–F、D–H、E–F、E–I、F–G、G–L、H–I、H–J、I–J、I–K、J–K、K–L。
- A–E 为候选仅角点，不当作通道；其余未列配对不补边。
- D–E 之间竖长黑凹口、E 右下方黑凹口分别需确认墙体边界；E–G 不列可通行。
- I 的容量及重复的怪物 Ranged／英雄 Ranged 印刷标记需重点确认，不删除其中任一标记来迁就现有单姿态区域映射。
- 全部区域的高低地、是否有零容量区仍待核准；未读取到数字不等于 0。W-03 只规定已确认零容量区域的通行／回合结束限制，不替代几何审阅。

## 待 Kyries 确认与后续接线边界

1. 上述属性、抗性／免疫图标、目标、技能数值、特殊页脚及胸前图标读法。
2. Reinforcements 的缺失单位判定与数量；Fire in the Hole! 触发的炮击是否消耗 Pounder 自身行动及相关时序，应先查核心规则再提出仍有歧义项，不凭电子游戏经验补规则。
3. 地牢威胁两个图标、村庄轰炸结算及 Caretaker 例外。
4. 12 号板块逐区容量、标记、共边、角点、墙及高低地，尤其 I 区。

核准后才建立独立 Boss 数据、召唤与触发运行时，再接部署、先攻、清场、地点来源、正式日志、回村和 UI。Hag 跨任务验收缺口另行保留；本稿不是其结案，也不开放 Pounder 战斗。
