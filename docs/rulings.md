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

R-002~R-052 是 2026-10-06 授权下的暂定结论，Kyries 推翻前按这些结论写说明书。理由、被否决的备选，以及和说明书 v0.1 原推荐不同的地方，见 [docs/rulings-notes.md](rulings-notes.md)。R-053 是 2026-10-08 Kyries 在聊天中的裁定，不属于那批暂定结论。

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
- **关联待确认**：无（Q-19 已由 R-199 补充 ③ 的让位/截断细节）。
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
- **补充裁定（2026-10-10，Kyries 确认 Q-22 边角）**：① 与任何几何出手位置都不连通（含 E-F 黑墙）时，怪物原地不动并跳过本回合剩余部分；不发明跨墙距离，也不因断图拒绝命令卡住回合。② 所有射程内可停落点都满员时，在 Speed / 容量允许的落点中，仍按到「几何上的出手位置」的最少步数靠近，再跳过剩余回合；几何出手位置不因满员从评分中排除。多个同等最优落点由目标玩家选择，不跨黑墙。③ Closest / Furthest 只在区域距离为有限值的英雄中排序，同距按姿态；不连通英雄不进入该排序候选。Guard 继续按 R-024 必须优先，不能改换可达目标，够不到按本补充移动或原地跳过。
- **依据 / 出处**：R24 第 3 步「positioning itself in order to take its action according to the Skill's Range」「the targeted player(s) decide where it goes」；OR24-p7、p8「already in range and doesn't need to move」
- **关联待确认**：Q-22（2026-10-10 边角补充已确认）
- **理由与备选**：见 [docs/rulings-notes.md](rulings-notes.md)
- **状态**：原条暂定（规则书未写明）；2026-10-10 边角补充由 Kyries 确认。

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
- **裁定**：封顶 3。印刷件核对：按房间或目标计 XP 的任务，因为 Trap 房和 Dark 房永不清理（R15），按卡面房间构成算出的上限本来就是 3；唯一可能超过的是 Fundraiser（每交 20 金得 1 XP），按 R29 封顶 3。捐献金额以 R-216 修订为准。
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
- **进展**（2026-10-26）：Kyries 当面确认 QuestMap FRONT **p011** 标注名「红点 X」= 本条 / R14 走廊灰点（dot）；见 **R-114**。仅此点语义；不扩散其它 QuestMap 页。
- **进展**（2026-10-27）：Kyries 当面确认 p011 特殊图案槽 **A/B/G** = Objective 房槽；见 **R-115**。p012 特殊图案槽 **A/C/D** 见 **R-117**。其它 QuestMap 页特殊槽仍 pending / hold。
- **进展**（2026-10-27）：任务卡 ↔ QuestMap **选图配对**见 **R-116**（8↔8 遗迹 / 16↔16 最暗；禁止 quest 页码硬绑 map 页）。
- **进展**（2026-10-27）：QuestMap FRONT **p011** / **p012** 整页布局 `review: confirmed`，见 **R-119** / **R-118**（仅布局读数；特殊槽语义仍 R-114–R-117）。
- **进展**（2026-10-28）：VQ-07 八槽 FRONT **p2–p10、p13–p14** 布局读数 `review: confirmed`，见 **R-123**；14 页 QuestMap 布局读数均已 confirmed，边缘房 / Boss 位数据与其它 **R-046** hold 仍延后。
- **状态**：延后（等 Phase 1 地牢板块标注：边缘房间、Boss 位接线等仍 hold）。QuestMap 14 页槽 / 边 / 灰点 / 起点读数已由 R-065、R-118、R-119、R-123 分批确认；p011 红点 X / Boss 位与 p012 Boss 位见 R-114 / R-121；槽数配对已由 R-116 接线。

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
- **进展**（2026-10-07，v1.3）：Kyries 批准 batch-01（40 条：合并 31、装饰 6、留下 3）和 batch-02（29 条：合并 9、装饰 3、留下 17）。留下的条目是 `needs_review`（`pending_<iconId>`，kind 为空）。技能卡正背面插画不跨面合并，也没有写成 `skill_art`。没有新造含义。
- **进展**（2026-10-07，v1.4）：Kyries 批准 batch-04（40 条：合并 8、装饰 7、留下 25）。留下的条目是 `needs_review`（`pending_<iconId>`，kind 为空）。技能卡杂项切图没有写成 `skill_art`。没有新造含义。
- **进展**（2026-10-07，v1.5）：Kyries 批准 batch-05（39 条：合并 17、装饰 22，没有留下）。免疫栏 r761、r812 沿用目标的 resist key。r871 原样继承 r346 的暂定含义。没有新造含义，也没有给 r873 补治疗数值。
- **进展**（2026-10-07，v1.6）：Kyries 批准 batch-06（34 条：合并 1、装饰 20、留下 13）。r833 旋转 180° 后并入 r240（食物），与 r397→r4 相同。r836 从 `needs_review` 改成装饰。留下的条目是 `needs_review`（`pending_<iconId>`，kind 为空），含义只描述外观。没有新造含义。
- **进展**（2026-10-08，v1.7）：Kyries 批准 batch-07（70 条：合并 3、归类 64、留下 3）。这 70 个 iconId 原先不在词典里（误放进装饰切图），新增 rank 907–976。r907 并入 r21，value 沿用空，不把心内的 26 写成 value。64 条饰品插图按 2026-10-08 的规则归入 `trinket_picture`，不是并入 r468。留下的条目是 `needs_review`（`pending_<iconId>`，kind 为空），含义只描述外观。没有新造含义。
- **进展**（2026-10-08，v1.8）：Kyries 批准 batch-08 的 79 条归类。key 用已有的 `skill_art`，kind 为 `other`，含义是通用句「技能插画 / Skill picture」，value 为空。不是并入 r274、r431 或 r490，也不照抄正面或背面更长的说明。核对后 31 条原是 `needs_review`，48 条原是 `unreviewed`。r195、r544、r569 仍留下，含义只描述外观。没有新造含义。
- **进展**（2026-10-26，v1.8 补充）：Kyries 拍板 Q-47 子集 7 hash：`293f170eab`、`73a29c830c`、`3deae1ab2a`、`c80192cfcc`、`032fd6cccd`、`a08da49488`、`a64616e9c5`（见 `icon-dictionary-v1.8-CHANGELOG.md` 2026-10-26）。Q-47 整体仍延后；其余 `needs_review` 未动。
- **进展**（2026-10-26，v1.8 第二刀）：余下 `needs_review` 21 条确认 + rank 335（`9b1134d0b0`）暂 leave（proposal `area_d10_teleport` 待 Kyries）。词典 `needs_review` 22→1。详见 CHANGELOG 第二刀表。
- **关联待确认**：Q-47
- **状态**：延后（词典 v1.8 已入库；`needs_review` / `unsure` / `unreviewed` 仍不命名。说明书 §21.2 P-01~P-10，以及抗性 / 免疫栏里尚未 `confirmed` 的图标。）

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

### R-053

- **编号**：R-053
- **日期**：2026-10-08
- **问题**：核心盒 10 张美德 / 折磨卡，正面没有印 Virtue 或 Affliction，各属于哪一边？
- **裁定**（本项目裁定）：美德（Virtue）为 Stalwart、Courageous、Focused、Powerful、Vigorous。折磨（Affliction）为 Fearful、Selfish、Masochistic、Hopeless、Irrational。Kyries 称这一边为折磨；规范化字段仍是 `affliction`，不改成中文。只按这份名单填写 `role`（`virtue` 或 `affliction`）。对不上名字的卡 `role` 留空，未验证原因保留 `role_not_printed`。不因此给卡上其余未确认图标起名。
- **依据 / 出处**：Kyries 于 2026-10-08 在聊天中拍板。规则书第 28 页把 Focused 标为 Virtue，把 Selfish 标为 Affliction。
- **关联待确认**：无
- **状态**：Kyries 已确认（2026-10-08）

### R-054

- **编号**：R-054
- **日期**：2026-10-10
- **问题**：Ritual Chamber（Room Tile 1）中央高台 F 与中横区域 E 是否相邻
- **裁定**（本项目裁定）：E-F 不相邻，黑墙阻隔，不可直接移动。容量与高台按已通过的 `docs/ruins-room-tile-review-2026-10-10.md` 入库，邻接图按此定稿；不补桥、路径或未命名数值。
- **依据 / 出处**：Kyries 在本对话通过核对表并明确裁定。区域标签只指核心盒 `DD_COREBOX_TILES_FRONT.pdf` 第 1 页 FRONT / 编号 1，raw id `dungeon_tile:p001`，不扩散到其他板块。
- **关联待确认**：Q-20（R-021 的本板块具体边界补充）
- **状态**：Kyries 已确认（2026-10-10）

### R-055

- **编号**：R-055
- **日期**：2026-10-10
- **裁定**：Q-53 区域表获批：英雄 Aggressive / Ranged→H、Defensive→C；怪物 Aggressive→J、Defensive→D、Ranged→F；C/H 宝箱各一。英雄 Support→C、怪物 Support→D 和红星 Cornered（英雄结束回合 Stress +1）先按拟议入库，三处图标保留 provisional，待代理对照完整印刷面后再最终确认；有出入回退 semantic=null。F 仍孤立，不补路。
- **来源 / 范围**：Kyries 本对话批准并随后明确暂定状态；只限 Room Tile 1 / Ritual Chamber 与配套 room:p001，几何继续依 R-054，不全局升级同形图标。
- **状态**：区域表已批准；三处图标已于 2026-10-10 完整印刷面复核一致，依 Kyries 的条件授权最终确认。
- **印刷复核**：代理重新查看完整 `DD_COREBOX_TILES_FRONT.pdf` 第 1 页与配套 Ritual Chamber `room:p001` 正面，并对照官方 R16 的英雄 / 怪物 Support 起点例图：C 左金框和 D 红竖条一致，C/H 红星与房间卡明文 Cornered 一致。只确认这些放置，不全局改同形词典，不补 F 路径。

### R-056

- **编号**：R-056
- **日期**：2026-10-10
- **裁定**：Q-54 正式确认：Masochistic 骰面 1–3，自身受到 2 × Hero Level 点 Wounds；两枚黑心为伤口图标。Irrational 骰面 1–5 姿态前移 1、6–10 后移 1；红色右箭头只是结果表指向标记，不是 Push / Pull 或角色标记。
- **来源 / 范围**：Kyries 已对照 PDF 核实并批准；当前印刷美德 / 苦难正面第 8 / 10 页，官方 R28。卡面限定批准附注记录 R-056，不升级其他卡的同形图标。Hero Level 不设默认值。
- **状态**：Kyries 已确认（2026-10-10）。

### R-057

- **编号**：R-057
- **日期**：2026-10-10
- **裁定**：Q-55：Selfish 触发但队伍没有补给时不产生效果；Irrational 要前移 / 后移但已在对应姿态轨尽头时不移动。两者不产生额外效果，仍保留本次触发骰与正常回合。
- **来源 / 范围**：Kyries 本对话批准；官方 R28 / R19 未明确这两个尽头边界，只补此边界，不新增伤口、压力、行动扣除或默认值。
- **状态**：Kyries 已确认（2026-10-10）。

### R-058

- **编号**：R-058
- **日期**：2026-10-10
- **裁定**：Q-56：按 R-029 用大型怪替换最后生成的小型怪、必要时向 Aggressive 调整姿态后，把仍在生成中的怪物棋子按最终姿态重新放到房间对应起点。
- **来源 / 范围**：Kyries 本对话批准；只补 R17 生成阶段的区域边界，不改变战斗中死亡补位只改姿态的 R-030。
- **状态**：Kyries 已确认（2026-10-10）。

### R-059

- **编号**：R-059
- **日期**：2026-10-10
- **裁定**：Q-57：未拾取宝箱在战斗结束后移除，代币回到本次地牢可用随机池；已拾取代币仍按 R-047 不再出现。补给池满 16 时不能选择补给奖励，可先免费使用补给或选择金币；纯补给宝箱保留且不扣行动。
- **来源 / 范围**：Kyries 本对话批准「这两个边界处理」；补充 R18 / R25 未明确的随机池与满池边界，不补卡片缺失数值。
- **状态**：Kyries 已确认（2026-10-10）。

### R-060

- **编号**：R-060
- **日期**：2026-10-10
- **问题**：大型怪占 2 格，但 R24 满员落点只移走一名非攻击目标角色；移走单格角色后可能仍超容量 1 格。
- **裁定**：本项目按字面只挤出一名非攻击目标角色，允许大型怪落点暂时超容量 1 格。被挤出角色只能去能容纳其占格的相邻区域；没有合法角色 / 去处时拒绝本次移动，不消耗 RNG 或回合。多种合法组合由攻击目标玩家选择，选择完成前不移动棋子。
- **依据 / 出处**：官方核心规则书 R24「Large and Small Monsters」、规格书 §6.8；Kyries 本对话批准「字面的一名挤出及上述无去处处理」。只补容量边界，不补缺失 Speed、射程或卡面数值。
- **关联待确认**：Q-58。
- **状态**：Kyries 已确认（2026-10-10）。

### R-061

- **编号**：R-061
- **日期**：2026-10-11
- **问题**：已确认 Wound 与 Bleed Out 等卡上的黑心红光图标被提取成不同 hash，后者仍为 needs_review。
- **裁定**：Kyries 确认同类黑心红光图标统一为已有 `wound`（Wound / 创伤）。本次完整印刷对照后将 `8466c441ea`、`2c1824ea21`、`6888d0cf12`、`d42d7955d3`、`48ca9f366e` 并入该语义，保留各 iconId，不造新词条、不填图标内数值。
- **依据 / 出处**：Kyries 本对话明确批准；已有 Wound `163b31751a`（player aid / Core p.27）、`ccade5e7ad`；核对范围与受影响卡见 [四核心整批接线清单](phase2-four-core-skills-2026-10-11.md)。其他未确认图标分别保留原因。
- **关联待确认**：Q-47，仅结清上述五个 hash。
- **状态**：Kyries 已确认（2026-10-11）。

### R-062

- **编号**：R-062
- **日期**：2026-10-11
- **问题**：Zealous Accusation I / II / III 的伤害图标与前段图标命名。
- **裁定**：Crit / Acc 后的红裂口图标 `8d4bbe5e11` 为已有 `damage`，使用普通攻击结算。完整印刷 p004 / 005 / 006 分别为 Crit 0 / 伤害 9、Acc 9 / 伤害 5；Crit 0 / 伤害 11、Acc 10 / 伤害 6；Crit 1 / 伤害 12、Acc 11 / 伤害 7。
- **澄清**：Kyries 在本对话补充确认，前段 `a396e95c00` 保持 `target_monster`，两枚表示最多两个怪物目标；前段 1 保持射程，不作 shuffle。本批三张无位移效果行。Wound 只用于黑心红光图标，沿用 R-061。
- **依据 / 出处**：Kyries 本对话确认与随后澄清；完整 SKILLS_FRONT p004–006、官方核心 R19–21。未核实的其他图标 / 数值仍按 R-048 拒绝，不根据技能名补伤害。
- **状态**：Kyries 已确认（2026-10-11）。

### R-063

- **编号**：R-063
- **日期**：2026-10-12
- **问题**：Hemophilia / Black Plague、Anemic / Thin Blooded 追加的 Bleed / Blight 是否递归触发同类被动？
- **裁定**：Kyries 批准：同一次状态施加中，每个相关被动至多触发一次。追加状态仍接受抗性 / 免疫，以及 Clotter / Thick Blooded 的持续时间修正。不得递归无限追加；多次独立状态施加分别结算。
- **依据 / 出处**：官方 R26–28 的具名被动，Kyries 本轮明确批准。
- **关联待确认**：Q-65（已确认）。

### R-064

- **编号**：R-064
- **日期**：2026-10-12
- **问题**：Q-60 的 Curio 效果行图标、面具 / 插画误分类与 01 口头记录冲突。
- **裁定**：Kyries 对照 CURIO_FRONT_V2 与手打 01–24 效果行批准：`ae45f5bcb3` = `roll_for_provisions`（R18）；`9b6a2b779d` / `12b6af97f2` = Bleed（并 `be17b4ee09`）；`e546d025cd` = Disease（并 `b4627031be`，非 Blight）；`449d2d43ed` / `382acc9dc4` / `3fe634e723` / `7b1a554877` = 抽负面怪癖；`3a7dfcb577` / `3ae4312868` / `3e2792bc5b` / `8b7f872f77` = 抽正面怪癖；`85e094f269` / `1d9ad90d4a` = 抽饰品卡（覆盖 curio_picture）；`40c4cc438c` = Debuff 2t；`73ea0990dd` / `3cd8b97ff0` = Buff 2t。面具不得继续当 decor。01 最早口头“美德 / 折磨”作废，以“抽负面怪癖”为准。只确认上述 hash 与已核对效果行，不发明未列含义，不裁定同卡效果的新收尾顺序。
- **依据 / 出处**：Kyries 本对话明确批准；[图标复核清单与 01–24 手打对照](ddbg-icon-review.md)，印刷件仅提供卡面数据。Torch 抑制负面效果仍依据官方 R14，状态依据 R21；Q-62 / Q-68 等已有规则停点保留。
- **关联待确认**：Q-60（已解决）。

### R-065

- **编号**：R-065
- **日期**：2026-10-13（UTC+8）
- **批准**：Kyries/Grok逐项目视批准VQ-06、VQ-13–18与QuestMap FRONT仅p1。对应审核稿及本轮回传记录见[批准入库交付](phase3-approved-data-2026-10-13.md)。Treasure Chamber T4–T5修正为黑墙/blocked，非通行。Spiked Pit最终逐对分类后续明确为R-066。
- **地图范围**：p1八房A–H与起点S；连接S–G、G–F、F–C、G–H、G–D、D–E、D–A、A–B；无灰点X/Y。只将p1升级为confirmed，不批准其他页，也不裁定Q-59起点侦察或Q-63返回。
- **板块范围**：明确回传的容量、地形、部署、宝箱、特殊区域位置和已命名图标/卡文数据可入库。usable仍须等完整运行时；Spiked Pit触发图标、Treasure移除图标、Ancestor's Glory两项未知图标未获语义批准。Torture既有候选边界不因本次批准撤销。不将局部星形对应推广为全局图标语义。
- **状态**：Kyries已确认。只记录数据批准，不关闭现有Q项、不宣称Phase3试玩验收。

### R-066

- **日期 / 状态**：2026-10-13（UTC+8），Kyries本对话已确认，补充R-065/VQ-13。
- **Spiked Pit最终邻接**：blocked为S1–S2、S5–S7；无角点。通行为S2–S4、S3–S6、S4–S5、S4–S8、S5–S8、S5–S9、S6–S7、S7–S9、S8–S9、S8–S10、S8–S11、S9–S11、S9–S12、S10–S11、S11–S12。其他未列对不补边；替代此前17对候选的未定分类，不新增跳墙规则。

### R-067

- **日期 / 状态**：2026-10-13（UTC+8），Kyries本对话已确认。
- **词典批准**：`8c4c3c2ec2`=Shuffle（位移/Push·Pull）；`ce2f57ed90`=Blight；`5c9604da90`=Wound。词典升级confirmed，保留各iconId与空value，不补数字，不推定复合顺序。
- **本面批准**：Torture Chamber BACK p2/H的Unholy Aura由candidate升级print confirmed；不复用Cornered。禁疗运行时验证前仍usable=false/runtimeReady=false。

### R-068

- **日期 / 状态**：2026-10-13（UTC+8），Kyries本对话项目裁定，以下均confirmed。
- **Q-52**：双方同次全灭记录mutualWipeout并停止单场；不视为一般英雄全灭收尾，无胜利/撤退奖励，无自动战役失败。死亡/替换仍走既有接口。
- **Q-59**：起点不允许侦察，只允许房间节点。
- **Q-61**：一次地牢内Curio抽空不洗回，R32回村才洗回；扣Torch前拒绝。
- **Q-63**：原路返回每个移动段（图上一条边）全员压力+1，包含灰点段、岔路换边、起点出入；不合并长走廊收费。
- **Q-70**：Fundraiser未达最低Lair目标可按R14提前离开，不算失败；摘要须记录earlyLeave、objectiveMet=false、lairClearedCount等。只有objectiveMet才开放捐献，否则跳过捐献。

### R-069

- **日期 / 状态**：2026-10-13（UTC+8），Kyries本对话批准的项目复合裁定；不是规则书原文。
- **通则（Q-62/68/71）**：按印刷行序结算；新疾病/怪癖对后续行立即生效，不回改获得当次事件；英雄死亡后取消其剩余效果与本卡尚未发奖励。第四负面怪癖死亡立即生效，随后取消其余。
- **Old Abbey**：每名英雄每次结束回合先一个压力事件（每负面怪癖+1），存活才治疗（每正面怪癖1×HL）。
- **Q-64 Trap**：先一个压力事件（全部分配压力点），再全部分配伤口；死亡取消该英雄剩余。
- **Q-66**：压力→Soft/The Worries追加伤口→死门→存活且压力≥10时意志/心脏病。
- **Q-67**：同次暴击的基础压力与相关怪癖压力先合并为一个压力事件，再应用加成。
- **范围**：上述项目均confirmed；不将未问及的其他规则自动批准。

### R-070

- **日期 / 状态**：2026-10-13（UTC+8），Kyries本对话项目裁定，Q-69 confirmed。
- **裁定**：同一次休息、同一英雄的Life总量是一次恢复事件，压力总量是一次恢复事件；Infirm/Fast Healer/Resilient各触发一次，不按每点触发。

### R-071

- **编号 / 日期**：R-071，2026-10-13（UTC+8）。
- **裁定（本项目，Kyries 本对话确认）**：Spiked Pit 的 S1 保持 R-066 获批断图：S1–S2 blocked，S1 无通行边，不修正为通行。远程怪在 S1 时按 R-021 不可达，无法清场，第 4 轮按 R25 被迫撤退；S1 宝箱暂不可达。收到视觉改判前严格按获批 edges。
- **Shuffle 触发范围**：仅当本次 Shuffle 结算后的实际落点为 S8 或 S9 时触发，含截断落点。进入／经过／移出或起点在坑不另触发；普通移动不替代 Shuffle。结束回合站在坑区的条款不变；伤害 3、Bleed 1·3t 与行序沿 R-065/067/069。
- **关联**：Q-72（位置范围）；R-066（保持原几何），R-021 / R25（断图与撤退）。
- **状态**：confirmed；是项目范围裁定，不把未明确位置范围写成官方规则书原文。

### R-072

- **编号 / 日期**：R-072，2026-10-14（UTC+8）。
- **裁定（本项目，Kyries 本对话确认）**：同次 Shuffle 实际落到 Spiked Pit（S8/S9，含截断）且英雄带 Vertigo 时，先完整结算 Spiked Pit（伤害 3，然后 Bleed 1·3t；内部行序沿 R-069），再结算 Vertigo 的压力 +2（含 Soft／The Worries 等压力相关追加伤口，以及随之而来的死门／意志／心脏病）。不开放每次由玩家选择顺序。
- **关联**：Q-74；R-071（落点范围不变），R-069（各自内部行序与死亡取消）。
- **状态**：confirmed；是项目范围裁定，不是规则书原文。边界例见[专题](phase3-spiked-vertigo-order-review-2026-10-14.md)。

### R-073

- **编号 / 日期**：R-073，2026-10-14（UTC+8）。
- **裁定（本项目，Kyries 本对话选择 A）**：Treasure Chamber T6 Hide and Heal 支付1行动及压力+2，沿R-069先完整结算压力、追加伤口、死门及意志／心脏病；仍存活时直接移除全部伤口，不应用Infirm／Fast Healer的治疗数值修正。移除伤口不另掷死门，已死亡者不复活。
- **关联 / 边界**：Q-73；R-065/067卡文、位置及图标不变。一般禁疗仍沿R-067，主动交互在支付前拒绝，不批准绕过禁疗。
- **状态**：confirmed；是本项目裁定，不写成官方规则书原文。见[专题](phase3-treasure-wound-removal-review-2026-10-14.md)。

### R-074

- **编号 / 日期**：R-074，2026-10-14（UTC+8）。
- **裁定（本项目，Kyries 本对话选择 A）**：R32回村时，多名英雄的美德／苦难转怪癖固定按当前姿态顺序Aggressive→Defensive→Ranged→Support进行。每名英雄的第四怪癖选择完成后再转换下一名，不重抽，不由玩家另选英雄顺序。
- **关联**：Q-75；R26第四怪癖规则和R32回村步骤保持不变。仅批准多名英雄的转换顺序，不补其他未知规则。
- **状态**：confirmed。

### R-075

- **编号 / 日期**：R-075，2026-10-14（UTC+8）。
- **裁定（本项目，Kyries 本对话选择 A）**：R32意志转换后消耗剩余补给若压力到10获得新的美德／苦难，先完整结算补给及压力／死门／意志；存活者的新意志立即洗回对应堆并转换为相应怪癖，再继续补给窗口。多名新卡仍沿R-074的当前姿态顺序，第四怪癖走PendingChoice；不重复消费补给。死亡先停在替换接口，不复活、不先发XP。
- **关联 / 状态**：Q-76，confirmed。

### R-076

- **编号 / 日期**：R-076，2026-10-14（UTC+8）。
- **裁定（本项目，Kyries 本对话选择 A）**：R32步骤b把光照重置到5不触发升光被动，包括Photo Mania、Nocturnal、Light Sensitive、Early Riser、Warrior of Light。回村不因此恢复伤口／压力或施加新的压力／伤口／Buff；真正消耗剩余补给的效果仍正常结算。
- **关联 / 状态**：Q-77，confirmed。

### R-077

- **日期 / 裁定**：2026-10-14（UTC+8），Kyries本对话选择A，批准核心Hamlet Event正面左上角五组准备天数映射：ef839b6878=2；61587999f3=4；1cdbcf4cc7=3；43aaf29bbb=1；9d38361e87为Militia Training的“？”（全员按卡文升级则0天，否则3天）。已逐页对照全部16张完整卡面及官方R33。
- **明确限定**：43aaf29bbb仅在Hamlet Event左上角使用准备天数语义，既有全局occupancy / occupancy_pips保持不变；其他四组也仅限上述卡面位置，不推广为其他图标的语义批准。未问及效果图标不随本次命名。
- **关联 / 状态**：Q-78，confirmed。

### R-078

- **编号 / 日期**：R-078，2026-10-14（UTC+8）。
- **裁定（本项目）**：Kyries本对话明确选择“立即洗回对应等级牌堆”：游商售出的饰品立即与对应等级当前可抽牌堆一起洗牌，不进入弃牌堆或本次陈列。其他陈列品、持牌与弃牌不参与本次洗牌。
- **来源 / 关联**：R33规定出售一件已装备饰品及售价，未写售出卡去向；Q-81，confirmed。不改变R-040的一次访问卖一件并买一件。陈列抽牌时可抽不足所需数量的补牌见 R-100（与本条出售即时洗回正交：出售仍立即洗回；R-100 覆盖首次陈列抽满）。

### R-079

- **编号 / 日期**：R-079，2026-10-14（UTC+8）。
- **裁定（本项目）**：同次村庄准备中，不同天再次在铁匠选择同一技能，仍支付1金，覆盖为本次铁匠指定的临时等级；相同等级也付费。始终保留最初原卡，不把先前临时卡当作新的原卡。III级每次实际访问仍按R34获得一颗奖励补给骰（R-041）。
- **依据 / 批准**：完整R29明确每项技能有三个等级，R34的Guild逐次升一级，因此I→II→III可永久升级两次。Kyries本对话指定条件：“如果不止能升级一次就选2”；核对后采用选项2。重复访问覆盖方式属于项目裁定，不称R29/R34明文。
- **关联 / 状态**：Q-82，confirmed。

### R-080

- **编号 / 日期**：R-080，2026-10-15（UTC+8）。
- **裁定（本项目）**：Guild永久升级与铁匠临时升级可以作用于同一技能，永久升级正常进行；任务结束保留新的永久卡。例如先临时Smite I→III，再永久I→II，任务中保留临时III，归还卡更新为II，不恢复已永久移除的I。后续再永久升到III也不恢复旧卡。
- **来源 / 批准**：官方R29/R34分别规定永久升级旧卡移除与临时升级结束归还，但未明确重叠；Kyries本轮明确选择“永久升级正常进行，任务结束保留II”。Q-83，confirmed。

### R-081

- **编号 / 日期**：R-081，2026-10-15（UTC+8）。
- **裁定 / 限定批准**：Kyries本轮明确“批准这八张卡的表格”。四核心II/III级完整抗性/免疫按[核对表](hero-higher-defence-review-2026-10-15.md)读取：Crusader II抗Stun/Shuffle，III抗Stun/Debuff且免疫Shuffle；Hellion II抗Bleed/Blight，III抗Stun/Bleed/Blight；Highwayman II抗Stun/Bleed，III抗Stun/Bleed/Blight；Vestal II抗Stun/Bleed，III抗Stun/Bleed且免疫Disease；其余免疫栏为空。
- **依据 / 边界**：当前版Hero STAT FRONT p2/4/8/10及BACK p1/3/7/9完整左右栏，R21/R27术语。只限这八张卡，不改全局词典、不外推其他卡；原始未命名图标/整卡unverified原因保留。数据批准不等于高等级战斗/疾病/位移运行时已完成。Q-84，confirmed。

### R-082

- **编号 / 日期**：R-082，2026-10-15（UTC+8）。
- **限定批准**：Kyries明确回复“批准这一条”：Bone Spearman II（`monster_medium:p013`，实体M13–15）Speed=2；Aggressive/Defensive共用d10选招表，1–5用技能2，6–10用技能1；Ranged/Support共用固定技能1。
- **依据 / 边界**：当前版monsters_medium_FRONT完整M13–15、官方R24、R-015/R-048，见[核对记录](phase4-ii-monster-review-2026-10-15.md)。仅此卡Speed/选招，不批准其余II级卡，不改全局图标词典；完整技能及入场另行验证，不自动进入Phase5。Q-85，confirmed。

### R-083

- **编号 / 日期**：R-083，2026-10-15（UTC+8）。
- **限定批准**：Kyries对[四卡限定表](phase4-remaining-ii-review-2026-10-15.md)明确回复“批准四卡限定表”：Bone Captain II（大型L1、抽牌M12）Speed1，A/D骰表1(1–6)/2(7–10)，R/S固定2，无常驻Protection；Gargoyle II（M50–52）Speed3，A/D/R骰表1(1–6)/2(7–10)，S固定2，有常驻Protection；Rattler II（M53–55）Speed3，A/D/R骰表2(1–5)/1(6–10)，S骰表1(1–5)/3(6–10)，无常驻Protection；Ghoul II（大型L3、抽牌M49）Speed2，A/D/R骰表1(1–4)/2(5–7)/3(8–10)，S骰表2(1–5)/3(6–10)，有常驻Protection。 Ghoul 的姿态分组以 R-214 更正为准。
- **依据 / 边界**：官方R24完整页面与上述当前版完整卡面。只限四个具体战斗卡id/等级/页组的Speed、完整选招和头部常驻Protection有无；不全局改词典、不外推其他等级，不等于完整技能均可执行。Rattler自身状态与Ghoul复合效果须另接运行时。Q-86，confirmed。

### R-084

- **日期 / 状态**：2026-10-15（UTC+8），Kyries本对话选择Q-87的A；本项目裁定。
- **范围**：Ghoul II Howl，`monster_large:p003`技能3，当前版大型FRONT p3。不自动推广至其他复合卡。
- **裁定**：共享一次攻击骰，先完成本次全部攻击伤害及暴击压力。然后按英雄姿态逐名执行命中目标的完整目标效果：光照−1（每名命中目标各一次，至0截止，并触发相应被动）→卡文压力+2（沿R-002修正，立即完成追加伤口/死门/意志/心脏病）→存活者感染疾病。途中死亡取消该英雄尚未执行的效果；第四怪癖选择完成后续接下一名，不重掷攻击或重付已结算效果。
- **关联**：Q-87；R-048、R-081、R-083。攻击判定仍按声明时的光照/姿态，不因后续降光照重算命中。

### R-085

- **日期 / 状态**：2026-10-15（UTC+8），Kyries本对话明确“批准这三组限定映射”。
- **限定批准**：当前版Hamlet Event FRONT p1 Supply Run与p3 Lost Shipment效果位置的`d712688f15`＝补给骰；p9 Gypsy Trail效果位置的`08a25c05cf`＝金币；p10 The Feast效果位置的`d9009c6f91`＝伤口。The Feast的`9d58d3d431`沿既有压力语义不变。
- **边界**：仅以上四张卡的指定效果位置，不推广到其他卡或全局词典，不自动批准运行时顺序或“fully restore”事件类型。完整卡面已逐页复核；实际效果运行时仍须另接。Militia Training的0/3天条件已由R-077批准，不重新请求。

### R-224

