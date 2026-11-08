# Stygian 17 张房间卡：逐卡审核表（待 Kyries 确认）

日期：2026-11-08
状态：**只做审核表，未实现**（R-048：未确认图标/数值不接线）。

## 0. 现状与架构

- 规则：R-036 / 规格书 §16.1——Stygian 用 17 张房间卡替换同名的 Ruins 1–9 与最暗地牢 1–8 非 Boss 房间；Boss 房间不替换。
- 数据：`packages/data/normalized/corebox/stygian_rooms.json` 已有 17 张卡的 `printedLines`、`replacesCardId`；**没有结构化效果**。
- 现有普通房间效果是按 **Room Tile 几何标志**（`endTurnHeal`、`endTurnStress`、`occupy` 等）实现的，不是按房间卡。Stygian 要生效，需要先加一层「按房间卡覆盖房间效果」的机制（下表确认后再做）。
- 大量效果图标在词典里仍是 `unreviewed`，必须先确认含义，不能按上下文猜。

## 1. 需要先确认的图标（全部当前 unreviewed）

| iconId       | 出现位置                                                                                  | 我的建议读数（仅建议）    |
| ------------ | ----------------------------------------------------------------------------------------- | ------------------------- |
| `60cf8ac696` | p001 Cornered：`suffer [icon] +2`                                                         | 压力 +2                   |
| `1125a4cdad` | p003 Healing Waters：`[icon] 3 /Hero Level`                                               | 治疗 3/Hero Level         |
| `10365b3e0f` | p004 Circle of Power：`[icon] 4 /Dungeon Level`；p010 Pool：`[icon] 3 per Negative Quirk` | 伤害                      |
| `84c99c6920` | p004 Spiked Pit：`suffer 1 [icon] 3t`                                                     | 流血 3t（或枯萎，待确认） |
| `d4c2a095b5` | p002 Unholy Aura：`1 [icon] /Hero Level`；p017 Rite：`5 [icon] /Negative Quirk`           | 压力                      |
| `f50b9f6892` | p016 Evil Gaze：`take a Negative Quirk and a [icon]`                                      | 压力？还是某个状态？      |
| `038ffa17fb` | p013 Toxic Vapors：`suffer 1 [icon] 3t`                                                   | 枯萎 3t（或流血，待确认） |
| `02014aa709` | p015 Teleporters：`through a [icon] Area`                                                 | 橙星/传送区域标记         |
| `ddc367e513` | p004 Spiked Pit：`Heroes that are [icon] or standing here`                                | “被移入/被推入”           |
| `06c13f0a05` | p006 Loot the Chest：`suffer [icon] +1`                                                   | 压力 +1                   |
| `5c3630560e` | p006 Hide and Heal：`remove all [icon]`                                                   | 所有状态/条件             |
| `4a64ee7321` | p002 Torture Chamber 头部 `!` 旁                                                          | 未知标记（危险？陷阱？）  |

已确认、可直接用的：`1e36d5379b`/`abf095b29d` = 压力，`731f6665d0` = 治疗，`0453c84dbc` = 伤害，`9e1f2c572e` = 红区标记，`337897984c` = 绿区标记。

## 2. 逐卡对照

> “标准”= 同一 `replacesCardId` 的普通房间效果；“Stygian”= 本次要实现的差异。数值按卡面文字抄录。

### p001 Ritual Chamber（替换 room:p001）

- 标准：Cornered，英雄在此结束回合 **压力 +1**。
- Stygian：Cornered，英雄在此结束回合 **压力 +2**（`60cf8ac696`）。
- 待确认：只有数值 +1→+2。

### p002 Torture Chamber（替换 room:p002）

- 标准：Unholy Aura，此区域英雄 **不能治疗/被治疗**。
- Stygian：同上，且英雄在此结束回合 **1 压力 / Hero Level**（`d4c2a095b5`）；头部 `4a64ee7321` 标记待确认。
- 待确认：`d4c2a095b5` 是否压力；`4a64ee7321` 是什么。

