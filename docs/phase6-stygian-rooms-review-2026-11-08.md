# Stygian 17 张房间卡：逐卡审核表（待 Kyries 确认）

日期：2026-11-08
状态：**只做审核表，未实现**（R-048：未确认图标/数值不接线）。

2026-11-10 补记。以下卡面读数已与印刷页复核。p02 和 p10 的红字确认已记录为 R-227。卡面数值与图标读法和实际对局的接入状态分别记录。

## 0. 现状与架构

- 规则：R-036 / 规格书 §16.1——Stygian 用 17 张房间卡替换同名的 Ruins 1–9 与最暗地牢 1–8 非 Boss 房间；Boss 房间不替换。
- 数据：`packages/data/normalized/corebox/stygian_rooms.json` 保留 17 张卡的 `printedLines` 和 `replacesCardId`，p02 和 p10 另有 R-227 的结构化效果。
- 现有普通房间效果是按 **Room Tile 几何标志**（`endTurnHeal`、`endTurnStress`、`occupy` 等）实现的，不是按房间卡。Stygian 要生效，需要先加一层「按房间卡覆盖房间效果」的机制（下表确认后再做）。
- 下表的图标读法仅适用于所列印刷位置。全局词典状态另行维护。

## 1. 印刷图标逐卡读法

| iconId       | 出现位置                                                                                  | 卡面读法                           |
| ------------ | ----------------------------------------------------------------------------------------- | ---------------------------------- |
| `60cf8ac696` | p001 Cornered：`suffer [icon] +2`                                                         | 压力 +2                            |
| `1125a4cdad` | p003 Healing Waters：`[icon] 3 /Hero Level`                                               | 治疗 3/Hero Level                  |
| `10365b3e0f` | p004 Circle of Power：`[icon] 4 /Dungeon Level`；p010 Pool：`[icon] 3 per Negative Quirk` | 治疗                               |
| `84c99c6920` | p004 Spiked Pit：`suffer 1 [icon] 3t`                                                     | 流血 1，持续 3t                    |
| `d4c2a095b5` | p002 Unholy Aura：`1 [icon] /Hero Level`；p017 Rite：`5 [icon] /Negative Quirk`           | 黑底红心，伤口                     |
| `f50b9f6892` | p016 Evil Gaze：`take a Negative Quirk and a [icon]`                                      | 疾病                               |
| `038ffa17fb` | p013 Toxic Vapors：`suffer 1 [icon] 3t`                                                   | 枯萎 1，持续 3t                    |
| `02014aa709` | p015 Teleporters：`through a [icon] Area`                                                 | 红橙星区标记                       |
| `ddc367e513` | p004 Spiked Pit：`Heroes that are [icon] or standing here`                                | 蓝双箭头，位移                     |
| `06c13f0a05` | p006 Loot the Chest：`suffer [icon] +1`                                                   | 压力 +1                            |
| `5c3630560e` | p006 Hide and Heal：`remove all [icon]`                                                   | 伤口                               |
| `4a64ee7321` | p002 Torture Chamber 地图上部                                                             | 标准版同位置也印有，效果文字未引用 |

在本批房间卡上，`1e36d5379b` 与 `abf095b29d` 为压力，`731f6665d0` 为治疗，`0453c84dbc` 为伤害。区域星标颜色以对应页为准，p014 和 p015 文中的 `337897984c` 印为红橙色。

## 2. 逐卡对照

> “标准”= 同一 `replacesCardId` 的普通房间效果；“Stygian”= 本次要实现的差异。数值按卡面文字抄录。

### p001 Ritual Chamber（替换 room:p001）

- 标准：Cornered，英雄在此结束回合 **压力 +1**。
- Stygian：Cornered，英雄在此结束回合 **压力 +2**（`60cf8ac696`）。

### p002 Torture Chamber（替换 room:p002）

- 标准：Unholy Aura，此区域英雄 **不能治疗/被治疗**。
- Stygian：同样禁止治疗，英雄在此结束回合另承受 **1 × 英雄等级个伤口**（R-227）。地图标记 `4a64ee7321` 的机制待核。

### p003 Healing Fountain（替换 room:p003）

- 标准：Healing Waters，英雄在此结束回合 **治疗 3**。
- Stygian：**治疗 3 / Hero Level**（`1125a4cdad`），且 **压力 +1**。

### p004 Spiked Pit（替换 room:p004）

- 标准：A 区的怪物在此结束回合时治疗 4。B 区的英雄和怪物被位移到此或在此结束回合时，承受 3 伤害及流血 1、持续 3t。
- Stygian：A 区治疗 **4 × 地牢等级**。B 区只列英雄，伤害和流血数值与标准相同。

### p005 Beacon of Light（替换 room:p005）

- 标准：Stressful Darkness，英雄在此结束回合 **压力 +1**；Beacon，英雄在此结束回合 **回复 1 压力**。
- Stygian：Stressful Darkness **压力 +2**；Beacon **回复 1 压力**；文本写“These corridors are too dark”，但核心盒没有走廊。
- 触发句指英雄在对应星标区域结束回合。