- **编号**：R-224
- **日期**：2026-11-10
- **核准**：HAMLET EVENTS FRONT p1–15 的准备天数依次为 2、2、4、3、3、3、1、2、2、1、3、2、4、3、2。Town Fair（p7）和 The Feast（p10）的一天来自左上角天数栏。Militia Training（p16）印问号，选择全体各升级一张 I 级技能时为 0 天，否则 3 天。
- **效果边界**：Supply Run 下次出征额外获得 2 颗补给骰，Lost Shipment 下次出征少掷 2 颗。Gypsy Trail 仅在英雄出售饰品时多得 5 金币。The Feast 的每位英雄可选压力归零或伤口归零。Traveling Merchants 仅能改自己的一颗骰。In Good Spirits 的并列最高者各获得一个美德并将压力标记翻红。
- **依据**：Kyries 确认的《村庄事件逐卡核对稿》、HAMLET EVENTS FRONT p1–16、核心规则书第 33 页、R-077、R-085、R-086、R-087、R-099。16 张效果与既有运行时相符。

### R-086

- **日期 / 状态**：2026-10-16（UTC+8），Kyries本对话选择Q-89的A。
- **裁定**：The Feast（Hamlet Event FRONT p10）的“fully restore”伤口分支直接将该存活英雄伤口置0，不应用Infirm／Fast Healer治疗数值修正。例如7伤口且持Infirm，结果仍为0伤口。压力分支按卡面完全恢复至0，两轨二选一，不同时恢复；已死亡英雄不复活。
- **依据 / 边界**：卡面完整图像、R-085限定图标、官方R26/R27怪癖触发与R29生命规则。此次只裁定The Feast，不外推其他“fully restore”效果，不改变R-073的限定范围。

### R-087

- **日期 / 状态**：2026-10-16（UTC+8），Kyries本对话选择Q-88的A。
- **裁定**：Lost Shipment的减2在下次任务掷补给前，由队伍从常规8颗中任选2颗取消，包括Radiant自选骰。其余各骰保持原类型；标准模式实际掷6颗。Radiant可取消两颗掷出骰、一掷一选或两颗自选骰，分别保留2掷4选、3掷3选或4掷2选；被取消骰不掷、不消费RNG。建筑奖励骰照常，仍受R-041的公共池16颗上限约束。
- **依据 / 边界**：当前版Hamlet Event FRONT p3、R-085限定补给骰图标、官方R12/R37及本轮限定裁定。只处理Lost Shipment，不从中推导其他减骰效果。

### R-088

- **编号**：R-088
- **日期**：2026-10-16
- **问题**：死亡补人前置的赏金猎人属性与完整防御。
- **裁定（本项目限定审批）**：Kyries 明确回复“批准三行属性与限定防御”。仅批准[核对表](phase4-replacement-hero-review-2026-10-16.md) §2 三面：I/II/III 的 Life 14/18/23、Dodge 1/2/3、Speed 均为 2；抗性依次为 Stun、Stun+Debuff、Stun+Debuff+Bleed，免疫均为空。`c07ea0c507` 只在 `hero_stat:p006:front` 左侧抗性栏按 Debuff 解释，保留图标原 ID、全局词典未确认状态和整卡未验证原因。
- **依据 / 边界**：官方 R10/R21/R29/R31、当前版 Hero STAT FRONT p5/p6、BACK p5 的完整页面图像及本轮明确批准。独立于旧四英雄 R-081，不批准其他英雄、技能效果、村庄 Scout Ahead 或死亡替换运行时。
- **关联待确认**：Q-90，confirmed。

### R-089

- **编号**：R-089
- **日期**：2026-10-16
- **裁定（本项目限定审批）**：Kyries 明确回复“批准两行限定修正及完整效果”。仅在 `hero_skill:p046` Mark for Death I 与 `hero_skill:p061` Caltrops I 的目标框，将橙色图标 `763ad8e857` 解释为 Debuff。Mark for Death I：射程0–2，目标 Mark3t＋Debuff2t，自身仍 Buff2t；Caltrops I：保留 Crit1→2、Acc9→1、射程2，目标 Bleed2·3t＋Debuff1t。目标状态按命中施加，自身效果沿规则不受是否命中影响。
- **依据 / 边界**：当前版技能 FRONT p46/p61 完整卡面、官方 R19–21 与[核图表](phase4-bounty-skills-2026-10-16.md)。p46 自身蓝色 `d4329c2a97` 仍是 Buff；保留原图标 ID、raw/parsed、全局词典与其他卡。只批准上述两张 I 级技能，不扩大到 II/III 或其余技能。
- **关联待确认**：Q-91，confirmed。

### R-090

- **编号**：R-090
- **日期**：2026-10-16
- **问题**：Scout Ahead 在村庄增加压力到10时，意志检定的任务次数归属。
- **裁定（本项目）**：Kyries明确选择“沿用 R28，计入下一任务”。村庄到10压力照常意志检定；已有意志卡则心脏病。村庄获得的意志卡与已检定状态延续至下一任务，不在出征时重置。
- **依据 / 边界**：官方R28完整页面、R33村庄技能行动、当前版 Hero STAT FRONT p5。死亡后仍须走R31/R33补人；本裁定不代替补人实现，不改变Q-79；Q-80 另见 R-100。
- **关联待确认**：Q-92，confirmed。

### R-091

- **编号**：R-091
- **日期**：2026-10-16
- **问题**：R31要求移除死者全部卡牌，但未说明疾病、怪癖、美德和苦难的回收时点与去向。
- **裁定（本项目）**：Kyries本轮明确选择“所有共享卡均立即洗回对应堆”。死者持有的疾病、正负怪癖、美德和苦难立即洗回各自对应牌堆；保留存活者持牌，不把死者意志转换成怪癖，不等待回村。饰品仍按R31先由存活队友接收或弃置，不能洗回代替饰品选择。
- **依据 / 边界**：已对照官方R31、R26、R28完整页面图像；具体回收去向是本项目裁定。仅回收死者持牌，不额外回收既有弃牌，不改变Q-79、R-078出售饰品或R32回村回收；Q-80 另见 R-100。
- **关联待确认**：Q-93，confirmed；实现见[死亡共享卡回收](phase4-death-card-release-2026-10-16.md)。

### R-092

- **编号**：R-092
- **日期**：2026-10-16
- **问题**：R31补人后继续探索时，死者未结算的个人探索骰/Trap房间分配是否转交替补。
- **裁定（本项目）**：Kyries本轮明确选择“取消死者剩余个人项，其他英雄继续”。死者未结算的个人探索骰和Trap分配取消，替补不承接、不补掷、不重付已完成效果；其他原英雄照常继续剩余个人项。
- **依据 / 边界**：官方R31、R14–15；具体个人项归属是本项目裁定，不作为其他未规定效果的新通则。入队时间、初始状态和空姿态沿R-039；共享卡回收沿R-091。
- **关联待确认**：Q-94，confirmed；实现见[替补入队续接](phase4-replacement-join-2026-10-16.md)。

### R-093

- **编号**：R-093
- **日期**：2026-10-16
- **问题**：R32允许村庄随时换姿态；R33按姿态行动，但未说明日中换位如何更新余下队列。
- **裁定（本项目）**：Kyries回复“这个交由玩家自行商量决定”。不固定为一种队列策略；页面在日中换位时提供“按新姿态重排余下英雄”“保留当天原行动队列”及取消，协商确认前不生效。
- **依据 / 边界**：官方R32–33、规格书§4.1。协商仅选择剩余顺序；已行动者、建筑访问和资源支出保留，不重置一天或让替补额外行动。次日仍按当时姿态生成队列。
- **关联待确认**：Q-95，confirmed；见[村庄换位记录](phase4-hamlet-stances-2026-10-16.md)。

### R-094

- **编号**：R-094
- **日期**：2026-10-17
- **问题**：扩充死亡补人的候选目录，核对瘟疫医生三等级属性与完整防御；III级右栏`8510428636`在词典中尚未命名。
- **裁定 / 数据批准**：Kyries本轮回复“批准三行属性与限定防御”。Plague Doctor I为Life11/Dodge0/Speed3，抗性Blight、无免疫；II为15/1/3，抗性Blight、免疫Disease；III为19/2/3，无抗性、免疫Blight和Disease。仅在`hero_stat:p014:front`右侧免疫栏将`8510428636`解释为Blight，不改全局词典或其他卡。
- **依据 / 边界**：完整Hero STAT FRONT p13/p14、BACK p13，官方R10/R21/R29/R31/R33、规格书§2.4/§4.6/§6.5/§7/§9.4。批准限三属性面与左右防御栏，不覆盖七技能、村庄能力、开局选择或完整候选可用性；整卡其他未验证原因保留。
- **关联待确认**：Q-96，confirmed；见[限定核对表](phase4-plague-doctor-review-2026-10-17.md) §2–3。

### R-095

- **编号**：R-095
- **日期**：2026-10-18
- **问题**：Grave Robber / Occultist 六面属性与完整左右防御栏；三枚词典 unreviewed 图标需按 R-088/R-094 模式做**具体卡面位置**限定命名，不改全局词典。
- **裁定 / 数据批准**：Kyries 于 2026-10-18 在聊天确认 Q-97 为 LIMITED per-card mappings（同 R-088/R-094 风格），不是全局词典升级。印刷 Life/Dodge/Speed 见[核对表](phase4-grave-occultist-stat-review-2026-10-18.md) §2。限定映射仅如下：
  - `e61ed317de` = Blight 抗性，仅 `hero_stat:p017:back` 左栏 #1（GR II）、`hero_stat:p018:front` 左栏 #2（GR III）、`hero_stat:p020:front` 左栏 #2（Occ III）。
  - `8cbe7d6703` = Debuff 抗性，仅 `hero_stat:p019:front` 左栏唯一抗性（Occ I）。**同 hash 在 Jester I（`hero_stat:p011:front`）另见 R-101 分卡批准。**
  - `a8c4b25b4e` = Debuff 抗性，仅 `hero_stat:p019:back` 左栏 #2（Occ II，Bleed 之后）。
  其余已 confirmed 图标按既有词典读取：GR I 左栏 Blight；GR II/III、Occ II/III 的 Debuff/Bleed 等同栏 confirmed 图标。六面右栏均为空。
- **依据 / 边界**：官方 R10/R21/R29/R31/R33、规格书 §2.4/§4.6/§6.5/§7/§9.4、R-001/R-048；Kyries 聊天确认。批准限六属性面与上表位置的防御解释；不改全局词典、不清除整卡未验证原因；不覆盖 I 级技能效果接线、Dark Ritual 村庄能力，也不把 Jester 或其他英雄同 hash 图标一并命名。Pilfer 图标命名另见 R-096。
- **关联待确认**：Q-97，confirmed；见[核对表](phase4-grave-occultist-stat-review-2026-10-18.md)。

### R-096

- **编号**：R-096
- **日期**：2026-10-18
- **问题**：Grave Robber 村庄能力 Pilfer（Hero STAT FRONT/BACK p17、FRONT p18）印刷为 `Draw a {icon:79084a2922} .`；词典 v1.8 中该图标仍为 `unreviewed`，需按 R-095 LIMITED per-card 风格确认含义后方可接线。
- **裁定 / 数据批准**：Kyries 于 2026-10-18 在聊天确认 Q-98：在 **Pilfer 卡面文案语境下**，`79084a2922` = **Loot Token**（战利品标记）。限定范围仅三张属性面的 Pilfer 行：`hero_stat:p017:front`、`hero_stat:p017:back`、`hero_stat:p018:front`。不是全局词典升级；不合并、不改写 `icon-dictionary-v1.8`；整卡 `verification.reasons` 仍可保留 `icon:79084a2922`（同 R-095 防御图标保留 unreviewed 的做法）。
- **依据 / 边界**：官方 R33（村庄技能）、R-047（十枚战利品堆）、规格书 §4.1/§6.4、R-001/R-048/R-095；Kyries 聊天确认。批准只覆盖上述 Pilfer 文案中的图标命名与「Draw a」数量=1。不批准翻面结算时机、补给奖励去向、空堆语义，或其他卡上同 hash 图标（上述边见 R-098）。
- **关联待确认**：Q-98，confirmed；后续边见 R-098。

### R-097

- **编号**：R-097
- **日期**：2026-10-18
- **问题**：Occultist 村庄能力 Dark Ritual III（Hero STAT FRONT p20）目标行末尾为 `{icon:4f7549c1b8} 3t`；同技能 I/II（FRONT/BACK p19）对应位置为已确认 Buff 图标 `2af41c1ca4`。词典 v1.8 中 `4f7549c1b8` 仍为 `unreviewed`，需按 R-095/R-096 LIMITED per-card 风格确认含义后方可接线。同 hash 亦出现在 `hero_stat:p010:front`（Vestal III Pray/Chant 目标行）。
- **裁定 / 数据批准**：Kyries 于 2026-10-18 在聊天确认 Q-100（widget value `buff-limited`）：在 **Dark Ritual III 卡面文案语境下**，`4f7549c1b8` = **Buff**（与 I/II 的 `2af41c1ca4` 同义）。限定范围：
  - 主批准行：`hero_stat:p020:front` Dark Ritual 目标行末 `{icon:4f7549c1b8} 3t`（接线治疗 5、压力 −2、Buff 3t）。
  - 同 hash 已知第二处印刷：`hero_stat:p010:front` Vestal Pray/Chant 目标行末 `{icon:4f7549c1b8} 3t`——**仅作 LIMITED 命名诚实记录（R-048）**，不因此批准或改写 Vestal III 村庄技能行为（Pray/Chant 仍仅 I 级已接）。
  不是全局词典升级；不合并、不改写 `icon-dictionary-v1.8`；整卡 `verification.reasons` 仍可保留 `icon:4f7549c1b8`。
- **依据 / 边界**：官方 R33（村庄技能）、规格书 §4.1/§6.5、R-001/R-048/R-095/R-096；Kyries 聊天确认。批准只覆盖上表印刷行的图标命名，以及 Dark Ritual III 与 I/II 同路径的效果接线（Self 压力 +1 → 目标治疗 5 / 压力 −2 / Buff 3t；目标须有获批 `verified_buff_defence`）。不批准全局词典升级、不清除无关卡的未验证原因、不发明 Vestal III 技能数值或等级门控；Q-79／Q-80 另见 R-099／R-100。Pilfer 抽取边另见 R-098。
- **关联待确认**：Q-100，confirmed；见[Occ 技能记录](phase4-occultist-skills-2026-10-18.md)。

### R-098

- **编号**：R-098
- **日期**：2026-10-18
- **问题**：Pilfer 在 R-096 下已能「抽取一枚战利品标记」离开可用堆（R-047）。印刷未写翻面或奖励。待确认：(a) 是否立即按 R18 翻面结算；(b) 若在村庄结算，补给类结果进入何处（村庄无地牢补给池）；(c) 可用堆已空时是否可施放 / 如何处理；(d) 村庄已抽取的 claimed 是否应在下次出征保留（出征原 `createLootState()` 会重建十枚）。
- **裁定**（本项目裁定；Kyries 于 2026-10-18 以 widget keep-current 确认）：锁定当前 #243 Pilfer 实现行为，不发明新引擎语义：
  - (a) **抽取时不翻面、不结算**战利品标记；不按 R18 在村庄立即兑现金币或补给。
  - (b) 因无翻面，村庄补给去向**不适用**；不发明村庄补给池或其它目的地。
  - (c) 可用堆已空时**拒绝**施放。
  - (d) 出征时**保留**村庄期间有效的 `lootPool`（含 `claimedIds`）；与 R-047 守恒及既有 `hamlet-embark` 路径一致。
- **依据 / 出处**：官方 R33（村庄技能）、R18（战利品翻面语境；本裁定明确 Pilfer 抽取不适用立即翻面）、R-047（十枚战利品堆）、R-096（Pilfer 限定命名与抽取）、规格书 §4.1/§6.4、R-001 / R-048；Kyries 聊天确认（widget keep-current）。
- **关联待确认**：Q-99，confirmed
- **状态**：Kyries 已确认（2026-10-18）

### R-099

- **编号**：R-099
- **日期**：2026-10-18
- **问题**：R34 Graveyard 写“gain a Virtue for the next quest”，R28 规定已有意志卡时压力 10 直接死亡，但未明确英雄已持美德／苦难后再次访问墓地（或走同一获美德路径）是否允许、旧卡去向。In Good Spirits 等村庄事件此前仅因 Q-79 拒绝已持牌英雄。
- **裁定**（本项目裁定；Kyries 于 2026-10-18 确认 **replace-reshuffle**）：
  - **允许**再获得。
  - 将**旧**意志卡洗回对应牌堆：美德→美德堆、苦难→苦难堆（洗牌方式沿 R-091／回村回收既有惯例；Kyries 表述的「Virtue deck」对应墓地再发美德的主路径，苦难归还苦难堆以保五美德／五苦难守恒）。
  - 再按 R34 墓地流程（及等价获美德路径）抽取／授予**新**美德；墓地金币／行动消耗与首次访问相同（免费、占当天行动与建筑）。
  - 先前仅以 Q-79 标签拒绝的等价授予路径（含 In Good Spirits：卡面未要求「无意志目标」）同样适用 R-099：获奖／被选英雄若已持牌则替换洗回，不得再以 Q-79 整事件拒绝。
- **依据 / 出处**：官方 R34 Graveyard、R28 意志／心脏病、规格书 §4.5／§8／§9.1；洗回惯例对照 R-091；Kyries 聊天确认 replace-reshuffle。不使用 FAQ。不改变 Q-80（Q-80 另见 R-100）。
- **关联待确认**：Q-79，confirmed
- **状态**：Kyries 已确认（2026-10-18）

### R-100

- **编号**：R-100
- **日期**：2026-10-18
- **问题**：官方 R33 游商首次来访按建筑等级抽满陈列（I `{1:3}`／II `{1:2,2:1}`／III `{1:1,2:1,3:1}`），但未写某级可抽牌堆不足所需张数时是否陈列不足货架、是否回收该级弃牌。
- **裁定**（本项目裁定；Kyries 于 2026-10-18 确认 **recycle_discard_fill**）：
  - 对每一级所需张数：若该级**可抽堆**不足所需，且该级**弃牌**非空，则将该级弃牌洗回可抽堆（洗牌沿既有饰品牌堆／R-078 同类 RNG 惯例），再抽／揭示**满额**所需张数。
  - **不得**陈列不足货架；**不得**在可抽不足时整次原子拒绝且不洗弃牌（旧 Q-80 pending 停点废除）。
  - 洗回弃牌后若可抽＋弃牌合计仍不足所需（真耗尽：卡在持牌／他处），则整次访问拒绝：不支付、不占用、不陈列；拒绝原因标明 R-100 耗尽，不再使用 Q-80 pending 文案。
  - R-078 出售仍为**立即**洗回对应可抽套；本裁定只覆盖**陈列抽满**时的弃牌回收，二者正交。R-040（一次访问卖一件并买一件）不变。
- **依据 / 出处**：官方 R33 Nomad Wagon；规格书 §4.5；R-040／R-078；Kyries 聊天确认 recycle_discard_fill。不使用 FAQ。不重开 Q-79／R-099。
- **关联待确认**：Q-80，confirmed
- **状态**：Kyries 已确认（2026-10-18）

### R-101

- **编号**：R-101
- **日期**：2026-10-24
- **问题**：核心盒 Jester / Arbalest / Abomination 九面 Hero STAT（`p011`–`p012`、`p015`–`p016`、`p021`–`p023`）Life/Dodge/Speed 与可核实防御栏未入库；建队仍用占位 life=1。 Jester II／III 和 Arbalest I 的状态防御补录见 R-215。
- **裁定**（Kyries 批准转录；不改全局词典）：
  - 九面三行属性按印刷 raw 入库，`attributesVerified: true`，批准标记 `kyries_review_2026-10-24`。
  - I 级条件防御：`hero_stat:p011:front` 左栏 `8cbe7d6703`→Debuff（与 R-095 Occ I 分卡批准）；`hero_stat:p021:front` 左栏 `40bb356305`→Blight；Arbalest I 仅 `df4eb1ac47`（Shuffle）在左栏，不写入 I 级 `verified_condition_defence`（schema 不含 shuffle）。
  - II/III 高等级防御：Arbalest `p015:back` / `p016:front`、Abomination `p022:front` / `p023:front` 按左右栏入库；Jester II/III 含词典 `unreviewed` 的 `f912c18659`，不批准 higher 注解。
  - 不批准村庄技能效果、不接线战斗技能；`f912c18659` 等仍保留整卡 `verification.unverified` 原因（R-048）。
- **依据 / 边界**：印刷 Hero STAT FRONT/BACK、extract raw、`hero-stat-print-art-map`（#286）；R-048/R-095。不使用 FAQ。
- **状态**：Kyries 已确认（2026-10-24）

### R-102

- **编号**：R-102
- **日期**：2026-10-24
- **问题**：Jester Dirk Stab I–III（`hero_skill:p106` 等）效果行「Ignores `{icon:a2e7252e06}`」；词典 `pending_a2e7252e06` / needs_review（Q-101）。
- **裁定**（Kyries 已确认，2026-10-24）：
  - 全局词典：`a2e7252e06` = **Guard（守护）**，`key=guard`，`kind=status`。
  - 规则语义（与 R-024 一致）：除非使用范围技能，针对被守护对象的非范围技能须转移到守护者；够不到则按 R-023 / R-024 补充移动或跳过。
  - Dirk Stab 印刷「Ignores `{icon:a2e7252e06}`」= **无视守护**，可直接对被守护对象结算伤害（不强制改选 Guard 敌人）。
  - 同图标出现于 Dirk Stab I–III；II/III 若仅该图标阻碍核实则一并核实接线，不扩其它未核实图标。
- **依据 / 出处**：官方 R21 / R24、规格书 §6.7；Kyries 聊天裁定 Q-101。不使用 FAQ。
- **关联待确认**：Q-101，confirmed
- **状态**：Kyries 已确认（2026-10-24）

### R-103

- **编号**：R-103
- **日期**：2026-10-24
- **问题**：Arbalest Rallying Flare I–III（`hero_skill:p166` 等）射程行后 `{icon:d93aef1e33}`（红骷髅/金头盔斜线）；词典 needs_review（Q-102）。
- **裁定**（Kyries 已确认，2026-10-24）：
  - 全局词典：`d93aef1e33` = **目标：英雄或怪物**，`key=target_hero_or_monster`，`kind=target`（与低置信 proposal 一致）。
  - 射程旁 ×N 该图标 = **同一区域内可选英雄或怪物目标，最多 N 个**；不另猜双阵营混排或额外效果。
  - Rallying Flare I–III 整卡可核实并接线；II/III 若仅该图标阻碍则一并核实。
- **依据 / 出处**：印刷 Hero Skill FRONT；Kyries 聊天裁定 Q-102；R-048。不使用 FAQ。
- **关联待确认**：Q-102，confirmed
- **状态**：Kyries 已确认（2026-10-24）

### R-104

- **编号**：R-104
- **日期**：2026-10-24
- **问题**：Warrens 扩展包 Antiquarian / Leper Hero STAT（TDH 印刷 `DD_EN_THE_DARKEST_HEROES_CARDS_100x180_Hero_STAT` p28–31；与 Warrens 英雄包 p1–4 同序）与七张 I 级战斗技能（TDH 技能页 **p274–315**，见 Q-103）待核实入库与接线。
- **裁定**（Kyries 批准转录；不改全局词典除非另开 Q）：
  - **STAT 入库**（`attributesVerified: true`，`kyries_review_2026-10-24`）：Leper I/II/III 与 Antiquarian I/II 共五面——Life/Dodge/Speed：Leper 18/0/1、25/1/1、33/2/1；Antiquarian 9/1/0、12/2/0。Leper I 左栏 `8db71542d2`→Stun 写入 `verified_condition_defence`。Antiquarian I 无已确认左栏抗性（Shuffle `df4eb1ac47` 在 Speed 行误 remap，不写入 shuffle 抗性）。 Leper 与 Antiquarian 的速度及状态防御以 R-215 为准。
  - **Antiquarian III**（`hero_stat:warrens:antiquarian:p002:front`）免疫栏含未确认 `8510428636`，**不**批准 `attributesVerified`（Q-104）。
  - **Antiquarian II 背面**村庄技能行含未确认图标时，属性仍批准，整卡可保留 `verification.unverified`（R-048，同 R-101 村庄栏）。
  - TDH 免疫栏标题装饰 `55a3fded25` 不入词典、不参与 STAT 核实（Q-104）。
  - **战斗**：各七张 I 级技能 id `hero_skill:p274`–`p292`（Leper）、`p295`–`p313`（Antiquarian）规范化核实后接线；移出 `FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS`，纳入正式替补白名单（与 Abom/Jester/Arbalest 同）。
- **依据 / 边界**：TDH 印刷 PDF、extract `extension/warrens`、R-048/R-101 路径。不使用 FAQ。
- **关联待确认**：Q-103、Q-104
- **状态**：Kyries 已确认（2026-10-24）

### Q-103

- **编号**：Q-103
- **问题**：#286 / `print-hero-18-art-catalog` 登记 Antiquarian 技能 p232–252、Leper p253–273；当前仓内 TDH 技能 PDF 上 Leper 自 **p274**、Antiquarian 自 **p295**（Nervous Stab 在 p295）。
- **暂定**（数据层）：扩展技能 extract 与规范化 id 采用 **印刷页** `hero_skill:p274`–`p315`；art map 页码待与 Kyries 对齐后改 catalog，不阻塞本 PR 接线。
- **状态**：待 Kyries 确认

### Q-104

- **编号**：Q-104
- **问题**：TDH Hero STAT 免疫栏标题 `55a3fded25`、Antiquarian III 免疫 `8510428636`、II 背村庄行 `7034784ee1` 等未入词典或 needs_review。
- **暂定**：R-104 按上表批准属性；未确认图标不命名、不猜效果；整卡 `verification` 可仍为 unverified。
- **处理**（2026-11-08，R-200）：Antiquarian III 免疫栏 = **位移 + 疾病**；`8510428636` 仅在本卡 `verified_higher_condition_defence` 注解为 Shuffle，`28b10f3fb7` 为 Disease；`8510428636` 仍**不**写入全局词典（沿用 R-105 / Plague Doctor III 的 per-card 模式）；`55a3fded25` 仍是标题装饰。
- **状态**：已确认（R-200，2026-11-08）

### R-105

- **编号**：R-105
- **日期**：2026-10-24
- **问题**：Cove 扩展包 Man-at-Arms / Flagellant Hero STAT（Cove 印刷 `DD_EN_COVE_CARDS_100x180_Hero_STAT` p1–4；与 TDH 同序 p24–27 几何）与七张 I 级战斗技能（TDH 技能页 **p232–273**，见 Q-105）待核实入库与接线。
- **裁定**（Kyries 批准转录；不改全局词典除非另开 Q）：
  - **STAT 入库**（`attributesVerified: true`，`kyries_review_2026-10-24`）：Flagellant I/II/III 与 MAA I/II/III 共六面——Life/Dodge/Speed：Flagellant 12/2/0、16/3/0、22/3/0；MAA 16/1/1、22/2/1、28/3/1。CE `speed` 缺印时 Speed 记 **0**；MAA Speed 以移动栏图标数量核实为 1（Flagellant I 亦 Speed 0，III 虽有 movement boot 3 仍 Speed 0）。 速度及状态防御以 R-215 为准。
  - TDH 免疫栏标题装饰 `55a3fded25` 不入词典、不参与 STAT 核实（同 Q-104 / Q-105）。
  - **战斗**：各七张 I 级技能 id `hero_skill:p232`–`p250`（MAA）、`p253`–`p271`（Flagellant）规范化核实后接线；移出 `FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS`，纳入正式替补白名单。
- **依据 / 边界**：Cove/TDH 印刷 PDF、CE OFFICIAL_PRINTED_COMPONENT 字面、`extract/extension/cove`、R-048/R-104 路径。不使用 FAQ。
- **关联待确认**：Q-105
- **状态**：Kyries 已确认（2026-10-24）

### Q-105

- **编号**：Q-105
- **问题**：`print-hero-18-art-catalog` 登记 MAA 技能 p232–252、Flagellant p253–273；Cove 英雄包 STAT 为 p1–4，TDH STAT 重印为 p24–27。本 PR 技能 id 与 extract 采用 **TDH 技能页 p232–273**；STAT raw 文件路径用 Cove 包 PDF、页码 p1–4（几何自 TDH p24–27 提取，见 import 脚本注释）。
- **暂定**：art map 中 EXTENSION_SKILL_BLOCKS 仍登记 p274+ 待与 Kyries 对齐；不阻塞本 PR 接线。
- **状态**：待 Kyries 确认

### R-106

- **编号**：R-106
- **日期**：2026-10-24
- **问题**：Weald 扩展包 Houndmaster / Shieldbreaker Hero STAT（Weald 印刷 `DD_EN_WEALD_CARDS_100x180_Hero_STAT` p1–4；几何自 TDH 同序 p32–35）与七张 I 级战斗技能（TDH 技能页 **p316–357**，见 Q-106）待核实入库与接线。
- **裁定**（Kyries 批准转录；不改全局词典除非另开 Q）：
  - **STAT 入库**（`attributesVerified: true`，`kyries_review_2026-10-24`）：Houndmaster I/II/III 与 Shieldbreaker I/II/III 共六面——Life/Dodge/Speed：HM 11/1/2、15/2/2、19/3/2；SB 11/1/2、15/2/2、19/3/3。CE `speed` 缺印时以移动栏图标数量核实 Speed；Shieldbreaker I/II 印刷两枚靴记 Speed **2**（CE movement.literal 仍为 3，见 Q-106）。
  - I 级条件防御：两名英雄 I 级正面 `{icon:8db71542d2}` 记 **Stun** 抗性（与核心盒路径一致）。 两名英雄 II／III 的状态防御见 R-215。
  - TDH 免疫栏标题装饰 `55a3fded25` 不入词典、不参与 STAT 核实（同 Q-104 / Q-105 / Q-106）。
  - **战斗**：各七张 I 级技能 id `hero_skill:p316`–`p334`（Shieldbreaker）、`p337`–`p355`（Houndmaster）规范化核实后接线；移出 `FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS`，纳入正式替补白名单。
- **依据 / 边界**：Weald/TDH 印刷 PDF、CE OFFICIAL_PRINTED_COMPONENT 字面、`extract/extension/weald`、R-048/R-104/R-105 路径。不使用 FAQ。
- **关联待确认**：Q-106
- **状态**：Kyries 已确认（2026-10-24）

### Q-106

- **编号**：Q-106
- **问题**：`print-hero-18-art-catalog` 登记 Houndmaster 技能 p316–336、Shieldbreaker p337–357；CE / 当前 TDH 技能 PDF 上 **Shieldbreaker 自 p316、Houndmaster 自 p337**（与 catalog 英雄顺序对调）。本 PR 技能 id 与 extract 采用 **印刷页 p316–357**；STAT raw 文件路径用 Weald 包 PDF、页码 p1–4（几何自 TDH p32–35 提取）。
- **暂定**：art map / EXTENSION_SKILL_BLOCKS 仍登记 HM→316、SB→337 待与 Kyries 对齐；不阻塞本 PR 接线。Shieldbreaker I/II CE `movement.literal` 为 3 而 Weald 印刷移动栏仅两枚靴，R-106 Speed 记 2。
- **状态**：待 Kyries 确认

### R-107

- **编号**：R-107
- **日期**：2026-10-24
- **问题**：Musketeer 扩展包 Hero STAT（`MG_DD_08_EN_MUSKETEER` 印刷 `DD_EN_MUSKETEER_CARDS_100x180_Hero_STAT` p1–2）与七张 I 级战斗技能（同包 `DD_EN_MUSKETEER_CARDS_44x68_SKILLS_FRONT` p1–21，见 Q-107）待核实入库与接线。
- **裁定**（Kyries 批准转录；不改全局词典除非另开 Q）：
  - **STAT 入库**（`attributesVerified: true`，`kyries_review_2026-10-24`）：Musketeer I/II/III 三面——Life/Dodge/Speed：14/0/1、19/1/1、24/2/2（STAT_FRONT p1、STAT_BACK p1、STAT_FRONT p2）。
  - I 级条件防御：Shuffle 抗性 `{icon:df4eb1ac47}` 仅记印刷存在，本 PR 不写入 `verified_condition_defence`（schema 仅 stun/bleed/blight/debuff）。 Musketeer I／II／III 的位移与眩晕防御已按 R-215 入库。
  - 免疫栏标题装饰 `55a3fded25` / `f9c2c60dad` 不入词典、不参与 STAT 核实（同 R-104–R-106）。
  - **战斗**：七张 I 级技能 id `hero_skill:musketeer:p001`、`p004`、`p007`、`p010`、`p013`、`p016`、`p019`（Aimed Shot、Smokescreen、Call the Shot、Buckshot、Sidearm、Patch Up、Skeet Shot）规范化核实后接线；移出 `FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS`（名单清空），纳入正式替补白名单。
- **依据 / 边界**：Musketeer 包印刷 PDF、CE OFFICIAL_PRINTED_COMPONENT 字面、`extract/extension/musketeer`、R-048/R-103。不打开 PvP / 专属扩展机制。不使用 FAQ。
- **关联待确认**：Q-107
- **状态**：Kyries 已确认（2026-10-24）

