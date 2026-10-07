# 规则裁定

2026-10-06 Kyries 授权助手先按规则书给出暂定裁定，Kyries 可随时推翻。

本文件记录本项目对规则歧义的裁定。规则书没写清、图标缺失，或资料互相冲突时，不在代码或规格书里自行补规则或数值。先查本文件；没有对应裁定时，在 PR 里提出待确认项，等写入裁定后再实现。

## 格式

已裁定条目使用编号 `R-xxx`（从 `R-001` 起），每条包含：

- **编号**
- **日期**
- **问题**
- **裁定**（属于本项目的结论时，标明「本项目裁定」）
- **依据 / 出处**
- **关联待确认**：`Q-xx`（如有）
- **状态**：已裁定 / 已取代；R-002 起还使用「依据规则书」「依据印刷件」「暂定（规则书未写明）」「延后」「需 Kyries 决定（非规则问题）」「Kyries 已确认（2026-10-06）」

R-002~R-052 是 2026-10-06 授权下的暂定结论，Kyries 推翻前按这些结论写说明书。理由、被否决的备选，以及和说明书 v0.1 原推荐不同的地方，见 [docs/rulings-notes.md](rulings-notes.md)。

## 流程

Kyries 最终拍板。2026-10-06 授权助手先按规则书写下暂定裁定；这些裁定可以随时推翻。推翻时在对应条目改状态，并回改 [核心规则说明书](spec/core-rules-spec-v0.2.md)。

## 已裁定

### R-001

- **编号**：R-001
- **日期**：2026-10-06
- **问题**：FAQ / 设计师 FAQ 能否作为规则来源（对应大纲 §7 第 4 条）
- **裁定**（本项目裁定）：不使用模组 FAQ 或设计师 FAQ，只认官方规则书。规则书没写清的，由 Kyries 在本文件裁定。
- **依据 / 出处**：Kyries 拍板
- **关联待确认**：无
- **状态**：已裁定

### R-002

- **编号**：R-002
- **日期**：2026-10-06
- **问题**：光照各档效果；光照 2–1「承受压力 +1」怎么计
- **裁定**：光照 5：英雄 Dodge +1（只在恰好为 5 时）；4–3：英雄和怪物 Crit +1；2–1：英雄**每次承受压力事件**额外 +1（按事件计，不按点数）；0：怪物 Dodge +1、Acc +1。4→0 逐级累加（光照 1 = Crit +1 + 压力 +1；光照 0 = 三项全有）。同一次压力事件里的所有「额外 +N」（光照、Nervous、The Worries）一次性加总，加出来的压力不再触发这些修正。
- **依据 / 出处**：R29 光照图示和正文（「when Heroes suffers Stress, they gain +1」「Effects from 4 to 0 are cumulative」「the bonus of +1 [Dodge] is lost if the Light is not on 5」）
- **关联待确认**：Q-01
- **状态**：依据规则书

### R-003

- **编号**：R-003
- **日期**：2026-10-06
- **问题**：陷阱攻击怎么随地牢等级缩放
- **裁定**：陷阱 = 对掷骰英雄的一次攻击：Acc 8、Crit 2 **固定**；命中伤害 2 × DL，暴击伤害 4 × DL。命中阈值 = 8 − 英雄 Dodge（含光照 5 的 +1、Quick / Slow Reflexes ±2）；暴击阈值 2 不受 Dodge 影响。可以改用 1 个 Tool 抵消。陷阱不是英雄也不是怪物，不吃光照 4–0 的 Crit / Acc 加成。暴击的压力见 R-031，「伤害」性质见 R-026。
- **依据 / 出处**：R14 正文「roll an attack of Acc 8 2[伤害]/Dungeon Level, Crit 2 4[伤害]/Dungeon Level」；AID-Expl；OR24-p3（DL1 下命中 2、暴击 4）
- **关联待确认**：Q-02
- **状态**：依据规则书

### R-004

- **编号**：R-004
- **日期**：2026-10-06
- **问题**：Guild 费用图标是不是金币
- **裁定**：是金币。英雄等级 +1 = 4 XP + 2 金；某个技能等级 +1 = 2 XP + 1 金；一次访问最多 2 项；旧卡永久移出；Guild 不可升级。BLD p1 和 R4 部件图里渲染不出来的「3Xp」文字视为旧设计残留，忽略。
- **依据 / 出处**：R34 Guild 段（渲染图为金币图标）；R33；HB Guild 格「2 [金币] 4Xp / 1 [金币] 2Xp」
- **关联待确认**：Q-03
- **状态**：依据规则书

### R-005

- **编号**：R-005
- **日期**：2026-10-06
- **问题**：死门骰骰面
- **裁定**：10 面 = 3 面骷髅 + 7 面空白。战役中掷出骷髅 = 致命一击（3/10）；PvP 反过来，空白 = 致命一击（7/10）。
- **依据 / 出处**：R37「the Deathblow chance in PvP is 7 out 10」（反推 3 面骷髅）；DICE-DD 展开图印证
- **关联待确认**：Q-04
- **状态**：依据规则书

### R-006

- **编号**：R-006
- **日期**：2026-10-06
- **问题**：英雄的 Wounds / Life / Dodge 在卡面上怎么表示
- **裁定**：英雄卡：Dodge（数字叠在 Dodge 图标上）、Life（心形里的数字）、Speed（靴子个数）、抗性 / 免疫栏、死门骰槽、村庄技能；伤口用代币放在英雄卡上计数。饰品槽 = 英雄卡左缘的钱袋图标（个数 = HL）；技能槽在英雄面板上（R-051）。卡面数值留到 Phase 1 转录。
- **依据 / 出处**：R10「Anatomy of the Hero Boards」；R19；R24；HERO-F p1–2（左缘钱袋图标）
- **关联待确认**：Q-05
- **状态**：依据规则书

### R-007

