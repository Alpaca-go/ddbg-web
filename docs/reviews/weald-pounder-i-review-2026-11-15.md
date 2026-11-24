# Weald Brigand Pounder I：印刷审阅准备

状态：**本表 I 级战斗卡、增援与 12 号板块经 R-258 更正核准；两段威胁经 R-259 续核，当前表列审阅项已结案**。Kyries 于 2026-11-15 明确要求保留 Hag 跨任务自然抵达的验收缺口，先准备本审阅资料。本稿不授予运行资格，不改 normalized、规则引擎、描述池抽取结果或未注册停点。

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
| Pounder I 能力／威胁  | `boss_ability:weald:p010`         | R-259 已核准                                          |
| Pounder I 战斗卡      | `monster_medium:weald:p020`       | 类型／位置行解析缺失；不补 Human、Front、Large 等标签 |
| Matchman I            | `monster_medium:weald:p023`       | 卡背为 Boss I；不因此推定独立 Boss 身份或加入普通池   |
| Boss 房间             | `room:weald:p012`                 | 不能加入九张普通房间堆                                |
| 对应板块              | `dungeon_tile:weald:p006` 的 back | 12 号；几何经 R-258 核准                              |

本次只审 I 级。p21–22、p24–25 为后续等级，不从 I 级推算；本稿不核准其数值。

## 战斗卡核准读数（R-258）

以下按 Kyries 填写及 R-258 核准结果采用。

| 字段                | Pounder I（p20）                        | Matchman I（p23）                                   |
| ------------------- | --------------------------------------- | --------------------------------------------------- |
| Life                | 55                                      | 7                                                   |
| Speed（靴印）       | 0                                       | 1                                                   |
| 类型行              | 无类型                                  | Human                                               |
| Dodge／胸前常驻图标 | 确认为内置 Protection；Dodge 0          | Dodge应该是 绿色I（怪物等级）的右边的数字，也就是 2 |
| Resistances         | 无抗性                                  | 眩晕、位移                                          |
| Immunities          | 眩晕、流血、腐蚀、减益、位移            | 无免疫                                              |
| 唯一技能            | BOOOOOOM! Pounder本身不能自己使用本技能 | Fire in the Hole!                                   |
| 选区／目标          | Crowded，距离 0–5，四个英雄目标图标     | Brigand Pounder，距离 0，红色怪物目标图标           |
| Crit／Acc           | Crit 0／暴伤 19；Acc 9／普伤 9          | 无Crit和Acc，唯一技能是让Pounder使用BOOOOOOM!       |
| 效果                | 命中时给命中对象+2压力                  | Trigger BOOOOOOM!，立即使用Pounder的BOOOOOOM!       |
| 页脚                | A／D／R 下划线标记；S 下红色特殊标记    | A／D／R／S 都使用技能1                              |

R-258：Pounder 不自行使用 BOOOOOOM!；由 Matchman 的 Fire in the Hole! 立即触发。两者须在同一个 Area 区域，仅在同一房间板块不够；不增加区域内距离或格位条件。Matchman 四姿态均使用技能 1。

## 能力与威胁（p10，R-258／R-259）

- **ACTIONS / Round: 1**。
- **Reinforcements（R-258 已确认）**：只有场上不存在 Matchman 时才发动。按该等级能力组成补足满员；I 级补足到 1 名 Matchman＋2 名 Fusiliers，已有 Fusilier 计入，不额外再造两名。Matchman 仍在时，即使其它召唤物死亡也不发动。
- **Bullseye Guillotine I（R-259）**：怪物进入怪物姿态轨 Ranged 槽位时，获得增益（Buff）2t＋反击（Riposte）1t。不是棋盘区域进入触发，也不是每回合自动刷新。
- **Bombardment I（R-259）**：每天结束、从村庄板移走英雄之前，掷 d10 对应建筑。有英雄则受到 5 点伤害；无人则建筑在可能时降级；Caretaker 在该处则无事发生，即使英雄同处亦由该例外优先。

Brigand Fusilier 来源为核心同级卡。正式接线前需核对实体副本、召唤资格、初始姿态、区域与选招，不复制或改名当地普通怪，也不因描述卡入池而跳过来源校验。

## 12 号板块几何（R-258）

采用本表局部字母，仅为审阅定位，尚未写入生产区域 ID。以下区域容量、共边和角点经 R-258 核准；黑色凹口是墙体，不作为区域。

| 区域 | 图上位置                     | 容量 | 印刷标记                |
| ---- | ---------------------------- | ---- | ----------------------- |
| A    | 最上排左                     | 3    | 无                      |
| B    | 最上排中                     | 3    | 怪物 Aggressive         |
| C    | 最上排右                     | 3    | 怪物 Support            |
| D    | 左侧第二区，右边是竖长黑凹口 | 3    | 怪物 Defensive          |
| E    | 正中央大区                   | 3    | 无                      |
| F    | C 下方右侧区                 | 3    | 无                      |
| G    | F 下方靠右小区，左边是黑凹口 | 2    | 无                      |
| H    | D 下方、左下第二排           | 3    | 无                      |
| I    | E 下方、H 右侧中区           | 2    | 怪物 Ranged             |
| J    | 最下排左侧宽区               | 4    | 英雄 Defensive、Support |
| K    | 最下排中央窄区               | 3    | 英雄 Aggressive         |
| L    | 最下排右                     | 3    | 英雄 Ranged             |

- 可通行共边（16 对）：A–B、A–D、B–C、B–E、C–F、D–H、E–F、E–I、F–G、G–L、H–I、H–J、I–J、I–K、J–K、K–L。
- 仅角点：A–E、B–F、C–E、E–H、G–K，不当作通道；其余未列配对不补边。
- D–E 之间为竖长黑凹口墙体，E 右下为反 L 墙体阻隔；E–G 不可通行。
- I 容量为 2；C 怪物 Support、I 怪物 Ranged、J 英雄 Defensive／Support、L 英雄 Ranged，按更正后标记采用。
- 全部区域无高低地，均为 normal；无零容量区域。

## 审阅结案与后续接线边界

本表已列 I 级字段与几何经 R-258／R-259 核准，当前审阅项无剩余待确认。两段威胁来源均为 `DD_EN_WEALD_CARDS_70_120_Boss_Abilities_BACK.pdf` 第 10 页，即 `boss_ability:weald:p010` 背面。

下一步建立独立 Boss 数据，再核对核心同级 Fusilier 实体来源并接入增援、触发炮击、威胁、部署与回放。字段核准不等于运行时完成；本批未改生产数据或开放战斗。其它等级、Shrieker、Stygian 与 Q-186 的其它卡面不因此获批；Hag 跨任务验收缺口保留。