### Q-107

- **编号**：Q-107
- **问题**：`print-hero-18-art-catalog` 与 `EXTENSION_SKILL_BLOCKS` 登记 Musketeer 技能 `startPage: 1`（与 MG_DD_08 包内页序一致），但规范化 id 使用前缀 `hero_skill:musketeer:p###` 以避免与核心盒 `hero_skill:p001` 冲突；art map 仍为 `hero_skill:art:musketeer:p###`。
- **暂定**：战役沙盒与 `MUSKETEER_VERIFIED_SKILL_PAGE_BLOCKS` 采用 **包内页 p1–21** + `musketeer:` 前缀 id；catalog 登记待与 Kyries 对齐。
- **状态**：待 Kyries 确认

### R-108

- **编号**：R-108
- **日期**：2026-10-25
- **问题**：核心盒任务卡 FRONT 底部 quest_setup 小图标 `7d43c83ef2` 对应房间代币种类（Q-108）。
- **裁定**：`{icon:7d43c83ef2}` 在任务分布行中表示 **Objective** 房代币（`kind: objective`），与冲压板 Rubine 刀线 objective / 绳绑卷轴图案一致（见 `docs/phase4-print-room-token-art-2026-10-19.md` xref 165）。用于 Dem Bones / Disruption / Break Them / Purify / They Are Back 等卡面分布行。
- **依据 / 边界**：`DD_EN_COREBOX_CARDS_70_120_quests_FRONT.pdf` 任务 p4/p6/p9/p10/p13 等；R15 房间代币图例；R-048 不猜未核实图标。数字角标 `a2e7f1dd7b` / `f698b6fd6c` 等仅为数量，不单独命名房间 kind。
- **关联待确认**：Q-108
- **状态**：Kyries 已确认（2026-10-25）

### R-109

- **编号**：R-109
- **日期**：2026-10-25
- **问题**：任务卡图标 `ecd1d4820d`（常与数量角标连用）对应房间种类（Q-109）。
- **裁定**：`{icon:ecd1d4820d}` 在任务分布行中表示 **Treasure** 房代币（`kind: treasure`）。Rising Threat I（quest:p005）第二行 `ecd1d4820d` + `723d85db03` 计 **1× treasure**，不是 lair。先例：Fundraiser I（quest:p003）已批准 `ecd1d4820d` + `a2e7f1dd7b` → treasure。
- **依据 / 边界**：任务 FRONT p5 裁剪为宝箱图案；`fundraiser_distribution.json`；冲压板 treasure（xref 163）。`723d85db03` / `a2e7f1dd7b` 仅为数量角标。
- **关联待确认**：Q-109
- **状态**：Kyries 已确认（2026-10-25）

### R-110

- **编号**：R-110
- **日期**：2026-10-25
- **问题**：任务卡图标 `0fd90af65e` 对应房间种类（Q-110）。
- **裁定**：`{icon:0fd90af65e}` 在任务分布行中表示 **Dark** 房代币（`kind: dark`）。They Are Back III（quest:p013）第一行该图标计 **1× dark**；同卡 `feea73ac43×1` 为 **1× curio**（不是把 `0fd90af65e` 当 curio）。
- **依据 / 边界**：任务 FRONT p13 裁剪为火把图案；与 `25bc58381e`→dark 同族；R15。`a2e7f1dd7b` 若同行出现仅为数量角标。
- **关联待确认**：Q-110
- **状态**：Kyries 已确认（2026-10-25）

### R-111

- **编号**：R-111
- **日期**：2026-10-25
- **问题**：任务卡图标 `5281dfacce` 对应房间种类（Q-111）。
- **裁定**：`{icon:5281dfacce}` 在任务分布行中表示 **Lair** 房代币（`kind: lair`）。The Threat is Real III（quest:p015）行 `5281dfacce` + `f698b6fd6c` 计 **3× lair**；`f698b6fd6c` 仅为数量角标。
- **依据 / 边界**：任务 FRONT p15；冲压板 lair（xref 175）；R15。不使用 FAQ。
- **关联待确认**：Q-111
- **状态**：Kyries 已确认（2026-10-25）

### R-112

- **编号**：R-112
- **日期**：2026-10-25（2026-10-25 修订：Q-112b 已确认；去掉引擎独立匀掷）
- **问题**：Forward Camps III（quest:p012）任务分布底栏 `?`、出征池与未接线的 camp XP / SPECIAL 设营地（Q-112 / Q-112b）。
- **裁定（已核实部分）**：
  - **印刷**：FRONT p12 核实 **Rest 8**、**empty×3**（`6f701b5f5f`）、**Objective×0**；其余五格为卡面印刷 **`?`**（非提取失败），SPECIAL 要求用 **3 Empty** 并 **randomize non-Objective** 补足；与其它 III 级任务一致 **tokenTotal = 8**（固定 empty×3 + 待展开 **5**）。
  - **data-pool-only**：`forward_camps_distribution.json` 记 `counts: empty×3` + `randomizeNonObjective: 5`；`basic-quests` + 出征池 + 印刷 art `enabled`。数据层保留 `?` 槽；**建局**时由引擎展开（见 Q-112b）。未展开模板仍 **拒出征**（错误信息点名 **Q-112b**）。
  - **设营 XP / SPECIAL**：见 **R-113**（已另刀接线）；本条只管分布与建局展开（Q-112b），不含 QuestMap 几何；QuestMap 择图见 **R-116**（8 代币不得硬绑 p11/p12 十六槽）。
- **Q-112b（Kyries 2026-10-25 已确认）**：
  - **C（展开时机）**：**建局**时从实体池一次取出所需枚数，与固定 empty 合并后 **洗混**、**面朝下** 放入地图房间槽；对齐规则书 **印刷 p12** 建局流程。进房只揭面，**不在进房时** 再决定 kind。
  - **B（抽法）**：再抽 **5** 枚 = 仅从 **dark / curio / treasure / lair / trap** 五类 **实体代币池无放回** 抽取（**排除 Empty 与 Objective**）。**禁止**对 kind 独立均匀掷骰（会产生非法 multiset；实体池每种通常 **≤3**）。固定 **empty×3 + 抽到的 5 枚 → 共 8**，与 `forward_camps_distribution.json` 骨架一致。
  - **弱类比**：规则书 p30 / p36 等处的「random / random non-Objective」措辞仅作弱类比，**不可**直接当作本卡底栏 `?` 的算法。
  - **待确认（不阻塞）**：冲压板五类非 Objective 代币是否**恰好各 3 枚**仍可标待确认；本裁定按 B 池不含 Empty，与「从含 Empty 的全池抽」不等价时仍按 **B**。
- **依据 / 边界**：`DD_EN_COREBOX_CARDS_70_120_quests_FRONT.pdf` p12（建局）；R-001 / R-048。
- **关联待确认**：Q-112（骨架，已确认）
- **状态**：Kyries 已确认（2026-10-25）；Q-112b 已确认（C+B）

### R-113

- **编号**：R-113
- **日期**：2026-10-26
- **问题**：Forward Camps III（quest:p012）SPECIAL 设营、`xpKind: camp` 任务 XP 与退出摘要（承接 R-112 未接线部分）。
- **裁定**：
  - **SPECIAL**：在 **已清理** 的 **Empty** 房，消耗 **1 Torch 或 1 Tool（Shovel）** → 成功设 1 次 forward camp；**同一 Empty 可多次**（每耗 1 补给计一次）；**不移除** Empty 代币（与 R15 一般 Empty「移除代币」表述区分：本任务保留代币供重复设营）。
  - **XP**：每次成功设营 **1 XP**（印刷「1 Xp / Set up camp」）；数据层 `xpKind: camp`、`roomsPerXp: 1`；适用 **R-038** 封顶 **3**。
  - **摘要**：`summarizeDungeonQuest` 按设营次数计待发 XP；建局分布仍只认 **R-112**，本条不管 QuestMap / R-048 几何。
- **依据 / 边界**：QUEST FRONT p12；规格书 §13.1（R15、R29、R-038）；R-112（分布与出征池）。
- **关联待确认**：Q-112（骨架，已确认）
- **状态**：Kyries 已确认（2026-10-26）

### R-114

- **编号**：R-114
- **日期**：2026-10-26（UTC+8）
- **问题**：QuestMap FRONT p011 / VQ-08 印刷与网页标注名「红点 X」是什么节点？是否等于规则书走廊灰点？
- **裁定**（本项目，Kyries 本对话当面确认）：p011 QuestMap 印刷／网页上的**红色实心圆**（标注名红点 X）语义 = **R14 / R-046 走廊灰点（dot）**：经过必须先停再继续探索。**不是**房间槽、**不是**设营点、**不是**起点。
- **限定**：仅批准该点的上述走廊灰点语义。p011 特殊图案槽 A/B/G 另见 **R-115**（2026-10-27 当面批为 Objective）；p011 整页布局 `review: confirmed` 另见 **R-119**；其它 QuestMap 页仍 **pending / hold**。VQ-08 就红点 X 可升 **confirmed**（仅此语义）；A/B/G 语义见 R-115。
- **依据 / 出处**：Kyries 于 2026-10-26 本对话当面确认；规则书 R14 长走廊灰点须停留；R-046；VQ-08。
- **关联**：R-046、R14、VQ-08、R-115；Q-45（板块标注仍延后，本条只结清 p011 红点 X）。
- **状态**：Kyries 已确认（2026-10-26）

### R-115

- **编号**：R-115
- **日期**：2026-10-27（UTC+8）
- **问题**：QuestMap FRONT p011 / VQ-08 特殊图案槽 **A / B / G** 印刷是什么？语义是否等于 Objective 房？
- **裁定**（本项目，Kyries 本对话当面确认，选项「1」）：A、B、G **三者同图案、同语义** = **Objective 房槽**（`kind: objective`）。印刷为方形槽内 **绳绑卷轴**（与 R-108 任务卡分布行 / 冲压板 Objective 卷轴图案一致）；位置为图上顶 / 左 / 右支路末端。**不是** Boss 位、**不是** 走廊灰点、**不是** 普通门洞房槽装饰。
- **限定**：仅批准 QuestMap FRONT **p011** 的 A/B/G 上述 Objective 语义；p012 特殊槽 A/C/D 另见 **R-117**；**不**扩散到其它 QuestMap 页。红点 X 仍仅见 **R-114**。VQ-08 就 A/B/G 可升 **confirmed**（仅此语义）。
- **依据 / 出处**：Kyries 于 2026-10-27 本对话当面确认（选项 1）；目视 `p011-questmap-red-dot.png` / `.jpg`；R-108（绳绑卷轴 = Objective 房代币）；规格书 I-53（Objective = 紫色卷轴/手）；VQ-08；R-046 / R-048。
- **关联**：R-046、R-048、R-108、R-114、R-117、VQ-08；Q-45。
- **状态**：Kyries 已确认（2026-10-27）

> **【R-121 修正 · 2026-10-27】** 废止本条「A/B/G = Objective 房槽 / 不是 Boss 位」。Kyries 对照规则书 p36 与印刷确认：QuestMap 绳绑卷轴槽 = **Boss 位**；Objective 房代币是洗入三格之一的内容，不是槽图标本身。详见 **R-121**。节点仍为 **A / B / G**。

### R-117

- **编号**：R-117
- **日期**：2026-10-27（UTC+8）
- **问题**：QuestMap FRONT p012 / VQ-09 特殊图案槽 **A / C / D** 印刷是什么？语义是否等于 Objective 房？
- **裁定**（本项目，Kyries 本对话当面确认，与 R-115 同选项「1」）：A、C、D **三者同图案、同语义** = **Objective 房槽**（`slotKind: objective`）。印刷为方形槽内 **绳绑卷轴**（与 R-108 / R-115 任务卡分布行 / 冲压板 Objective 卷轴图案一致）；位置为图上顶排左 / 顶排右 / 次排左支路。**不是** Boss 位、**不是** 走廊灰点、**不是** 普通门洞房槽装饰。
- **限定**：仅批准 QuestMap FRONT **p012** 的 A/C/D 上述 Objective 语义；**不**扩散到其它 QuestMap 页。p011 特殊槽 A/B/G 仍仅见 **R-115**。VQ-09 就 A/C/D 可升 **confirmed**（仅此语义）；对应 `unresolvedMarkers` 按 objective 清除（与 R-115 对 p011 A/B/G 的做法对齐）。
- **依据 / 出处**：Kyries 于 2026-10-27 本对话当面确认（选项 1）；R-108（绳绑卷轴 = Objective 房代币）；R-115（同语义先例）；规格书 I-53（Objective = 紫色卷轴/手）；VQ-09；R-046 / R-048。
- **关联**：R-046、R-048、R-108、R-115、R-116、VQ-09；Q-45。
- **状态**：Kyries 已确认（2026-10-27）

> **【R-121 修正 · 2026-10-27】** 废止本条「A/C/D = Objective 房槽 / 不是 Boss 位」。同 R-121：卷轴槽 = **Boss 位**。节点仍为 **A / C / D**。

### R-119

- **编号**：R-119
- **日期**：2026-10-27（UTC+8）
- **问题**：QuestMap FRONT **p011** 整页布局读数（槽 A–P、起点 S、边清单、灰点 X）是否可升为 `review: confirmed`？
- **裁定**（本项目，Kyries 当面批）：**p011 整页布局可读数获批**。数据 `quest_map:p011` 的 `review` 可升为 **`confirmed`**。范围：十六房间槽 **A–P**、起点 **S**、现录入 **19** 条边；**无**未解释 `unresolvedMarkers`。**灰点 X** 语义仍仅见 **R-114**；特殊图案槽 **A/B/G** Objective 语义仍仅见 **R-115**。
- **限定**：仅批准 **p011** 整页布局 `review: confirmed`；**不**扩散到 p012 或其它 QuestMap 页；**不**改 **R-116**（tokenTotal / 地点选图配对）或 **R-117**。
- **依据 / 出处**：Kyries 于 2026-10-27 当面确认；`dungeon_layouts.json` 录入边与 VQ-08 表；R-114、R-115；VQ-08；R-046 / R-048。
- **关联**：R-046、R-048、R-114、R-115、R-116、VQ-08；Q-45。
- **状态**：Kyries 已确认（2026-10-27）

### R-118

- **编号**：R-118
- **日期**：2026-10-27（UTC+8）
- **问题**：QuestMap FRONT **p012** 整页布局读数（槽 A–P、起点 S、边清单）是否可升为 `review: confirmed`？
- **裁定**（本项目，Kyries 当面批）：**p012 整页布局可读数获批**。数据 `quest_map:p012` 的 `review` 可升为 **`confirmed`**。范围：十六房间槽 **A–P**、起点 **S**、现录入 **17** 条边；**无**灰点、**无**未解释 `unresolvedMarkers`。特殊图案槽 **A/C/D** Objective 语义仍仅见 **R-117**。
- **限定**：仅批准 **p012** 整页布局 `review: confirmed`；**不**扩散到 p011 或其它 QuestMap 页；**不**改 **R-116**（tokenTotal / 地点选图配对）或 **R-115**。
- **依据 / 出处**：Kyries 于 2026-10-27 当面确认；`dungeon_layouts.json` 录入边与 VQ-09 表；R-117；VQ-09；R-046 / R-048。
- **关联**：R-046、R-048、R-115、R-116、R-117、VQ-09；Q-45。
- **状态**：Kyries 已确认（2026-10-27）

### R-116

- **编号**：R-116
- **日期**：2026-10-27
- **问题**：任务卡（QUEST FRONT）与 QuestMap（FRONT/BACK）如何配对选图？页码同号是否表示同一组件？
- **裁定**（本项目，Kyries 经「DDBG·规则书」转达拍板）：
  - **配对，不是塞槽**：普通任务 **8 枚房间代币 ↔ 8 房间槽** QuestMap；最暗地牢 **16 ↔ 16**（规则书 R12、R36；占位与校验见 **R-046**）。**禁止**把 8 代币硬塞进 16 槽或反之。
  - **选图键**：引擎 / 出征 / 沙盒按 **`tokenTotal`** 与 **出征地点**（遗迹 vs 最暗地牢；核心盒 `basic-quests` 现为遗迹）在兼容 QuestMap 中择一；**不得**用「任务卡 PDF 页码 = QuestMap FRONT 页码」作为唯一或默认绑定（例：**quest:p012 Forward Camps** 为 III 级 **8 代币**，**R-112**；**QuestMap p11/p12** 为红边 **16 槽**，**VQ-08/09**——同页号不表示同一组件）。
  - **出征**：在槽数 / 地点匹配的图中优先 `review: confirmed`；含未解释标记的 pending 图仍 **拒出征**（**R-048**）。p012 特殊槽 A/C/D 已由 **R-117** 接线，与本条槽数配对无关；**不**改 **R-115** / **R-117** / Boss p016–p019。
- **依据 / 出处**：规则书 R12、R36；R-046；R-112；VQ-08、VQ-09；R-117；Kyries 拍板（2026-10-27）。
- **关联**：R-046、R-112、R-114、R-115、R-117、VQ-08、VQ-09、Q-45。
- **状态**：Kyries 已确认（2026-10-27）

### R-120

- **编号**：R-120
- **日期**：2026-10-27（UTC+8）
- **问题**：核心盒 Boss 任务卡 **quest:p016–p019** 如何按印刷表接线并启用沙盒出征？XP、Boss 位与 Boss 战斗何时实现？
- **裁定**（本项目，Kyries 批 2026-10-27）：
  - **分布**：p016–p018 各 **16** 枚代币（objective×1、empty×3、dark×3、curio×3、lair×3、trap×3）；curio 行 **d07a10730a + 5790845c5c** 读 **3× curio**（5790845c5c 仅为数量角标）。p019 **8** 枚（objective×1、empty×1、dark×2、curio×1（d07a+f698 角标）、treasure×1、lair×1、trap×1）。数据文件 `*_distribution.json`；**R-108** objective、**R-038** XP 封顶。
  - **元数据**：p016–p018 `level: 3`、`restPoints: 20`、`expeditionRegion: darkestDungeon`；p019 `restPoints: 12`、`expeditionRegion: ruins`；`bossQuest: true`（**不进**战役 `questsForCampaignLevel` 普通「抽 2 选 1」池，规则书 **R30** 按幕另接；项目 **R-030** 为姿态补位，勿混淆）。p019 卡面无罗马级标记：`level: 3` 为 schema 占位，**非**普通 III 级随机池卡（幕威胁触发待 Phase 5）。
  - **XP**：卡面「3 Xp」之定额语义见 **R-122**（本条废止 Scout Ahead 式 `xpKind: all` / `roomsPerXp: 2` / `maxRooms: 6` 占位）。
  - **出征 / 选图**：`basic-quests` + 印刷 art **enabled**；沙盒 `sandboxEmbarkQuests()` 可选；QuestMap 按 **R-116**（tokenTotal + `expeditionRegion`；16 槽用 confirmed **p11/p12**）。**不做** Boss 位几何、Boss 战斗 / 多形态 / Ancestor 终局；SPECIAL 文案与 `bossRef` 仅数据/裁定记录，运行时未实现。
- **限定**：不发明未核实图标；不修改 **R-116** 配对语义正文；Boss 拒建局若因 **R-046** hold 须在 PR 说明。
- **依据 / 出处**：`DD_EN_COREBOX_CARDS_70_120_quests_FRONT.pdf` p16–p19；R-108、R-038、R-116、R-048、R-030；Kyries 2026-10-27。
- **关联**：R-046、R-108、R-116、R-030、Q-45。
- **状态**：Kyries 已确认（2026-10-27）

> **【R-122 修正 · 2026-10-27】** 废止本条「XP 占位：`xpKind: all` / `roomsPerXp: 2` / `maxRooms: 6`」。Boss/最暗任务 XP = **击败后固定 3**（既是额也是顶，与 R-038 一致）。详见 **R-122**。

### R-121

- **编号**：R-121
- **日期**：2026-10-27（Asia/Shanghai / UTC+8）
- **授权**：Kyries 当面确认「卷轴槽确实是 BOSS 位」（消息 t109u / pt109u）
- **问题**：QuestMap FRONT 上印刷的「绳绑卷轴」方形槽，究竟是 Objective 房槽，还是规则书 R36 的 Boss 位（3 格）？此前 R-115 / R-117 将 p011 A/B/G、p012 A/C/D 批为 Objective，是否应推翻？
- **裁定**：
  1. **QuestMap 卷轴槽图标 = 规则书 R36 / 规格 §5.1 的 Boss 位（Boss slots）**。最暗地牢布置**不用**普通边缘房；用板块上带该图标的 **3 格**；将 **目标房代币 + 2 张随机非目标房代币** 洗混后先放入这 3 格，再填其余房间。
  2. **印刷识别**：方形槽内 **绳绑卷轴**（紫底卷轴、绳/链绑）。规则书 p36 正文将该图标内嵌于句中，并称其为 **Boss Slots**（「the ones indicated on the tile with the [卷轴图标]… Place them first on the indicated Boss Slots」）。图例角标 **「3」** 对应「三处可能发现 Boss」。规格 I-62 曾写「紫色小方块」——印刷实为绳绑卷轴；**以印刷 + R36 正文为准**，I-62 图标描述应更正为绳绑卷轴（规格文案另刀）。
  3. **与 Objective 的关系**：Objective **房代币**（任务卡分布行 / 冲压板，见 **R-108** / I-53）是**洗入这 3 格之一的内容**，**不是**「卷轴槽图标本身 = 目标房」。卷轴槽 = Boss 候选格；其中一格最终放 Objective 代币，另两格放随机非 Objective。
  4. **节点 ID**（与 `dungeon_layouts.json` 字段对齐）：
     - **`quest_map:p011`**（VQ-08）：**A**（x65,y15 顶支）、**B**（x20,y28 左支）、**G**（x80,y41 右支）。
     - **`quest_map:p012`**（VQ-09）：**A**（x35,y15 顶排左）、**C**（x65,y15 顶排右）、**D**（x35,y28 次排左）。
  5. **推翻 / 修正**：**R-115**、**R-117** 废止「卷轴槽 = Objective 房槽 / 不是 Boss 位」；见本条修正注。**R-108 不变**。
  6. **数据**：上述六节点 `slotKind: boss`。原批准仅数据，布置曾保持 hold。**2026-10-31 进展**：Kyries 本聊天明确要求完成 A-3，授权接通已确认两张16槽图的目标+2随机非目标三格布置及其它房间填充；不据此批准未审战斗 Room Tile 几何。
  7. **限定**：本条仅批准 p011 A/B/G 与 p012 A/C/D；**不**扩散其它 QuestMap 页特殊槽；**不**实现 Boss 战斗 / 多形态运行时（仍 R-120 / Phase 5 hold）；**不**改八槽 confirmed 流程。
- **依据 / 出处**：Kyries 2026-10-27 对照确认；规则书核心盒 **p36 / R36**；FRONT p11/p12；R-108；R-046。
- **关联**：R-046、R-048、R-108、R-114、R-115（修正）、R-116、R-117（修正）、R-118、R-119、R-120、VQ-08、VQ-09、Q-45；规格 I-62 / §5.1。
- **状态**：Kyries 已确认（2026-10-27）

### R-122

- **编号**：R-122
- **日期**：2026-10-27（Asia/Shanghai / UTC+8）
- **问题**：核心盒 Boss / 最暗任务卡（quest:p016–p019）卡面「3 Xp」如何计发？R-120 的 `xpKind: all` / `roomsPerXp: 2` / `maxRooms: 6` 占位是否作废？
- **裁定**（本项目，Kyries 拍板 2026-10-27）：
  1. **Boss / 最暗任务 XP = 击败 Boss 并回村后，每名英雄与驿站各固定获得 3 XP**（卡面「3 Xp」/「3 XP」字面）。
  2. **废止** R-120 对 p016–p019 套用的 Scout Ahead 式占位：`xpKind: all`、`roomsPerXp: 2`、`maxRooms: 6`。
  3. 与 **R-038** 一致：固定 3 **既是额度也是封顶**。
  4. **最终战**（Heart of Darkness / Ancestor 多形态）：规则书未见单独 XP 任务卡或「发 XP」句；本条记为 **不发 XP / 非任务卡奖励**（待若发现印刷反证再改）。
  5. **数据**：p016–p019 使用 `xpKind: flat`、`flatXp: 3`（等价定额字段）；**不**实现 `summarizeDungeonQuest` / 回村发放 Boss 分支（仍 hold）。
- **限定**：仅批准 p016–p019 定额语义；不改普通任务公式类 XP；不实现 Boss 战斗运行时。
- **依据 / 出处**：Kyries 2026-10-27 拍板；QUEST FRONT p16–p19「3 Xp」；规则书 R29 / R36；R-038；R-120（修正）。
- **关联**：R-038、R-120（修正）、R-044、R-113、Q-37。
- **状态**：Kyries 已确认（2026-10-27）

### R-123

- **编号**：R-123
- **日期**：2026-10-28（Asia/Shanghai / UTC+8）
- **批准**：Kyries 当面批准 **VQ-07**（QuestMap 八槽图布局读数）；对照已录入的 `dungeon_layouts.json` 与 [全套标注表](phase3-scout-pressure-maps-2026-10-11.md) 连接清单，无修正。
- **范围**（仅布局几何读数，`review: confirmed`）：
  - **FRONT p2–p10、p13–p14**（八房间槽 + 起点 S + 连接段 + 灰点 X/Y 段数与边列表，见标注表各行）。
  - **不含**：p1（已由 **R-065** 批准）、p11/p12 十六槽（已由 **R-118** / **R-119** 批准）。
  - **不**借此裁定 **Q-59**（起点侦察）、**Q-63**（原路返回灰点计费）；**不**改 **R-121** Boss 位、边缘房、Boss XP、p019 幕触发或其它任务卡 hold。
- **数据**：`quest_map:p002`–`p010`、`p013`、`p014` 的 `review` 从 `pending` 升为 `confirmed`；节点 / 边 / 坐标不变。
- **引擎**：八代币遗迹出征按 **R-116** 在 confirmed 八槽池中择图；不引入 quest 页码 = map 页码硬绑。
- **关联**：R-046、R-065、R-116、R-118、R-119、VQ-07、Q-45（板块标注仍部分延后）。
- **状态**：Kyries 已确认（2026-10-28）

### R-124

- **编号**：R-124
- **日期**：2026-10-29（Asia/Shanghai）
- **裁定 / 批准**：Kyries 在聊天选择「采用：死灵法师 II，按实际威胁匹配」。C-019 先做死灵法师 II；II 级 Face the Threat 仅匹配实际抽到、同级且已注册的迫近威胁。缺少威胁、描述卡 / 脚本不一致、其它尚未实现 Boss 均保持停点，不默认替换成死灵法师，不由 I 级缺省或临时任务映射绕过。
- **范围**：仅 C-019 的 II 映射策略和首切片身份；不批准 R-121、其它 II/III Boss、II/III 幕末 offer、最暗线或 Phase 6；两项 II 威胁被动仍须按各自已确认规则接线。
- **依据**：规格书 §2.2–2.3、§14.1；官方 R11 / R35；本项目裁定仅确定缺实现时的停点策略。
- **状态**：Kyries 已确认。

### R-125

- **编号**：R-125
- **日期**：2026-10-29（Asia/Shanghai）
- **裁定 / 批准**：Kyries 在聊天确认 Q-114 两项：Haunted Graveyard 首日 d10 最低并列时，由玩家从并列最低者中选一名守卫；墓地被看守人 / 事件封锁或当天已接待英雄时，仍可完成守卫，建筑服务沿用封锁与每日一次限制。
- **范围**：仅 Necromancer II `boss_ability:p005` 的首日守卫。指定英雄首日必须访问墓地；可只守卫而不使用服务，也可在服务合法时使用正常墓地效果。并列待选不重掷，首日义务不因免费换姿态改给别人；不能以提前结束当天的技能绕过。
- **依据**：卡面已核实文字；官方 R11、R33–34 / 规格书 §2.3、§4；歧义仅按本项目裁定处理，不使用 FAQ。
- **状态**：Kyries 已确认，Q-114 关闭。

### R-126

- **编号**：R-126
- **日期**：2026-10-29（Asia/Shanghai）
- **裁定 / 批准**：Kyries 在聊天批准 C-022 限定切片：II 级完成两次普通任务后，仅在实际迫近威胁为已注册死灵法师 II（`boss_ability:p002`）时强制提供 Face the Threat。缺失、错级、描述卡 / 脚本不一致或其它尚未实现威胁时保持停点，不继续抽普通任务，也不默认替换 Boss。
- **范围**：仅 II 级幕末 offer 与既有 R-124 出征解析衔接；I 级沿既有路径。III 级、其它 Boss、R-121 / 边缘房、正式升幕与存档闭环均未获本条批准。
- **依据**：官方 R30、R35 / 规格书 §2.1–2.3、§14.1；R-124。
- **状态**：Kyries 已确认。

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
| Q-19 | R-020（第 ③ 条由 R-199 补充） | 暂定（规则书未写明）；大型怪让位已裁定（2026-11-07） |
| Q-20 | R-021 | 暂定（规则书未写明） |
| Q-21 | R-022 | 暂定（规则书未写明） |
| Q-22 | R-023 | 原条暂定；边角补充 Kyries 已确认（2026-10-10） |
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
| Q-108 | R-108 | Kyries 已确认（2026-10-25） |
| Q-109 | R-109 | Kyries 已确认（2026-10-25） |
| Q-110 | R-110 | Kyries 已确认（2026-10-25） |
| Q-111 | R-111 | Kyries 已确认（2026-10-25） |
| Q-112 | R-112 | Kyries 已确认（2026-10-25） |
| Q-112b | R-112 | Kyries 已确认（2026-10-25；建局实体池无放回 C+B） |
| Q-113 | R-113 | Kyries 已确认（2026-10-26；设营 SPECIAL + camp XP + 摘要） |

### 仍待确认

Q-53 见 R-055（区域表批准，三处图标已对照完整印刷面复核，见 #79）；Q-54 见 R-056（已核 PDF 正式批准）；Q-58 见 R-060（已批准一名挤出及无去处处理）。

### Q-52

- **问题**：最后一名英雄与最后一只怪物在同次技能中阵亡（如 Riposte），单场胜利与英雄全灭的收尾如何排序？
- **来源**：核心规则书 R20 的技能顺序、R25 的立即胜利 / 英雄全灭条件；现有裁定未明确此边界。
- **处理**：不推定赢家。Phase 2 只记录双方全灭事实并停止单场；不发胜利 / 逃跑事件，不发奖励，不处理战役结果。
- **状态**：confirmed（R-068，2026-10-13）；以上处理保留为裁定前停点记录，现以对应R条目为准，实现另记专题交付。

### Q-66

- **问题**：The Worries / Soft 在同一压力事件中追加伤口，且压力同时达到 10，伤口 / 死门与意志 / 心脏病如何排序？
- **来源**：R26–29；R-002 汇总压力加成，R-026 区分追加伤口，未明确本复合收尾。
- **处理**：确认前整次原子拒绝，不先支付压力或伤口、不先掷骰。
- **状态**：confirmed（R-069，2026-10-13）；以上处理保留为裁定前停点记录，现以对应R条目为准，实现另记专题交付。

### Q-67

- **问题**：同一次暴击产生基础暴击压力，并同时触发 Off Guard / Weak Grip，这些压力如何分组，再应用 Nervous / The Worries / Soft / 低光照？
- **来源**：R26–29、R-002、R-031，未明确多种触发源在同一攻击中的压力事件身份。
- **处理**：组合涉及额外压力 / 伤口修正时整次停场，不按多条压力分别重复修正。
- **状态**：confirmed（R-069，2026-10-13）；以上处理保留为裁定前停点记录，现以对应R条目为准，实现另记专题交付。

### Q-68

- **问题**：同一 Curio 同时带来压力 / 状态与疾病，抽到的新疾病 / 怪癖是否参与同卡效果的被动触发？
- **来源**：官方 R14 描述 Curio 正负效果通常同时发生；R26–28 描述被动与感染，没有规定此事件边界。印刷件只提供数据，不补结算顺序。
- **处理**：完整目录仍保留；该组合整卡停场，不按猜测先感染或先施加状态，也不先发金币。
- **状态**：confirmed（R-069，2026-10-13）；以上处理保留为裁定前停点记录，现以对应R条目为准，实现另记专题交付。

### Q-71

- **问题**：同一 Curio 获得负面怪癖并带有压力 / 状态等其他效果时，新怪癖（例如 Nervous、Soft、Anemic、Thin Blooded）是否参与该卡其余效果？同卡压力 / 状态与怪癖获得、第四负面引发发疯及其余奖励如何排序？
- **来源**：官方 R14 的 Curio 复合效果、R26 的事件型怪癖与第四负面永久死亡；没有明确新怪癖何时参与同卡剩余效果。Q-68 已覆盖新疾病，但未批准将其推广为新怪癖的结算顺序。
- **处理**：负面怪癖的纯获得接口可以独立实现；Curio 含该复合仍保持既有整卡停点，不先发奖励、不自行规定新被动生效时点。纯接口返回死亡事实，不推定该 Curio 后续金币或战役结果。
- **状态**：confirmed（R-069，2026-10-13）；以上处理保留为裁定前停点记录，现以对应R条目为准，实现另记专题交付。