### p003 Healing Fountain（替换 room:p003）

- 标准：Healing Waters，英雄在此结束回合 **治疗 3**。
- Stygian：**治疗 3 / Hero Level**（`1125a4cdad`），且 **压力 +1**。
- 待确认：`1125a4cdad`=治疗；数值按 Hero Level。

### p004 Spiked Pit（替换 room:p004）

- 标准：A Circle of Power：怪物在此结束回合 **4 伤害**（文本 `4 .`）；B Spiked Pit：在此/进入的英雄与怪物 **3 伤害 + 1 状态 3t**。
- Stygian：A **4 伤害 / Dungeon Level**（`10365b3e0f`）；B **只列英雄**（“Heroes that are [ddc367e513] or standing here”）承受 **3 伤害 + 1 状态 3t**（`84c99c6920`）。
- 待确认：① `10365b3e0f`=伤害？② `84c99c6920`=流血还是枯萎？③ B 是否真的只作用英雄（标准文本有 Monsters，Stygian 文本没有）？④ `ddc367e513` 是否“被移入”。

### p005 Beacon of Light（替换 room:p005）

- 标准：Stressful Darkness，英雄在此结束回合 **压力 +1**；Beacon，英雄在此结束回合 **回复 1 压力**。
- Stygian：Stressful Darkness **压力 +2**；Beacon **回复 1 压力**；文本写“These corridors are too dark”，但核心盒没有走廊。
- 待确认：① 压力 +2；② “corridors”是否只是卡面措辞、实际作用于本房间区域？

### p006 Treasure Chamber（替换 room:p006）

- 标准：A Loot the Chest：花 2 行动抽 1 饰品，每场一次；B Hide and Heal：无怪物时花 1 行动、压力 +2，移除所有状态。
- Stygian：A 花 2 行动并 **压力 +1**（`06c13f0a05`）抽饰品，每场一次；B 无怪物时花 1 行动、**压力 +3**，移除所有状态（`5c3630560e`）。
- 待确认：两个图标含义；B 的 +3 是否压力。

### p007 Tomb of Ancestor（替换 room:p007）

- 标准：Ancestor’s Glory，英雄在此 **免疫** 流血/枯萎/眩晕/减益/位移，并移除已应用的这些状态。
- Stygian：英雄在此结束回合 **移除所有** 流血/枯萎/眩晕/减益/位移（不再给免疫）。
- 待确认：五个状态图标是否就是标准房那五种；是“结束回合移除”而非“持续免疫”。

### p008 Invocation Chamber（替换 room:p008）

- 标准：The Invokers：每轮最后一只怪物改为朝指定区域移动；Invoking Abyss：轮末此区有怪物 → 4 名英雄各 **压力 +2**。
- Stygian：The Invokers 同上；Invoking Abyss：轮末此区有怪物 → 4 名英雄各 **压力 +4**。
- 待确认：只有 +2→+4。

### p009 Old Abbey（替换 room:p009）

- 标准：Feeling the Presence，英雄在此结束回合 **压力 +1 / 每个负面怪癖**，**治疗 1 / Hero Level / 每个正面怪癖**。
- Stygian：**压力 +2 / 每个负面怪癖**，治疗 1 / Hero Level / 每个正面怪癖（`60cf8ac696` + `731f6665d0`）。
- 待确认：只有负面怪癖压力 +1→+2。

### p010 Pool of Rebirth（替换 room:p014）

- 标准：英雄在此结束回合 **压力 +1 且 3 伤害 / 每个负面怪癖**；清房后可各压力 +4 复活一名死亡英雄到驿站。
- Stygian：**压力 +2 且 3 伤害 / 每个负面怪癖**；特殊复活不变。
- 待确认：`10365b3e0f`=伤害；复活部分是否完全照标准。

### p011 Hall of Ascension（替换 room:p015）

- 标准：花 2 行动、**压力 +3**，立即升级自己或一个技能。
- Stygian：花 2 行动、**压力 +5**（`1e36d5379b`），立即升级。
- 待确认：只有 +3→+5。

