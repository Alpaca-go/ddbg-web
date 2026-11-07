# 任务 SPECIAL 核对稿（Q-160）

状态：待 Kyries 确认。三张任务卡的印刷文本已入库（`quest_cards.json`），SPECIAL 运行时未接；确认前任务可出征但不结算 SPECIAL。

来源：`DD_EN_COREBOX_CARDS_70_120_quests_FRONT.pdf`（p4 / p5 / p10）。

## 1. Rising Threat（`quest:p005`，I 级，p5）

卡文（已入库）：

> Curio Rooms always have Battles. When spawning Monsters in Curio Rooms, draw 1 Level 2 Monster.

现状：`rising_threat_distribution.json` 只有房间代币分布；没有运行时。

待确认：

1. 「Curio Rooms always have Battles」是否等价于现有 Curio 守卫战路径，还是需要单独的强制战斗标记？
2. 「draw 1 Level 2 Monster」是否在 I 级任务中从 **II 级怪物池** 抽 1 只加入该场战斗（不是 II 级任务池）？
3. 该效果与 Curio 交互结算的先后顺序（先抽怪开战，还是先结算 Curio 再战斗）。

## 2. Purify the Fountains（`quest:p010`，II 级，p10）

卡文（已入库）：

> Objective Rooms are {icon:700c7def3e} 3. Add 3 {icon:dd2d2467ec} to your starting Provisions if possible.
> When in an Objective Room, the Healing Fountain does not function unless a Hero spends 2 actions and 1 {icon:dd2d2467ec} when there to purify it.
> Objective Rooms are cleared only if the Healing Fountain has been purified. Set aside the room {icon:700c7def3e} 3 at the start of the quest; you will not use it in other meetings.

现状：`purify_the_fountains_distribution.json`；**`dd2d2467ec` 在 `icon-dictionary-v1.8` 里 meaning 为空、status 未核实**，不能命名成圣水。

待确认：

1. `dd2d2467ec` 是否就是通用补给里的圣水 / `potion`（若是，需先按 R-048 补词典确认）。
2. 起始补给「+3 个该道具」在补给池满 16 时如何处理（是否受 R-041 上限）。
3. 净化耗「2 行动 + 1 道具」是否复用现有交互/行动计数；治疗泉净化前后分别如何生效。
4. 目标房「set aside」是否只需要现有目标房代币语义，还是另有 physical set-aside 要求。

## 3. Dem Bones（`quest:p004`，I 级，p4）

卡文（已入库）：

> Objective Rooms are {icon:700c7def3e} 7. A Hero must spend 2 actions in the {icon:0fd119772a} Area to recover the bones.
> Set aside the room {icon:700c7def3e} 7 at the start of the quest; you will not use it in other meetings.
> Objective Rooms are cleared only if the bones have been collected.

现状：`dem_bones_distribution.json`；`0fd119772a` 已确认是「Area marker (green)」；绿区/目标标记几何仍按交接停点，未接运行时。

待确认：

1. 目标房板块上**绿区**对应的区域编号（需要几何审核，当前没有逐面标注）。
2. 「2 行动取骨」的行动计数与清理顺序（取骨前目标房不算清理）。
3. 取骨是否需要每名英雄、还是任一名英雄；取骨后是否移除标记/代币。
4. 目标房 set aside 的物理语义是否与 Purify 相同。

## 交付方式

- 三项都先只补「SPECIAL 运行时 + 任务卡清理判定 + 摘要」；不动 `usable` / `combatReady` / 任务白名单。
- 依赖项：`dd2d2467ec` 词典确认（Purify）、绿区几何（Dem Bones）、Curio 强制战斗标记（Rising Threat）。