### Q-70

- **问题**：Fundraiser I卡面要求清理一间Lair作为最低任务目标；未达目标时能否按R14提前离开？若允许，如何与R15“不存在任务失败”和该最低目标协调？
- **来源**：QUEST FRONT p3明确最低目标，但未写“不能回村”；官方R14允许全员掷探索骰前离开，R15说明任务不失败。印刷卡只提供目标与数字，不补退出规则。
- **处理**：未达最低目标时退出 / 捐献摘要保持停点，不推定失败、不扣金币或生成奖励；达成至少一间Lair后按明确卡文接10金币奖励与任务结束后的捐献选择。
- **状态**：confirmed（R-068，2026-10-13）；以上处理保留为裁定前停点记录，现以对应R条目为准，实现另记专题交付。

### Q-69

- **问题**：R15 的休息点分配中，同一英雄的多个 Life / 压力恢复点，应合并为一次恢复事件，还是每点分别触发 Infirm / Fast Healer / Resilient？
- **来源**：官方 R15 每点恢复1 Life或1 Stress，R26–28 描述被治疗 / 压力恢复的怪癖，但没有明确多个休息点的事件分组；印刷件只提供休息点数。
- **处理**：基础休息与不受这三项修正的恢复可运行；为持有 Infirm / Fast Healer 的英雄分配Life、或为持有 Resilient 的英雄分配压力恢复时，原子拒绝该选择，不分配此点、不恢复或消耗柴火。不自行按每点重复加成或合并加成。
- **状态**：confirmed（R-070，2026-10-13）；以上处理保留为裁定前停点记录，现以对应R条目为准，实现另记专题交付。

### Q-59

- **问题**：地牢起点（队伍图案，不是房间槽）是否允许侦察？
- **来源**：核心 R14、规格书 §5.4 以当前房间描述侦察，明确禁止长走廊中点侦察；R-046 尚未定稿的地图边界没有明确起点侦察。
- **处理**：Phase 3 首切片仅允许从房间节点侦察；起点拒绝。沙盒明确注入“房间 G 已结算”以验证侦察接口，不模拟起点探索或跳过结算。
- **状态**：confirmed（R-068，2026-10-13）；以上处理保留为裁定前停点记录，现以对应R条目为准，实现另记专题交付。

### Q-60（已由 R-064 解决）

- **问题**：Curio 的效果栏中，17 个图标 ID 尚无获批语义，或词典将实际效果位置的图标归为 decor / curio_picture；是否修正这些卡面限定条目？
- **来源**：核心盒 Curio 印刷 FRONT p1–24，词典 v1.8，R-048。逐页行表及 ID / 页码见 [Curio 交付](phase3-curio-2026-10-11.md)。
- **处理**：完整 24 张入库并保留正常抽牌概率；未知行的 `effect=null`。抽到后保留原牌与抽前 Torch 决定，整卡不结算、不视为空白；不把未知图标推定为负面而被 Torch 消除。
- **状态**：2026-10-12 Kyries 明确批准全部 17 个 hash 与 Curio 01–24 手打效果行，见 R-064；以下未知行处理仅保留为此前记录。图标已知不等于运行时所有奖惩接口已接通。

### Q-61

- **问题**：一次地牢内 Curio 堆抽空后是否洗回弃牌？
- **来源**：R10 明确初始洗牌，R32 明确回村时洗回弃掉的 Curio；未找到一次地牢内抽空后的规定。
- **处理**：抽空时在扣 Torch 前拒绝，保持池与 RNG；不自动回收弃牌。本刀不接回村流程。
- **状态**：confirmed（R-068，2026-10-13）；以上处理保留为裁定前停点记录，现以对应R条目为准，实现另记专题交付。

### Q-62

- **问题**：同一 Curio 的压力效果达到 10 时，意志 / 心脏病与同卡其他奖惩如何排序，死亡后哪些效果仍发放？
- **来源**：R14 Curio 自处理、R28 压力到 10 的立即检定 / 心脏病；现有裁定没有说明同卡多行收尾的顺序。
- **处理**：整卡预检遇到该边界时停止，不先发奖励或推定死亡后奖励；已抽卡与 Torch 决定保留。既有探索骰压力恢复不变，Q-52 继续停场。
- **状态**：confirmed（R-069，2026-10-13）；以上处理保留为裁定前停点记录，现以对应R条目为准，实现另记专题交付。

### Q-63

- **问题**：原路返回经过长走廊灰点时，R14 的“每条走廊压力 +1”按完整长走廊还是每个移动段计？三岔 / 四岔灰点切换分支如何计数？起点是否适用同一返回规则？
- **来源**：核心 R14 的 Long Corridors / Backtracking；规格书 §5.6，现有 Q-45 / R-046 地图边界。
- **处理**：仅接普通房间间确实走过的直接走廊；灰点与起点返回保持未接线，不将图的每条边自行命名为一次收费走廊。
- **状态**：confirmed（R-068，2026-10-13）；以上处理保留为裁定前停点记录，现以对应R条目为准，实现另记专题交付。

### Q-64

- **问题**：Trap 房间同一次分配既有伤口又有压力，且英雄已在死门或压力将到 10 时，伤口 / 死门与压力 / 意志 / 心脏病的结算顺序是什么？死亡后是否继续支付该分配另一部分？
- **来源**：核心 R15 只说明总量按 DL 自行分配，R28 / R29 分别说明压力 10 与死门，未明确该复合效果顺序；R-026 将 Trap 房间定为 Wound。
- **处理**：上述混合组合在支付和掷骰前整次拒绝，保留选择，可改选纯伤口或纯压力；其他混合分配正常执行。不自动推定死亡后继续受伤 / 增压的顺序。
- **状态**：confirmed（R-069，2026-10-13）；以上处理保留为裁定前停点记录，现以对应R条目为准，实现另记专题交付。

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

- **Phase 3 进展（2026-10-11）**：QuestMap FRONT / BACK p1–14 已对照并录入待审核布局，见[全套标注表](phase3-scout-pressure-maps-2026-10-11.md)。实际灰点有两段、三岔、四岔连接；按印刷图修正 schema，不新增规则裁定。全部标注仍为 pending；p11 / p12 特殊图案槽语义见 **R-115** / **R-117**（2026-10-27 起）。
- **Phase 3 进展（2026-10-26）**：Kyries 当面确认 QuestMap FRONT **p011** 标注名「红点 X」= R14 走廊灰点（dot），见 **R-114**。VQ-08 仅该点语义可升 confirmed；其它页仍 pending / hold。此前「p11 红点未解释」措辞以本条为准作废。
- **Phase 3 进展（2026-10-27）**：Kyries 当面确认 p011 特殊图案槽 **A/B/G** = Objective 房槽，见 **R-115**。VQ-08 就 A/B/G 亦可升 confirmed；p012 特殊槽 **A/C/D** 见 **R-117**；其它页特殊槽仍 pending / hold。
- **Phase 3 进展（2026-10-27）**：Kyries 当面确认 p012 特殊图案槽 **A/C/D** = Objective 房槽，见 **R-117**。VQ-09 就 A/C/D 亦可升 confirmed（仅此语义）。
- **Phase 3 进展（2026-10-27）**：**R-116** 规定 8 代币任务与十六槽 p11/p12 **不是**同页硬绑关系，引擎按 tokenTotal / 地点配对八槽遗迹图；十六槽图留给 16 代币最暗任务。
- **Phase 3 进展（2026-10-27）**：Kyries 当面确认 QuestMap FRONT **p011** / **p012** 整页布局可读数；`quest_map:p011` / `quest_map:p012` 升 `review: confirmed`，见 **R-119** / **R-118**（A/B/G、A/C/D Objective 仍分别见 R-115 / R-117；八代币出征仍按 R-116 不硬绑本页）。
- **Phase 3 进展（2026-10-28）**：Kyries 当面批准 **VQ-07**；八槽 FRONT **p2–p10、p13–p14** 布局读数升 `review: confirmed`，见 **R-123**。Q-59 / Q-63 仍待裁定；边缘房 / Boss 位布置等 **R-046** hold 不变。

### Q-47

- **问题**：卡面上没有文字标注的图标怎么命名、归进哪一类？
- **阻塞 Phase 1/2**：是（P1 schema）
- **暂定处理**（见 R-048）：不命名、不猜测。占位：未确认图标保留原始图标 ID；含未确认图标的卡在 Phase 2 标为「未验证」，不进入可用卡池。抗性 / 免疫图标映射一并在此处理。
- **进展**（2026-10-07）：图标词典 v1.2 已入库。`confirmed` 与 `confirmed_rulebook` 可用于命名；`needs_review`（`pending_<iconId>`）、`unsure`、`unreviewed` 仍按 R-048 保持占位，并在规范化层标成未验证。
- **进展**（2026-10-07，v1.3）：Kyries 批准 batch-01（合并 31、装饰 6、留下 3）和 batch-02（合并 9、装饰 3、留下 17）。留下的条目仍不命名。后续未审批次，以及约 70 个词典未收的 iconId，仍按 R-048 占位。
- **进展**（2026-10-07，v1.4）：Kyries 批准 batch-04（合并 8、装饰 7、留下 25）。留下的条目仍不命名。尚未审阅的 267 条，以及 70 个词典未收的 iconId，仍按 R-048 占位。
- **进展**（2026-10-07，v1.5）：Kyries 批准 batch-05（合并 17、装饰 22）。没有留下的条目。尚未审阅的 228 条，以及 70 个词典未收的 iconId，仍按 R-048 占位。
- **进展**（2026-10-07，v1.6）：Kyries 批准 batch-06（合并 1、装饰 20、留下 13）。留下的条目仍不命名。尚未审阅的 195 条，以及 70 个词典未收的 iconId，仍按 R-048 占位。
- **进展**（2026-10-08，v1.7）：Kyries 批准 batch-07（合并 3、归类 64、留下 3）。原先未收的 70 个 iconId 收入词典。留下的 3 条仍不命名。尚未审阅的 195 条仍按 R-048 占位。
- **进展**（2026-10-08，v1.8）：Kyries 批准 batch-08（归类 79、留下 3）。79 条归入已有 `skill_art`，通用含义，不是合并。r195、r544、r569 仍不命名。尚未审阅的 147 条仍按 R-048 占位。
- **进展**（2026-10-11，R-061）：五个黑心红光 hash 并入已有 Wound，`confirmed` 641、`needs_review` 32；Bleed Out I/II/III 的唯一图标阻塞已解除。其他 hash 不随本次批准改名。
- **状态**：延后（词典 v1.8 已入库；剩余 `needs_review` / `unsure` / `unreviewed` 仍按 R-048 占位）


### Q-72

- **问题**：Spiked Pit 的“Heroes and Monsters that are Shuffle or standing here at the end of their turn”中，Shuffle 触发按坑区实际落点，还是包括移出／经过，或只按起点在坑区？
- **来源**：ROOMS FRONT p4 卡文与完整卡图；核心 R21 只定义推／拉的区域与姿态移动，没有补充本面触发范围。R-067确认图标语义，R-069确认有序效果／死亡取消，但没有裁定此位置范围。
- **具体选项**：① 仅实际落点 S8/S9 触发（普通移动、移出、经过不触发）；② Shuffle 进入、经过或移出坑区均触发；③ 仅 Shuffle 开始时处于 S8/S9 触发。
- **处理**：R-071 确认仅实际落点 S8/S9（含截断），不按经过／移出／起点另触发。印刷数字与几何按 R-065/066/067 入库，完整特殊运行时就绪前 `usable=false`；不只接结束回合后开放半张卡。
- **状态**：confirmed（R-071，2026-10-13，本对话批准）。

### Q-73

- **问题**：Treasure Chamber T6 Hide and Heal的“remove all Wounds”是直接全部移除，还是一次会受Infirm／Fast Healer修正的治疗事件？
- **来源**：ROOMS FRONT p6完整卡图；核心R26／R27恢复怪癖与R29死门恢复。R-065/067已确认几何、卡文与Wound图标，R-069已确认压力先行及死亡取消，未明确此事件类型。
- **具体选项**：A存活后全部伤口置0，不套治疗数值修正；B以压力和追加伤口后的当前伤口为基础治疗量，Infirm／Fast Healer各一次。具体7伤口＋Infirm的结果分别为0／1，见[专题](phase3-treasure-wound-removal-review-2026-10-14.md)。
- **处理**：R-073确认A：存活后直接移除全部伤口，不应用Infirm／Fast Healer修正；压力先行、死亡取消与一般禁疗保持原裁定。
- **状态**：confirmed（R-073，2026-10-14，本对话选择A）。

### Q-74

- **问题**：同次 Shuffle 实际落到 Spiked Pit 时，房间伤害／Bleed 与 Vertigo 压力先后如何处理？R-071 的位置范围不变。
- **来源**：R21／R28／R29及ROOMS FRONT p4；未找到跨房间／疾病卡同时触发的优先级。R-069确认各自内部行序，未规定此跨卡顺序。
- **具体选项**：A先Vertigo、B先Spiked Pit、C玩家选择。Life17／14伤口／Soft＋Vertigo的实际差异见[专题](phase3-spiked-vertigo-order-review-2026-10-14.md)。
- **处理**：R-072 确认先结算 Spiked Pit（伤害 3 → Bleed 1·3t，行序沿 R-069），再结算 Vertigo 压力（+2，并触发 Soft 等压力相关追加伤口／死门／意志）。不因同次触发让玩家选顺序。
- **状态**：confirmed（R-072，2026-10-14，本对话批准）。


### Q-75

- **问题 / 来源**：官方R32回村的美德／苦难转怪癖未规定多名英雄谁先抽，同一牌堆分配会受顺序影响；已对照完整R32页面图像。
- **处理 / 状态**：confirmed（R-074，2026-10-14，Kyries选择A）：固定按当前姿态进攻→防御→远程→支援；PendingChoice完成后继续下一英雄。

### Q-76

- **问题 / 来源**：R32意志转怪癖之后消耗补给又产生意志卡，是否再次转换（R28／R32）。
- **处理 / 状态**：confirmed（R-075，2026-10-14，Kyries选择A），新卡立即再转换后继续补给窗口。

### Q-77

- **问题 / 来源**：R32恢复光照与R27升光被动如何相容，R32同时明示不恢复伤口／压力。
- **处理 / 状态**：confirmed（R-076，2026-10-14，Kyries选择A），回村重置不触发升光被动。

### Q-78

- **问题 / 来源**：16张村庄事件正面左上角准备天数图标尚待审核，R33说明位置；须与已有occupancy语义区分。
- **处理 / 状态**：confirmed（R-077，2026-10-14），Kyries选择A并特别限定43aaf29bbb只在Hamlet Event左上角生效。

### Q-87

- **问题 / 来源**：Ghoul II Howl（当前版大型FRONT p3）的多目标光照、压力检定与疾病先后；官方R19–20规定共享攻击骰及目标效果最后结算，未规定此复合边界。
- **处理 / 状态**：confirmed（2026-10-15，R-084），Kyries选择A：全部攻击伤害/暴击压力先行；按姿态逐名结算光照−1、压力+2及即时死门/意志/心脏病、存活者感染疾病。每名命中目标各降1光照，死亡取消该英雄后续效果，第四怪癖待选后继续下一名。

### Q-79

- **问题 / 来源**：R34 Graveyard写“gain a Virtue for the next quest”，R28规定已有意志卡时压力10直接死亡，但未明确英雄已从墓地或村庄事件获得意志卡后，再次访问墓地是否允许、是否更换原卡。已对照完整R34页面图像；不使用FAQ。
- **处理 / 状态**：confirmed（R-099，2026-10-18）。Kyries 确认 replace-reshuffle：允许再获得；旧卡洗回对应意志牌堆后再抽新美德；In Good Spirits 等仅因 Q-79 拒绝的授予路径一并适用。

### Q-80

- **问题 / 来源**：官方R33游商I级首次来访写“draw and reveal three Level 1 Trinkets”，但未明确当前可抽牌堆不足三张时陈列几张、是否回收弃牌。已对照完整R33页面图像，不使用FAQ。
- **处理 / 状态**：confirmed（R-100，2026-10-18）。Kyries 确认 recycle_discard_fill：可抽不足时将该级弃牌洗回可抽堆再抽满额；不陈列不足货架；洗回后仍不足才以 R-100 真耗尽拒绝。

### Q-81

- **问题 / 来源**：官方R33游商规定出售已装备饰品的价格，但没有明确售出卡去向，已对照完整页面图像。
- **处理 / 状态**：confirmed（R-078，2026-10-14），Kyries本对话选择“立即洗回对应等级牌堆”。

### Q-82

- **问题 / 来源**：官方R34铁匠规定临时使用II/III级技能、下次任务结束归还原卡，但未明确同次村庄准备中不同天重复选择同一技能的覆盖/付费方式；已对照完整R34页面图像。
- **处理**：R29明确三个技能等级，按Kyries“可升级多次则选2”的条件采用付1金覆盖本次指定临时等级，保留最初原卡，详见R-079。
- **状态**：confirmed（2026-10-14，R-079）。

### Q-83

- **问题 / 来源**：R29/R34的Guild永久升级与铁匠临时升级重叠时，任务结束归还哪个版本？
- **处理 / 状态**：confirmed（R-080，2026-10-15），永久升级正常进行，归还卡更新为新的永久卡；临时III/永久II时任务结束保留II。

### Q-84

- **问题 / 来源**：四核心英雄II/III级完整抗性/免疫未在原四张I级批准范围内，Hero STAT FRONT p2/4/8/10及BACK p1/3/7/9。
- **处理 / 状态**：confirmed（R-081，2026-10-15），Kyries批准八卡限定表；不全局改词典，运行时另题接入。

### Q-85

- **问题 / 来源**：II级怪物缺少已批准Speed/姿态选招，现有I级批准不能外推。
- **处理 / 状态**：confirmed（R-082，2026-10-15），Kyries仅批准Bone Spearman II（M13–15）Speed=2与A/D骰表2(1–5)/1(6–10)、R/S固定1；其余II级继续待核对。

### Q-86

- **问题 / 来源**：其余四种II级怪物尚无获批Speed/姿态表及头部常驻Protection入场字段；R-082只覆盖Spearman。已对照官方R24完整页面及当前版印刷中型M12/M49/M50–55、大型L1/L3，具体候选见[四卡核对表](phase4-remaining-ii-review-2026-10-15.md)。
- **处理 / 状态**：confirmed（R-083，2026-10-15），Kyries明确回复“批准四卡限定表”；仅四卡基础字段获批，完整效果运行时仍须逐张接入。原送审状态保留在核对表历史说明中。

### Q-88

- **问题 / 来源**：Lost Shipment p3的“Party rolls -2”已由R-085批准为补给骰；R12规定每英雄2颗，R37规定Radiant每英雄1掷1选，但现有裁定未明确队伍减2如何分配至英雄，以及是否可减少Radiant自选颗数。R-041仅解释奖励骰，不能直接裁定减骰分配。
- **处理 / 状态**：confirmed（R-087，2026-10-16）。Kyries选择A：队伍掷前从常规8颗任选2颗取消，包含Radiant自选骰；其余保留原类型，建筑奖励照常。原pending停点由该限定裁定解除。

### Q-89

- **问题 / 来源**：The Feast p10“fully restore”伤口是直接清零还是按当前伤口量治疗再套Infirm／Fast Healer？R-085仅批图标，R-073只限Treasure Chamber，不能外推。
- **处理 / 状态**：confirmed（R-086，2026-10-16）。Kyries明确选A：直接伤口归零，不应用Infirm／Fast Healer；7伤口且持Infirm仍变0。

### Q-90

- **问题 / 来源**：死亡补人当前缺少第五名已核实英雄。已目视当前版 Hero STAT FRONT p5/p6、BACK p5 及官方 R10/R21/R29/R31，赏金猎人三等级 Life/Dodge/Speed 和完整防御候选见[限定三行核对表](phase4-replacement-hero-review-2026-10-16.md) §2–3。III 级左栏 `c07ea0c507` 仍为 unreviewed，提出只在 `hero_stat:p006:front` 抗性栏解释为 Debuff 的候选，不能扩大 R-081 或改全局词典。
- **处理 / 状态**：confirmed（R-088，2026-10-16）。Kyries 回复“批准三行属性与限定防御”，按 §2 三面单独入库；III 图标仅本卡左栏限定映射，不改词典或清除整卡未验证。技能、村庄能力和实际补人另开主题。

### Q-91

- **问题 / 来源**：当前版技能 FRONT p46 Mark for Death I、p61 Caltrops I 目标框橙色下双箭头 `763ad8e857` 与官方 R21 Debuff 图例一致，但词典 v1.8 为 buff。已查看七张 I 级技能完整卡面，具体两行限定修正与完整状态/时长见[核图表](phase4-bounty-skills-2026-10-16.md)。
- **处理 / 状态**：confirmed（R-089，2026-10-16）。Kyries 回复“批准两行限定修正及完整效果”。仅上述两个 id 的目标框按 Debuff 解释；p46 自身蓝色箭头仍是 Buff，不改 raw/parsed、全局词典或其他卡，完整效果按核图表接线。

### Q-92

- **问题 / 来源**：Scout Ahead在村庄增加压力到10时，官方R28的“每个任务一次”未明确村庄期间的次数归属。
- **处理 / 状态**：confirmed（R-090，2026-10-16）。Kyries选择“沿用R28，计入下一任务”；不在出征时重置意志卡与检定状态。

### Q-93

- **问题 / 来源**：官方R31要求死亡时移除英雄面板全部卡牌，但没有写疾病/怪癖/美德/苦难的回收时点与去向。R26与R28描述持牌和一般弃牌，不能自行外推为立即洗回或等回村。
- **处理 / 状态**：confirmed（R-091，2026-10-16）。Kyries本轮明确选择“所有共享卡均立即洗回对应堆”；死者持牌立即回到各自牌堆，保留存活者持牌，不转怪癖。饰品继续独立处置。

### Q-94

- **问题 / 来源**：R31只写补人后继续探索，未说明死者剩余的个人探索骰/Trap房间分配由谁结算。
- **处理 / 状态**：confirmed（R-092，2026-10-16）。Kyries选择“取消死者剩余个人项，其他英雄继续”；替补不继承这些余项，不补掷、不重付已完成效果。

### Q-95

- **问题 / 来源**：R32允许村庄随时换姿态，R33未说明日中换位后的剩余行动顺序。
- **处理 / 状态**：confirmed（R-093，2026-10-16）。Kyries回复“这个交由玩家自行商量决定”；由玩家在本次换位时选择剩余队列策略。

### Q-96

- **问题 / 来源**：正式网页仅一名额外候选，继续核对瘟疫医生三等级属性及防御。已检查当前版Hero STAT FRONT p13/p14、BACK p13及完整官方R10/R21/R29/R31/R33；三行Life/Dodge/Speed和左右栏见[限定核对表](phase4-plague-doctor-review-2026-10-17.md) §2–3。III级右栏第一枚`8510428636`仍为unreviewed，候选只在`hero_stat:p014:front`免疫栏解释为Blight，不改全局词典。
- **处理 / 状态**：confirmed（R-094，2026-10-17）。Kyries回复“批准三行属性与限定防御”；按§2三面单独入库，III图标只在本卡右栏解释为Blight免疫，不改词典或清除整卡未验证。七技能与Experimental Vapours另行接线，不以转录验证代替完整英雄可用。

### Q-97

- **问题 / 来源**：Kyries选定Grave Robber与Occultist为下一批替补属性/防御候选。印刷raw已核实六面Life/Dodge/Speed（见[核对表](phase4-grave-occultist-stat-review-2026-10-18.md) §2）；完整左右防御栏仍有三枚词典unreviewed图标：`e61ed317de`（GR II/III、Occ III左栏）、`8cbe7d6703`（Occ I唯一抗性）、`a8c4b25b4e`（Occ II左栏第二枚）。需按R-088/R-094模式做**具体卡面位置**限定命名，不改全局词典。云环境无印刷页图像，不能目视提出候选含义。
- **处理 / 状态**：confirmed（R-095，2026-10-18）。Kyries 在聊天确认 LIMITED per-card mappings：`e61ed317de`→Blight（GR II 左#1、GR III 左#2、Occ III 左#2）；`8cbe7d6703`→Debuff（仅 Occ I）；`a8c4b25b4e`→Debuff（Occ II 左#2）。Jester I 同 hash 不在批准范围。不改全局词典。

### Q-98

- **问题 / 来源**：Grave Robber 村庄能力 Pilfer（Hero STAT FRONT/BACK p17、FRONT p18）印刷为 `Draw a {icon:79084a2922} .`。词典 v1.8 中 `79084a2922` 仍为 `unreviewed` / `unknown_79084a2922`，三面属性卡 `verification.reasons` 均含该图标。接线 Pilfer 需要确认该图标含义（抽何种牌／代币）及数量语义；云环境无印刷页图像，不能目视命名。
- **处理 / 状态**：confirmed（R-096，2026-10-18）。Kyries 确认 LIMITED：仅 Pilfer 文案中 `79084a2922`→Loot Token（战利品标记）；不改全局词典。印刷「Draw a」数量=1 已接；翻面/空堆/出征保留见 R-098。

### Q-99

- **问题 / 来源**：Pilfer 在 R-096 下已能「抽取一枚战利品标记」离开可用堆（R-047）。印刷未写翻面或奖励。待确认：(a) 是否立即按 R18 翻面结算；(b) 若在村庄结算，补给类结果进入何处（村庄无地牢补给池）；(c) 可用堆已空时是否可施放 / 如何处理；(d) 村庄已抽取的 claimed 是否应在下次出征保留（出征原 `createLootState()` 会重建十枚）。
- **处理 / 状态**：confirmed（R-098，2026-10-18）。Kyries 以 widget keep-current 确认锁定当前 #243 行为：(a) 抽取不翻面、不结算；(b) 无翻面则补给去向 N/A，不发明村庄补给目的地；(c) 空堆拒绝；(d) 出征保留村庄 `claimedIds` / 有效 `lootPool`（既有 hamlet-embark）。

### Q-100

- **问题 / 来源**：Occultist 村庄能力 Dark Ritual（Hero STAT FRONT p20 / III）目标行末尾为 `{icon:4f7549c1b8} 3t`。同技能 I/II（FRONT/BACK p19）对应位置为已确认 Buff 图标 `2af41c1ca4`。词典 v1.8 中 `4f7549c1b8` 仍为 `unreviewed` / `unknown_4f7549c1b8`；整卡 `verification.reasons` 含该图标。云环境无印刷页图像，不能目视命名。I/II 的 Self 压力+1、目标治疗/压力−2/Buff 3t 已按印刷接线；III 曾整次拒绝（R-048），不把 `4f7549c1b8` 猜成 Buff。同 hash 亦见于 `hero_stat:p010:front`（Vestal III Chant 行）。
- **处理 / 状态**：confirmed（R-097，2026-10-18）。Kyries 确认 LIMITED：Dark Ritual III 语境下 `4f7549c1b8`→Buff；不改全局词典。p010 仅记 LIMITED 命名诚实，不接线 Vestal III。Dark Ritual III 已按印刷治疗 5 与 I/II 同路径接线。

### Q-101

- **问题 / 来源**：Jester Dirk Stab I–III（`hero_skill:p106` 等）效果行含 `{icon:a2e7252e06}`（词典 `pending_a2e7252e06` / needs_review）。整卡 `verification.unverified`；其余六张 Jester I 级已核实并接线。
- **处理 / 状态**：confirmed（R-102，2026-10-24）。Kyries 确认 `a2e7252e06`→Guard；Dirk Stab「Ignores」= 无视守护。词典已确认，I–III 整卡核实并接线。

### Q-102

- **问题 / 来源**：Arbalest Rallying Flare I–III（`hero_skill:p166` 等）射程行后含 `{icon:d93aef1e33}`（红骷髅/金头盔斜线，词典 needs_review）。整卡 `verification.unverified`；其余六张 Arbalest I 级已核实并接线。
- **处理 / 状态**：confirmed（R-103，2026-10-24）。Kyries 确认 `d93aef1e33`→target_hero_or_monster；射程旁 ×2 = 可选英雄或怪物目标。词典已确认，I–III 整卡核实并接线。

### Q-114

- **问题 / 来源**：C-019，Necromancer II `boss_ability:p005` 背面 Haunted Graveyard：准备首日英雄掷 d10，最低者首日去墓地守卫，可照常使用建筑效果。卡面、官方核心规则书与现有裁定未说明：(a) 最低点数并列时由玩家选一人还是所有并列者都守卫；(b) 墓地被看守人 / 事件封锁或当天已接待英雄时，守卫是否只完成守卫而不享服务，还是覆盖这些限制。
- **处理 / 状态**：confirmed（R-125，2026-10-29）。Kyries 选择“玩家从并列最低者中选一人”和“仍可完成守卫；建筑服务沿用封锁和每日一次限制”。按 R-125 接线，关闭本停点。

### R-127

- **日期**：2026-10-30（UTC+8）。
- **裁定 / 批准**：Kyries 本轮逐项确认：Speed Stone / Camouflage Cloak / Fasting Seal 的 `22c0a26f50` 为 Dodge；Book of Constitution 正面获得疾病时立即弃掉该疾病，反面 Speed −2；Cleansing Crystal 反面抽一张负面怪癖；Camouflage Cloak 正面光照条件为 ≥3。
- **数据修复**：修正 Dodge 的通用未定含义；p016 parsed 效果补回 raw 中已确认的疾病图标 `96dfcd2af2`；p038 实际反面效果图标 `b7d0cfd524` 改为 draw_negative_quirk（`afb3fe2d69` 仍为插画）；p019 独有比较符 `206c655597` 按 ≥3 确认。数字不补入图标 value。
- **来源**：完整 TRINKETS_FRONT p010/016/019/029/038；Kyries 本聊天“全部确认，按上述修正”。
- **关联**：Q-115，confirmed；R-048。

### R-128

- **日期**：2026-10-30（UTC+8）。
- **裁定（本项目）**：Book of Sanity 反面 Suffer Damage 6 作为一次非攻击伤害事件：触发 On Guard、Fragile 等“受到伤害时”效果；不被 Protection 减半，不触发 Riposte，不算暴击。按 R-026 合并同批追加伤口，沿 R29 / R-005 处理死门。
- **来源**：完整 TRINKETS_FRONT p036；Kyries 对本聊天上述方案明确选择“采用此裁定”。这是项目裁定，不冒充规则书已写明。
- **关联**：Q-116，confirmed；R-026。

### R-129

- **日期**：2026-10-30（UTC+8）。
- **裁定（本项目）**：Camper’s Helmet 正面 When Camping, roll 2 Provisions 仅在柴火休息 Resting 时触发；Forward Camps 任务的 set up camp 不触发。
- **来源**：完整 TRINKETS_FRONT p024；核心 R15 / 规格书 §5.8；Kyries 本聊天明确选择“仅柴火休息 Resting”。
- **关联**：Q-117，confirmed；R-113。

### R-130

- **日期**：2026-10-30（UTC+8）。
- **裁定（本项目）**：Book of Constitution 在持有者已有疾病、又获得新疾病时，先按 R27 处理（替换旧疾病并触发额外负面怪癖），再使用饰品立即弃掉新疾病；不恢复旧疾病，也不取消该负面怪癖。
- **来源**：Kyries 本聊天对两种处理方案明确选择“先按R27处理，再弃新疾病”。
- **关联**：Q-118，confirmed；R-127、R27。

### R-131

- **日期**：2026-10-30（UTC+8）。
- **裁定（本项目）**：Camper’s Helmet 的两颗补给奖励受公共池16颗上限约束：只掷可容纳的颗数；仅一个空位就掷一颗；满池不提供使用，不翻面或消耗RNG。Wild仍由玩家选择骰面。
- **来源**：Kyries 本聊天明确选择“只掷能容纳的颗数；满池不提供使用”。
- **关联**：Q-119，confirmed；R-129、R12。

### R-132

- **日期**：2026-10-30（UTC+8）。
- **裁定（本项目）**：允许执行0格移动，仍花1行动；例如 Book of Constitution 反面使 Speed 2 降到0时，可以用该移动行动支付反面。原地移动不能替代必须离开无空间区域的移动。
- **来源**：Kyries 本聊天明确选择“允许0格移动，仍花1行动”。
- **关联**：Q-120，confirmed；R18、R-028。

### R-133

- **日期**：2026-10-30（UTC+8）。
- **裁定（本项目）**：R-028“战斗外可用”包含村庄准备阶段；文字条件适用的饰品能力可以使用，包括免费治疗、减压及修正建筑治疗。村庄没有地牢光照或补给，对这些条件有要求的能力不提供使用。
- **来源**：Kyries 本聊天明确选择“村庄也允许适用能力，按上述处理”。
- **关联**：Q-121，confirmed；R-028。

### R-134