- **编号**：R-007
- **日期**：2026-10-06
- **问题**：英雄 II / III 级卡是否齐全
- **裁定**：齐全，关闭。核心盒英雄卡共 23 张 = 10 名英雄 × 2 张（I/II 级做在同一张卡的正反面，III 级单独一张、背面是卡背）+ Abomination 3 张（I、II、III 各一张，正反面为两种形态）。与 R4 的「23 Hero」一致。
- **依据 / 出处**：HERO-F p1–23 与 HERO-B p1–23 逐页对照（例：HERO-F p1 = Crusader I，HERO-B p1 = Crusader II，HERO-B p2 = 卡背）；R4
- **关联待确认**：Q-06
- **状态**：依据印刷件

### R-008

- **编号**：R-008
- **日期**：2026-10-06
- **问题**：Musketeer 是否纳入首版
- **裁定**：首版不纳入，先做核心盒 11 名英雄；Musketeer 印刷数据齐全（英雄卡、技能卡、指示物板都有），按通用英雄规则使用，无需新规则，以后单独加入。
- **依据 / 出处**：`WAVE 1/MG_DD_08_EN_MUSKETEER/` 文件清单；大纲 F.5；Kyries 于 2026-10-06 确认助手建议
- **关联待确认**：Q-07
- **状态**：Kyries 已确认（2026-10-06）

### R-009

- **编号**：R-009
- **日期**：2026-10-06
- **问题**：Crimson Court 是否附带英雄
- **裁定**：不附带，关闭。
- **依据 / 出处**：`WAVE 1/MG_DD_03_EN_CRIMSON_COURT/` 全部 16 个文件中没有英雄卡和技能卡（只有怪物、Boss、Curio、任务、房间、板块、指示物板）
- **关联待确认**：Q-08
- **状态**：依据印刷件

### R-010

- **编号**：R-010
- **日期**：2026-10-06
- **问题**：补给骰各面的效果
- **裁定**：Food = Heal 1，或在探索中抵消 Hunger；Bandage = 移除所有 Bleed，或 Heal 1；Potion = 移除所有 Blight，或压力 −1；Torch = 光照 +1，或（在抽 Curio **之前**使用）忽略该 Curio 的全部负面效果；Tool = **只能**用来抵消探索危害 Trap / Rubble；Wild = 翻到任意一面。
- **依据 / 出处**：R12 正文（文字完整，无缺图标）；R14（Torch 须在抽卡前）；AID-Prov
- **关联待确认**：Q-09
- **状态**：依据规则书

### R-011

- **编号**：R-011
- **日期**：2026-10-06
- **问题**：Stygian 房间卡的具体数值
- **裁定**：以 17 张 Stygian 房间卡的转录为准，规则层面不另作裁定。
- **依据 / 出处**：占位：转录完成前，引擎不开放 Stygian 模式
- **关联待确认**：Q-10
- **状态**：延后（等 Phase 1 转录 ROOMS-S p1–17）

### R-012

- **编号**：R-012
- **日期**：2026-10-06
- **问题**：探索骰空白面
- **裁定**：无事发生：不触发任何危害，也不算「掷出 Curio」（不触发 Hoarder 等）。
- **依据 / 出处**：DICE-E 展开图（6 面中有 1 面无图案）；R14 与 AID-Expl 只列出 5 种危害
- **关联待确认**：Q-11
- **状态**：依据印刷件

### R-013

- **编号**：R-013
- **日期**：2026-10-06
- **问题**：侦察后「只掷 1 颗」的适用范围
- **裁定**：只限侦察后**紧接着的那一次**探索（Radiant 模式为 0 颗）；之后即使走向已翻开的房间，也恢复为每人 2 颗（Radiant 1 颗）。
- **依据 / 出处**：R14「during their next Exploration and only then」；OR24-p4
- **关联待确认**：Q-12
- **状态**：依据规则书

### R-014

- **编号**：R-014
- **日期**：2026-10-06
- **问题**：两份 Old Road 文件哪份为准
- **裁定**：以 OR24（文件名**不带** V2，2024-04-17 导出）为准；OR22（文件名带 V2，2022-09-05 导出）只作历史参考。Old Road 是教程，只用来佐证规则书。
- **依据 / 出处**：两份 PDF 的元数据（CreationDate 分别为 2024-04-17、2022-09-05）；裁定原则 1；OR24-p1「this is NOT a rulebook」
- **关联待确认**：Q-13
- **状态**：依据规则书

### R-015

- **编号**：R-015
- **日期**：2026-10-06
- **问题**：怪物卡底部「姿态 → 技能」怎么读
- **裁定**：4 个姿态图标从左到右为 Aggressive → Defensive → Ranged → Support；相邻的一组姿态共用右边的标签；标签是单个技能号就直接用，是 d10 区间表就掷 d10。大型怪按所占两格中**优先级较高**的姿态读。Phase 1 schema：`stanceGroups[]: { stances[], skill | rollTable[] }`。
- **依据 / 出处**：R22 图示（Bone Defender 分组框 + d10 小图标）；R24「Stance/Skill Eligibility」；R17；OR24-p7（Bloodletter 掷 9 → 技能 3）
- **关联待确认**：Q-14
- **状态**：依据规则书

### R-016

- **编号**：R-016
- **日期**：2026-10-06
- **问题**：Debuff 让谁受益
- **裁定**：只有**以被 Debuff 角色为目标的敌人**每堆 +1 Crit；友方（例如给他治疗的队友）不受益。辅助卡「the others」与规则书冲突，以规则书为准。
- **依据 / 出处**：R21「Characters targeting a debuffed enemy gain +1 Crit against them per stack」；AID-Cond（冲突，不采用）
- **关联待确认**：Q-15
- **状态**：依据规则书

### R-017

- **编号**：R-017
- **日期**：2026-10-06
- **问题**：Riposte 的触发与计算
- **裁定**：①【依据规则书】只有实际**受到来自敌人的伤害**（命中或暴击，且减免后仍 ≥ 1）才触发；落空不触发（辅助卡「When attacked」与规则书冲突，以规则书为准）。②【依据规则书】反弹量 = ⌈D / 2⌉，D 为 **Protection 减半之前**、其他修正之后的伤害（「先 Riposte 后 Protection」），顺序见 R-026。③【暂定】反弹伤害不是「攻击」：不会再触发对方的 Riposte，不被 Protection 减半，不算暴击；但它是「伤害」，会触发受害者「受到伤害时」类怪癖 / 疾病，并照常引起死亡或死门判定。
- **依据 / 出处**：R21 Riposte 与 Protection 条
- **关联待确认**：Q-16
- **理由与备选**：见 [docs/rulings-notes.md](rulings-notes.md)
- **状态**：暂定（规则书未写明）

