# Weald Hag I：印刷映射与接线审阅

状态：**卡面候选待 Kyries 核准，沿用 Q-186；不登记新 R 编号。** 本批只修正官方 W4 已明确的空锅开战姿态与部署区域来源，不将下列候选写入 normalized 或开放 Boss 出征。

## 来源与实际查看范围

印刷根目录：`MG_DD_06_EN_WEALD`。来源 PDF 只读，渲染图只保存在忽略缓存 `node_modules/.cache/hag-review-2026-11-14/`；未提交美术。逐页渲染核对以下页面，文字提取仅用于定位：

| PDF                                                 | 页码与用途                                |
| --------------------------------------------------- | ----------------------------------------- |
| `DD_EN_WEALD_RULES.pdf`                             | W4，Hag 初始姿态、先攻及击败后移除锅      |
| `DD_EN_WEALD_CARDS_70_120_Boss_Abilities_FRONT.pdf` | p16 Hag I；p19 Cauldron I                 |
| `DD_EN_WEALD_CARDS_70_120_Boss_Abilities_BACK.pdf`  | p16 地牢／村庄威胁                        |
| `DD_EN_WEALD_CARDS_140x140_monster_large_FRONT.pdf` | p10 Hag I；p13 Cauldron Empty I           |
| `DD_EN_WEALD_CARDS_140x140_monster_large_BACK.pdf`  | p10 通用 Boss I 卡背；p13 Cauldron Full I |
| `DD_EN_WEALD_CARDS_63x88_rooms_FRONT.pdf`           | p10，10—Hag，Boss 房                      |
| `DD_WEALD_TILES_BACK.pdf`                           | p5，10 号板块全图；尚未做逐区几何核准     |

另查看本机印刷审阅缓存中 Boss Abilities p13 正反面（Hag I Description）及 p19 背面（Cauldron Boss Ability I 卡背）。不采用旧 TTS 页序或 FAQ 作为本批规则来源（R-001）。

## 官方规则书已有结论

Weald W4 与现有规格书 W-05 一致：

- Hag 在 Aggressive；Cauldron 在 Ranged，各放到对应的印刷区域。
- 开战建立 3 张怪物、4 张英雄的先攻牌堆。空锅轮到时不执行动作。
- Hag 被击败后将锅移出游戏。

上述不依赖新图标命名。本批将旧 `hagICauldronBattleStartStance()` 的 Aggressive 修正为 Ranged，并移除以同姿态英雄所在区域充当怪物部署区域的回退；现在必须提供显式 `monsterStanceAreas` 且该区域存在，否则原子拒绝（R-048）。

不要把 Hag Abilities 印刷的 `ACTIONS / Round: 2` 与 W4 的整场 3 张怪物先攻混为一谈。旧 `combatEntry.printedInitiativeCards: 2` 是 Hag 自身声明，不能简单改成 3 再另加锅的一张。当前 `startRound` 尚无 Hag 专属补牌适配；完整 Hag 两次＋锅一次、空锅跳过与行动顺序留后续接线，不声称本批已修好整个先攻流程。

## 印刷身份映射

以下真实 raw ID 已可追溯，但暂不替换运行时常量；锅的 Full 是同一实体卡背面，不增加一份组件。

| 内容              | 当前旧占位                                                                          | 印刷来源与真实 raw ID                                                       |
| ----------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Hag I Description | `boss_ability:weald:hag:p001`                                                       | Boss Abilities p13，`boss_ability:weald:p013`                               |
| Hag I 能力／威胁  | `boss_ability:weald:hag:p002`                                                       | p16，`boss_ability:weald:p016`                                              |
| Cauldron I 能力   | 未完整接入                                                                          | p19，`boss_ability:weald:p019`                                              |
| Hag I 战斗卡      | `monster_large:weald:hag:p001`                                                      | large FRONT p10，`monster_large:weald:p010`                                 |
| Empty／Full I     | `monster_large:weald:cauldron_empty:p001`／`monster_large:weald:cauldron_full:p001` | large p13 正／反面，raw 为 `monster_large:weald:p013`；背面运行身份方案待定 |
| Hag Boss 房       | 未接正式部署                                                                        | rooms p10，`room:weald:p010`；TILES BACK p5                                 |

脚本 ID `boss:weald:hag:1` 与卡牌页码身份分开。迁移须覆盖内容包注册、威胁池、Face the Threat、战斗引用、存档与旧别名；不能只改几个常量，也不能将 p10／p13 加入普通 14 实体池。

## 卡面字段候选（Q-186）

下表是供核对的候选，**尚未授予 combatReady**。Crit／Acc 标签旁数沿用 R-230 的读法；未印刷数值不自填。R-232 已确认 Large 占两格及右侧灰栏不参与选招，不重复送审这条通则。