- **日期**：2026-10-30（UTC+8）。
- **裁定（本项目）**：村庄免费饰品导致英雄死亡时，替补只继承死者当天尚未使用的村庄行动；死者已行动则替补当天不能再行动。准备天数不变，不因免费能力额外消耗行动。
- **来源**：Kyries 本聊天明确选择“按上述方式继承未使用行动”。
- **关联**：Q-122，confirmed；R-133、R31。

### R-135

- **日期**：2026-10-31（UTC+8）。
- **裁定（本项目）**：Necromancer III 的 Reanimation：每场首个死亡的非 Large 怪物清除伤口与条件，以同卡重新生成；按新生成怪物放入可用姿态及其对应区域，洗入一张先攻。无空间则忽略该次效果，不顺延到下一只死亡怪物。对应区域须有显式获批部署绑定，不从英雄当前位置推断。
- **来源**：Kyries 本聊天明确回复“确认按此处理”（清除伤口/条件、同卡、姿态对应区域、新生成洗入先攻）；其余生成流程沿官方 R31/R38，威胁在 Boss 被击败后结束。
- **关联**：Q-123，confirmed；`boss_ability:p006` 背面 Reanimation、R-048。

### R-136

- **日期**：2026-10-31（UTC+8）。
- **裁定（本项目）**：Pyre I–III 的 Burn the Heretic 对最近的同区英雄自动命中，不掷攻击骰；99 Damage 仍按普通伤害结算防护与死门。不补 Acc/Crit 或虚构攻击骰面。
- **来源**：Kyries 本聊天明确回复“确认按此处理”。
- **关联**：Q-124，confirmed；`monster_large:p011–p013`、R20–21/R29/R39、R-026。

### R-137

- **日期**：2026-10-31（UTC+8）。
- **裁定（本项目）**：Collector III 的 Snatch! 偷走饰品后，放入其原等级弃牌堆，保留牌池守恒；由该英雄玩家选择被偷的持有饰品。
- **来源**：Kyries 本聊天明确选择“放原等级弃牌堆”；玩家选择由 `boss_ability:p018` 背面卡文明确指定。
- **关联**：Q-125，confirmed；R26、R-048。村庄 R33 已限制每栋建筑每天接待一名英雄；没有英雄的建筑不触发偷取。

### R-138

- **编号**：R-138
- **日期**：2026-10-31（Asia/Shanghai）
- **问题**：最暗地牢 Excavation Site 每名英雄各掷一颗奖励补给骰，补给池满16时如何处理？
- **裁定**：Kyries 本聊天选择“允许弃掉已有补给，腾位后领取奖励”。保留已掷本颗结果，玩家选择弃已有一颗后加入；Wild 再选择面，不重掷、不超过16。四名英雄各一次，奖励步骤完成后进行免费8点休息；原柴火保留（R36）。本条仅处理挖掘点溢出，不扩散其它奖励源。
- **依据**：官方 R12 补给池上限16、R36 Excavation Site；Kyries 本聊天明确回复。
- **状态**：Kyries 已确认。

### R-139

- **编号**：R-139
- **日期**：2026-10-31（UTC）
- **问题**：Heart of Darkness · Impending Doom（`boss_ability:p037`）提前掷的 d10 如何对应 Know This / Puncture / Dissolution？与卡面射程 0–10、Ancestor2 传送骰有何区别？
- **裁定**：
  - **出处**：能力卡 `boss_ability:p037` 第二句「corresponding Skill」；战斗卡 `monster_large:p020` 页脚 **Stance/Skill Eligibility** d10 区间表（按 **R-015** 读卡脚 d10 区间→技能编号）；官方规则书约 p41 说明该骰为**提前掷的选招骰**（下次 Heart 回合使用），不是攻击骰。
  - **映射**（整数 d10，1–10）：**1–4 → Know This（slot 1）**；**5–7 → Puncture（slot 2）**；**8–10 → Dissolution（slot 3）**。
  - **边界**：三招卡面 **range 0–10** 是**射程**（`verified_range`），不是 Impending Doom 映射表；**勿**与 Ancestor2 · Swift Teleportation（`boss_ability:p035`）行动内 d10→姿态传送（1–3/4–6/7–9/10 不传送）混用。
  - **引擎**：开战与 Heart 每次行动结束覆盖 `battle.impendingDoomDie`（#451）；Heart 怪物回合用 `applyHeartOfDarknessImpendingDoomSkill` 读落位骰并调用 #456 Acc 命令；无骰或非法面值拒绝。
- **依据 / 出处**：Kyries 2026-10-31 批准确认；印刷 `boss_ability:p037`、`monster_large:p020` 页脚、规则书 p41；R-001、R-015、R-048。
- **关联**：#451、#456；[phase5-final-heart-impending-doom-skill-map-2026-11-01.md](phase5-final-heart-impending-doom-skill-map-2026-11-01.md)。
- **状态**：Kyries 已确认。
### R-140

- **编号**：R-140
- **日期**：2026-11-02（Asia/Shanghai）
- **问题**：Ascended Witch Fate’s Pull（monster_medium:p066 slot 3；FRONT p066–68）原始效果行含 shuffle_resist 图标（ed2299539e）与 Pull 2，如何结算？
- **裁定**：按“目标 Pull 2、压力 +1”实现。仅此招的该印刷组合进行上下文映射；不变更词典在抗性/免疫栏等其它位置的含义，不外推其它卡。
- **依据**：Kyries 在查看本地原卡截图后明确回复“就按‘目标 Pull 2、压力 +1’实现”；R-001 / R-048。
- **关联**：Q-128（已确认）；K-004。
- **状态**：Kyries 已确认。
### R-141

- **编号**：R-141
- **日期**：2026-11-02（Asia/Shanghai）
- **裁定**：Kyries 对照本轮展示的当前印刷截图逐卡确认：Collect Bounty II（hero_skill:p044）Acc=10；Mark for Death III（p048）目标 Mark 3t + Debuff 3t，自身 Buff 3t；Caltrops III（p063）目标 Bleed 3/3t + Debuff 3t。
- **范围**：仅这三张卡。保留 p044 原始 Acc 1O 转录，规范化阈值为10；橙色763ad8e857仅在p048/p063目标效果行映射为debuff，不修改全局词典或其它卡。两张I级卡继续按R-089。
- **依据**：当前核心盒 SKILLS FRONT p044/p048/p063 图像及 Kyries 明确回复“确认，按这三处实现”；R-001 / R-048。
- **关联**：Q-126、Q-127 已确认；K-016。仅开放这三张目录卡，不批准 Phase 6 全战役验收。
- **状态**：Kyries 已确认。

### R-142

- **编号**：R-142
- **日期**：2026-11-02（Asia/Shanghai）
- **裁定**：Bone Bearer（monster_medium:p016，FRONT p016–17）Speed=2（右侧两枚脚印；黄色3为Dodge）；aggressive 固定技能2；defensive d10 1–4→1、5–7→2、8–10→3；ranged 不可选；support d10 1–6→1、7–10→3。早先提问 Speed=3 已被更正，以本次确认为准。 选招表以 R-214 更正为准。
- **任务准入**：开放 Break Them / They Are Back（quest:p009/p013）已按任务计划部署的指定怪物入场。保持单怪部署、不洗牌、不补满四姿态；p009 使用 III级 Bone Bearer；p013 Bone Captain 使用卡面 Life+20、Dodge+2。仍检查完整战斗字段、实例身份和牌池守恒，不能以普通随机遭遇替代。
- **依据**：Kyries 对更正后的核图问题明确回复“确认更正字段并开放计划部署入场”；当前怪物 FRONT p016–17、QUEST p009/p013；R-001 / R-048。无 Acc 技能依官方规则书 R19 Note 直接生效，友方治疗依 R20/R24。
- **边界**：只批准上述字段及两项计划部署，不外推其它怪物或任务，不开放其它 hold、核心任务生产白名单或 Phase 6。
- **关联**：K-010。
- **状态**：Kyries 已确认。

### R-143

- **编号**：R-143
- **日期**：2026-11-02（Asia/Shanghai）
- **裁定**：Kyries 明确回复“确认以上九张字段”。最暗普通怪 monster_medium:p063/p066/p069/p072/p075/p078/p080/p083/p086 的 Speed、四姿态选招分组及 d10 区间，按 [逐卡核图表](phase5-darkest-monster-fields-review-2026-11-02.md) 入库。p063 的远程姿态选招见 R-214 更正；Speed依次为2/2/3/2/1/3/3/2/2，不把黄色Dodge数字当Speed。
- **依据**：当前版怪物FRONT M63–88，九种身份首张完整卡与26份Speed栏/页脚核图；官方规则书R24、R-015、R-001 / R-048。
- **边界**：只批准九种怪物的上述字段，不批准房间几何，不解除battleReady:false，不将占位部署视为生产随机遭遇，不外推其它卡。
- **状态**：Kyries 已确认。

### R-144

- **编号**：R-144
- **日期**：2026-11-02（Asia/Shanghai）
- **裁定**：Kyries 明确回复“确认本面几何和部署”。批准 Pool of Rebirth（room:p014；最暗编号1）当前版 TILES FRONT p9 的12区容量、G高地、14条通路、9组仅角点及八姿态部署，具体按[核对表](phase5-pool-of-rebirth-geometry-review-2026-11-02.md)入库。
- **依据**：当前印刷整页及A–L区域标字核图；R16/R17部署、R18容量、R25高地、R-021邻接；R-001 / R-048。
- **边界**：仅批准本面几何与部署。F区星形标记4591aebebd语义仍未确认，不套用其它房间的cornered；usable保持false。房间特殊效果、清理后复活、最暗遭遇生产准入及其它板块未随本次批准。
- **状态**：Kyries 已确认。

### R-145

- **编号**：R-145
- **日期**：2026-11-02（Asia/Shanghai）
- **裁定**：Kyries 确认：板块上的星标效果必须查对应的 `DD_EN_COREBOX_CARDS_63x88_rooms_FRONT.pdf` 房间卡；不同颜色也逐面查对应卡，不按星形外观全局解释为Damage、cornered或其它效果。Pool of Rebirth 的 TILES FRONT p9 对应 ROOMS FRONT p14，F区星标绑定该卡区域效果。
- **卡面**：区域效果原文为“Heroes ending their turn here suffer {Stress} +1 and {Heal} 3 per Negative Quirk.”。清场后的整房特殊效果另列：英雄可各承受Stress+4以复活一名死去英雄并放入Stagecoach。两段不混为同一个区域触发器。
- **依据**：Kyries 明确说明p9→p14并提供当前卡面效果截图；当前印刷房间卡p14、已确认Stress/Heal图标；R-001 / R-048。
- **边界**：本次确认来源对应与效果文字；保留原文限定范围，不据此猜测复合结算顺序、复活资格/状态或开战准入。暂保留区域及整房效果runtimeReady=false、usable=false；不修改全局星标词典。后续其它板块逐面匹配地点、编号、房间身份及卡文。
- **状态**：Kyries 已确认。R-144中星标语义待确认项由本条的房间卡绑定补充。

### R-146

- **编号**：R-146
- **日期**：2026-11-02（Asia/Shanghai）
- **裁定**：Kyries 对重生池区域效果选择A：每个负面怪癖同时对应压力+1及治疗3；N个为一次压力+N、一次治疗3N，N=0两项都不触发。正面怪癖不计入N。先完整结算压力、追加伤口/死门及意志/心脏病，仍存活才单次治疗，沿用已有治疗修正与禁疗。
- **依据**：Kyries明确回复“A：压力和治疗均按怪癖数”；ROOMS FRONT p14区域效果，R-144/R-145，既有压力/健康结算规则。
- **边界**：仅英雄在本面F区结束回合触发；不扩展到进入/经过、怪物或其它房间。区域runtimeReady可标记true，整房清场复活仍未实现，usable=false及生产遭遇准入停点保留。
- **状态**：Kyries 已确认。

### Q-129

- **日期**：2026-11-02（Asia/Shanghai）
- **问题**：Pool of Rebirth清场复活后，英雄进入驿站按新招募I级/继承驿站XP处理，还是保留死亡前等级、技能与XP？“place them in the Stagecoach”是否增加一枚等待英雄代币，还是只解除该身份死亡禁选？
- **来源**：ROOMS FRONT p14整房特殊效果；R-145。现有死亡流程只保存死亡身份并回收持牌，不能擅自补原状态快照或等待代币。
- **状态**：已由R-147裁定；共享实体卡的复活冲突另见Q-130。

### R-147

- **编号**：R-147
- **日期**：2026-11-02（Asia/Shanghai）
- **裁定**：仅在“1—Pool of Rebirth”（room:p014）的清场复活中，英雄按Kyries原话“继承所有”保留死亡时数据，不按I级/继承驿站XP的新招募流程重建；进入驿站不增加等待英雄代币。
- **依据**：Kyries明确回复“1.在1—Pool of Rebirth这张room card里按照继承所有 2.在1—Pool of Rebirth这张room card里不增加等待英雄代币”；ROOMS FRONT p14，R-145。
- **边界**：仅本卡复活，不外推其它复活来源或普通补员；不凭此复制共享实体卡或撤销其他英雄已完成的获牌。死亡时数据必须在回收前保存，复活时实体牌冲突见Q-130。本条不表示清场复活运行时已经实现。
- **状态**：Kyries已确认，Q-129已解决。

### Q-130

- **日期**：2026-11-02（Asia/Shanghai）
- **问题**：Pool of Rebirth完整继承时，死者原有饰品、疾病、怪癖或意志牌已被其他英雄持有，应如何处理？
- **来源**：R-147要求完整继承；现行R-091死亡后立即洗回疾病/怪癖/意志牌，饰品由队友接收或弃置。当前代码`releaseDeadHeroCards`及`continueDeathEstates`执行上述流程，不能复制同一张共享实体卡。
- **状态**：已由R-148裁定。

### R-148

- **编号**：R-148
- **日期**：2026-11-02（Asia/Shanghai）
- **裁定**：仅Pool of Rebirth清场复活时，死者原有饰品、怪癖、疾病及意志牌若已按死亡回收规则被其他英雄持有，复活时交还给复活英雄，不复制实体牌。
- **依据**：Kyries明确回复“复活前已按现行死亡回收规则被其他英雄持有，复活时交还给复活英雄”；R-147、ROOMS FRONT p14。
- **边界**：只在本卡复活时归还，不改变普通死亡当时的R-091回收及遗产分配流程；不增加等待英雄代币，不外推其它复活来源。
- **状态**：Kyries已确认，Q-130已解决。

### Q-131

- **日期**：2026-11-02（Asia/Shanghai）
- **问题**：重生池按R-148取回其他英雄持有的意志牌后，原持有者的`resolveTested`如何处理？清除标记并允许下次压力10重新检定，还是保留标记、无牌压力10仍触发心脏病？
- **来源**：R-148原实体卡归还；现有意志结算拒绝“已检定但无牌”状态，不能直接把归还结果写入公开游戏状态。
- **状态**：已由R-149裁定；清场复活公开命令仍未开放。

### R-149

- **编号**：R-149
- **日期**：2026-11-02（Asia/Shanghai）
- **裁定**：仅重生池按R-148从其他英雄手中取回意志牌时，清除原持有者的意志检定标记；下次压力达到10重新检定。
- **依据**：Kyries明确选择“清除其检定标记，下次压力达到10重新检定”；R-148。
- **边界**：只处理本卡意志牌归还后的原持有者，不清除复活英雄的原意志牌或检定标记，不外推普通弃牌或其它复活。
- **状态**：Kyries已确认，Q-131已解决。

### Q-132

- **日期**：2026-11-02（Asia/Shanghai）
- **问题**：Pool of Rebirth的“Once the Room is cleared”是每次清场仅一次复活机会（放弃后结束），还是清场后允许反复各付压力+4、每次复活一名英雄？
- **来源**：ROOMS FRONT p14，R-145；清场后的可使用次数没有独立裁定，不能把“Once”自行解释为次数限制或无限使用。
- **状态**：已由R-150裁定。支付事务只准备一次支付，不开放公开清场入口。

### Q-133

- **日期**：2026-11-02（Asia/Shanghai）
- **问题**：重生池支付压力导致队员死亡时，完成压力结算后是否仍复活所选英雄？任一死亡取消、仅全队死亡取消、或仍执行复活？
- **来源**：ROOMS FRONT p14；R-069的取消奖励裁定有既定范围，尚未专门覆盖本卡清场复活，不能自行外推。
- **状态**：已由R-151裁定。事务记录支付死亡及回收结果，目标档案仍为死亡状态；实际复活及驿站入口留待后续实现。

### R-150

- **编号**：R-150
- **日期**：2026-11-02（Asia/Shanghai）
- **裁定**：仅Pool of Rebirth，每次清场后仅有一次复活机会；选择放弃也结束本次机会。不得离开再进入后重复激活。
- **依据**：Kyries明确选择“每次清场后仅使用一次，放弃也结束本次机会”；ROOMS FRONT p14，R-145。
- **边界**：后续清场入口须记录使用或放弃结果；不表示公开命令或驿站存储已经实现，不外推其它房间。
- **状态**：Kyries已确认，Q-132已解决。

### R-151

- **编号**：R-151
- **日期**：2026-11-02（Asia/Shanghai）
- **裁定**：仅Pool of Rebirth清场复活，支付压力时即使有队员死亡，完成压力结算后仍复活所选英雄，包括全队付款死亡的情况。
- **依据**：Kyries明确选择“仍执行复活，包括全队付款死亡”；ROOMS FRONT p14，R-147/R-148。
- **边界**：不因支付死亡取消本卡复活；付款死亡仍保存档案并执行既有回收，复活英雄完整继承并进入驿站、不增加等待代币。不外推其它奖励或自动判断战役结局。
- **状态**：Kyries已确认，Q-133已解决。

### R-152

- **编号**：R-152
- **日期**：2026-11-02（Asia/Shanghai）
- **裁定**：重生池复活英雄从驿站补位入队，不消耗等待英雄代币。即使等待代币为0，也可以选择该复活英雄补位；普通新英雄仍按R31/R33移除1枚代币。
- **依据**：Kyries明确选择“复活英雄补位不消耗等待代币”；R-147、ROOMS FRONT p14。
- **边界**：仅本卡复活的完整英雄，不授予普通新英雄免费补位，也不向驿站添加代币、XP或免费升级。
- **状态**：Kyries已确认。


### R-153

- **编号**：R-153
- **日期**：2026-11-02（Asia/Shanghai）
- **裁定**：Kyries逐项确认Hall of Ascension（最暗编号2，room:p015；TILES BACK p9）几何、部署与宝箱，唯一修正为L区容量3，其余按[核对表](phase5-hall-of-ascension-geometry-review-2026-11-02.md)。E/K为高地，13条通路、3组仅角点，A一个/C两个宝箱。
- **效果来源**：Kyries截图与ROOMS FRONT p15对应；B区绿色星标：英雄可在此花费2行动并承受压力+3，立即升级自身或一项技能。只绑定本卡，不改全局图标词典。
- **边界**：几何及效果卡文对应获批；升级运行时尚未接通，usable=false、runtimeReady=false。未批准额外使用次数、升级限制或压力后中断顺序，也不解除其它板块停点。
- **状态**：已确认，Q-134已解决。


### R-154

- **编号**：R-154
- **日期**：2026-11-03（Asia/Shanghai）
- **裁定**：仅Hall of Ascension（ROOMS FRONT p15，R-153），每次交互花费2行动、承受压力+3，还须支付对应公会升级费用：英雄4 XP+2金币，技能2 XP+1金币（R-004）。满足条件时允许重复使用，每次重新支付费用，不添加每英雄/每任务一次限制。
- **依据**：Kyries在聊天中明确选择“还需支付对应XP和金币”“允许重复使用”；R18交互，R29/R34升级。
- **结算**：沿R-069先完整结算卡文压力及相关伤口/死门/意志/心脏病；存活后执行升级与其XP/金币费用，死亡取消剩余升级。无合法升级或资源不足整次拒绝，不先支付行动/压力。
- **状态**：Q-135/136已解决；不外推其他房间或免除升级等级上限。

### R-155

- **编号**：R-155
- **日期**：2026-11-03（Asia/Shanghai）
- **裁定**：Hall of Ascension战斗中升级英雄后，新增技能槽留空，到村庄再补。不在任务中自动装备或更换其他技能。连续升级可以累计空槽。饰品槽仍随英雄等级增加，既有伤口、疾病和状态不因换卡清除。
- **依据**：Kyries明确选择“新槽留空，到村庄再补”；R11/R32技能换装与R29升级。
- **实现边界**：仅记录实际升华升级产生的空槽，后续战斗按该记录校验；村庄按新等级完整换装后清除空槽记录。无此记录者继续要求完整2+HL技能。
- **状态**：Q-137已解决。

### Q-138

- **日期**：2026-11-03（Asia/Shanghai）
- **问题**：Eldritch Vault（最暗地牢3，TILES FRONT p10 / ROOMS FRONT p16）的逐面几何、部署与绿色星标对应核对。
- **候选**：见 [完整审核稿](phase5-eldritch-vault-geometry-review-2026-11-03.md)：A–I共9区，外侧4区容量4、内侧4区及中央容量2；内侧与中央为高地。英雄与怪物四姿态分区部署，8条通路；未见额外角点、阻挡与宝箱，E区绿色星标对应卡上抽III级饰品及装备压力+2的文字。
- **状态**：Kyries已确认，见R-156。

### R-156

- **编号**：R-156
- **日期**：2026-11-03（Asia/Shanghai）
- **裁定**：批准Eldritch Vault（最暗地牢3，TILES FRONT p10，ROOMS FRONT p16）的完整审核稿：A/C/F/I容量4、普通；B/D/E/G/H容量2、高地。英雄Support A、Aggressive C、Defensive F、Ranged I；怪物Defensive B、Ranged D、Support G、Aggressive H。通路A-B、B-E、C-D、D-E、E-G、E-H、F-G、H-I；无额外角点、阻挡或宝箱。E绿色星标对应本房卡花费2行动、按在场英雄人数抽III级饰品、装备其中一张承受压力+2的卡文。
- **依据**：Kyries在查看本面标字图、容量/部署表、连接表与星标效果后明确回复“通过”；详见[审核稿](phase5-eldritch-vault-geometry-review-2026-11-03.md)。
- **边界**：仅批准本面图面与效果来源，不外推其它面或补充饰品分配、装备时机、重复使用等规则。几何可入库，特殊效果运行时未完成前保持不可参战。
- **状态**：Q-138已解决。

### Q-139

- **日期**：2026-11-03（Asia/Shanghai）
- **问题**：Toxic Chamber（最暗地牢4，TILES BACK p10 / ROOMS FRONT p17）的逐面几何、部署和Toxic Vapors区域对应。
- **候选**：见[审核稿](phase5-toxic-chamber-geometry-review-2026-11-03.md)：10区，仅F高地；10条通路、4组仅角点，B/E各两个宝箱；A/B/C/E橙色星标对应英雄站立时Acc −3。容量与八姿态部署按完整表核对。
- **状态**：Kyries修正D/F部署后确认其余正确，见R-157。

### R-157

- **编号**：R-157
- **日期**：2026-11-03（Asia/Shanghai）
- **裁定**：批准Toxic Chamber（最暗地牢4，TILES BACK p10 / ROOMS FRONT p17）的完整审核稿，修正怪物部署为Aggressive D、Defensive G、Ranged F、Support F；英雄Aggressive/Ranged J、Defensive/Support H。A–J容量依次2、4、2、4、2、2、4、2、3、2，仅F高地。通路A-B、A-D、B-C、C-G、D-H、E-F、F-I、G-J、H-I、I-J；仅角点B-D、B-G、D-I、G-I，无额外阻挡。宝箱B/E各两个；橙星A/B/C/E对应Toxic Vapors：站在此处的英雄Acc −3。
- **依据**：Kyries明确回复“D应该是怪物Aggressive，F应该是怪物Ranged／Support，其他正确”；见[本面审核稿](phase5-toxic-chamber-geometry-review-2026-11-03.md)。
- **边界**：本次批准图面与效果来源，不外推其它面或未决运行时边界。Toxic Vapors完整运行时未接通前，几何可入库但不可参战。
- **状态**：Q-139已解决。

### Q-140

- **日期**：2026-11-03（Asia/Shanghai）
- **问题**：Eldritch Power Chamber（最暗地牢5，TILES FRONT p11 / ROOMS FRONT p18）的逐面几何、部署与橙星卡文对应。
- **状态**：Kyries 已明确回复“审核结果通过”，见 R-158。

### R-158

- **编号**：R-158
- **日期**：2026-11-03（Asia/Shanghai）
- **裁定**：批准 Eldritch Power Chamber 完整审核稿：A–H容量依次2、3、4、3、3、4、4、3，均普通地形。英雄Aggressive/Defensive G、Ranged/Support C；怪物Aggressive/Defensive E、Ranged A、Support F。通路A-B、A-D、B-C、B-E、C-E、C-F、D-E、D-G、E-F、F-H、G-H；仅角点A-E、B-D，无额外阻挡；A有两个独立宝箱。C橙星对应：怪物需要移动至射程距离时朝橙星区域移动；怪物在橙星区域结束其回合，每名英雄受到5点伤害。
- **依据**：Kyries 查看标字图及[审核稿](phase5-eldritch-power-chamber-geometry-review-2026-11-03.md)后回复“审核结果通过”；R-001 / R-048、核心规则R16–18、R25与R-021。
- **边界**：批准本面图面及卡文来源，不外推其它面或未决路径选择、伤害减免等运行时细节。特殊效果完整运行时未接通前保持不可参战。
- **状态**：Q-140 已解决。

### Q-141

- **日期**：2026-11-03（Asia/Shanghai）
- **问题**：Eldritch Vault 按人数抽多张 III 级饰品时，是否必须全部处置、可否重复交互、压力 +2 是否仅作用于装备者？
- **状态**：待 Kyries 确认；运行时先按 R-156 卡文接通逐张饰品获得流，仅 `equip` 对装备者 +2 压力，见 [phase5-vault-toxic-runtime-2026-11-03.md](phase5-vault-toxic-runtime-2026-11-03.md)。

### Q-142

- **日期**：2026-11-03（Asia/Shanghai）
- **问题**：Teleporters（最暗地牢6，TILES BACK p11 / ROOMS FRONT p19）的逐面几何、部署及橙星卡文对应；临时审核稿编号Q-141因main已有同号问题顺延。
- **状态**：Kyries 已明确回复“核对通过”，见 R-159。

### R-159

- **编号**：R-159
- **日期**：2026-11-03（Asia/Shanghai）
- **裁定**：批准 Teleporters 完整审核稿：A–H容量依次3、2、3、2、2、3、2、3，均普通地形。英雄Aggressive G、Defensive D、Ranged B、Support E；怪物Aggressive A、Defensive F、Ranged H、Support C。实体通路A-D、B-C、E-H、F-G，无仅角点或额外阻挡；C/F各一宝箱。A/C/F/H橙星对应房间卡文：角色可在橙星区域之间移动和攻击；英雄穿过橙星区域承受压力+1。
- **依据**：Kyries 查看标字图及[审核稿](phase5-teleporters-geometry-review-2026-11-03.md)后回复“核对通过”；R-001 / R-048、核心规则R16–18、R25与R-021。
- **边界**：橙星卡文对应不混为实体通路；不在本次几何批准中补移动消耗、射程、视线或压力触发次数等未决运行时细节。特殊效果完整运行时未接通前保持不可参战。
- **状态**：Q-142 已解决。

### Q-145

- **日期**：2026-11-03（Asia/Shanghai）
- **问题**：Teleporters（R-159）「Heroes moving through」橙星区的压力触发次数与路径边界：是否含落点、是否含非 `moveHero` 位移、同区重复经过是否合并。
- **状态**：运行时采用最小可测解释（见 [phase5-teleporters-runtime-2026-11-03.md](phase5-teleporters-runtime-2026-11-03.md)）；待 Kyries 确认。

### Q-143

- **日期**：2026-11-03（Asia/Shanghai）
- **问题**：Evil Eye（最暗地牢7，TILES FRONT p12 / ROOMS FRONT p20）的逐面几何、部署与印刷A/B橙星卡文对应。
- **状态**：Kyries 已明确回复“核对通过”，见 R-160。

### R-160

- **编号**：R-160
- **日期**：2026-11-03（Asia/Shanghai）
- **裁定**：批准 Evil Eye 完整审核稿：A–I容量依次2、3、4、2、3、3、4、4、2，均普通地形。英雄四姿态G、怪物四姿态C；通路A-B、A-D、B-C、B-E、C-F、D-E、D-G、E-F、E-H、F-I、G-H、H-I；仅角点A-E、B-D、B-F、C-E、D-H、E-G、E-I、F-H，无额外阻挡；A/I各一宝箱。E的印刷A橙星对应Evil Gaze：英雄在此结束回合获得负面怪癖；英雄可花2行动摧毁眼睛，执行者获正面怪癖，全体英雄压力−5。A/D/H/I的印刷B橙星对应Staring Eyes：英雄在此结束回合压力+2。定位区域字母与印刷效果字母分别记录。
- **依据**：Kyries 查看标字图及[审核稿](phase5-evil-eye-geometry-review-2026-11-03.md)后回复“核对通过”；R-001 / R-048、核心规则R16–18、R25与R-021。
- **边界**：批准图面与卡文来源，不补摧毁后的效果移除、重复交互、怪癖抽取/替换等运行时细节；完整特殊效果运行时未接通前保持不可参战。
- **状态**：Q-143 已解决。

### Q-144

- **日期**：2026-11-03（Asia/Shanghai）
- **问题**：Temple of the Chosen（最暗地牢8，TILES BACK p12 / ROOMS FRONT p21）的逐面几何、部署与橙星卡文对应。
- **状态**：Kyries 已明确回复“核对通过”，见 R-161。

### R-161

- **编号**：R-161
- **日期**：2026-11-03（Asia/Shanghai）
- **裁定**：批准 Temple of the Chosen 完整审核稿：A–H容量依次4、4、3、4、3、4、4、3，仅A高地，其余普通。英雄四姿态F；怪物Support A、Ranged C、Aggressive E、Defensive G。通路A-B、A-C、A-D、B-C、B-F、C-D、C-E、D-H、E-G、F-G、G-H；仅角点B-E、D-E、E-F、E-H，无额外阻挡；E两个独立宝箱。A橙星对应Rite of the Chosen：一名怪物在此结束其回合时，所有怪物治疗5；英雄压力+1，另按负面怪癖追加压力+1 / Negative Quirk。
- **依据**：Kyries 查看标字图及[审核稿](phase5-temple-of-the-chosen-geometry-review-2026-11-03.md)后回复“核对通过”；R-001 / R-048、核心规则R16–18、R25与R-021。
- **边界**：批准本面图面与卡文来源，不补负面怪癖计数范围、治疗上限、触发顺序等运行时细节。特殊效果完整运行时未接通前保持不可参战。
- **状态**：Q-144 已解决。


### Q-145

- **日期**：2026-11-03（Asia/Shanghai）
- **问题**：Templars Room（最暗地牢9，TILES FRONT p13 / ROOMS FRONT p22）的逐面几何、部署及尖刺区卡文对应。
- **状态**：Kyries 修正四处部署后确认其余正确，见 R-162。

### R-162

- **编号**：R-162
- **日期**：2026-11-03（Asia/Shanghai）
- **裁定**：批准[Templars Room审核稿](phase5-templars-room-geometry-review-2026-11-03.md)，A–N容量依次2、1、2、4、1、4、2、1、3、4、1、4、2、1，均普通地形，无宝箱。英雄Aggressive I、Defensive F、Ranged G、Support F；怪物Aggressive M、Defensive M、Ranged C、Support C。22条共享边与4组仅角点按审核稿，无额外阻挡。B/E/H/K/N五个尖刺区分别保留印刷编号1–2、3–4、5–6、7–8、9–10，并关联Spikes原文。
- **依据**：Kyries明确修正C/G/I/M部署并确认“其他正确”；R-001 / R-048、核心规则R16–18、R25。
- **边界**：仅批准图面与卡文来源；不推定数字区间的掷骰用途，不开放Boss参战或Pit Toss。尖刺触发与Boss运行时准入另行核实。
- **状态**：Q-145 已解决。


### Q-146

- **日期**：2026-11-03（Asia/Shanghai）
- **问题**：Shuffling Horror Room（最暗地牢10，TILES BACK p13 / ROOMS FRONT p23）逐面几何与部署。
- **状态**：Kyries 已回复“核对通过”，见 R-163。

### R-163

- **编号**：R-163
- **日期**：2026-11-03（Asia/Shanghai）
- **裁定**：批准[Shuffling Horror Room完整审核稿](phase5-shuffling-horror-room-geometry-review-2026-11-03.md)：A–I容量2、3、2、3、3、3、3、3、3，仅A/C高地。英雄Aggressive G、Defensive I、Ranged I、Support B；怪物Aggressive H、Defensive H、Ranged D、Support C。通路A-D、B-E、C-F、D-E、D-G、E-F、F-I、G-H、H-I；仅角点B-D、B-F、D-H、F-H，无额外阻挡、宝箱或特殊交互标记；配套room卡无额外效果文字。
- **依据**：Kyries查看审核稿与原图后回复“核对通过”；R-001 / R-048，核心规则R16–18、R25。
- **边界**：几何批准不代表Boss技能、召唤或完整运行时已获准参战；保持usable=false，准入另行核实。
- **状态**：Q-146 已解决。