### R-018

- **编号**：R-018
- **日期**：2026-10-06
- **问题**：持续型状态在移除最后一枚代币后，本回合是否还有效
- **裁定**：Buff / Debuff / Guard / Mark / Riposte / Protection：只要该堆还有 ≥ 1 枚代币就有效；回合开始时移除最后一枚，该堆**立即失效**，本回合不再生效。推论：自己回合里给自己加的 Nt 状态，有效期 = 本回合剩余时间 + 之后的 N − 1 个自己回合（1t 只在本回合剩余时间有效）。黄金测试 G-03、G-08 都符合。
- **依据 / 出处**：R21（Protection「As long as the character has one or more Protection stacks」；Buff「+1 Crit per stack」，按堆存在与否判定）；R20 例（剩 1 枚 =「will last one more turn」）；OR24-p7
- **关联待确认**：Q-17
- **状态**：依据规则书

### R-019

- **编号**：R-019
- **日期**：2026-10-06
- **问题**：Mark、Protection 是否按堆叠加
- **裁定**：Mark 按堆叠加（每堆 Acc +1）。Protection 不叠加：有 ≥ 1 堆即「来自攻击的伤害」减半（向上取整）；怪物卡内置 Protection 视为始终存在、不可移除，与代币 Protection 同时存在时也只减半一次。
- **依据 / 出处**：R21 Mark、Protection 条及「Important: … built-in Protection」
- **关联待确认**：Q-18
- **状态**：依据规则书

### R-020

- **编号**：R-020
- **日期**：2026-10-06
- **问题**：Push / Pull 的路径、同区、大型怪、站位脱节
- **裁定**：① 每移 1 个区域，目标与使用者所在区域的距离必须 −1（Pull）或 +1（Push）；有多个候选区域时，**英雄技能由使用者的玩家选，怪物技能由被位移英雄的玩家选**。② 目标与使用者同区：Pull 在区域上不动；Push 的第一步可去任一相邻区域（选择者同 ①）；姿态轨照常移动。③ 大型怪在姿态轨上作为 2 格整体移动 X 格，其他角色顺移，到轨道头尾即止。④【依据规则书】区域移动被满员区域截断时，姿态轨照常移动，允许站位与区域脱节。抗性：区域和姿态各少移 1；免疫：都不动；英雄位移自己时可以无视自己的抗性 / 免疫。
- **依据 / 出处**：R21 Shuffle 条；R22 例；R24（多个可选区域时由被选为目标的玩家决定，类推）
- **关联待确认**：Q-19
- **理由与备选**：见 [docs/rulings-notes.md](rulings-notes.md)
- **状态**：暂定（规则书未写明）

### R-021

- **编号**：R-021
- **日期**：2026-10-06
- **问题**：区域几何：相邻、距离、穿过、墙
- **裁定**：① 相邻 = 两个区域共享一段边界，且中间没有黑色墙体；只有角点相接不算相邻。② 距离 = 区域邻接图上的最短步数（射程、Speed、Closest / Furthest 都用它）。③【依据规则书】移动途中可以穿过满员区域和有敌人的区域，只是回合结束时不能停在满员区域。④ 房间板块上的黑色矩形不是区域，不可进入，按墙处理（等同 Crimson Court 规则书所称的 Impassable Walls）。Phase 1 标注 schema：每块房间板块显式标注区域节点、容量、高低地、英雄 / 怪物起始区、「!」标记、邻接边；每条边带一个「仅角点相接」标志，以便以后改判时只改数据。
- **依据 / 出处**：R18（只禁止「end their turn」在满员区域；第 1 个移动行动可以停在满员区域、再用第 2 个行动离开）；R19「spaces away」；R24；TILES；DD_EN_CRIMSONCourt_RULES.pdf p4
- **关联待确认**：Q-20
- **理由与备选**：见 [docs/rulings-notes.md](rulings-notes.md)
- **状态**：暂定（规则书未写明）

### R-022

- **编号**：R-022
- **日期**：2026-10-06
- **问题**：高地「射程 +1（可选）」
- **裁定**：攻击者所在区域比目标所在区域高（高地 > 普通 > 低地）时：Acc +1；并且对这类更低的区域，射程上限 +1（射程 a–b 变为 a–(b+1)），原射程照样可选。从低打高没有惩罚。对友方（例如治疗）同样适用。
- **依据 / 出处**：R25「When a character targets a creature in an area with lower elevation than theirs, they gain Range +1 (optional) and +1 Acc」
- **关联待确认**：Q-21
- **理由与备选**：见 [docs/rulings-notes.md](rulings-notes.md)
- **状态**：暂定（规则书未写明）

### R-023

- **编号**：R-023
- **日期**：2026-10-06
- **问题**：怪物移动细节
- **裁定**：①【依据规则书】目标已在射程内 → 不移动。② 不在射程内 → 在 Speed 以内移动到与目标距离落在射程内的区域，需要时**可以后退**拉开距离。③ 有多个可去区域时由被选为目标的玩家选；目标是区域（Crowded）时，由该区域里姿态优先级最高的英雄的玩家选。④ 移动后仍够不到 → 移动到离「能出手的位置」步数最少的区域，然后跳过本回合剩余部分。不能停在满员区域（大型怪挤占规则除外）。
- **依据 / 出处**：R24 第 3 步「positioning itself in order to take its action according to the Skill's Range」「the targeted player(s) decide where it goes」；OR24-p7、p8「already in range and doesn't need to move」
- **关联待确认**：Q-22
- **理由与备选**：见 [docs/rulings-notes.md](rulings-notes.md)
- **状态**：暂定（规则书未写明）

### R-024