### p006 Treasure Chamber（替换 room:p006）

- 标准：A 花 2 行动抽 1 张饰品，每场一次。B 无怪物时花 1 行动、压力 +2，移除全部伤口。
- Stygian：A 额外支付压力 +1。B 压力提高至 +3，仍移除全部伤口。

### p007 Tomb of Ancestor（替换 room:p007）

- 标准：区内英雄免疫枯萎、流血、减益、眩晕、标记和位移，移除已施加的相关状态。
- Stygian：英雄在此结束回合时移除枯萎、流血、减益、眩晕及标记。卡面列的是结束回合移除。

### p008 Invocation Chamber（替换 room:p008）

- 标准：The Invokers：每轮最后一只怪物改为朝指定区域移动；Invoking Abyss：轮末此区有怪物 → 4 名英雄各 **压力 +2**。
- Stygian：The Invokers 同上；Invoking Abyss：轮末此区有怪物 → 4 名英雄各 **压力 +4**。

### p009 Old Abbey（替换 room:p009）

- 标准：Feeling the Presence，英雄在此结束回合 **压力 +1 / 每个负面怪癖**，**治疗 1 / Hero Level / 每个正面怪癖**。
- Stygian：**压力 +2 / 每个负面怪癖**，治疗 1 / Hero Level / 每个正面怪癖（`60cf8ac696` + `731f6665d0`）。

### p010 Pool of Rebirth（替换 room:p014）

- 标准：英雄在此结束回合，每个负面怪癖对应压力 +1 和治疗 3（R-146）。
- Stygian：每个负面怪癖对应 **压力 +2 和治疗 3**（R-227）。两版卡面都写明清场后可各承受压力 +4，复活一名已死亡英雄并放入驿站。

### p011 Hall of Ascension（替换 room:p015）

- 标准：花 2 行动、**压力 +3**，立即升级自己或一个技能。
- Stygian：花 2 行动、**压力 +5**（`1e36d5379b`），立即升级。

### p012 Eldritch Vault（替换 room:p016）

- 标准：花 2 行动，按在场英雄数各抽 1 张 L3 饰品；装备再 +2 压力。
- Stygian：同上，但**使用房间时承受 = 在场英雄数的压力**，装备再 +2（与 R-202 一致）。
- 使用者的额外压力成本与标准房的项目裁定 R-202 一致。

### p013 Toxic Chamber（替换 room:p017）

- 标准：Toxic Vapors，站立此区英雄 **Acc −3**。
- Stygian：Acc −3，在此结束回合时额外承受**枯萎 1，持续 3t**。

### p014 Eldritch Power Chamber（替换 room:p018）

- 标准：怪物需要进入射程时朝指定区域移动；怪物在该区结束回合 → 英雄各 **5 伤害**。
- Stygian：同上，但 **10 伤害**（`0453c84dbc`）。
- 红橙星在右上圆阵区，对应标准房间 C 区（R-158）。

### p015 Teleporters（替换 room:p019）

- 标准：角色可在橙星区之间移动/攻击；英雄穿过橙星区 **压力 +1**。
- Stygian：同样穿梭；英雄穿过该区 **压力 +2**（`abf095b29d` 确认）。
- `02014aa709` 为红橙区标记。穿越判定在标准房的项目口径见 R-203。

### p016 Evil Eye（替换 room:p020）

- 标准：A 区结束回合获得一个负面怪癖。花 2 行动摧毁眼睛，执行者得正面怪癖，全体英雄压力 −5。B 区结束回合压力 +2。
- Stygian：A 区结束回合额外获得一个疾病，B 区压力提高至 +3。怪癖与疾病的先后和中断边界待裁定。

### p017 Temple of the Chosen（替换 room:p021）

- 标准：怪物在此结束回合 → 所有怪物 **治疗 5**，英雄 **压力 +1**，另 **+1 / 负面怪癖**。
- Stygian：所有怪物各治疗 5。每名英雄压力 +2，并按负面怪癖计额外承受 **5 个伤口**。

## 3. 实施计划（确认后）

1. 加“房间卡覆盖”机制：`roomTileBattleAreas` / 房间效果投影接受当前 `roomCardId`，Stygian 卡覆盖对应标准卡的标志与数值。
2. 按上表逐张实现 17 个效果；新增数值常量集中在 `stygian-rooms.ts`（或同目录），不在运行时散落。
3. 测试：每张卡至少一条效果测试；`room_tile_geometry` 的 `usable` 仍按现有 Boss/普通规则，不因 Stygian 改变。
4. 启用 UI 的 Stygian 房间替换（目前 UI 警告“房间效果未接，暂用标准房间”）。
5. 修复 `manual-room-tile-survey` 的过时记录（不提交）。

## 4. 需要 Kyries 回答

1. p02 地图标记 `4a64ee7321` 的机制，以有说明的图例或板块资料为准。
2. p16 Evil Eye 同时获得怪癖和疾病时，如何排序及处理死亡等中断。