### Q-147

- **日期**：2026-11-03（Asia/Shanghai）
- **问题**：Mammoth Cyst Room（最暗地牢11，TILES FRONT p14 / ROOMS FRONT p24）几何、容量、部署及紫星图面编号。
- **状态**：Kyries修正J/L容量后确认通过，见R-164。

### R-164

- **编号**：R-164
- **日期**：2026-11-03（Asia/Shanghai）
- **裁定**：批准[Mammoth Cyst Room审核稿](phase5-mammoth-cyst-room-geometry-review-2026-11-03.md)，J/L容量修正为2；A–L最终容量2、3、2、3、4、3、2、5、2、2、4、2，均普通地形。英雄四姿态K；怪物Aggressive/Defensive H、Ranged/Support E。13条通路按审核稿，无仅角点、额外阻挡或宝箱。紫星A=1–2、C=3–4、B=5–6、G=7–8、I=9–10。
- **依据**：Kyries明确回复“J容量是2，L容量是2，其他都核对通过”；R-001 / R-048，核心规则R16–18、R25。
- **边界**：仅批准图面与room卡无额外效果文字的来源；不推定紫星效果或数字掷骰用途，不开放Boss参战、召唤或传送运行时。
- **状态**：Q-147已解决。


### Q-148

- **日期**：2026-11-03（Asia/Shanghai）
- **问题**：Ancestor Room（最暗地牢12，TILES BACK p14 / ROOMS FRONT p25）逐面几何与部署。
- **状态**：Kyries回复“核对通过”，见R-165。

### R-165

- **编号**：R-165
- **日期**：2026-11-03（Asia/Shanghai）
- **裁定**：批准[Ancestor Room完整审核稿](phase5-ancestor-room-geometry-review-2026-11-03.md)：A–K容量3、4、2、3、3、3、3、3、2、4、3，均普通地形。英雄Aggressive K、Defensive I、Ranged K、Support C；怪物Aggressive E、Defensive B、Ranged A、Support J。18条通路按审核稿，D-E及H-J为共享边；仅角点B-D、E-J，无额外阻挡、宝箱或特殊标记；room卡无额外效果文字。
- **依据**：Kyries查看审核稿及原图后回复“核对通过”；R-001 / R-048，核心规则R16–18、R25。
- **边界**：仅批准图面，不批准最终战形态切换、召唤、战斗开局或先攻处理；Boss运行时准入另行核实，保持usable=false。
- **状态**：Q-148已解决。

### Q-149

- **日期**：2026-11-03（Asia/Shanghai）
- **问题**：Necromancer Room（遗迹10，TILES BACK p6 / ROOMS FRONT p10）逐面几何、容量、地形与部署，见[审核稿](phase5-necromancer-room-geometry-review-2026-11-03.md)。
- **状态**：Kyries修正E容量为3，其余审核通过，见R-166。

### R-166

- **编号**：R-166
- **日期**：2026-11-03（Asia/Shanghai）
- **裁定**：批准[Necromancer Room审核稿](phase5-necromancer-room-geometry-review-2026-11-03.md)，E容量修正为3；A–H容量3、4、3、4、3、2、4、2。A为高地，其余普通；英雄四姿态G，怪物仅Aggressive A。11条共享边、6组角点按审核稿；无额外阻挡、宝箱或星标，room卡无额外效果文字。
- **依据**：Kyries明确回复“E容量是3，其他审核通过”；R-001、R-048、R-021，核心规则R16–18、R25。
- **边界**：只批准图面，不补造怪物其余三姿态部署；Boss运行时准入另行核实，保持usable=false。
- **状态**：Q-149已解决。

### Q-150

- **日期**：2026-11-03（Asia/Shanghai）
- **问题**：Prophet Room（遗迹11，TILES FRONT p6 / ROOMS FRONT p11）几何、容量与部署，见[审核稿](phase5-prophet-room-geometry-review-2026-11-03.md)。
- **状态**：Kyries回复“审核通过”，见R-167。

### R-167

- **编号**：R-167
- **日期**：2026-11-03（Asia/Shanghai）
- **裁定**：批准[Prophet Room审核稿](phase5-prophet-room-geometry-review-2026-11-03.md)：A–H容量4、3、3、3、3、4、3、3，均普通地形。英雄Aggressive C、Support D、Ranged/Defensive H；怪物仅Aggressive E。12条共享边含D-H及F-H；仅角点A-E、B-F、C-E。橙色标记A=1–2、B=3、C=4、D=5、E=6、F=7–8、G=9、H=10；无宝箱或额外阻挡，room卡无额外效果文字。
- **依据**：Kyries回复“审核通过”；R-001、R-048、R-021，核心规则R16–18、R25。
- **边界**：只批准图面，不补其余怪物姿态；不批准落石、掷骰表或Boss运行时准入，保持usable=false。
- **状态**：Q-150已解决。

### Q-151

- **日期**：2026-11-03（Asia/Shanghai）
- **问题**：Collector Room（遗迹12，TILES BACK p7 / ROOMS FRONT p12）几何、容量、部署与三宝箱，见[审核稿](phase5-collector-room-geometry-review-2026-11-03.md)。
- **状态**：Kyries回复“核对通过”，见R-168。

### R-168

- **编号**：R-168
- **日期**：2026-11-03（Asia/Shanghai）
- **裁定**：批准[Collector Room审核稿](phase5-collector-room-geometry-review-2026-11-03.md)：A–H容量2、3、3、2、2、2、2、3，均普通地形。英雄Aggressive/Support H、Ranged/Defensive B；怪物Aggressive C、Defensive G、Ranged E、Support A。7条共享边、3组角点按审核稿；F有三个独立宝箱标记，各带白色叹号；无额外阻挡或星标，room卡无额外效果文字。
- **依据**：Kyries回复“核对通过”；R-001、R-048、R-021，核心规则R16–18、R25。
- **边界**：仅批准图面与宝箱数量，不推定叹号特殊奖励含义；Boss 准入仍另行核实，保持 usable=false。F 区宝箱交互与奖励见 R-177。
- **状态**：Q-151已解决。

### Q-152

- **日期**：2026-11-03（Asia/Shanghai）
- **问题**：Fanatic Room（遗迹13，TILES FRONT p7 / ROOMS FRONT p13）几何、容量、高地与部署，见[审核稿](phase5-fanatic-room-geometry-review-2026-11-03.md)。
- **状态**：Kyries回复“核对通过”，见R-169。

### R-169

- **编号**：R-169
- **日期**：2026-11-03（Asia/Shanghai）
- **裁定**：批准[Fanatic Room审核稿](phase5-fanatic-room-geometry-review-2026-11-03.md)：A–I容量3、3、3、4、3、4、3、3、3；B为高地，其余普通。英雄Aggressive/Ranged H、Defensive A、Support C；怪物Aggressive/Defensive B、Ranged/Support E。12条共享边及6组角点按审核稿；D/F保持独立折区，A-E及C-E不相连也非仅角点；无宝箱、星标、编号标记或额外阻挡，room卡无额外效果文字。
- **依据**：Kyries回复“核对通过”；R-001、R-048、R-021，核心规则R16–18、R25。
- **边界**：仅批准图面，不据篝火或囚笼插画推定效果；Fanatic/Pyre、Boss部署及准入另行核实，保持usable=false。
- **状态**：Q-152已解决，核心盒25张Room均已获批几何。

### R-170

- **日期**：2026-11-03（Asia/Shanghai）
- **裁定**：Evil Eye（R-160）摧毁后，本场不能再次摧毁，E区不再触发Evil Gaze负面怪癖；A/D/H/I的Staring Eyes仍生效。获得怪癖沿用核心R26完整实体牌池与第四张替换/发疯规则。
- **依据**：Kyries本轮对上述毁眼边界明确回复“是，按上述处理”；ROOMS FRONT p20，核心R26。
- **边界**：仅本房本场；不开放其它房间或Boss准入。

### R-171

- **日期**：2026-11-03（Asia/Shanghai）
- **裁定**：Temple of the Chosen（R-161）一名怪物在A区结束回合时，先全体存活怪物各治疗5（不超过Life）；再按英雄姿态顺序，对每名存活英雄一次增加“1＋该英雄自身负面怪癖数”压力，即时处理意志/死亡。正面怪癖不计数，不抽取新怪癖。
- **依据**：Kyries本轮对上述计数与结算顺序明确回复“是，按上述处理”；ROOMS FRONT p21与核心R17–18、R26。
- **边界**：仅本房区域效果，不开放其它房间或Boss准入。

### R-172

- **日期**：2026-11-03（Asia/Shanghai）
- **裁定**：在R-166获批Necromancer Room几何上，先接Necromancer I真实部署：Boss初始进攻姿态、区域A，四英雄区域G。
- **依据**：Kyries对本切片明确回复“确认，先做 Necromancer I 真实部署”；R-166图面与核心R30/R38。
- **边界**：仅I级真实部署，不修改combatReady，不扩大任务白名单，不开放其它Boss/等级或Phase 6。房间usable=false与完整Boss准入停点保持，普通房间选择仍拒绝Boss。

### Q-153

- **日期**：2026-11-04（Asia/Shanghai）
- **问题**：是否批准 Prophet I 在 R-167 真实几何上的专用部署（Boss 进攻/E；英雄 Aggressive/C、Support/D、Ranged 与 Defensive/H），并将橙色编号映射为现有放长椅/落石运行时的骰点表：1–2/A、3/B、4/C、5/D、6/E、7–8/F、9/G、10/H？详见[具体方案](phase5-prophet-i-production-entry-review-2026-11-04.md)。
- **依据**：R-167 仅批准图面，明确保留掷骰表与 Boss 运行时准入；规格书 §14.5、核心 R38–R39 已记载先知三次行动及长椅/落石流程。
- **状态**：Kyries 回复“确认”，见 R-173。

### R-173

- **日期**：2026-11-04（Asia/Shanghai）
- **裁定**：批准 Q-153 的 Prophet I 真实部署与八组骰点绑定：Boss 进攻/E；英雄进攻/C、辅助/D、远程与防御/H；1–2/A、3/B、4/C、5/D、6/E、7–8/F、9/G、10/H。部署后显式 startBattle，接既有三次行动、长椅和落石流程。
- **依据**：Kyries 对具体方案明确回复“确认”；R-167 图面、规格书 §14.5 与核心 R38–R39。
- **边界**：仅 Prophet I 专用部署及绑定，不修改 combatReady、任务白名单或 room:p011 usable=false；其它等级、正式页面与自然任务闭环分切片验收。

### R-174

- **日期**：2026-11-04（Asia/Shanghai）
- **裁定**：Prophet I 战斗卡 monster_large:p005 的 Speed 为1；四姿态共用 d10 选招表：1–5 为 Eye on You（slot1），6–10 为 Fulminate（slot2）。首次与第三次行动继续由 R-173 长椅/落石规则替代。
- **依据**：Kyries 对逐项卡图提案明确回复“确认，按卡图入库”；本地私有 COREBOX monster_large FRONT p005。
- **边界**：仅此卡字段与正式目录接线，不扩大其它卡片审批、combatReady或任务白名单。

### R-175

- **日期**：2026-11-04（Asia/Shanghai）
- **裁定**：批准 Collector I 在 R-168 房间的专用部署。Boss 初始进攻/C，英雄进攻与辅助/H、防御与远程/B。Collect All 的防御、远程、辅助召唤物分别放 G、E、A。显式开始战斗时在 F 布置三个独立宝箱，沿用 R-047 有限牌池。
- **依据**：Kyries 对部署方案回复“确认”。R-168 图面、核心 R31/R39、规格书 §14.4–14.5、R-034。
- **边界**：限 I 级 Face the Threat 的实际 Collector 威胁与专属目标房。F 区宝箱交互与奖励见 R-177；沿用既有任务白名单、combatReady 与 room:p012 usable=false。

### R-176

- **日期**：2026-11-04（Asia/Shanghai）
- **裁定**：Collector I 战斗卡 `monster_medium:p092` 的 Speed 为 2。四姿态共用 d10 选招表，1–5 为 Show Collection（slot 1），6–10 为 Life Steal（slot 2）。
- **依据**：Kyries 对 Q-154 回复“确认”。核心 R24、印刷 COREBOX 怪物中卡正面第 92 页及[字段核对稿](phase5-collector-i-page-entry-review-2026-11-04.md)。
- **边界**：仅此卡字段与正式目录。Collect All 仍按核心 R39 与规格书 §14.5 接管相应行动。

### R-177

- **日期**：2026-11-04（Asia/Shanghai）
- **裁定**：批准 Collector Room（R-168）F 区三个独立宝箱的交互与奖励运行时：英雄在同区、当前行动中可 `interactLoot` 翻开并结算，奖励种类与 R-047 十枚有限堆一致（含 R-059 补给池满 16 时的保留 / 选项限制）；白色叹号仅图面外观，不赋予额外或特殊奖励。未拾取箱在战斗结束仍按 R-047 / R-059 归还未拾取代币至本次地牢可用堆；已拾取 `claimedIds` 不再出现。
- **依据**：Kyries 令继续接通宝箱交互；核心 R18、R39；规格书战利品翻面；R-168、R-175、R-047、R-059；R-001 / R-048。
- **边界**：不修改 `combatReady`、任务白名单或 `room:p012 usable=false`；不推定叹号语义；Collector II/III 与其余 Boss 分切片。

### R-178