### p012 Eldritch Vault（替换 room:p016）

- 标准：花 2 行动，按在场英雄数各抽 1 张 L3 饰品；装备再 +2 压力。
- Stygian：同上，但**使用房间时承受 = 在场英雄数的压力**，装备再 +2（与 R-202 一致）。
- 待确认：无新图标；按 R-202 实现即可。

### p013 Toxic Chamber（替换 room:p017）

- 标准：Toxic Vapors，站立此区英雄 **Acc −3**。
- Stygian：Acc −3；且在此结束回合 **1 [038ffa17fb] 3t**。
- 待确认：`038ffa17fb` 是枯萎还是流血。

### p014 Eldritch Power Chamber（替换 room:p018）

- 标准：怪物需要进入射程时朝指定区域移动；怪物在该区结束回合 → 英雄各 **5 伤害**。
- Stygian：同上，但 **10 伤害**（`0453c84dbc`）。
- 待确认：只有 5→10；绿区标记 `337897984c` 对应哪个区域。

### p015 Teleporters（替换 room:p019）

- 标准：角色可在橙星区之间移动/攻击；英雄穿过橙星区 **压力 +1**。
- Stygian：同样穿梭；英雄穿过该区 **压力 +2**（`abf095b29d` 确认）。
- 待确认：只有 +1→+2；`02014aa709` 是否橙星标记。

### p016 Evil Eye（替换 room:p020）

- 标准：A Evil Gaze：英雄在此结束回合获得 1 个负面怪癖；花 2 行动摧毁眼 → 正面怪癖 + 全体英雄 **−5**（压力？）。B Staring Eyes：英雄在此结束回合 **压力 +2**。
- Stygian：A 额外 `take a Negative Quirk and a [f50b9f6892]`；摧毁眼仍给正面怪癖 + 全体 −5；B **压力 +3**。
- 待确认：① `f50b9f6892` 是什么；② “−5” 是压力还是别的；③ B +2→+3。

### p017 Temple of the Chosen（替换 room:p021）

- 标准：怪物在此结束回合 → 所有怪物 **治疗 5**，英雄 **压力 +1**，另 **+1 / 负面怪癖**。
- Stygian：所有怪物 **治疗 5**，英雄 **压力 +2**，另 **5 压力 / 负面怪癖**（`d4c2a095b5`）。
- 待确认：① 怪物治疗 5 是否不变；② 负面怪癖惩罚从 +1 变成 +5；③ `d4c2a095b5`=压力。

## 3. 实施计划（确认后）

1. 加“房间卡覆盖”机制：`roomTileBattleAreas` / 房间效果投影接受当前 `roomCardId`，Stygian 卡覆盖对应标准卡的标志与数值。
2. 按上表逐张实现 17 个效果；新增数值常量集中在 `stygian-rooms.ts`（或同目录），不在运行时散落。
3. 测试：每张卡至少一条效果测试；`room_tile_geometry` 的 `usable` 仍按现有 Boss/普通规则，不因 Stygian 改变。
4. 启用 UI 的 Stygian 房间替换（目前 UI 警告“房间效果未接，暂用标准房间”）。
5. 修复 `manual-room-tile-survey` 的过时记录（不提交）。

## 4. 需要 Kyries 回答

1. 上表 12 个 `unreviewed` 图标分别是什么（尤其 `84c99c6920` / `038ffa17fb` 是流血还是枯萎，`f50b9f6892` 是什么，`ddc367e513` 是否“被移入”）。
2. p004 Spiked Pit 的 B 是否真的只作用英雄（标准房也作用怪物）。
3. p005 “corridors”是否只是措辞（核心盒无走廊）。
4. p016 Evil Eye 的“−5”和 `f50b9f6892` 是什么。
5. 其余“只有数值变化”的卡（p001/p008/p009/p011/p014/p015/p017 等）是否按上表直接实现。
