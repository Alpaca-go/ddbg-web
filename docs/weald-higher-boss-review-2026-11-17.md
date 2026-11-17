# Weald 三 Boss 高等级接续审阅

状态：Hag II／III 数值及锅生命周期已由 R-267 核准；本稿的 Pounder／Shrieker II／III 卡面与专项细节待 Kyries 确认（Q-186）。不从 I 级推算，也不因卡面核实即开放正式入口。

## 官方来源与房间共用

本次逐面查看本地私有英文印刷图，缓存为 `node_modules/.cache/weald-review/`，不提交图像。

- Weald W3／W4：每个 Boss 找出其对应 Room Card 与 Room Tile，没有按等级更换房间的步骤。三个 Boss 房间正面 rooms p10／p11／p12 分别编号10／11／12，均不印等级。
- 因此标准／Radiant II／III 使用对应 Boss 的同一房间和板块：Hag 10（R-254）、Shrieker 11（R-261）、Pounder 12（R-258）。几何和标记沿用已核准实体，等级属性取各等级战斗卡。不将这条推广为 Stygian 房间替换。
- 本次查看 medium FRONT p21／22／24／25；large FRONT p5／6／8／9；Boss Abilities FRONT 与 BACK p5／6／11／12；rooms FRONT p10／11／12；规则书 W3／W4。Description 与非规则背面不作为本批已复核范围。
- 全部 PDF 位于官方 `MG_DD_06_EN_WEALD`，文件名与各 I 级审阅稿相同。页码按 PDF 页序；raw 仅核对身份和文字，不以提取文字代替图像。

## Brigand Pounder II／III

| 字段            | Pounder II p21                  | Pounder III p22 | Matchman II p24 | Matchman III p25 |
| --------------- | ------------------------------- | --------------- | --------------- | ---------------- |
| Life            | 70                              | 90              | 9               | 11               |
| Dodge           | 1                               | 2               | 3               | 4                |
| Speed           | 未印脚印，候选0                 | 未印脚印，候选0 | 1               | 1                |
| 类型            | 无类型行                        | 无类型行        | Human           | Human            |
| 内置 Protection | 有                              | 有              | 无              | 无               |
| 抗性            | 无                              | 无              | 眩晕／Shuffle   | 眩晕／Shuffle    |
| 免疫            | 眩晕／流血／腐蚀／减益／Shuffle | 同左            | 无              | 无               |

Pounder 没有 Large 标签，不因炮的模型或原画大小增加占格；Matchman 也只按实际卡面处理。

| 技能              | 目标／射程／最多目标      | II Crit／暴伤；Acc／普伤 | III Crit／暴伤；Acc／普伤 | 效果           |
| ----------------- | ------------------------- | ------------------------ | ------------------------- | -------------- |
| BOOOOOOM!         | Crowded／0–5／4           | 0／24；10／12            | 0／34；11／17             | 命中目标压力+2 |
| Fire in the Hole! | Brigand Pounder／0／1怪物 | 无印刷攻击数值           | 无印刷攻击数值            | 立即触发炮击   |

- Abilities p11／p12：每轮1行动。II 增援为一名同级 Matchman＋一名同级核心 Brigand Bloodletter；III 为一名同级 Matchman＋两名同级核心 Brigand Raiders，均印 if not already in play。
- 待确认：是否沿 R-258，只有 Matchman 不在场才发动，并补到上述组成、已有附属怪计数；Matchman 在场但其它附属怪缺失时不补？还是高等级分别补齐每种缺额？不把 I 级裁定自动扩范围。
- Fire in the Hole 是否沿 R-258 要求 Matchman 与 Pounder 同 Area，且 Pounder 不可自行炮击，待本批确认扩范围。
- Bullseye Guillotine II：进入怪物姿态轨 Ranged 槽，Buff 2t＋Riposte 2t；III 为3t＋3t。不是棋盘区域进入，也不是每回合刷新。
- Bombardment II／III：日末、移走村庄英雄前，d10对应建筑；有英雄时受7／9伤口，否则尽可能降级；Caretaker在场无事发生。沿用 R-259 的时序与例外是否扩范围，待确认。

## Shrieker II／III

| 字段  | Shrieker II p5         | Shrieker III p6 | Nest II p8                      | Nest III p9 |
| ----- | ---------------------- | --------------- | ------------------------------- | ----------- |
| Life  | 60                     | 72              | 30                              | 40          |
| Dodge | 3                      | 4               | 未印，候选0                     | 未印，候选0 |
| Speed | 3                      | 3               | 未印，候选0                     | 未印，候选0 |
| 类型  | Eldritch／Beast／Large | 同左            | Large                           | Large       |
| 抗性  | 眩晕／流血／Shuffle    | 同左            | 无                              | 无          |
| 免疫  | 腐蚀                   | 腐蚀            | 眩晕／流血／腐蚀／减益／Shuffle | 同左        |

| 技能            | 目标／射程／最多目标 | II Crit／暴伤；Acc／普伤 | III Crit／暴伤；Acc／普伤 | 效果                                     |
| --------------- | -------------------- | ------------------------ | ------------------------- | ---------------------------------------- |
| Peck            | Closest／1／1        | 2／15；10／11            | 2／20；11／15             | Self Pull1；目标流血 II=3／2t，III=3／3t |
| Call the Murder | Crowded／1／4        | 1／4；10／2              | 1／6；11／3               | Self Push2；目标压力+1                   |
| Regurgitate     | Crowded／2／2        | 1／4；10／2              | 1／6；11／3               | 目标减益2t、疾病                         |

- 四姿态统一左侧表：1–5槽1，6–9槽2，10槽3；右侧灰栏不参与。Nest无普通技能／选招。
- Abilities p5／p6：每轮3行动；Nest在场时只有Shrieker可进入其区域；Call the Murder替代Push2飞往Nest区域并治疗3／4。治疗归属、Acc之后且伤害之前、未命中／已在巢区也执行及无视路径／墙／距离／容量、不改姿态，R-262 已明确涵盖三个等级。
- Where Did It Go? II：在地牢将要获得补给时忽略该补给，不采用I级先获得再弃一枚。
- Where Did It Go? III：每获得一枚，选择从公共池弃两枚。待确认：沿R-262逐枚处理，满池先R-266容量待选、再弃两枚；若只有一枚则弃这一枚？
- Murder of Magpies II：全部英雄投完村庄supply dice后，从reserve选弃三枚；reserve不足三枚是否全弃，待确认。
- Murder of Magpies III：每名英雄出征前少掷1颗Supply Die（raw图标fe736ca63c）。是否只减常规骰、其它技能／事件额外骰照常，待确认。
- II忽略补给时，来自随机骰的补给仍掷骰／完成Wild选面再忽略，还是直接略过对应奖励骰与Wild选择，待确认。不能为存档RNG自行决定。

## 待确认汇总与接续

1. 核准两组卡面数值、未印Speed／Dodge采用0、威胁及上列已注明的通则扩范围。
2. Pounder高等级增援的触发条件与缺额补齐方式。
3. Shrieker II忽略随机补给的骰子／Wild处理；III补给弃两枚与II reserve弃三枚遇不足时的处理。
4. Shrieker III村庄减骰是否只影响常规骰。

核准后分别拆数据、Pounder增援／炮击／威胁、Shrieker技能／巢穴／两段威胁、正式入口与版本日志、阶段页面及收尾PR。Hag已核准运行时与官方房间共用的正式接线不等待其它两Boss未知细节。