- **日期**：2026-11-04（Asia/Shanghai）
- **裁定**：批准 Fanatic I 在 R-169 房间（`room:p013` / `room_tile:p007:front`）的专用部署与生产胜负交接。公开命令 **`deployFanaticI`**：Boss 初始进攻/B，四英雄按 R-169 获批姿态区部署；保留英雄状态与 RNG 游标，部署不掷骰。显式 **`startBattle`** 时经 **`monsterStanceAreas.ranged`** 将 Pyre 落 **E**（R39 开战布置）。**`finishDungeonBattle`** 沿用遗迹 I 级共用交接，清除威胁、记录 Fanatic 击败并清理目标房；英雄全灭仍走 R-044。
- **依据**：Kyries 确认 [#583](https://github.com/Alpaca-go/ddbg-web/pull/583) 与 R-178；R-169 图面、[审核稿](phase5-fanatic-i-production-entry-review-2026-11-04.md)、核心 R39、规格书 §14.5、对标 R-175。
- **边界**：限 I 级 Face the Threat 的实际 Fanatic 威胁与专属目标房；不修改 `combatReady`、任务白名单或 `room:p013` / 获批 tile 的 `usable=false`；不经 `selectRoomTile` 进 Boss 房；Fanatic II/III 与其余 Boss 分切片。

### R-186

- **日期**：2026-11-04（Asia/Shanghai）
- **裁定**：批准最终战在 R-165 房间（`room:p025` / `room_tile:p014:back`）的 **`deployFinalBattleForm`** 生产部署与形态间续接。四英雄按 R-165 落 **K/I/K/C**，各形态 Boss 与支持卡按目录 stance 落 **E/B/A/J**；十一区邻接经 `roomTileBattleAreas` 写入 BattleState，**不**经 `selectRoomTile` 或探索 tile 白名单。保留英雄状态与 RNG 游标，部署不掷骰；显式 **`startBattle`** 仍洗先攻。`room_tile` 与 `darkest_boss_content` 的 **`usable` / `combatReady` 保持 false**（无 `ancestorGlory` 等特殊区运行时）。
- **补记**：Ancestor 首形态的三只 Reflection 与随机姿态部署见 R-217。
- **依据**：Kyries 确认 [#595](https://github.com/Alpaca-go/ddbg-web/pull/595) 与 R-186；R-165 图面、[审核稿](phase5-ancestor-room-geometry-review-2026-11-03.md)、[生产入口审核稿](phase5-final-battle-production-entry-review-2026-11-04.md)、核心 R36/R-035、对标 R-184 / R-182。
- **边界**：限最终战形态流程（`finalBattleProvisions` + `finalFormSequence`）；不修改任务白名单、自然战役严格存档、形态技能完整 AI、Stygian、扩展包。

### R-187

- **日期**：2026-11-04（Asia/Shanghai）
- **裁定**：最终战形态战斗卡 Speed 与四姿态选招表如下（印刷 COREBOX monsters_medium FRONT p105–p111、monsters_large FRONT p18–p20；`darkest_boss_content.finalBattle` 同 id）：
  - **Ancestor 1** `monster_medium:p105`：Speed **3**；四姿态 d10 **1–3 → slot 1**（Perfect Replication）、**4–10 → slot 2**（Imperfect Reproduction）；slot 3 Time Heals All 由 `boss_ability:p034` 与专用运行时处理，**不**写入姿态骰表。
  - **Perfect Reflection** `monster_medium:p106`：Speed **2**；四姿态 **1–5 / 6–10 → slot 1–2**。
  - **Imperfect Reflection** `monster_medium:p109`：Speed **1**；四姿态 **1–5 / 6–10 → slot 1–2**。
  - **Ancestor 2** `monster_large:p018`：Speed **3**；四姿态 **1–2 / 3–6 / 7–10 → slot 1–3**（与既有 verified 一致）。
  - **Gestating Heart** `monster_large:p019`：卡面**无**移动靴印，Speed **0**；四姿态固定 **slot 1**（Dispersion）；Ichor 与随机召唤走 `boss_ability:p036` 与专用运行时。
  - **Heart of Darkness** `monster_large:p020`：卡面**无**移动靴印，Speed **0**；四姿态 footer **1–4 / 5–7 / 8–10 → slot 1–3**（与 **R-139** Impending Doom 映射一致；Impending Doom 仍走专用落骰）。
- **依据**：Kyries 确认 [#596](https://github.com/Alpaca-go/ddbg-web/pull/596)；核心 R24、R-015、R-139；[字段核对稿](phase5-final-battle-page-entry-review-2026-11-04.md)；部署 R-186（[#595](https://github.com/Alpaca-go/ddbg-web/pull/595)）。自然任务与严格存档边界见 [phase5-final-battle-natural-save-2026-11-04.md](phase5-final-battle-natural-save-2026-11-04.md)（**Q-xxx 待确认**）。
- **边界**：仅此六张卡字段与正式 `bossMonsters` 目录及 `preFinalBattleBossCatalogTaskSources` 迁移。不修改 `combatReady`、任务白名单或 R-186 部署几何；Absolute Nothingness / 完整 AI / 自然存档分切片。

### R-188

- **日期**：2026-11-04（Asia/Shanghai）
- **裁定**：最终战第 4 形态 **Heart of Darkness** 被击败（`finishDungeonBattle` → `finishFinalBattleForm` 完成全部形态）= **战役胜利**（R9、R41；规格书 §14.7「击败 = 赢得游戏」）。`dungeon.campaignVictory: true` 为终局态：此后 `applyCommand` 一律拒绝，不再接受部署、战斗、结算或回村命令。存档沿用「起点 + 命令日志 + 快照校验」，终局由回放派生，**不新增存档字段**；快照伪造 `campaignVictory` 由严格校验拒绝。网页在终局整屏显示战役胜利面板，不进入村庄，也不开放新战役。
- **依据**：Kyries 点名「开 B1」（[#600](https://github.com/Alpaca-go/ddbg-web/pull/600)）；核心 R9 / R41；规格书 §1 胜利定义、§14.7；[切片记录](phase5-final-battle-victory-2026-11-04.md)。
- **边界**：仅终局态与结局面板。胜利后回村（R32）或新战役、`combatReady`、`ancestorGlory`、完整 Boss AI、Stygian 与扩展包均不在本裁定内（**Q-xxx 待确认**）。
- **补充（2026-11-04，Kyries）**：打完最终 BOSS 游戏即结束，胜利**不回村**；结局面板改为提供「开新战役」入口（回到出征设置页）。边界中的「新战役」一项自此解除，回村仍不开放。

### R-189

- **日期**：2026-11-04（Asia/Shanghai）
- **裁定**：Kyries 授权把最暗 / 最终战相关 **17 处 `combatReady` 改为 `true`**（`darkest_boss_content` 7 条：三条遭遇 + 最终战四形态；`darkest_boss_abilities` 9 张；`absolute_nothingness_support` 1 张），并移除「`combatReady` 为 true 时拒绝部署」的旧反守卫；schema 由 `z.literal(false)` 改为 `z.boolean()`，保留发现问题后回退 false 的能力。理由：核心包开发完毕后由 Kyries 做大量实测，再按实际表现修正。
- **范围**：仅准入声明、schema 与部署守卫；不改 `usable`、任务白名单、生产几何、技能效果线或 AI 行为。`ancestorGlory` 属 Tomb of Ancestor（`room:p007`，已实现并有测试），不在本裁定内。
- **依据**：Kyries 2026-11-04 指示（[#602](https://github.com/Alpaca-go/ddbg-web/pull/602)）；R-048 的准入原则；[切片记录](phase5-combatready-2026-11-04.md)。
- **边界**：`combatReady: true` 表示「允许进入生产战斗」，**不等于**四形态 AI 已全部自动。Ancestor 1 的三招与 Gestating Heart 的召唤目前仍需显式命令，按切片文档的后续 PR 补；本裁定不批准 Phase 6、Stygian 或扩展包。

### R-190

- **日期**：2026-11-05（Asia/Shanghai）
- **裁定**：**由玩家操作的部分不做干预。** 战斗策略、目标与路线选择、村庄安排、补给与饰品使用等属于玩家决策；难度再高，只要引擎是按规则执行，就原样保留，**不得为使测试、黄金回放或自然链通过而调整**。测试/回放若打不过，结论是「该输入下玩家会输」，不是引擎缺陷，不改规则、不改数值、不加保底。
- **范围**：禁止为测试绿灯修改自然战斗策略、搜索有利种子、注入状态绕过玩家决策、改怪物/英雄数值或难度；测试夹具必须明确标注为夹具，不能冒充「自然养成/自然通关已验证」。
- **依据**：Kyries 2026-11-05 指示；R-048（不发明规则或数值）；R-001（只认官方规则书与裁定）。
- **边界**：不影响修**规则/相位/状态机**错误（如 R-044 全灭判负、R32 村庄相位）；不影响用公开命令复现与严格回放；不批准任何为平衡性做的数值改动；Phase 6、Stygian、扩展包仍不在内。

### R-185

- **日期**：2026-11-04（Asia/Shanghai）
- **裁定**：Mammoth Cyst 战斗卡 `monster_large:p016` 的 Speed 为 1。四姿态共用 d10 选招表：1–4 为 slot 1（Bulging Gaze），5–8 为 slot 2（Digestion），9–10 为 slot 3（Revivify）。slot 3 虽为 Self 技能，但卡面 footer 与 Fanatic 同型分段表写入姿态骰表；White Cell 召唤与 boss_ability 替换行动仍走专用运行时，不另改表。
- **依据**：Kyries 确认 [#593](https://github.com/Alpaca-go/ddbg-web/pull/593)；核心 R24、印刷 COREBOX 怪物大卡 FRONT p016 及[字段核对稿](phase5-mammoth-cyst-page-entry-review-2026-11-04.md)；部署 R-184（[#592](https://github.com/Alpaca-go/ddbg-web/pull/592)）。自然任务与严格存档见 [phase5-mammoth-cyst-natural-save-2026-11-04.md](phase5-mammoth-cyst-natural-save-2026-11-04.md)。
- **边界**：仅此卡字段与正式 `bossMonsters` 目录及 `preMammothCystTaskSources` 迁移。White Cell Teleport / 紫星运行时 / 完整 AI 与其余最暗 Boss 分切片。

### R-184

- **日期**：2026-11-04（Asia/Shanghai）
- **裁定**：批准 Mammoth Cyst（quest:p018）在 R-164 房间（`room:p024` / `room_tile:p014:front`）的专用部署与生产胜负交接。公开命令 **`deployMammothCystI`**：`monster_large:p016` 初始进攻/**H**，四英雄按 R-164 均落 **K**；保留英雄状态与 RNG 游标，部署不掷骰。显式 **`startBattle`** 洗先攻（目录 `initiativeCards: 2`、单 Boss 实体，经 `expandDarkestMidBossInitiativeDeckSides` 补全 monster 侧张数；开战不预置 `monster_medium:p104` White Cell）。**`finishDungeonBattle`** 沿用最暗中途 Boss 共用交接（`finishDarkestDungeonBattle`），记录 `bossQuestVictory` 与目标房清理；英雄全灭仍走 R-048 停点。
- **依据**：Kyries 确认 [#592](https://github.com/Alpaca-go/ddbg-web/pull/592) 与 R-184；R-164 图面、[审核稿](phase5-mammoth-cyst-production-entry-review-2026-11-04.md)、核心 R36/R39、规格书 §14.x、对标 R-182 / R-180。
- **边界**：限 quest:p018 最暗目标房；不修改 `darkest_boss_content.combatReady`、任务白名单或 `room_tile` 的 `usable=false`；不经 `selectRoomTile` 或 `prepareDungeonMonsters` 占位 `darkest-mid-boss-*` 进 Mammoth Cyst 战；White Cell Teleport / 紫星运行时 / 完整 AI 与其余 Boss 分切片。

### R-183

- **日期**：2026-11-04（Asia/Shanghai）
- **裁定**：Shuffling Horror 战斗卡 `monster_large:p017` 的 Speed 为 1。四姿态共用 d10 选招表：1–7 为 slot 1（Lacerate），8–10 为 slot 2（Undulations）。slot 3（Echoing Disassembly）由 `boss_ability:p033` 与专用运行时处理，不写入姿态骰表。
- **依据**：Kyries 确认 [#590](https://github.com/Alpaca-go/ddbg-web/pull/590)；核心 R24、印刷 COREBOX 怪物大卡 FRONT p017 及[字段核对稿](phase5-shuffling-horror-page-entry-review-2026-11-04.md)；部署 R-182（[#589](https://github.com/Alpaca-go/ddbg-web/pull/589)）。
- **边界**：仅此卡字段与正式 `bossMonsters` 目录及 `preShufflingHorrorTaskSources` 迁移。Echoing / Undulations 深化、Mammoth / Templars 与其余 Boss 分切片。

### R-182

- **日期**：2026-11-04（Asia/Shanghai）
- **裁定**：批准 Shuffling Horror（quest:p016）在 R-163 房间（`room:p023` / `room_tile:p013:back`）的专用部署与生产胜负交接。公开命令 **`deployShufflingHorrorI`**：`monster_large:p017` 初始进攻/**H**，四英雄按 R-163 获批姿态区部署；保留英雄状态与 RNG 游标，部署不掷骰。显式 **`startBattle`** 洗先攻（目录 `initiativeCards: 2`、单 Boss 实体，经 `expandDarkestMidBossInitiativeDeckSides` 补全 monster 侧张数；开战不预置 support 召唤物）。**`finishDungeonBattle`** 沿用最暗中途 Boss 共用交接（`finishDarkestDungeonBattle`），记录 `bossQuestVictory` 与目标房清理；英雄全灭仍走 R-048 停点。
- **依据**：Kyries 确认 [#589](https://github.com/Alpaca-go/ddbg-web/pull/589) 与 R-182；R-163 图面、[审核稿](phase5-shuffling-horror-room-geometry-review-2026-11-03.md)、核心 R36/R39、规格书 §14.x、对标 R-180 / R-178。
- **边界**：限 quest:p016 最暗目标房；不修改 `darkest_boss_content.combatReady`、任务白名单或 `room_tile` 的 `usable=false`；不经 `selectRoomTile` 或 `prepareDungeonMonsters` 占位 `darkest-mid-boss-*` 进 Shuffling Horror 战；Echoing / Undulations 完整生产、Mammoth / Templars 与其余 Boss 分切片。

### R-181

- **日期**：2026-11-04（Asia/Shanghai）
- **裁定**：Templar Warlord `monster_large:p014` 与 Templar Impaler `monster_large:p015` 的 Speed 均为 2。两卡共用姿态选招表：进攻姿态 d10 1–2 → slot 1（Torment），3–4 → slot 2（Body Slam / Stinger Shot），5–10 → slot 3（Revelation）；防御、远程、辅助姿态 d10 1–5 → slot 1，6–10 → slot 2。 两卡选招表以 R-214 各自的映射为准。
- **依据**：Kyries 待确认本 PR；核心 R24、印刷 COREBOX 怪物大卡 FRONT p014–p015 及[字段核对稿](phase5-templars-page-entry-review-2026-11-04.md)；部署 R-180。
- **边界**：仅此两卡字段与正式 `bossMonsters` 目录及 `preTemplarsTaskSources` 迁移。Pit Toss / Spikes / 完整 AI 与其余最暗 Boss 分切片。

### R-180

- **日期**：2026-11-04（Asia/Shanghai）
- **裁定**：批准 Templars（quest:p017）在 R-162 房间（`room:p022` / `room_tile:p013:front`）的专用部署与生产胜负交接。公开命令 **`deployTemplarsI`**：Templar Impaler 进攻/M、Templar Warlord 远程/C，四英雄按 R-162 获批姿态区部署；保留英雄状态与 RNG 游标，部署不掷骰。显式 **`startBattle`** 洗先攻（两只 Templar 各 2 张实体先攻，共 8 monster 侧，沿用 `expandDarkestMidBossInitiativeDeckSides`）。**`finishDungeonBattle`** 沿用最暗中途 Boss 共用交接（`finishDarkestDungeonBattle`），记录 `bossQuestVictory` 与目标房清理；英雄全灭仍走 R-048 停点。
- **依据**：Kyries 确认 [#586](https://github.com/Alpaca-go/ddbg-web/pull/586) 与 R-180；R-162 图面、[审核稿](phase5-templars-room-geometry-review-2026-11-03.md)、核心 R36/R39、规格书 §14.x、对标 R-178 / R-175。
- **边界**：限 quest:p017 最暗目标房；不修改 `darkest_boss_content.combatReady`、任务白名单或 `room_tile` 的 `usable=false`；不经 `selectRoomTile` 或 `prepareDungeonMonsters` 占位 `darkest-mid-boss-*` 进 Templars 战；Pit Toss / Spikes / Shuffling Horror / Mammoth 与其余 Boss 分切片。

### R-179

- **日期**：2026-11-04（Asia/Shanghai）
- **裁定**：Fanatic I 战斗卡 `monster_large:p008` 的 Speed 为 2。四姿态共用 d10 选招表：1–2 为 slot 1（Righteous Condemnation），3–6 为 slot 2（Strike the Heretic），7–10 为 slot 3（Fury of the Righteous）。
- **依据**：Kyries 确认 [#584](https://github.com/Alpaca-go/ddbg-web/pull/584) 与 R-179。C-017、核心 R24、印刷 COREBOX 怪物大卡正面第 8 页及[字段核对稿](phase5-fanatic-i-page-entry-review-2026-11-04.md)。
- **边界**：仅此卡字段与正式目录。Pyre 仍仅开战布置；Sentence / Pit Toss / 先攻 4 沿用既有运行时。

### Q-154

- **日期**：2026-11-05（Asia/Shanghai）
- **问题**：Necromancer II 的 Army of the Dead（`boss_ability:p005` 背面）在「地牢首场战斗就是 Boss 战」时，Bone Captain 是否加入该场 Boss 战？若加入，落在哪个怪物姿态/区域，先攻如何洗入？
- **暂定**：正常 `startDungeonBattle` 首战仍按既有 `firstBattleThreatDeck` 与 `firstBattleThreatEntry` 生成并消费；`deployNecromancerII` 不自行加入 Bone Captain，也不伪造落点或先攻。
- **状态**：已确认（R-204，2026-11-08）；Bone Captain 加入首场 Boss 战并按 2 格姿态位落位。

### R-191

- **日期**：2026-11-05（Asia/Shanghai）
- **问题**：交接稿把第 4 幕写成「p016 → p017 → p018 三连任务」，与规格书 §2.1 / §14.7.3 / §15 的「3 张最暗任务卡随机抽 1 张（不是 2 选 1）」冲突；同时 III 幕后没有进入最暗的战役入口。
- **裁定**：
  1. **第 4 幕只打 1 张最暗任务**：Act III Boss 击败 → 回村 → 该次村庄阶段结束 → 抽 1 张最暗任务（p016/p017/p018，不是 2 选 1）→ 打完直接进入最后村庄（固定 4 天、不抽村庄事件）与最终战。**不存在** p016→p017→p018 三连；三张都打会把前三个形态全部取消，与 §14.7「前三个形态中有一个被最暗任务取消」矛盾。
  2. 抽到的那张决定最终战取消哪个形态（p016→Ancestor 2、p017→Ancestor 1、p018→Gestating Heart）；第 IV 形态不能跳过。
  3. 本切片先接线**入口**并**固定提供 p016**：公开命令 `enterDarkestDungeon` 只在 Act III Boss 胜利、3 XP 已发、回村完成且该次村庄阶段结束后可用；确认后仍走 `chooseNextQuest` 的出征校验与最暗布置（16 房、3 Boss 位、最暗怪物池、III 级房间/饰品）。固定提供不抽卡、不消耗 RNG；自然战役的最暗布置续接既有 RNG 游标（`placeDarkestRooms` 的 `startCursor`），不回到 0 重放。
  4. 固定提供期间，Act III Boss 完成后 `offerNextQuest` 必须拒绝，不得回落到 III 级剩余普通任务的 2 选 1 池。
- **依据**：Kyries 2026-11-05 明确选择「单任务 + 本刀固定 p016」（本对话）；核心 R35–R36；规格书 §2.1「Act IV：① 最暗地牢任务（3 选 1，随机抽）→ ② 最终战」、§14.7.1–.3、§15 L1 QuestSelect；[docs/plan.md](plan.md) 第 4 幕；R-120（p016–p018 不进普通池）、R-121（Boss 位布置）。
- **切片**：[phase5-darkest-act-entry-2026-11-05.md](phase5-darkest-act-entry-2026-11-05.md)。
- **边界**：不实现随机 1/3 抽签（Q-155）、p017/p018 生产入口、最暗中途 Boss 特殊机制、最终准备门槛修正或战役级严格存档；不改 `usable` / `combatReady` / 任务白名单。
- **补充（2026-11-06）**：第 3 条「固定提供 p016」已由 **R-192** 取代为随机 1/3 抽签；「只打 1 张、无三连」的结构不变。

### R-192

- **日期**：2026-11-06（Asia/Shanghai）
- **问题**：R-191 先固定提供 p016；「3 张随机抽 1 张」的时点、RNG 消费，以及是否明示抽到的任务（Q-155）待定。
- **裁定**：
  1. **时点**：Act III Boss 后的村庄阶段结束、玩家执行公开命令 `enterDarkestDungeon` 时一次性抽取；只抽 1 张，不提供 2 选 1、不允许重抽。
  2. **RNG**：用 `state.seed` 与当前 `d.cursor` 对 p016–p018 做 Fisher–Yates 洗牌取首张，游标前进 2；命令无载荷，严格存档按「种子 + 命令日志」重放，同种子同游标同结果。
  3. **明示**：抽到的任务卡按公开抽卡处理；待选与事件文案同时给出它将取消的最终形态（p016→Ancestor 2nd Form、p017→Ancestor 1st Form、p018→Gestating Heart；第 IV 形态不能跳过，§14.7.3）。
  4. 本裁定取代 R-191 第 3 条的「固定提供 p016」与 Q-155 的暂定；R-191 的「第 4 幕只打 1 张、无三连」结构不变。
- **依据**：Kyries 2026-11-06 指示「合入，然后继续」；规格书 §14.7.3 / §15 L1 QuestSelect；R-191；Q-155 关闭。
- **切片**：[phase5-darkest-quest-draw-2026-11-06.md](phase5-darkest-quest-draw-2026-11-06.md)。
- **边界**：不改最暗任务数据、最终战形态流程或存档模型；p017/p018 的目标 Boss 特殊机制中 Mammoth White Cell Teleport 等仍 hold；Templars 尖刺/Pit Toss 见 **R-193**。

### Q-155

- **日期**：2026-11-05（Asia/Shanghai）
- **问题**：最暗任务的「3 张随机抽 1 张」应在什么时点、按什么 RNG 消费抽取？抽到后是否在 UI 明示（它决定最终战取消哪个形态）？
- **暂定**：本切片按 R-191 固定提供 p016（不抽卡、不消耗 RNG）。随机 1/3 抽签留到下一刀；预计仍在「Act III Boss 后村庄阶段结束」时一次性抽取，写入严格存档命令日志，并在确认窗口明示抽到的任务与它将取消的形态。
- **状态**：已裁定 → **R-192**（2026-11-06）；p016–p018 均可作为第 4 幕唯一生产入口。

### R-194

- **日期**：2026-11-06（Asia/Shanghai）
- **问题**：战役进行到 II/III 级（含 III→最暗）时，`QuestStart` 只有 seed/quest/mode/party、没有战役等级；能否为中途状态做严格存档？等级字段应放在起点还是存档上？
- **裁定**：
  1. **起点恒为战役起点**：`QuestStart.questId` 记录战役第一个任务（I 级普通任务；既有 p019 沙盒入口仍允许），命令日志覆盖从该起点到保存点的**整段战役**（回村、村庄准备、抽任务、升幕、最暗入口都在日志里）。中途状态**不**另造起点，也不把当前任务当起点。
  2. **等级记在存档上**：`QuestSave.campaignLevel`（1–3）由 `createQuestSave` 从保存时状态写入；`loadQuestSave` 必须与回放结果一致，否则拒绝。旧档缺省该字段时按回放结果解释，不强制迁移。
  3. 因此 II/III（含 III→最暗）严格存档**在模型上可用**：只要日志从战役起点录起，`advanceRuinsAct` / `enterDarkestDungeon` 都是可回放公开命令；等级由回放派生，`campaignLevel` 只做声明校验。
- **依据**：AGENTS「存档 = 初始种子 + 命令日志」；大纲 §3.3 / Phase 4；规格书 §2.1–2.2、§14.7；交接稿第 12/13 条；R-190（不调策略/种子）。
- **切片**：[phase5-campaign-save-model-2026-11-06.md](phase5-campaign-save-model-2026-11-06.md)。
- **边界**：本裁定不改变回放语义、不新增快照信任、不实现按任务分段存档；II/III 的**验收**仍需一条完整 Act I 自然链，当前自然策略在 R-190 下会因驿站替补耗尽而输，属后续工作。

### R-193

- **编号**：R-193
- **日期**：2026-11-06（Asia/Shanghai）
- **问题**：Templars Room（`room:p022` / `room_tile:p013:front`）橙星尖刺区 Spikes 与 Templar Impaler「Pit Toss」（`boss_ability:p028`）的运行时。
- **裁定**（本项目裁定）：
  1. **橙星 d10 落点**：印刷编号直读为 d10 落点，**1–2→B、3–4→E、5–6→H、7–8→K、9–10→N**（与 B/E/H/K/N 五坑几何一致，R-162）。
  2. **尖刺触发**：仅 **「被位移进入」**（含 Push·Pull·Shuffle 等技能位移路径终点落坑）或 **「移动结束停在此处」**（英雄执行 Move 行动，路径终点为该坑）两种场合；**同一场合只结算一次**。主动走进不另结；路径仅经过坑而不以坑为终点不另结。**站立／回合路过**未在上述两场合内则不另结。
  3. **尖刺效果**：对英雄 **5 伤 + Bleed 3（3t）**；按**常规抗性 / 免疫**处理（与技能攻击同源的环境伤害结算路径）。
  4. **Pit Toss**：Body Slam **命中**后掷 d10→按 ① 落入对应橙星坑；**不结算**尖刺区的 Spikes 伤害；Body Slam 本身的命中伤害与卡面目标效果（如 Stun）照常。**若坑区已满（`capacity` 无空位）则 ignore：英雄不移动**，Body Slam 伤害与效果仍结。
- **依据 / 出处**：Kyries 2026-11-06 裁定（本对话）；几何 **R-162**；卡面引用见 Q-156 题干。
- **关联待确认**：无（Q-156 关闭）
- **状态**：已裁定
- **切片说明**：数据 `room_tile:p013:front` 五区 `runtimeReady=true` 供 Spikes 投影；`usable` 仍为 false（生产仍经 `deployTemplarsI`，不经 `selectRoomTile` 普适入口）；引擎对 Templars 面单独投影 `templarsSpikes` 与 Pit Toss 链。

### Q-156

- **日期**：2026-11-06（Asia/Shanghai）
- **问题**：Templars 尖刺区与 Pit Toss 的运行时规则。已确认卡文：`boss_ability:p028`「Pit Toss: When the Templar Impaler hits a Hero with his Body Slam Skill, roll a d10 to see which Pit Area he'll throw them into. If the Area has no space, ignore this effect.」；房间卡 p22 Spikes「Heroes〔Shuffle 位移图标〕or ending their move here take 5〔伤害〕and Bleed 3 3t」；橙星区 B=1–2、E=3–4、H=5–6、K=7–8、N=9–10。
- **状态**：已裁定 → **R-193**（2026-11-06）

### Q-157

- **日期**：2026-11-06（Asia/Shanghai）
- **问题**：Mammoth Cyst 的 White Cell Teleport 与紫星落点。已确认卡文：`boss_ability:p031`「Teleport: When it hits a Hero with the Teleport Skill, roll a d10 to see where they'll land.」；房间卡 p24 无额外效果文字；紫星 A=1–2、C=3–4、B=5–6、G=7–8、I=9–10。
- **待确认**：① d10 1–10 与紫星区的对应是否按印刷编号直读；② 落点区域已满或没有空间时的处理（是否套用 R-034 的召唤挤占/英雄移位规则）；③ Teleport 技能本身是否另有伤害或压力（卡面技能文本尚未逐字核）；④ White Cell Stalk 被击败或换位后传送是否失效。
- **暂定**：保持 hold（White Cell 召唤、Revivify、Bulging Gaze/Digestion 最小结算保留）；`deployMammothCystI` 生产部署不变。
- **状态**：已裁定 → **R-195**（2026-11-07）；d10 按印刷编号直读、满员按 §6.7 截断、卡面只有 +2 压力。

### Q-158

- **日期**：2026-11-06（Asia/Shanghai）
- **问题**：最暗中途 Boss 的自动选招 / AI 范围。现状：Shuffling Horror 的 Undulations 与 Echoing Disassembly 有显式公开命令与最小结算（含既有召唤 Cultist Priest / Malignant Growth 逻辑），Templars / Mammoth 的技能也要玩家/测试显式驱动。
- **待确认**：① 核心盒 v1 是否要求中途 Boss「自动选招」（按姿态 d10 表自动执行），还是保持显式命令；② Echoing 召唤的完整范围（姿态轨未满时的召唤次数、召唤物落区、先攻洗入）是否已由 R-183 / R-034 覆盖，还是另有卡面细节待核。
- **暂定**：保持显式命令；`combatReady: true` 只表示允许进入生产战斗，不等于 AI 已完成（R-189）。
- **决定（2026-11-07，Kyries）**：**核心盒 v1 保持显式命令**驱动中途 Boss 技能与召唤，不做自动选招/AI；自动选招归 Phase 6（后续阶段）。Echoing 召唤的「先攻卡洗入」已按 R-034 #5 接线（`phase5-shuffling-horror-echoing-initiative-2026-11-07.md`），其余选招仍由玩家/测试驱动。
- **Phase 6 补记（2026-11-08）**：新增 `autoMonsterTurn` 命令，按已批准的姿态 d10 表自动选招、定位、按卡面目标优先级选目标并施放；玩家该做的选择（怪物落点、位移方向）以 `pendingChoice` 返回，不替玩家选。覆盖 Templars I / Shuffling Horror / Mammoth Cyst，显式 `apply*` 命令保留。切片：[phase6-boss-auto-turn-2026-11-08.md](phase6-boss-auto-turn-2026-11-08.md)。
- **状态**：已确认（2026-11-07）→ 核心盒 v1 显式命令；AI 归 Phase 6。

### Q-159

- **日期**：2026-11-06（Asia/Shanghai）
- **问题**：DL3 三张普通怪 Brigand Raider、Brigand Hunter、Adder 仍缺 `speed` / `stanceGroups`（`monster_pool.json`）。
- **待确认**：请 Kyries 逐卡核对印刷面的 Speed 与四姿态选招分组/d10 区间；确认后按 R-048 入库，不猜数值。
- **暂定**：保持缺失；相关遭遇不进入生产随机池，也不补默认值。
- **核对稿**：[phase5-dl3-monster-fields-review-2026-11-07.md](phase5-dl3-monster-fields-review-2026-11-07.md)。
- **状态**：已裁定 → **R-196**（2026-11-07，Kyries 逐卡确认）。

### Q-160

- **日期**：2026-11-06（Asia/Shanghai）
- **问题**：任务 SPECIAL 仍有 hold：Rising Threat 只有分布数据、没有运行时；Purify 的圣水图标/交互待核实；Dem Bones 的绿区/目标标记几何按交接停点。
- **待确认**：三项是否纳入核心盒 v1，以及各自的卡文/图标含义与几何；确认前不实现。
- **暂定**：保持 hold；任务卡可出征，但 SPECIAL 不结算。
- **核对稿**：[phase5-task-special-review-2026-11-07.md](phase5-task-special-review-2026-11-07.md)。
- **答复（2026-11-07，Kyries）**：
  - **Rising Threat**：① Curio 房战斗等价于现有 Curio 守卫战路径；② 是，抽 **1 只 II 级怪**；③ 先抽怪开战，再结算 Curio。
  - **Purify**：① `dd2d2467ec` 待确认（我方识别：**Potion 药水补给**，见核对稿）；② 补给池满时仍先拿 3 个任务道具，再丢弃超出上限的部分；这 3 个是**初始携带、不可丢弃**的任务补给，否则目标房无法净化；③ 净化复用现有行动计数/交互；④ 旁置「需要」（现有 `room:p003` 旁置实现）。
  - **Dem Bones**：① 目标房 room 7 = `DD_COREBOX_TILES_FRONT.pdf` p4；绿星在**第二行第一格**（按现有几何为 **A4**，容量 3，防御/支援的怪物起始格）；② 2 行动、任意顺序；③ 任意英雄均可取骨，骨头取完再移除；④ 旁置与 Purify 同语义（`room:p007`）。
- **已确认（R-197）**：`dd2d2467ec` = Potion；Dem Bones 的 room 7 旁置与 Purify 同语义。
- **状态**：已裁定 → **R-197**（Kyries 2026-11-07 确认）。

### R-197

- **编号**：R-197
- **日期**：2026-11-07（Asia/Shanghai）
- **问题**：Q-160：三条任务 SPECIAL（Rising Threat / Purify the Fountains / Dem Bones）的运行时语义，以及 `dd2d2467ec` 图标身份。
- **裁定**（Kyries 2026-11-07 确认）：
  1. **图标 `dd2d2467ec` = Potion（药水补给）**：词典 `group: "potion"`、仅任务卡出现；本作补给面只有 Food / Bandage / Potion / Torch / Tool / Wild（规格书 §5.2、I-31–I-33），无 Holy Water。确认后可把该图标标为 Potion（provision）。
  2. **Rising Threat（`quest:p005`）**：Curio 房战斗等价于现有 Curio 守卫战路径；**抽 1 只 II 级怪**；**先抽怪开战，再结算 Curio**。
  3. **Purify the Fountains（`quest:p010`）**：开局携带 **3 个不可丢弃的任务药水**（Potion）；补给池满时**先拿再丢弃超出上限的部分**；净化 = **2 行动 + 1 药水**，复用现有行动计数/交互；目标房旁置 `room:p003`（需要）。
  4. **Dem Bones（`quest:p004`）**：目标房 room 7 = TILES FRONT p4；绿区 = **A4**（第二行第一格，容量 3，防御/支援的怪物起始格，与 `Ancestor's Glory` 同区）；**2 行动任意顺序**；**任意英雄**均可取骨；**骨头取完再移除**；room 7 旁置与 Purify 同语义（`room:p007`）。
- **依据 / 出处**：Kyries 2026-11-07 聊天确认；QUEST p4 / p5 / p10；规格书 §5.2；R-065（Tomb of Ancestor A4 / Ancestor's Glory）、R-048。
- **关联待确认**：无（Q-160 关闭）。
- **状态**：已裁定。
- **切片**：[phase5-task-special-review-2026-11-07.md](phase5-task-special-review-2026-11-07.md)、[phase5-rising-threat-2026-11-07.md](phase5-rising-threat-2026-11-07.md)、[phase5-purify-fountains-2026-11-07.md](phase5-purify-fountains-2026-11-07.md)。
- **实现状态**：Rising Threat（Curio 房强制守卫 + 1 只 II 级怪）与 Purify（3 个任务药水 + 净化耗 1 个）已接线；Dem Bones 既有「2 行动、任意英雄、完成后清理」已符合，绿区 A4 与 Ancestor's Glory 同区已记录，无需改代码。
- **待确认**：Purify 补给满 16 时，「丢弃哪些既有补给」当前按池尾自动丢弃；若须玩家选择，另开 Q。
- **补（2026-11-07，Kyries 确认）**：目标房里的 **Healing Fountain 净化前不生效**——`startDungeonBattle` 用 `objectiveRoomBattleAreas` 裁掉本任务旁置目标房的 `endTurnHeal`，普通房间的同一板块仍按 R-065 触发 `Healing Waters`（治疗 3）。「常规效果是否整体重做」不在本裁定范围，保持 R-065 现状。
- **边界**：只接 SPECIAL 运行时与目标房清理判定；不动 `usable` / `combatReady` / 任务白名单；不猜额外数值或图标语义。

### Q-161

- **日期**：2026-11-06（Asia/Shanghai）
- **问题**：9 张走廊板块 `geometryVerified=false`，`corridor_layout_bindings` 为空。
- **待确认**：逐面几何标注与绑定审核（与房间板块同流程）；确认前走廊只沿用现有布局，不改绑定。
- **暂定**：保持 `geometryVerified=false`，不自行推定走廊形状/连接。
- **核对稿**：[phase5-corridor-tiles-review-2026-11-07.md](phase5-corridor-tiles-review-2026-11-07.md)。
- **查清（2026-11-07，Kyries）**：`corridor_tile:p006`、`p007`、`p009`–`p014`（TILES FRONT 对应页）实际是 **8 页 Boss 房间板块**（16 面，属已核实的 25 面；R-054 / R-065 / R-066 / R-144 / R-153 / R-156–R-169）；`ports` 数字 1-2、3、4、5、6、7-8、9、10 是 Prophet Room 的 **Wooden Pews d10 区域标记**（词典 `096ea91bb9`），不是走廊出口。p006 Prophet Room 复核：容量/部署/11 条共享边/3 条角点与 R-167 数据一致，D–H 共享边存在。
- **定性（2026-11-07，Kyries）**：`TILES_FRONT p8` 与 `TILES_BACK p8` 是 **PvP 地形**（首版不做）；`TILES_BACK p1` 是 **Old Road 教程地图**（不做）。两个 PDF 共 **28 页**，减去这 3 页 = **25 页 = 25 张任务/房间板块**，与 `room_tile_geometry.json` 的 25 面一一对应。**核心盒没有走廊板块**。
- **处置**：Q-161 关闭；`corridor_tile_geometry.json` 全部作废（8 页误标 + p008 为 PvP），引擎未使用；`corridor_layout_bindings` 不建，探索仍用抽象边（R-116 只批了 QuestMap）。**清理已完成**：移除 `corridor_tile_geometry.json`、corridor-tile 生成器与测试、engine catalog 的数据读取（仅保留 QuestMap 绑定查询）、web corridor art 映射/解析器与 `dungeon-data` 引用。
- **状态**：已关闭（2026-11-07）→ 误标 + PvP/教程页，无核心盒走廊板块。

### R-195

- **编号**：R-195
- **日期**：2026-11-07（Asia/Shanghai）
- **问题**：Q-157：White Cell Stalk 的 Teleport（`monster_medium:p104` slot 3 / `boss_ability:p031`）与 Mammoth Cyst Room 紫星落点的运行时。
- **裁定**（本项目裁定）：
  1. **d10 落点**：紫星印刷编号直读——**1–2→A、3–4→C、5–6→B、7–8→G、9–10→I**（R-164 图面 A=1–2、C=3–4、B=5–6、G=7–8、I=9–10）。
  2. **触发**：Teleport 技能（射程 2、Furthest、Acc 12）**命中**英雄后掷 d10；落空不传送，技能的目标效果（+2 压力）也只在命中时结算。
  3. **效果**：卡面只有 `{target_effects}{stress}+2, Teleport`；命中 +2 压力（走既有怪物压力结算），**没有额外伤害**；传送只移动英雄所在区域，**不移动姿态轨**。
  4. **满员 / 已在落点**：落点区域没有空位时按规格书 §6.7「被位移的角色不能放进满员区域，区域上的移动在那里截断」——英雄停在原区域、姿态轨不变；**不套用 R-034 的召唤挤占**。英雄已在该区则不移动。
  5. **RNG**：d10 在技能自身掷骰之后消费 1 次战斗骰；同种子同命令同结果。
- **依据 / 出处**：`boss_ability:p031`「Teleport: When it hits a Hero with the Teleport Skill, roll a d10 to see where they'll land.」；`monster_medium` FRONT p104（射程 2 / Furthest / Acc 12 / `{stress}+2, Teleport`）；`ROOMS FRONT p24`（紫星）；规格书 §6.7 / §6.8（R-021）、R-164；Kyries 2026-11-07「继续推 Q-157」。
- **关联待确认**：无（Q-157 关闭）。
- **状态**：已裁定。
- **切片**：[phase5-mammoth-teleport-2026-11-07.md](phase5-mammoth-teleport-2026-11-07.md)。
- **边界**：不实现完整 AI / 自动选招；`usable` 仍为 false，生产仍经 `deployMammothCystI`；不改 `combatReady`、任务白名单或其它紫星效果。

### Q-162

- **日期**：2026-11-07（Asia/Shanghai）
- **问题**：Q-156 接入尖刺/Pit Toss 后，`templars-i-natural-save.test.ts` 的固定种子 5075 在自然策略下不再获胜；该 PR 在 ≤20000 的种子搜索内未找到必胜路径，测试已 `it.skip`，自然存档验收暂时缺位。
- **暂定**：保持 skip；不为绿灯调整自然策略或挑选有利种子（R-190）。定向单测见 `templars-spikes-pit-toss.test.ts`。
- **待确认**：① 接受 skip，后续用合法玩家策略或人工记录补回自然存档验收；② 批准改用新的固定种子（须说明不是为绿灯挑选）；③ 把该验收改成「记录该输入会输」的断言。
- **决定（2026-11-07，Kyries）**：选 **①**——**保持 skip**，不为绿灯调整自然策略或挑选种子（R-190）；后续用合法玩家策略或人工逐日记录补回自然存档验收。定向单测继续覆盖尖刺/Pit Toss 的语义。
- **状态**：已确认（2026-11-07）→ ① 保持 skip。

### R-196

- **编号**：R-196
- **日期**：2026-11-07（Asia/Shanghai）
- **问题**：Q-159：DL3 三张普通怪 Brigand Raider（`monster_medium:p056`）、Brigand Hunter（`monster_medium:p059`）、Adder（战斗卡 `monster_large:p004`，pool 参考卡 `monster_medium:p062`）缺 `speed` / `stanceGroups`。
- **裁定**（本项目数据批准，Kyries 2026-11-07 逐卡确认）：
  - **Brigand Raider**：Speed **2**；进攻+防御 d10 **1–7→技能2、8–10→技能1**；远程 **1–5→2、6–10→1**；支援固定**技能3**。
  - **Brigand Hunter**：Speed **2**；进攻固定**技能2**；防御/远程/支援固定**技能1**。
  - **Adder**：Speed **1**；进攻 **1–5→1、6–10→2**；防御+远程 **1–3→1、4–7→2、8–10→3**；支援固定**1**。
- **依据 / 出处**：Kyries 2026-11-07 聊天逐卡确认；COREBOX 怪物中卡 FRONT p056–61、怪物大卡 FRONT p4；R24、R-001、R-048。
- **关联待确认**：无（Q-159 关闭）。
- **状态**：已裁定。
- **切片**：[phase5-dl3-monster-fields-review-2026-11-07.md](phase5-dl3-monster-fields-review-2026-11-07.md)（核对稿已按确认值填表）。
- **边界**：只补三张卡的 Speed/选招与 `monster_pool` 的 `missingBattleFields`；不改遭遇几何、生产准入白名单或其它卡，不解除 Boss/房间停点。**字段齐全不等于可进半场战斗**：三张卡的技能效果尚未逐招接入，`startDungeonBattle` 仍按 R-048 拒战。

### Q-163

- **日期**：2026-11-07（Asia/Shanghai）
- **问题**：R-196 补齐 DL3 三张普通怪的 Speed/选招后，`startDungeonBattle` 仍拒战——三张卡的技能效果尚未逐招核实（`Brigand Raider 技能 1 的完整效果尚未接入，保留部署，不进入半场战斗（R-048）`）。技能文本已入库：
  - **Brigand Raider**：1 Slice and Dice（Crowded；Crit 2；2t）、2 Shank（Closest；Crit 1；2t）、3 Harmless Poke（Furthest 1；Crit 0；Push 1；2t）。
  - **Brigand Hunter**：1 Blanket Fire（Crowded；Crit 1；2t、+1）、2 Rushed Shot（Closest 0；Crit 1；Push 1）。
  - **Adder**：1 Adder's Fang（Furthest 2；Crit 1；3 3；4t）、2 Paralyzing Quills（Closest 1；Crit 1；1t）、3 Molt（Self；2t；Remove）。
- **待确认**：三张卡每个技能的效果原语（伤害 / 暴击 / 命中、状态、Shuffle、Self 效果）与数值；确认前保持拒战，不猜效果（R-048）。
- **补（2026-11-07）**：按规格书 §6.5「Crit X [n] / Acc Y [m]」——每行两个 damage 图标分别是**暴击伤害**与**普通伤害**，可直接读出，不再有歧义：
  - **Brigand Raider**：1 Slice and Dice（Crowded0，2 目标）Crit 2 / 暴伤 **11**，Acc 10 / 普伤 **7**，目标 **Debuff 2t**；2 Shank（Closest0）Crit 1 / **16**，Acc 10 / **10**，目标 **Bleed 3，2t**；3 Harmless Poke（Furthest1）Crit 0 / **12**，Acc 7 / **8**，自身 **Buff 2t + Pull 1**。
  - **Brigand Hunter**：1 Blanket Fire（Range 2 / Crowded，4 目标）Crit 1 / **8**，Acc 10 / **5**，目标 **Debuff 2t、Stress +1**；2 Rushed Shot（Closest0）Crit 1 / **11**，Acc 9 / **7**，自身 **Push 1**。
  - **Adder**：1 Adder's Fang（Furthest2）Crit 1 / **5**，Acc 10 / **3**，目标 **Blight 3，4t**；2 Paralyzing Quills（Closest1）Crit 1 / **10**，Acc 10 / **7**，目标 **Stun 1t**；3 Molt（Self）自身 **Buff 2t、Heal 9、Remove Bleed + Blight**。
- **待确认**：以上 8 条是否照此接线（数值与效果一起）；确认后写入 `verified_monster_effects` 并重跑准入。
- **暂定**：字段已入库但不入半场战斗；`dungeon-battle-l2-admission.test.ts` 已记录该边界。
- **核稿（2026-11-07，Kyries）**：选 **方案 2**（加 cleanse 原语，八招一次接完），**数值表按提案不变**。
- **状态**：已裁定 → **R-198**（2026-11-07）。

### R-198

- **编号**：R-198
- **日期**：2026-11-07（Asia/Shanghai）
- **问题**：Q-163：DL3 三张普通怪（Brigand Raider / Brigand Hunter / Adder）八招技能效果的运行时接线，以及 Molt 的 Remove 行原语。
- **裁定**（Kyries 2026-11-07 确认：方案 2、数值表不变）：
  1. **八招一次接完**：Raider 三招、Hunter 两招、Adder 三招全部写入 `verified_monster_effects`；`startDungeonBattle` 不再按技能效果拒战。
  2. **cleanse 原语**：`{ type: "cleanse", scope: "self", kinds: ["bleed", "blight"] }`；按 R21「移除状态 = 移除所有堆叠」清空所列状态的全部堆叠，只接卡面的整行 Remove。
  3. **Molt 的图标归一**：Remove 行印刷的是 `blight_resist` 变体图标；按 R-140「仅本招上下文映射」把该位置归一为 Blight（保留原 `iconId` 与 `confirmed` 命名），原行仍逐字签名守门。
  4. **数值**（规格书 §6.5：Crit X [暴伤] / Acc Y [普伤]）：
     - Raider：1 Slice and Dice 暴伤 11 / 普伤 7、目标 Debuff 2t；2 Shank 16 / 10、目标 Bleed 3 2t；3 Harmless Poke 12 / 8、自身 Buff 2t + Pull 1。
     - Hunter：1 Blanket Fire 8 / 5、目标 Debuff 2t + Stress 1；2 Rushed Shot 11 / 7、自身 Push 1。
     - Adder：1 Adder's Fang 5 / 3、目标 Blight 3 4t；2 Paralyzing Quills 10 / 7、目标 Stun 1t；3 Molt 自身 Buff 2t + Heal 9 + Remove Bleed/Blight。
- **依据 / 出处**：COREBOX 怪物中卡 FRONT p056–61、怪物大卡 FRONT p4；规格书 §6.5；R21、R-140、R-196、R-048；Kyries 2026-11-07「方案 2、数值不变」。
- **关联待确认**：无（Q-163 关闭）。
- **状态**：已裁定。
- **切片**：[phase5-dl3-monster-effects-2026-11-07.md](phase5-dl3-monster-effects-2026-11-07.md)。
- **实现状态**：`verified-monster-effects.ts` 写入 8 条并重生成 `normalized/corebox/*.json`；`monster-effect-plan.ts` 增加 `{self_plate}` 与 Remove 行签名归一、cleanse 编译；`monster-self-status.ts` 允许自身治疗 / Remove；`battle-monster-action.ts` 结算自身治疗与清空堆叠；`dungeon-battle-l2-admission.test.ts` 的 DL3 用例改为断言 admitted，新增 `dl3-monster-effects.test.ts`。
- **边界**：不实现完整 AI / 自动选招；cleanse 只支持自身 Bleed+Blight 同一条 Remove 行（缺一项即拒绝）；不改自然策略或种子（R-190），不改遭遇几何、生产准入白名单或其它卡。

### R-199

- **编号**：R-199
- **日期**：2026-11-07（Asia/Shanghai）
- **问题**：Q-19：位移（Push / Pull）的终点落在另一只大型怪占据的两格之间时，姿态轨如何处理。原实现整条 `resolveShuffle` 拒绝，Rising Threat 的 Curio 守卫战会自然触达。
- **裁定**（Kyries 2026-11-07 确认：顺移）：
  1. **整块让位**：同阵营角色在姿态轨上按「插入」顺移；被位移者占据目标格位后，让位者以**整块**（大型怪 2 格整体）沿同一方向移动，最小移动量为「与插入块不重叠」；被让位者若再撞到别人，继续同向级联。
  2. **边界截断**：让位顶到轨道头 / 尾（越出 0–4）时，这一次**姿态位移截断**——被位移者保持原姿态；区域位移按 R-020 ④ 独立照常结算，截断只作用于轨道这一段。
  3. **不额外结算**：让位不造成伤害、不改变区域、不消耗额外骰；Shuffle 抗性 / 免疫仍只作用于被位移者本人。
- **依据 / 出处**：R-020 ③「大型怪在姿态轨上作为 2 格整体移动 X 格，其他角色顺移，到轨道头尾即止」；R17（大型怪占 2 格）；R-021 ③ / ④（可穿过、区域与姿态独立）；Kyries 2026-11-07「顺移」。
- **关联待确认**：无（Q-19 关闭；R-020 其余条款仍为暂定）。
- **状态**：已裁定（补充 R-020 ③ 的让位细节）。
- **切片**：[phase5-q19-large-monster-stance-shift-2026-11-07.md](phase5-q19-large-monster-stance-shift-2026-11-07.md)。
- **实现状态**：`shuffle.ts` 由「整条拒绝」改为块级让位 + 同向级联 + 边界截断（`stanceSteps: 0`）；`shuffle.test.ts` 改写 Q-19 用例并新增级联截断用例；`b09-curio-natural-paths.test.ts` 去掉 `Q-19` 容忍（p001 / p005 各 100 种子自然路径全通过）。
- **边界**：不实现「位移途中绕开大型怪」等未裁定细节；不改自然策略或种子（R-190）。






### R-200

- **编号**：R-200
- **日期**：2026-11-08（Asia/Shanghai）
- **问题**：Kyries 决定 18 名正式英雄都按核心内容对待；Musketeer 纳入；Antiquarian III STAT 与英雄技能图标语义待确认。
- **裁定**（Kyries 2026-11-08）：
  1. **18 名英雄一律按核心内容**（含 Leper / Antiquarian / Flagellant / Man-at-Arms / Houndmaster / Shieldbreaker / Musketeer）；**Musketeer 纳入，覆盖 R-008「首版不纳入」**。
  2. **Antiquarian III STAT 入库**：Life 15 / Dodge 3 / Speed 0；左栏 Blight 抗性；免疫栏 = **位移 + 疾病**（`8510428636` → Shuffle，`28b10f3fb7` → Disease）。`8510428636` 仍不写入全局词典，只在本卡 `verified_higher_condition_defence` 注解（沿用 R-105 / Plague Doctor III 模式）。**Q-104 关闭**。 速度及抗性以 R-215 为准，免疫裁定继续有效。
  3. **英雄技能图标语义**：直角箭头**指向左 = 作用给自己**、**指向右 = 作用给选中目标**（规则书 p20）；**弧形箭头 + 数字 = 射程**（1 = 相邻地块，2 = 隔一个地块，无数字 = 0，只能当前地块）；**红色爪痕上的数字 = 伤害**；Protection / Guard 见 p21。
  4. **扩展英雄 II/III 级技能（98 张）** 仍须逐卡核实范围/目标/状态注解；核实完成前不进入战斗目录（沿用 Q-158 / Phase 7 流程），不按图标顺序猜效果。
- **依据 / 出处**：Kyries 2026-11-08 口述 + `DD_EN_COREBOX_RULES.pdf` p20–21；R-048（不猜规则/数值/图标）；R-008（被覆盖）。
- **关联待确认**：无（Q-104 关闭）；98 张逐卡核实另见 `phase7-hero-expansion-verification-2026-11-08.md`。
- **状态**：已裁定
- **实现状态**：`warrens-hero-stat.ts` 增加 Antiquarian III；`hero-higher-defence.ts` 增加 `hero_stat:warrens:antiquarian:p002:front` 批准行与 `kyries_review_2026-11-08`；`normalized/corebox/hero_stat.json` 已重生成；`battle-data-plugin` 英雄属性计数 53→54。目录尚未切到 18 名 I–III。
- **边界**：不改全局图标词典；不猜未确认图标；不在本裁定内完成 98 张扩展高等级技能接线。

### Q-163（已关闭）

- **编号**：Q-163
- **日期**：2026-11-08
- **问题**：Leper **Revenge II/III** 卡面 stats 仅 Crit/Acc，效果行此前误读 `heal`（`20ffe98e2d`）前缀。除目标 Mark + Debuff 外，是否另有伤害或 Buff？
- **裁定**（Kyries 2026-11-08）：**没有伤害、没有其它 Buff**；效果 = 目标 Mark + Debuff（II 2t/2t，III 3t/3t）。行首误 `heal` 逐卡覆盖为 `{target_effects}`。stats 仅 Crit/Acc、无伤害数字：按 R-031，不造伤害；暴击仍走压力 −1（不另开 Q）。
- **依据 / 出处**：Warrens Leper p284/p285 印刷件；R-200；R-048。
- **状态**：Kyries 已确认（2026-11-08）

### Q-164（已关闭）

- **编号**：Q-164
- **日期**：2026-11-08
- **问题**：Leper **Intimidate II/III** 自身 Buff 是否真实？`{light}` 行是否另有光照效果？
- **裁定**（Kyries 2026-11-08）：**没有 Buff**；自身 = Mark（`d4329c2a97` 本卡覆盖为 mark；II 2t / III 1t）。印刷 Ignores 行 = `[折角箭头] Ignores [目标效果] [目标效果] , [Debuff] Nt`：**Ignores** 无视 **Protection + Guard**（两个目标效果标记）；**Debuff Nt** 为**另一目标效果**（II 2t / III 3t）。`9ffbd6087a` 词典误为 light（Kyries 目视 = 折角箭头）：**禁止** light / 光照 ±；签名闸保留提取键，结算段拆为三行（Ignores+Protection / Ignores+Guard / 目标 Debuff），**不**把行首箭头接入引擎。保留 stats 真实伤害。
- **依据 / 出处**：Warrens Leper p293/p294；R-200；R-048。
- **状态**：Kyries 已确认（2026-11-08）

### Q-165（已关闭）

- **编号**：Q-165
- **日期**：2026-11-08
- **问题**：Leper **Withstand II/III** 是否另有 Buff？
- **裁定**（Kyries 2026-11-08）：**没有额外 Buff**；自身 Protection（II 2t / III 3t）+ 自身 Mark（1t）。
- **依据 / 出处**：Warrens Leper p287/p288；R-200。
- **状态**：Kyries 已确认（2026-11-08）

### Q-166（已关闭）

- **编号**：Q-166
- **日期**：2026-11-08
- **问题**：Leper **Solemnity II/III** 是否仅自身 Heal + 压力 -1？
- **裁定**（Kyries 2026-11-08）：仅自身 Heal 9/12 + 压力 -1；**无 Buff、无 Shuffle**。`f18923574c` 本卡覆盖为 `{stress}`。
- **依据 / 出处**：Warrens Leper p290/p291；R-200；R-048。
- **状态**：Kyries 已确认（2026-11-08）

### Q-167（已关闭）

- **编号**：Q-167
- **日期**：2026-11-08
- **问题**：Antiquarian **Flashpowder II/III** 效果行误提 blight/bleed/`target_effects`。
- **裁定**（Kyries 2026-11-08）：II/III 均为目标 **眩晕 + Debuff**（II：Stun 1t + Debuff 2t；III：Stun 2t + Debuff 2t）。逐卡覆盖 icon key，不改全局词典。
- **状态**：Kyries 已确认（2026-11-08）

### Q-168（已关闭）

- **编号**：Q-168
- **日期**：2026-11-08
- **问题**：Antiquarian **Get Down!** 自身位移；III 含「Push 1 or Push 2」。
- **裁定**（Kyries 2026-11-08）：I/II **固定自身 Push 2**；III **Push 1 或 Push 2 自选**。引擎最小支持：`SkillCombatState.shufflePushDistance` + `readVerifiedStatusEffects` 消费「Push N or Push M」同行。
- **状态**：Kyries 已确认（2026-11-08）

### Q-169（目标增益补录见 R-209）

- **编号**：Q-169
- **日期**：2026-11-08
- **问题**：Fortifying Vapours 自身 `{stress} 3t` 误读。
- **裁定**（Kyries 2026-11-08）：I/II/III 均为 **自身 Heal + Buff**（I：Heal 1 + Buff 2t；II：Heal 2 + Buff 3t；III：Heal 4 + Buff 3t）。stats 目标治疗行保留；去掉误 stress 行。
- **状态**：Kyries 已确认（2026-11-08）

### Q-170（自身增益补录见 R-209）

- **编号**：Q-170
- **日期**：2026-11-08
- **问题**：Invigorating Vapours 头行混阵营图标。
- **裁定**（Kyries 2026-11-08）：头盔 = **队友**；本技能对 **1/2/3 名队友**施加 Buff **2/3/4t**（I/II/III）；无自身 Debuff 行。
- **状态**：Kyries 已确认（2026-11-08）

### Q-171（已关闭）

- **编号**：Q-171
- **日期**：2026-11-08
- **问题**：Protect Me 效果行图标误读。
- **裁定**（Kyries 2026-11-08）：目标 **守护（Guard）+ 防护（Protection）+ Mark**（II：3t/2t/2t；III：3t/3t/1t）。`9ffbd6087a` 本卡覆盖为 `guard`，不入光照。
- **状态**：Kyries 已确认（2026-11-08）

### Q-172（已关闭）

- **编号**：Q-172
- **日期**：2026-11-08
- **问题**：Punish 条件行「if Flagellant has …」如何结算。
- **裁定**（Kyries **真确认** 2026-11-08）：若苦修者**自身有流血或腐蚀**，攻击可**额外 +2 伤害**（`verified_actor_damage_bonus`，同行洗净为 `{damage}+NifFlagellanthas{bleed}{blight},`）。攻击行 stats 伤害照常；目标施加 **Bleed**（及印刷 Debuff），不是签收占位。
- **状态**：Kyries 真确认（2026-11-08）

### Q-173（转移有效，自身状态见 R-208）

- **编号**：Q-173
- **日期**：2026-11-08
- **问题**：Suffer「Transfer all … to the Flagellant」转移语义。
- **裁定**（Kyries **真确认** 2026-11-08）：选择**目标队友**，将其身上的**流血与腐蚀堆**转移到苦修者（`verified_bleed_blight_transfer`）；同时自身获得印刷 **Buff + Mark**（III 另接卡面 Bleed）。须在引擎结算转移并清空队友对应堆，不能只签收。
- **状态**：Kyries 真确认（2026-11-08）

### Q-174（治疗有效，Redeem 追加自身减益见 R-208）

- **编号**：Q-174
- **日期**：2026-11-08
- **问题**：Exsanguinate / Redeem 印刷误读。
- **裁定**（Kyries **真确认** 2026-11-08）：**Exsanguinate** I/II/III：目标 **Bleed 2/3/3**，持续 **3/3/4t**；自身 **Heal 3/5/7 + Debuff 1t**（去掉误 OCR 的 Stun/自身 Bleed）。**Redeem**：**无 Acc/Crit** 的友方治疗 + 同等自身治疗（`verified_target_heal` / `verified_self_heal`）。
- **状态**：Kyries 真确认（2026-11-08）

### Q-175（已关闭）

- **编号**：Q-175
- **日期**：2026-11-08
- **问题**：Endure 射程/命中与压力行。
- **裁定**（Kyries **真确认** 2026-11-08）：**自身与队友压力各 −1**（`verified_self_stress` + `verified_allies_stress`）。另有 stats：**临近一个队友**，I **射程 1** Acc **12** Crit **0**；II **射程 1–2** Acc **14** Crit **0**；III **射程 1–2** Acc **16** Crit **1**。不是「仅 Self 头行签收」。
- **状态**：Kyries 真确认（2026-11-08）

### Q-176（已关闭）

- **编号**：Q-176
- **日期**：2026-11-08
- **问题**：Man-at-Arms **Retribution** I–III 自身行 `9d58d3d431` 误读为 `{stress} 2t`，与 `1ce58a493c`（词典 **Mark**）并存。
- **裁定**（Kyries **真确认** 2026-11-08）：效果为**自身 Mark 2t + 反击（Riposte）**（I：2t；II/III：Riposte 3t，Mark 仍为 2t）。本卡将 `9d58d3d431` 覆盖为 `{mark}`、`1ce58a493c` 覆盖为 `{riposte}`，**拆行**并 `verified_status_effects` 接线；**非**压力行。
- **状态**：Kyries 真确认（2026-11-08）

### Q-177（I 级持续回合由 R-209 修订）

- **编号**：Q-177
- **日期**：2026-11-08
- **问题**：Man-at-Arms **Defender** I–III OCR：`a0290ad4ce`/`ac56561b87` 误为 Riposte + `{shuffle}`。
- **裁定**（Kyries **真确认** 2026-11-08）：效果为**自身守护（Guard）+ 保护（Protection）**（I：**2t / 3t**；II：**2t / 2t**；III：**2t / 3t** 以卡面为准）。拆行、本卡覆盖 icon key，**不改全局词典**。
- **状态**：Kyries 真确认（2026-11-08）

### Q-178（II 级自身增益由 R-209 修订）

- **编号**：Q-178
- **日期**：2026-11-08
- **问题**：Houndmaster **Hound's Rush** I–III 自身行 `{icon:1ff34c908b}`（直角箭头）语义。
- **裁定**（Kyries **真确认** 2026-11-08）：`1ff34c908b` = **对自身起效**标记（**非** `{range}`、**不**丢弃）。自身 **Buff** L1/L2 = **2t**、L3 = **3t**（Self + 蓝双箭头/mark 族；逐卡覆盖为 `{buff}`）。目标 **Bleed** 层数/时长 L1 **1·3t**、L2 **2·2t**、L3 **2·3t**。`1ff34c908b` 逐卡覆盖为 `{self_effects}` 保留于 Self 行首。
- **状态**：Kyries 真确认（2026-11-08）

### Q-179（已确认）

- **编号**：Q-179
- **日期**：2026-11-08
- **问题**：Houndmaster **Cry Havoc** I–III 首行 −1 与 stats 射程/队友头。
- **裁定**（Kyries **真确认** 2026-11-08）：首行 −1 **非**目标减益；为**队友减压**（`verified_allies_stress −1` + 压力签收行）。弧形箭头 = 射程；**射程 1** 后头盔数 = 可作用队友：**L1 2 人 / L2–III 3 人**。减压：**自身 1 / 1 / 2**、**队友各 1**（L1/L2/L3）。stats 补 `range 1` + 对应 `target_hero` 数量 + Acc；删掉 `target_effects` 误读。
- **状态**：Kyries 真确认（2026-11-08）

### Q-180（已确认）

- **编号**：Q-180
- **日期**：2026-11-08
- **问题**：Houndmaster **Blackjack** I–III `{icon:763ad8e857}`。
- **裁定**（Kyries **真确认** 2026-11-08）：`763ad8e857` = **Stun**（**非** Debuff）；目标 **Stun 1t**（III 亦 1t）。逐卡覆盖，不改全局词典。
- **状态**：Kyries 真确认（2026-11-08）

### Q-181（目标上限已由 R-207 修订）

- **编号**：Q-181
- **日期**：2026-11-08
- **问题**：Shieldbreaker **Impale** I–III stats 射程 1 后四枚 `{icon:7616568d52}`；extract/词典误作**头盔** `target_hero` 且按图标数当目标上限。
- **裁定**（Kyries **真确认** 2026-11-08）：印刷为四枚**红骷髅**（非头盔）；语义对照 `a396e95c00` 红骷髅 **target_monster** 路径（词典 v1.2 evidence）。**不按四图标数接目标上限**；本卡 stats 收成 **射程 1 + 一枚 target_monster**（Crowded 类读法，与 Bone Spearman Impale「Crowded」同类红骷髅族对照 `packages/data/normalized/corebox/monster_medium.json` Bone Spearman slot 2）。`7616568d52` **不**写入全局词典。证据：`packages/data/extract/extension/weald/raw/hero_skill.json` `hero_skill:p325`–`p327` front stats 行。
- **状态**：Kyries 真确认（2026-11-08）

### Q-182（已确认）

- **编号**：Q-182
- **日期**：2026-11-08
- **问题**：Shieldbreaker **Captivate** I–III「+N vs」条件与副效果。
- **裁定**（Kyries **真确认** 2026-11-08）：对**标记**目标额外伤害 **+2 / +4 / +4**（L1/L2/L3）；目标**腐蚀** **2 / 2 / 3** 层，**2 / 2 / 2** t。OCR 爪痕行拆为 `+N vs {mark}` + `{blight}`；**非** stunned。
- **状态**：Kyries 真确认（2026-11-08）

### Q-183（已确认）

- **编号**：Q-183
- **日期**：2026-11-08
- **问题**：Shieldbreaker **Puncture** I–III 效果行结构。
- **裁定**（Kyries **真确认** 2026-11-08）：`9ffbd6087a` 折角装饰不入结算。自身**退后 1**（Self **Pull 1**，印刷原文）；**Ignores Guard**；目标 **Pull 1**（同印刷 Pull 文案，非 Push）。
- **状态**：Kyries 真确认（2026-11-08）

### Q-184（已确认）

- **编号**：Q-184
- **日期**：2026-11-08
- **问题**：Shieldbreaker **Serpent Sway** I–III。
- **裁定**（Kyries **真确认** 2026-11-08）：**I/II** 仅自身：Protection **2t / 3t** + 退后 **Pull 1**（**非** Mark/shuffle 误接）。**III** 在自身同族效果外，**射程 1、1 名队友** **Protection 2t**（`stats` 头行 `target_hero`×1）。
- **状态**：Kyries 真确认（2026-11-08）

### Q-185（已确认）

- **编号**：Q-185
- **日期**：2026-11-08
- **问题**：Musketeer 与 Arbalest 七技能族是否同规则；**Smokescreen I** 误读 Mark+Protection vs Suppressive Fire Debuff 1t。
- **裁定**（Kyries 真确认 2026-11-08）：**Musketeer 与 Arbalest 技能完全一致**——仅图标与技能名称不同；**数值与效果全部相同**。Smokescreen 全等级（含 I）对齐 **Suppressive Fire** 对应等级（单一 **Debuff** 等）；Call the Shot 对齐 **Sniper's Mark**（**Mark**，非 Debuff）；余五族同对照表。`verified-musketeer-higher` + `musketeer-arbalest-parity.test.ts` 强制效果行与 `verified_*` 一致。
- **状态**：Kyries 已确认（2026-11-08）


### R-201

- **编号**：R-201
- **日期**：2026-11-08（Asia/Shanghai）
- **问题**：最终战自然存档验收是否只到首形态部署/开战、不含四形态连续胜利。
- **裁定**（Kyries 2026-11-08 确认；**测试范围**，不是游戏规则）：
  1. 自然链/存档自动化验收覆盖 p018 自然路径至**首形态部署与开战**，并对检查点做严格回放；
  2. **四形态连续胜利**不纳入自动化验收：Boss 输赢与战斗过程是玩家的决策，自动化只保证流程没有引擎拒绝/卡死/存档不一致（R-190）；
  3. 不为此调整自然策略、种子或数值；需要时另开「最终战多形态自然链」切片。
- **依据 / 出处**：R-190（不为绿灯调策略/种子）、Kyries 2026-11-07「Boss 输赢不是测试目标」、[phase5-final-battle-natural-save-2026-11-04.md](phase5-final-battle-natural-save-2026-11-04.md)。
- **关联待确认**：无（原 Q-xxx 关闭）。
- **状态**：已裁定
- **实现状态**：无代码改动；`final-battle-natural-save.test.ts` 保持首形态边界。

### R-202

- **编号**：R-202
- **日期**：2026-11-08（Asia/Shanghai）
- **问题**：Q-141 Eldritch Vault 多张 III 饰品的处置、压力与重复交互。
- **裁定**（Kyries 2026-11-08 确认，按卡文）：使用者在使用 Vault 时先承受**在场英雄数**的压力；每张抽出的 III 饰品逐张全部处置；**装备**该饰品再 +2 压力（只给装备者）；同一次房间交互可重复（每次花 2 行动）。
- **依据 / 出处**：卡文 `dd2d2467ec` / R-156；R-048。
- **关联待确认**：无（Q-141 关闭）。
- **状态**：已裁定
- **实现状态**：`battle-eldritch-vault.ts` 记录 `eldritchVaultStress`，在最后一张抽牌处理完后通过 `triggerBattlePassive` + `resolveBattlePressure` 结算；`battle-eldritch-vault.test.ts` 增加压力断言。

### R-203

- **编号**：R-203
- **日期**：2026-11-08（Asia/Shanghai）
- **问题**：Q-145 Teleporters 橙星区的压力触发范围。
- **裁定**（Kyries 2026-11-08 确认）：只统计英雄 `moveHero` 路径上的橙星区；含落点、不含起点；同一移动内同一橙星区重复经过逐次计；`shuffle` / `pull` / 怪物移动等非 `moveHero` 位移不触发。
- **依据 / 出处**：R-159；卡文 `df38279161`；规则书 R16–R18。
- **关联待确认**：无（Q-145 关闭）。
- **状态**：已裁定
- **实现状态**：`battle-teleporters.ts` 现有实现已符合，无代码改动；`battle-teleporters.test.ts` 覆盖。

### R-204

- **编号**：R-204
- **日期**：2026-11-08（Asia/Shanghai）
- **问题**：Q-154 Necromancer II「Army of the Dead」在“地牢首战就是 Boss 战”时，Bone Captain 是否加入、落位与先攻。
- **裁定**（Kyries 2026-11-08 确认）：Boss-first 时 Bone Captain **加入该场 Boss 战**；放在第一个可用的 2 格怪物姿态位（Boss 通常占 aggressive，因此落 defensive），区域使用已获批的 `monsterStanceAreas`；`startRound` 按存活实体自动多洗入 1 张怪物先攻卡；没有合法 2 格姿态位时拒绝部署（R-048）。
- **依据 / 出处**：R-036；`boss_ability:p005`；R-166（Necromancer Room 只印 Aggressive E）；R-048。
- **关联待确认**：无（Q-154 关闭）。
- **状态**：已裁定
- **实现状态**：`necromancer-ii-army.ts` 新增 `applyNecromancerIIArmyBattleStart`，在 `startBattle` 链中、`startRound` 前加入；`necromancer-ii-deploy.test.ts` 覆盖。

### R-205

- **编号**：R-205
- **日期**：2026-11-08（Asia/Shanghai）
- **问题**：Purify 任务补给池满 16 时丢弃哪些补给。
- **裁定**（Kyries 2026-11-08 确认）：任务补给（3 个药水）**不可丢弃**；加入后超过 16 时，由玩家从**既有补给**中选择要丢弃的道具（逐个选择），直到池回到 16；不再按池尾自动丢弃。
- **依据 / 出处**：R-197；QUEST p10；R-041 的 16 上限。
- **关联待确认**：无。
- **状态**：已裁定
- **实现状态**：`dungeon-starting-provisions.ts` 新增 `dungeon-provision-discard:` 待选与 `chooseProvisionDiscard`；`quest-p010-purify.test.ts` 覆盖；`quest-provisions.ts` 改为返回溢出信息。

### R-206

- **日期**：2026-11-10（Asia/Shanghai）
- **问题**：十八英雄技能卡的姿态与目录转录不一致。
- **裁定**：按 Kyries 交回的《十八英雄技能逐卡审校 距离与目标核对稿》所需位置列和对应印刷卡面逐卡修正。堕落者的形态限制仍依卡面及规则书第 38 页。火枪手按 Q-185 与弩手对应技能的同等级姿态一致。
- **依据**：核心规则书第 19 页；核心盒 SKILLS FRONT 第 211–231 页；The Darkest Heroes SKILLS FRONT 第 232–357 页；核心盒弩手 SKILLS FRONT 第 148–168 页。
- **实现**：在规范化层按卡号修正已复核的姿态行。沿用已确认的姿态图标，原始提取和全局词典保持原样（R-048）。

### R-207

- **日期**：2026-11-10（Asia/Shanghai）
- **问题**：部分英雄技能的目标头与射程区间在规范化后丢失或误读。
- **裁定**：按交回的技能核对稿修正。Target Whistle I–III 射程 0–2；Lick Wounds I–III 的目标为 Self。Bellow、Hound’s Harry、Impale 各级同一区域内最多选 4 名敌人，Impale 此项取代 Q-181 的单目标上限。Beast’s Bile、Suppressive Fire、Sniper’s Mark、Blindfire、Battlefield Bandage I 保留卡面射程区间；火枪手对应技能按 Q-185 与弩手同步。
- **依据**：核心规则书第 19 页、R-022、R-048；核心盒 SKILLS FRONT 第 151、154、160、163、214 页；The Darkest Heroes SKILLS FRONT 第 238–240、325–327、340–345、352–354 页。

### R-208

- **日期**：2026-11-10（Asia/Shanghai）
- **裁定**：按 Kyries 交回的英雄技能核对稿，Rain of Sorrows I–III 在苦修者有流血或腐蚀时分别 +2/+3/+4 伤害，复用 Q-172 的条件。Reclaim I/II 自身流血 1、持续 3 回合。Redeem I–III 在双方治疗之外，自身减益 1 回合。Suffer I–III 保留 Q-173 的转移，自身标记分别持续 2/2/1 回合、增益分别持续 2/3/4 回合。
- **依据**：交回核对稿苦修者表；The Darkest Heroes SKILLS FRONT 第 256–258、262–267、271–273 页；R-048、Q-172～Q-174。

### R-209

- **日期**：2026-11-10（Asia/Shanghai）
- **裁定**：按 Kyries 交回的英雄技能核对稿修正下列状态与伤害。Festering Vapours I–III 施加腐蚀 2/2/3、持续 2/3/3 回合，再施加减益 1/2/2 回合。Fortifying Vapours 对目标施加增益 2/3/3 回合。Invigorating Vapours 保留 Q-170 的队友效果，自身增益 2/2/3 回合。Defender I 为守护 1 回合、防护 2 回合。Command I–III 对自身及目标均施加增益 2/2/3 回合。Hound’s Rush II 自身增益 3 回合。Adder’s Kiss I–III 施加腐蚀 2、持续 2/3/3 回合。Captivate 的命中与暴击数值按伤害结算。
- **依据**：交回核对稿古物学家、持盾步兵、训犬师、破盾者表；The Darkest Heroes SKILLS FRONT 第 241、247–249、298–300、307–312、322–324、331–333、338 页；R-048、Q-169、Q-170、Q-177、Q-178、Q-182。

### R-210

- **日期**：2026-11-10（Asia/Shanghai）
- **裁定**：补齐麻风病人 I 级已核对的效果。Purge 自身增益 2 回合；Revenge 目标标记 2 回合、减益 1 回合；Withstand 为 Self，自身防护与标记各 2 回合；Solemnity 为 Self，自身治疗 6、压力 −1。Intimidate I 与 II/III 的自身图标均为标记（2/2/1 回合），I 级同 Q-164 无视防护和守护，目标减益 1 回合。
- **依据**：交回核对稿与 The Darkest Heroes SKILLS FRONT 第 280、282、283、286、289、292–294 页；R-048、Q-164～Q-166。Intimidate 自身列的「增益」与印刷红色准星及 Q-164 冲突，采用已核实的标记。Purge III 暴击格写「治疗 19」，印刷为红色伤害 19。

### R-211

- **日期**：2026-11-10（Asia/Shanghai）
- **裁定**：补齐核对稿已列明的 I 级效果。小丑 Dirk Stab 自身 Pull 1 且无视守护，Harvest 目标流血 2 持续 2 回合，Solo 自身增益 2 回合和 Pull 2、目标眩晕 1 回合，Battle Ballad 可选最多 2 名英雄且对自身与目标施加增益 2 回合，Slice Off 目标流血 3 持续 1 回合。弩手 Sniper Shot 对标记目标伤害 +3，Suppressive Fire 目标减益 1 回合，Sniper’s Mark 目标标记 2 回合，Battlefield Bandage 自身增益 2 回合。火枪手对应技能按 Q-185 对齐。
- **依据**：交回核对稿小丑与弩手表、核心盒 SKILLS FRONT 第 106、109、115、118、124、148、151、154、163 页；R-048、Q-185。
- **交回稿冲突处理**：火枪手 Aimed Shot、Buckshot 的橙格文字按 Q-185 取同级弩手 Sniper Shot、Bola 的条件伤害和位移，保留火枪手自己的名称与图标。

### R-212

- **日期**：2026-11-10（Asia/Shanghai）
- **裁定**：堕落者 I 级和 II/III 一样按印刷面限定人形或兽形。Manacles I 施加眩晕 1 回合，Beast’s Bile I 施加腐蚀 2 持续 2 回合，Absolution I 为 Self。Rake、Rage、Slam I 级保留核对稿列明的自身压力 +1，以及各自的状态与位移。Transform I 转为兽形时自身增益 2 回合、治疗 4、压力 +2，存活队友压力 +2。反面转为人形时自身减益 3 回合、压力 −1，存活队友压力 −1。
- **依据**：交回核对稿堕落者表、核心盒 SKILLS FRONT 第 211、214、217、220、223、226、229 页和 SKILLS BACK 第 220 页；核心规则书第 19–21、38 页；R-048。

### R-213

- **日期**：2026-11-10（Asia/Shanghai）
- **裁定**：Bolster、Endure、Cry Havoc 的右侧箭头对应选中的英雄目标。按头行限制选目标并按印刷 Acc 结算，命中或暴击才给相应目标压力 −1。自身压力行独立结算，落空也适用。Q-175、Q-179 的目标数、射程、自身减压值继续有效。
- **依据**：交回核对稿；The Darkest Heroes SKILLS FRONT 第 250–252、268–270、346–348 页；核心规则书第 19–20 页、R-200、Q-175、Q-179。


### R-214

- **编号**：R-214
- **日期**：2026-11-10
- **裁定**：按 Kyries 交回的怪物技能选招与目标数量核对稿更新下列卡号。技能号按印刷标签，区间两端均含。大型仍按所占两格中优先级较高的姿态读（R-015）。
  - M p016 Bone Bearer：进攻固定 2；防御 1–4 → 2、5–7 → 1、8–10 → 3；远程和支援 1–6 → 1、7–10 → 3。修订 R-142 选招。
  - M p027 Brigand Fusilier：进攻固定 2；防御、远程和支援固定 1。
  - M p063 Ascended Brawler：进攻和防御固定 1；远程和支援固定 2。补正 R-143 的卡面字段。
  - M p104 White Cell Stalk：四姿态 1–3 → 1、4–7 → 2、8–10 → 3。
  - ADD_014 p1 Perfect Reflection、p3 Imperfect Reflection：两张补印卡各自记录四姿态 1–5 → 1、6–10 → 2。
  - L p3 Ghoul：进攻和防御 1–4 → 1、5–7 → 2、8–10 → 3；远程和支援 1–5 → 2、6–10 → 3。修订 R-083 的姿态分组。
  - L p14 Templar Warlord：进攻和防御 1–5 → 1、6–10 → 3；远程和支援 1–2 → 1、3–4 → 3、5–10 → 2。
  - L p15 Templar Impaler：进攻、防御和远程 1–2 → 1、3–4 → 3、5–10 → 2；支援 1–5 → 1、6–10 → 3。两张 Templar 选招表取代 R-181 的共用表。
- **依据**：交回的怪物技能选招与目标数量核对稿、上述印刷页、R-001、R-015、R-048。
- **逐卡复核**：核对稿的单目标 ×1、复数目标、Self、Special 和 Heart of Darkness 三招 0–10 射程与既有数据一致。Ascended Witch 的 Fate’s Pull 按 R-140 结算，Adder 的 Molt 按 R-198／Q-163 结算。
- **边界**：仅修正印刷选招字段。Boss 特殊行动继续走对应专用入口（R-190、R-201）。

### R-215

- **编号**：R-215
- **日期**：2026-11-10
- **裁定**：按 Kyries 交回的英雄属性卡抗性、免疫与速度核对稿逐面同步。速度等于卡面移动栏的蓝底鞋印数量。Antiquarian I／II／III 为 **2／2／2**，Flagellant 为 **2／3／3**，Man-at-Arms 为 **1／1／2**。取代 R-104、R-105、R-200 对这些速度的旧值。
- **抗性／免疫**（未单列免疫即该面无免疫）：
  - Antiquarian I 位移，II 眩晕、位移，III 眩晕。III 免疫位移、疾病，沿用 Q-104。
  - Arbalest I 位移。Jester II 减益、流血，III 减益、流血、腐蚀。
  - Flagellant I 流血，II 位移、流血，III 眩晕、位移、流血。
  - Man-at-Arms I 位移，II 位移、流血，III 眩晕、位移、流血。
  - Houndmaster II 眩晕、流血，III 眩晕、流血、腐蚀。
  - Leper I **减益**（Kyries 明确更正 R-104 的眩晕），II 位移、减益，III 眩晕、位移、减益。
  - Musketeer I 位移，II 眩晕、位移，III 眩晕且免疫位移。
  - Shieldbreaker II 眩晕、位移，III 眩晕且免疫位移。
- **依据**：交回的属性卡核对稿及 Leper I 人工更正。COREBOX Hero STAT 正 p12／p15、背 p11。The Darkest Heroes 正 p28–31、背 p28／p30。Cove 正 p1–4、背 p1／p3。Weald 正 p2／p4、背 p1／p3。Musketeer 正 p1／p2、背 p1。R-001、R-048。
- **实现**：按卡号、等级、正背面与核准日期写入逐卡字段。旧提取图标与印刷版不一致的行采用人工核准的防御值。战斗沿用状态抗性、位移抗性、位移免疫和疾病免疫的既有结算。

### R-216

- **编号**：R-216
- **日期**：2026-11-10
- **裁定**：Fundraiser I（QUEST FRONT p3）每清理一间巢穴获得 10 金币。至少清理一间后可向继承人捐献任意不超过共享余额的整数金币。每交 20 金币得 1 XP，英雄和驿站仍各封顶 3 XP，随回村发放。旧裁定的 60 金限制修订为只限制 XP 的换算，R-068 的最低目标与提前离开继续适用。
- **依据**：Kyries 核准的任务与探索逐项核对稿、QUEST FRONT p3、核心规则书第 29 页、R-001、R-038、R-068。

### R-217

- **编号**：R-217
- **日期**：2026-11-10
- **裁定**：最终战 Ancestor 首形态主体放进攻。开场部署 2 只 Perfect Reflection、1 只 Imperfect Reflection，在防御、远程、支援三个空姿态随机落位。两只 Perfect 等价，用一次种子 RNG 等概率确定 Imperfect 的姿态。开场合计 4 张怪物先攻牌。
- **依据**：Kyries 核准的任务与探索逐项核对稿、核心规则书第 40 页、R-001、R-186。最终战存档验收范围沿用 R-201。

### R-218

- **编号**：R-218
- **日期**：2026-11-10
- **裁定**：以核对稿与核心规则书第 39–41 页的先攻配置执行。最暗中段三个遭遇的本体各每轮行动 2 次。Ancestor 首形态每轮共 4 张怪物先攻，Reflection 阵亡或替补时不增减，已有行动的 Reflection 不再行动，余下怪物先攻由 Ancestor 承担。Ancestor 第二形态和 Heart of Darkness 各 2 张先攻、2 次行动。三只 Absolute Nothingness 各占一个区域容量，无先攻与行动。Gestating Heart 本体 1 次行动，Dispersion 成功召唤后立即洗入 1 张怪物先攻，召唤物当轮即可行动。
- **依据**：Kyries 核准的任务与探索逐项核对稿、核心规则书第 39–41 页、R-001、R-034、R-217。Ancestor 首形态的固定四张为 R-034 的专属例外。
- **验收**：R-201 的范围不扩。原 p018 种子 3279 与策略在新规则下止于中段 Boss 战全灭，验收该真实停止点可严格回放。最终战部署与行动次数由机制夹具独立核对（R-190）。
