# 任务 SPECIAL 核对稿（Q-160）

状态：**部分确认（Kyries 2026-11-07）**——Rising Threat 三项已确认；Purify 待 `dd2d2467ec` 命名确认与旁置语义澄清；Dem Bones 待旁置语义确认。

来源：`DD_EN_COREBOX_CARDS_70_120_quests_FRONT.pdf`（p4 / p5 / p10）。

## 图标 `dd2d2467ec` 的识别（Purify）

**结论：是 Potion（药水补给）的图标，不是圣水。**

证据：

- 词典 `icon-dictionary-v1.8.json`：`group: "potion"`、`status: unreviewed`、`meaning` 为空；全卡池只出现 2 次，且只在任务卡（Purify）上。
- 词典里已确认的 `7c568783f1` 是「Potion (provision, player aid heading)」**补给辅助卡标题图**，不是逐项图标。
- 本作补给面只有 **Food / Bandage / Potion / Torch / Tool / Wild**（规格书 §5.2、I-31–I-33），**没有 Holy Water**；Purify 的「Add 3 {icon} to starting Provisions」与「spend 1 {icon} to purify」只能是 Potion。

待 Kyries 确认命名后，把 `dd2d2467ec` 标为 Potion（provision）并接任务补给与净化消耗。

## 1. Rising Threat（`quest:p005`，I 级，p5）

卡文（已入库）：

> Curio Rooms always have Battles. When spawning Monsters in Curio Rooms, draw 1 Level 2 Monster.

**已确认（2026-11-07）**：① 等价现有 Curio 守卫战路径；② 是，抽 **1 只 II 级怪**；③ **先抽怪开战，再结算 Curio**。

## 2. Purify the Fountains（`quest:p010`，II 级，p10）

卡文（已入库）：

> Objective Rooms are {icon:700c7def3e} 3. Add 3 {icon:dd2d2467ec} to your starting Provisions if possible.
> When in an Objective Room, the Healing Fountain does not function unless a Hero spends 2 actions and 1 {icon:dd2d2467ec} when there to purify it.
> Objective Rooms are cleared only if the Healing Fountain has been purified. Set aside the room {icon:700c7def3e} 3 at the start of the quest; you will not use it in other meetings.

**已确认（2026-11-07）**：

- ② 补给池满时**仍先拿 3 个任务道具**，再丢弃超出上限的部分；这 3 个是**初始携带、不可丢弃**的任务补给，否则目标房无法净化。
- ③ 净化复用现有行动计数/交互。
- ④ 旁置：**需要**（现有 `room:p003` 旁置实现已按此处理）。

**待确认**：① `dd2d2467ec` 命名为 Potion（见上）。

## 3. Dem Bones（`quest:p004`，I 级，p4）

卡文（已入库）：

> Objective Rooms are {icon:700c7def3e} 7. A Hero must spend 2 actions in the {icon:0fd119772a} Area to recover the bones.
> Set aside the room {icon:700c7def3e} 7 at the start of the quest; you will not use it in other meetings.
> Objective Rooms are cleared only if the bones have been collected.

**已确认（2026-11-07）**：

- ① 目标房 room 7 = `DD_COREBOX_TILES_FRONT.pdf` **p4**；绿星在**第二行第一格**——按现有 `room_tile:p004:front` 几何对应 **A4**（容量 3，防御/支援的怪物起始格）；A4 目前还登记着 `Ancestor's Glory` 特殊区域，需要确认绿区是否就是 A4、是否与它共存。
- ② **2 行动**、任意顺序。
- ③ **任意英雄**均可取骨；**所有骨头取完再移除**。

**待确认**：④ room 7 旁置是否与 Purify 同语义：开局移出、不进入其它遭遇、只在目标房使用（现有 `basic-quests.ts` 的 `setAsideRoomCardId: "room:p007"` 已按此实现）。

## 交付方式

- 三项都只补「SPECIAL 运行时 + 目标房清理判定 + 摘要」；不动 `usable` / `combatReady` / 任务白名单。
- 依赖项：`dd2d2467ec` 命名（Purify）、room 7 旁置语义（Dem Bones）、Curio 守卫战接线（Rising Threat）。