| 字段                     | Hag I（large FRONT p10）                 | Empty I（FRONT p13）            | Full I（BACK p13）    |
| ------------------------ | ---------------------------------------- | ------------------------------- | --------------------- |
| 印刷类型／等级           | Human—Large／I                           | Large／I                        | Large／I              |
| 心形 Life                | 60                                       | 66                              | 9                     |
| 顶部脚印旁数，Speed 候选 | 1                                        | 0                               | 0                     |
| Dodge 候选               | 生命上方两个蓝脚印方格：2                | 未见蓝脚印方格，0 候选待核准    | 同左                  |
| Protection 候选          | 未见白护甲方格                           | 心形上方一个护甲方格：1         | 未见护甲方格          |
| 抗性候选                 | 腐蚀                                     | 空                              | 空                    |
| 免疫候选                 | 眩晕、Shuffle                            | 眩晕、流血、腐蚀、减益、Shuffle | 与 Empty 同组         |
| 左侧彩色姿态表           | A／D／R／S 共用：1–6 技能 2；7–10 技能 3 | 无普通选招表／技能块            | A／D／R／S 共用技能 1 |

Empty 与 Full 的生命不相同；旧单测里的 `100`／`120` 是人工构造测试值，不是印刷值，禁止据此生成正式目录。

### Hag 技能候选

| 技能                   | 目标     | 射程／最多目标候选 | Crit／暴伤 | Acc／普伤  | 效果及需核对边界                                                                                 |
| ---------------------- | -------- | ------------------ | ---------- | ---------- | ------------------------------------------------------------------------------------------------ |
| 1 Into the Pot         | Closest  | 1／1               | 未印刷     | 10／未印刷 | Self → Pull 1；命中目标 Put in the Cauldron。不能因未印刷伤害而自行填 0 或沿用其他怪物的攻击数字 |
| 2 Meat Tenderizer      | Crowded  | 1／3               | 1／5       | 9／3       | 无额外效果文字                                                                                   |
| 3 Season to Perfection | Furthest | 2／1               | 0／2       | 10／1      | 目标减益 2t、压力 +1 候选                                                                        |

Hag Abilities p16 明写每轮两次行动；轮到 Hag 且没有英雄在锅里时，先用 Into the Pot!，之后再用一个技能。如何把能力强制选招、普通姿态表与整场先攻配合实现，须在正式场景验证，不能从旧测试的 Bone Soldier 技能模板补数值。

### Cauldron 技能与生命周期候选

- Full 的 Boil：Closest，射程 0／最多 1 目标候选，Crit 1／暴伤 9，Acc 12／普伤 5，目标压力 +1 候选；空锅没有 Boil，不能复制 Full 技能给 Empty。
- Abilities p19：锅开场 Empty；英雄入锅时翻 Full 并清掉锅的伤口；锅内英雄不能移动或被 Shuffle（蓝色双箭头语义候选）。
- 锅受伤达到其 Life，或锅内英雄到达 Death's Door 时，将英雄放在邻接区域，锅翻回 Empty 并清伤口。邻接有多个合法区域／容量不足时的选择沿用已存在规则与 PendingChoice，不能指定默认格。
- 英雄入锅后的棋子、姿态标记、可选目标、先攻归属、持续状态结算，以及从空锅到满锅的 Life／Protection 更新，须逐项核对核心规则及卡面；本批不补猜测状态机。
- 当前旧 morph 仅能改卡名／Life／伤口；它不是完整英雄入锅。锅死亡、释放英雄、翻面清伤口与 Hag 击败清场不能当普通击杀复用而不核对。

### 威胁候选

Abilities BACK p16：Painfully Soothing I 在英雄使用 Potion 时压力 +1；No Rest for the Wicked I 使 Sanitarium 少治疗 3 Life。图标候选与文案需一并核准，并核对新卡 ID 的绑定；旧被动 helper 的存在不代表新的印刷目录已经获批。

## I 级阶段收尾核对

五普通任务固定种子场景、XP／回村与严格存档已补齐，阶段浏览器冒烟已有记录。仍需区分下列边界：

1. 普通九房几何 R-234–R-239 已核准；当前 schema 的 `usable` 显式为 false。现行普通任务通过已选包＋任务白名单＋独立 Weald 选择器运行，不能把泛用地点闸门的全开放当作收尾小改动。
2. 不提升 Boss 房／Stygian 的几何或运行资格；10 号板块仍需逐区登记部署、容量、邻接、墙与高低地。不能从普通房间审批类推。
3. 固定种子逐任务成功不等于同一战役连续通关；旧真菌／Patrol 存档限制仍按前批记录，不静默修补。
4. 步骤 1–4 的总体状态还包含未验收边界，不因五任务有场景就一并标为完成。Hag I 仅进入步骤 6 的前置核对，正式 Boss 闭环尚未完成。

## 后续最小接线顺序

1. 核准本表 Hag／锅属性、技能及图标；继续转录并核准 10 号板块几何，沿用 Q-186。
2. 决定锅正反面运行身份与旧别名兼容，建立独立 Boss 目录，不进入普通池。
3. 接专属部署、整场 3／4 先攻、空锅跳过，再接英雄入锅／释放与锅完整生命周期；未核准部分继续原子拒绝。
4. 接 Hag I 正式战役入口、胜利清场、XP／回村／日志存档，最后做 1–3 条关键路径冒烟；完成后才进入 Brigand Pounder。

本批待确认字段已全部放在上面的候选表；未新增裁定或复制旧 TTS 来源为正式数据。