- **编号**：R-024
- **日期**：2026-10-06
- **问题**：选目标的平手与 Guard
- **裁定**：① Crowded 平手（几个区域英雄数相同）→ 选包含姿态优先级最高英雄的那个区域。② Guard：只要场上有 Guard 英雄，怪物不以友方为目标的技能必须选 Guard 英雄（多名时按姿态顺序）；够不到就按 R-023 移动，仍够不到就跳过。英雄对有 Guard 的怪物同理：不以友方为目标的技能必须把 Guard 敌人选为目标之一，做不到就不能使用该技能。③【依据规则书】Closest / Furthest 按区域距离，同距离多人按姿态顺序。
- **依据 / 出处**：R19；R21「Characters must always target Guard enemies when using Skills that don't target allies」；R24「a character with the Guard status must be targeted first」「prioritize by Stance」
- **关联待确认**：Q-23
- **理由与备选**：见 [docs/rulings-notes.md](rulings-notes.md)
- **状态**：暂定（规则书未写明）

### R-025

- **编号**：R-025
- **日期**：2026-10-06
- **问题**：技能「成功使用」的定义
- **裁定**：只有「掷了骰且**所有**目标都落空」才算没成功（可以本回合再用）。其余都算成功、本回合不能再用：至少命中 1 个目标；技能没有 Acc（不掷骰直接生效）；选了空区域（没有目标可落空）。
- **依据 / 出处**：R19「if the Skill is used successfully (it didn't miss its target) then the Hero cannot use that Skill again during the same turn」
- **关联待确认**：Q-24
- **理由与备选**：见 [docs/rulings-notes.md](rulings-notes.md)
- **状态**：暂定（规则书未写明）

### R-026

- **编号**：R-026
- **日期**：2026-10-06
- **问题**：Damage 与 Wound 的区分；伤害修正顺序
- **裁定**：①「伤害（Damage）」只指**攻击**造成的伤害：英雄 / 怪物技能的命中和暴击、探索陷阱攻击、Riposte 反弹（R-017）。Bleed / Blight、Hunger、Rubble、Trap Room、Curio、怪癖和疾病自己造成的伤口（Light Sensitive、Syphilis、Fragile 的追加伤口等）都是「伤口（Wound）」：不触发「takes Damage」类效果（Clumsy、Fragile、Off Guard、On Guard、Spotted Fever、Syphilis），不被 Protection 减半。任何来源的伤口都触发死门判定。② 一次伤害的结算顺序：基础值（命中值或暴击值）+ 类型加成（+X vs …）+ 攻击方修正 → 防御方加减（On Guard −1 等）→ 暴击减半类（Hard Skinned）→ 计算 Riposte 反弹量 → Protection 减半 → 结果 ≥ 1 才算「受到伤害」→ 放伤口代币，同时放追加伤口（Fragile +1、Syphilis +HL）。所有减半向上取整；同一时刻的伤口只掷一次死门骰。**建议做成可配置项** `damageIncludesAllWounds`（默认 false）。
- **依据 / 出处**：R19「apply Wound on the Target equal to the Damage」；R21 Protection「half Damage … from attacks」、Riposte、Bleed「suffers Wounds」；R14；R15 Trap Room「Wounds and/or Stress」；R26–R28 怪癖疾病措辞；R29
- **关联待确认**：Q-25
- **理由与备选**：见 [docs/rulings-notes.md](rulings-notes.md)
- **状态**：暂定（规则书未写明）

### R-027

- **编号**：R-027
- **日期**：2026-10-06
- **问题**：战斗中使用补给的时机
- **裁定**：任何英雄都可以在以下时点把补给作为免费行动使用：任一回合抽先攻卡之前；抽出先攻卡后、结算回合开始效果之前；英雄回合里每个行动之前或之后；怪物回合中「定好技能、目标并移动之后，掷骰之前」。**不能**插在掷骰之后、结算完成之前（饰品例外，见 R-028）。效果作用于被选定的英雄（Stress Eater 等算在该英雄身上）。
- **依据 / 出处**：R12「They can be used any time by any Hero … as a free action during Battle」；R18
- **关联待确认**：Q-26
- **理由与备选**：见 [docs/rulings-notes.md](rulings-notes.md)
- **状态**：暂定（规则书未写明）

### R-028

- **编号**：R-028
- **日期**：2026-10-06
- **问题**：饰品使用时机
- **裁定**：① 战斗中每件饰品在**任意一个角色的回合**里至多用一次（包括敌人的回合），不限于持有者自己的回合。②【依据规则书】可以在看到掷骰结果之后、结算之前决定使用；引擎在「掷骰后、结算前」给持有适用饰品的英雄开一个可选窗口。③【依据规则书】战斗外没有每回合次数限制，但仍按正面 → 反面 → 正面交替，且只在效果适用时使用；反面也由玩家在适用时机自行选择使用。
- **依据 / 出处**：R26 正文「In battle, a Trinket can be used only once per turn」和 Critical Stone 例
- **关联待确认**：Q-27
- **理由与备选**：见 [docs/rulings-notes.md](rulings-notes.md)
- **状态**：暂定（规则书未写明）

### R-029

- **编号**：R-029
- **日期**：2026-10-06
- **问题**：大型怪生成的边界情况
- **裁定**：抽到的大型怪**放不下**时（不论场上已有几只怪），弃掉最后生成的那只非大型怪，放入大型怪，必要时把怪物往 Aggressive 方向挪。后排大型怪从后往前找到第一个空位后，再占它前面（朝 Aggressive）的一格。被弃掉的那张怪物卡算本场战斗用过的卡，战斗结束时一并洗回。
- **依据 / 出处**：R17 大型怪条（「If there are already three Monsters in play and you draw a large Monster that can't fit…」）
- **关联待确认**：Q-28
- **理由与备选**：见 [docs/rulings-notes.md](rulings-notes.md)
- **状态**：暂定（规则书未写明）

### R-030

- **编号**：R-030
- **日期**：2026-10-06
- **问题**：阵亡补位时棋子要不要移动
- **裁定**：只有姿态轨补位（后面的角色向前滑，最后一格留空）；其他角色的棋子留在原区域不动。大型怪阵亡空出 2 格，后面的角色前滑 2 格。
- **依据 / 出处**：R24–R25「Characters behind them in the Stance Tracker will slide to fill the position」（只提到姿态轨）
- **关联待确认**：Q-29
- **状态**：依据规则书

### R-031

- **编号**：R-031
- **日期**：2026-10-06
- **问题**：暴击压力的细节
- **裁定**：①【暂定】一次技能使用中：每名被暴击的英雄 +1；同区域里没被选为目标的英雄只 +1 一次，不论这次暴击了几名英雄。英雄打出暴击同理：一次技能使用不论暴击了几个目标，该英雄和同区英雄只 −1 一次。②【依据规则书】治疗暴击也算「打出暴击」，同区英雄压力 −1。③【依据规则书】探索陷阱暴击算「承受暴击」：**只有掷骰的英雄**压力 +1（并触发 Weak Grip、Shocker、Hard Skinned）；探索中没有区域，其他英雄不受影响。
- **依据 / 出处**：R20 暴击条；R20 例 2（治疗暴击称为 Critical Hit）；OR24-p8（Divine Grace）；OR24-p3（陷阱暴击：「your Hero also raises their Stress by 1」）；R14「Life or Stress losses only apply to the Hero you roll the dice for」
- **关联待确认**：Q-30
- **理由与备选**：见 [docs/rulings-notes.md](rulings-notes.md)
- **状态**：暂定（规则书未写明）

### R-032

- **编号**：R-032
- **日期**：2026-10-06
- **问题**：先攻「下一个行动者」何时确定
- **裁定**：抽到先攻卡的那一刻，在本轮还有剩余行动次数的同阵营角色里，按当前姿态优先级最高者确定；对应角色已死则该卡作废、再抽。伪代码照说明书 §6.3，关闭。
- **依据 / 出处**：R17；R30–R31 Shuffling Horror 例
- **关联待确认**：Q-31
- **状态**：依据规则书

### R-033

- **编号**：R-033
- **日期**：2026-10-06
- **问题**：抗性细节
- **裁定**：① 1t 状态遇到抗性 → 0t → 不放代币、没有效果。② 抗性只减持续回合，不减 Bleed / Blight 每回合的数值。抗性可与 Clotter / Thick Blooded / Hard Noggin 的「−1 回合」叠加。抗性只对有持续时间的状态和 Shuffle 起作用；免疫让对应效果完全无效（例如疾病免疫）。③ 卡面抗性 / 免疫图标对应哪种状态 → 数据问题，并入 R-048（Q-47）延后。
- **依据 / 出处**：R21 抗性与免疫条（「Resistance reduces the duration of the Condition by 1 turn … immunity negates the effect altogether」）
- **关联待确认**：Q-32
- **状态**：依据规则书

### R-034

- **编号**：R-034
- **日期**：2026-10-06
- **问题**：召唤怪物的棋子放在哪里
- **裁定**：姿态位：第一个空姿态位（Boss 规则写明具体姿态的按其写法，例如 Collector）。棋子：Boss 卡或该 Boss 特殊规则写明的优先——Necromancer 放在召唤技能的目标区域；Collector 放在 Defensive / Ranged / Support 对应区域；Mammoth Cyst、Shuffling Horror、Gestating Heart 放在姿态对应区域；没写明的放在姿态对应区域。该区域没空间：一名英雄移到最近的可用区域；被怪物占满则玩家选一只怪物移走。姿态轨已满 → 召唤无效。召唤物的先攻卡洗进**当前**牌堆，当轮可以行动。
- **依据 / 出处**：R31「(unless the Boss specifies otherwise)」；R11 / R30 Necromancer 卡图例「placed on the Target Area」；R38–R41 各 Boss 步骤
- **关联待确认**：Q-33
- **状态**：依据规则书

### R-035

- **编号**：R-035
- **日期**：2026-10-06
- **问题**：最终战「不能恢复 Life / 压力」的范围
- **裁定**：只指**形态切换之间**：形态之间不能休息、不能恢复 Life 或压力、不能自由重排姿态。战斗进行中，技能治疗、补给、Gestating Heart 的 Ichor 治疗都照常有效。
- **依据 / 出处**：R40（该句位于「the next phase begins」与「A new Initiative Deck is created」之间）；R36「There is no pause to rest, change Stances, etc when changing Boss forms」；R41 Gestating Heart
- **关联待确认**：Q-34
- **理由与备选**：见 [docs/rulings-notes.md](rulings-notes.md)
- **状态**：暂定（规则书未写明）

### R-036

- **编号**：R-036
- **日期**：2026-10-06
- **问题**：Stygian 模式的适用范围
- **裁定**：① 17 张 Stygian 房间卡替换同名的 17 张**非 Boss** 房间卡：Ruins 1–9 和最暗地牢 1–8。8 张 Boss 房间卡（Necromancer / Prophet / Collector / Fanatic / Templars / Shuffling Horror / Mammoth Cyst / Ancestor Room）没有 Stygian 版，照常使用。② 「All Bosses have +1 Crit」里的 Boss = 拥有自己 Boss Abilities 卡的角色：Necromancer、Prophet、Collector、Fanatic（各 I–III 级）、Templar Impaler、Templar Warlord、Mammoth Cyst、White Cell Stalk、Shuffling Horror、Ancestor 1st Form、Ancestor 2nd Form、Gestating Heart、Heart of Darkness。不包括 Pyre、Collected、Bone Rabble / Soldier / Spearman、Cultist Priest、Malignant Growth、Reflections、Absolute Nothingness，以及 Gestating Heart 召唤的最暗地牢怪物。
- **依据 / 出处**：ROOMS p1–25 与 ROOMS-S p1–17 卡名对照；BOSSAB p1–37；QUEST-p16~18「The Boss for this Quest is …」；R37「All Bosses have +1 Crit to their Skills」
- **关联待确认**：Q-35
- **状态**：依据印刷件

### R-037

- **编号**：R-037
- **日期**：2026-10-06
- **问题**：战役等级切换时的怪物牌堆和任务卡
- **裁定**：①【依据规则书】怪物牌堆累加：进入 II 级加入 II 级怪物，进入 III 级再加入 III 级怪物 → I + II + III。被永久移出游戏的怪物（例如 Necromancer I 的威胁）不回来。进入 III 级时，II 级饰品也改为只在 Nomad Wagon 使用，地牢里只抽 III 级饰品。②【暂定】已经进行过的任务卡（不论完成多少）不洗回任务堆；没选的那张永久弃掉；换等级时把旧等级任务堆整个移除。
- **依据 / 出处**：R35「Add the Level 2 Monsters … do the same thing for the Level 3 cards」；R11；R32 第 a 步洗回清单（不含任务卡）
- **关联待确认**：Q-36
- **理由与备选**：见 [docs/rulings-notes.md](rulings-notes.md)
- **状态**：暂定（规则书未写明）

### R-038

- **编号**：R-038
- **日期**：2026-10-06
- **问题**：任务 XP 是否封顶 3
- **裁定**：封顶 3。印刷件核对：按房间或目标计 XP 的任务，因为 Trap 房和 Dark 房永不清理（R15），按卡面房间构成算出的上限本来就是 3；唯一可能超过的是 Fundraiser（每交 20 金得 1 XP），按 R29 封顶 3 → 引擎最多允许交 60 金，并提示超出部分不再加 XP。
- **依据 / 出处**：R29「All Quests grant between 0 to 3 Xp」；R15；QUEST-p1~p19 卡面房间代币构成（例：Scout Ahead = 空 2、暗 1、Curio 2、巢穴 2、陷阱 1，可清理 6 间 → 上限 3）
- **关联待确认**：Q-37
- **状态**：依据规则书

### R-039

- **编号**：R-039
- **日期**：2026-10-06
- **问题**：新英雄的初始状态与剩余 XP
- **裁定**：新英雄获得驿站当前累计的全部 XP（驿站不扣），随即可以花**任意数量**的 XP 做至多 2 项升级（视同 Guild，不花金币）；**没花完的 XP 留在该英雄身上**（个人余额，以后去 Guild 用）。其余按开局「选英雄」流程：I 级英雄卡，7 张 I 级技能自选装备（槽数按等级），0 伤口、0 压力（白面），没有怪癖、疾病、饰品、苦难或美德。战斗中阵亡的，新英雄在战斗结束后加入；入队后在探索阶段自由调整姿态（默认放进空出的最后一个姿态位）。
- **依据 / 出处**：R31「immediately spends any Xp they want to make up to two upgrades」；R11 选英雄；R10 第 9 步；R14（探索阶段可换姿态）
- **关联待确认**：Q-38
- **状态**：依据规则书

### R-040

- **编号**：R-040
- **日期**：2026-10-06
- **问题**：Nomad Wagon 卖 + 买是否算一次
- **裁定**：一次访问可以卖 1 件已装备的饰品**并且**买 1 件陈列品（两件事都可选做）。这是对「每次访问只能选 1 项」的特别规定。
- **依据 / 出处**：R33 Nomad Wagon 段「A Hero visiting the Nomad Wagon can sell one of their equipped Trinkets and buy one from the available Trinkets」
- **关联待确认**：Q-39
- **状态**：依据规则书

### R-041

- **编号**：R-041
- **日期**：2026-10-06
- **问题**：Survivalist / Blacksmith III 给的补给骰
- **裁定**：在下一个任务的「掷补给」步骤中**掷出**（掷到 Wild 照常转面），不是自选面。先掷常规的每人 2 颗，再逐颗加入奖励骰，公共池到 16 颗即停，多出的作废。Radiant 模式下奖励骰不受「1 颗掷、1 颗选」影响。
- **依据 / 出处**：R34 Survivalist / Blacksmith「gain a Provision Die」；R12（上限 16，规则书明文）；R37 Radiant「for bonus dice provided by other effects, follow their rules as normal」；QUEST-p10「if possible」
- **关联待确认**：Q-40
- **理由与备选**：见 [docs/rulings-notes.md](rulings-notes.md)
- **状态**：暂定（规则书未写明）

### R-042

- **编号**：R-042
- **日期**：2026-10-06
- **问题**：村庄技能「准备天数 −1，当天立即结束」；看守人被移出的时效
- **裁定**：① Zealous Speech：只能由当天**第一个**行动的英雄使用（姿态顺序最前、当天还没人行动）；当天立即结束，这就是那一天的消耗（天数轨照常 −1），**不另外再扣 1 天**。②【依据规则书】当天其他英雄不能再访问建筑或使用村庄技能。③ Hellion「Intimidate: Remove the Caretaker from play」只在**当天**有效：看守人离开所占建筑，当天之后行动的英雄可以去；下一天开始照常掷看守人。
- **依据 / 出处**：R10 / R11 / R13 图例（「(Only as the first action of a day) Preparation Days -1 (Day ends immediately)」）；R33；HERO-F p1–2（印刷卡面只写「(Only as the first action of a day) (Day ends immediately)」，**没有**「Preparation Days -1」）；HERO-F p3–4（Hellion）
- **关联待确认**：Q-41
- **理由与备选**：见 [docs/rulings-notes.md](rulings-notes.md)
- **状态**：暂定（规则书未写明）

### R-043

- **编号**：R-043
- **日期**：2026-10-06
- **问题**：Abbey 能不能移除正面怪癖
- **裁定**：能。「Remove 1 / 2 Quirks」可以移除任意怪癖（正面或负面），由玩家选。规则书指正面时会明写「Positive Quirk」（同一建筑的「gain a Positive Quirk」），这里没有限定。
- **依据 / 出处**：R34 Abbey I–III 段
- **关联待确认**：Q-42
- **状态**：依据规则书

### R-044

- **编号**：R-044
- **日期**：2026-10-06
- **问题**：「在 Boss 任务中被击败」怎么判定
- **裁定**：① Boss 任务（三幕的 Face the Threat、最暗地牢任务、最终战）中**任何一场战斗**英雄全灭 = 战役失败；R25「全灭但驿站还有 4 人 → 按逃跑处理」不适用于 Boss 任务。② 单个英雄在 Boss 任务中阵亡：照常从驿站补人，新英雄在该场战斗结束后加入（Boss 战中阵亡的，Boss 战结束即任务结束，新英雄回村时加入；最终战各形态之间不补人）。③ Boss 战不计轮数，没有逃跑。
- **依据 / 出处**：R9「The Campaign is also failed if the Heroes are defeated during a Boss Quest」；R25（「when all Heroes are defeated」）；R30；R31；R35
- **关联待确认**：Q-43
- **状态**：依据规则书

### R-045

- **编号**：R-045
- **日期**：2026-10-06
- **问题**：Tool / Torch 的适用范围
- **裁定**：Tool 不能抵消 Trap Room（那是房间效果，不是探索危害）。Torch 也不能抵消 Dark Room 的光照 −1，只能另用 Torch 把光照 +1。任务卡另有规定的除外（例：QUEST-p11 Warm Up the Halls）。
- **依据 / 出处**：R12「Tool – This Provision is only used to counter Exploration Hazards (Traps and Rubble)」；R14（探索危害 = 探索骰结果）；R15
- **关联待确认**：Q-44
- **状态**：依据规则书

### R-046

- **编号**：R-046
- **日期**：2026-10-06
- **问题**：地牢板块：房间槽数、长走廊节点、休息与离开地点
- **裁定**：规则层面能定的：灰点是**必须停留**的走廊节点，经过灰点要分两次探索（R14 明文）；离开地牢在任何位置都可以，只要还没掷这一次的探索骰（R14）。板块数据部分延后。
- **依据 / 出处**：占位假设：普通板块房间槽 = 8、最暗地牢 = 16（与任务卡房间代币数相等，标注时校验，不符即报错）；起点和灰点都不是房间，不能休息（R15 只允许在已清理的房间休息）。依据 R12、R14、R15、R30、R36
- **关联待确认**：Q-45
- **状态**：延后（等 Phase 1 地牢板块标注：QMAP 14 块的房间槽、走廊、灰点、起点、边缘房间、Boss 位）

### R-047

- **编号**：R-047
- **日期**：2026-10-06
- **问题**：战利品代币的构成；代币数量是否受限
- **裁定**：① 10 枚战利品代币 = 5 种 × 各 2 枚：Roll for Provisions ×2；Choose a Provision ×2；Roll for Either Gold or Provision ×2；Roll for Double Gold or Choose a Provision ×2；第 5 种 **Roll for Double Gold** ×2（规则书 R18 没列出：图案为带掷骰箭头的 d10 + 金币 ×2，没有补给选项 → 掷 d10，获得 2 倍点数的金币）。② 战利品堆是 10 枚的有限堆：拾取过的本次地牢不再出现，回村洗回；抽空就不再放。③ 「!」标记数量是房间板块数据 → 并入 R-046 / Phase 1 板块标注。④ 伤口、状态、金币、XP 等代币电子版不设数量上限；规则书写明的数量限制照常（补给池 16 颗、等待英雄代币数）。
- **依据 / 出处**：PB3-F（10 枚宝箱正面，右上 3×3 + 第 4 行 1 枚）与 PB3-B（镜像位置的 10 个结果面）；R18 战利品图例（图标组合同款）；R25；R32
- **关联待确认**：Q-46
- **状态**：依据印刷件

### R-048

- **编号**：R-048
- **日期**：2026-10-06
- **问题**：卡面上没有图例的图标
- **裁定**：不命名、不猜测。
- **依据 / 出处**：占位：转录时把未确认的图标保留为原始图标 ID，不赋语义；含未确认图标的卡在 Phase 2 MVP 中标为「未验证」，不进入可用卡池
- **进展**（2026-10-07）：图标词典 v1.1 已入库（`packages/data/dictionary/`）。`confirmed` 与 `confirmed_rulebook` 可用于命名；`needs_review`、`unsure`、`unreviewed` 仍按本裁定保持占位。
- **进展**（2026-10-07，v1.2）：Kyries 批准 31 条后续图标：18 条并入已确认图标，3 条改为 decor，10 条仍是 `needs_review`（key 为 `pending_<iconId>`，kind 为空）。规范化层（`packages/data/normalized/`）把这些图标，以及词典未收的 iconId，标成未验证。
- **进展**（2026-10-07，v1.3）：Kyries 批准 batch-01 的 40 条：31 条并入已确认图标，6 条改为 decor，3 条仍是 `needs_review`（r195、r216 维持 v1.2 占位；r539 从 `unreviewed` 改为 `pending_<iconId>`，kind 为空）。没有新造含义。
- **关联待确认**：Q-47
- **状态**：延后（词典 v1.3 已入库；`needs_review` / `unsure` / `unreviewed` 仍不命名。说明书 §21.2 P-01~P-10，以及抗性 / 免疫栏里尚未 `confirmed` 的图标。约 70 个词典未收的 iconId 仍待印刷 PDF 重切）

### R-049

- **编号**：R-049
- **日期**：2026-10-06
- **问题**：大纲 F.5「玩家辅助卡有回合流程摘要」与事实不符
- **裁定**：大纲 F.5 改为「玩家辅助卡 8 张 = 2 种双面卡各 4 张：Provisions / Exploration、Rooms / Conditions；没有回合流程摘要」。
- **依据 / 出处**：AID 全部 8 页；Kyries 于 2026-10-06 确认助手建议
- **关联待确认**：Q-48
- **状态**：Kyries 已确认（2026-10-06）

### R-050

- **编号**：R-050
- **日期**：2026-10-06
- **问题**：电子存档 schema 要补哪些字段
- **裁定**：电子存档 = 存档表全部字段 + 说明书 §19.3 的 S1–S11；「Xp」记为每名英雄的个人余额（R-039）；纸质存档表只作为导出格式。
- **依据 / 出处**：SAVE；说明书 §19；Kyries 于 2026-10-06 确认助手建议
- **关联待确认**：Q-49
- **状态**：Kyries 已确认（2026-10-06）

### R-051

- **编号**：R-051
- **日期**：2026-10-06
- **问题**：技能槽数是否为 2 + 英雄等级
- **裁定**：是：I 级 3 个、II 级 4 个、III 级 5 个。饰品槽 = 英雄等级。
- **依据 / 出处**：DASH（5 个技能槽，徽记依次为 I、I、I、II、III）；HERO-F / HERO-B（英雄卡左缘钱袋图标：Crusader I 级 1 个、II 级 2 个、III 级 3 个）；R11、R26、R29 文字一致
- **关联待确认**：Q-50
- **状态**：依据印刷件

### R-052

- **编号**：R-052
- **日期**：2026-10-06
- **问题**：怪物牌堆抽空怎么办
- **裁定**：生成怪物时牌堆抽空 → 停止生成，剩下的姿态位留空；如果一只怪都没生成，战斗立即以英雄胜利结束（照常清理房间、拿奖励）。不另外洗回任何卡。
- **依据 / 出处**：R17；R25（每场战斗结束都把用过的怪物卡洗回，地牢内没有另外的怪物弃牌堆）；R11 Necromancer I 威胁
- **关联待确认**：Q-51
- **理由与备选**：见 [docs/rulings-notes.md](rulings-notes.md)
- **状态**：暂定（规则书未写明）

## 待确认（未裁定）

依据规则书、依据印刷件、暂定（规则书未写明），以及 Kyries 已确认的 Q，都已写入上面的 R-002~R-052，这里只保留索引。状态为「延后」的仍留在本节。Q-07、Q-48、Q-49 已于 2026-10-06 由 Kyries 确认（R-008、R-049、R-050），不再列在待确认里。

### 已有暂定裁定的索引

| Q | 裁定 | 状态 |
|---|---|---|
| Q-01 | R-002 | 依据规则书 |
| Q-02 | R-003 | 依据规则书 |
| Q-03 | R-004 | 依据规则书 |
| Q-04 | R-005 | 依据规则书 |
| Q-05 | R-006 | 依据规则书 |
| Q-06 | R-007 | 依据印刷件 |
| Q-07 | R-008 | Kyries 已确认（2026-10-06） |
| Q-08 | R-009 | 依据印刷件 |
| Q-09 | R-010 | 依据规则书 |
| Q-11 | R-012 | 依据印刷件 |
| Q-12 | R-013 | 依据规则书 |
| Q-13 | R-014 | 依据规则书 |
| Q-14 | R-015 | 依据规则书 |
| Q-15 | R-016 | 依据规则书 |
| Q-16 | R-017 | 暂定（规则书未写明） |
| Q-17 | R-018 | 依据规则书 |
| Q-18 | R-019 | 依据规则书 |
| Q-19 | R-020 | 暂定（规则书未写明） |
| Q-20 | R-021 | 暂定（规则书未写明） |
| Q-21 | R-022 | 暂定（规则书未写明） |
| Q-22 | R-023 | 暂定（规则书未写明） |
| Q-23 | R-024 | 暂定（规则书未写明） |
| Q-24 | R-025 | 暂定（规则书未写明） |
| Q-25 | R-026 | 暂定（规则书未写明） |
| Q-26 | R-027 | 暂定（规则书未写明） |
| Q-27 | R-028 | 暂定（规则书未写明） |
| Q-28 | R-029 | 暂定（规则书未写明） |
| Q-29 | R-030 | 依据规则书 |
| Q-30 | R-031 | 暂定（规则书未写明） |
| Q-31 | R-032 | 依据规则书 |
| Q-32 | R-033 | 依据规则书 |
| Q-33 | R-034 | 依据规则书 |
| Q-34 | R-035 | 暂定（规则书未写明） |
| Q-35 | R-036 | 依据印刷件 |
| Q-36 | R-037 | 暂定（规则书未写明） |
| Q-37 | R-038 | 依据规则书 |
| Q-38 | R-039 | 依据规则书 |
| Q-39 | R-040 | 依据规则书 |
| Q-40 | R-041 | 暂定（规则书未写明） |
| Q-41 | R-042 | 暂定（规则书未写明） |
| Q-42 | R-043 | 依据规则书 |
| Q-43 | R-044 | 依据规则书 |
| Q-44 | R-045 | 依据规则书 |
| Q-46 | R-047 | 依据印刷件 |
| Q-48 | R-049 | Kyries 已确认（2026-10-06） |
| Q-49 | R-050 | Kyries 已确认（2026-10-06） |
| Q-50 | R-051 | 依据印刷件 |
| Q-51 | R-052 | 暂定（规则书未写明） |

### 仍待确认

### Q-10

- **问题**：「Stygian 房间卡危险更强」的具体数值要以房间卡转录为准
- **来源**：核心规则书 Game Modes + 卡面
- **暂定处理**（见 R-011）：规则层面不另作裁定，以 17 张 Stygian 房间卡的转录为准。占位：转录完成前，引擎不开放 Stygian 模式。
- **状态**：延后（等 Phase 1 转录 ROOMS-S p1–17）

### Q-45

- **问题**：长走廊的灰点是不是独立节点，起点能不能休息，从哪个房间离开，房间槽数是否等于任务房间数？
- **阻塞 Phase 1/2**：是（P1 地牢板块标注 schema）
- **暂定处理**（见 R-046）：规则层面已定的部分——灰点是必须停留的走廊节点，经过灰点要分两次探索（R14）；离开地牢在任何位置都可以，只要还没掷这一次的探索骰（R14）。板块槽数、走廊和 Boss 位等数据延后。占位假设：普通板块 8 槽、最暗地牢 16 槽；起点和灰点不能休息。
- **状态**：延后（等 Phase 1 地牢板块标注）

### Q-47

- **问题**：卡面上没有文字标注的图标怎么命名、归进哪一类？
- **阻塞 Phase 1/2**：是（P1 schema）
- **暂定处理**（见 R-048）：不命名、不猜测。占位：未确认图标保留原始图标 ID；含未确认图标的卡在 Phase 2 标为「未验证」，不进入可用卡池。抗性 / 免疫图标映射一并在此处理。
- **进展**（2026-10-07）：图标词典 v1.2 已入库。`confirmed` 与 `confirmed_rulebook` 可用于命名；`needs_review`（`pending_<iconId>`）、`unsure`、`unreviewed` 仍按 R-048 保持占位，并在规范化层标成未验证。
- **进展**（2026-10-07，v1.3）：Kyries 批准 batch-01（合并 31、装饰 6、留下 3）。留下的条目仍不命名。后续未审批次，以及约 70 个词典未收的 iconId，仍按 R-048 占位。
- **状态**：延后（词典 v1.3 已入库；`needs_review` / `unsure` / `unreviewed` 仍按 R-048 占位）
