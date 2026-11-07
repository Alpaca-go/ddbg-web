# 任务 SPECIAL 核对稿（Q-160）

状态：**已确认（Kyries 2026-11-07）→ R-197**；三项 SPECIAL 的运行时语义与 `dd2d2467ec` 图标身份均已定案，运行时待实现。

来源：`DD_EN_COREBOX_CARDS_70_120_quests_FRONT.pdf`（p4 / p5 / p10）。

## 图标 `dd2d2467ec` = Potion（药水补给）

证据：

- 词典 `icon-dictionary-v1.8.json`：`group: "potion"`、`status: unreviewed`、`meaning` 为空；全卡池只出现 2 次，且只在任务卡（Purify）上。
- 词典里已确认的 `7c568783f1` 是「Potion (provision, player aid heading)」**补给辅助卡标题图**，不是逐项图标。
- 本作补给面只有 **Food / Bandage / Potion / Torch / Tool / Wild**（规格书 §5.2、I-31–I-33），**没有 Holy Water**；Purify 的「Add 3 {icon}」「spend 1 {icon}」只能是 **Potion**。

**已确认（R-197）**：`dd2d2467ec` = Potion（药水补给）。

## 1. Rising Threat（`quest:p005`，I 级，p5）

卡文（已入库）：

> Curio Rooms always have Battles. When spawning Monsters in Curio Rooms, draw 1 Level 2 Monster.

**已确认（R-197）**：① 等价现有 Curio 守卫战路径；② 是，抽 **1 只 II 级怪**；③ **先抽怪开战，再结算 Curio**。

## 2. Purify the Fountains（`quest:p010`，II 级，p10）

卡文（已入库）：

> Objective Rooms are {icon:700c7def3e} 3. Add 3 {icon:dd2d2467ec} to your starting Provisions if possible.
> When in an Objective Room, the Healing Fountain does not function unless a Hero spends 2 actions and 1 {icon:dd2d2467ec} when there to purify it.
> Objective Rooms are cleared only if the Healing Fountain has been purified. Set aside the room {icon:700c7def3e} 3 at the start of the quest; you will not use it in other meetings.

**已确认（R-197）**：

- 开局携带 **3 个不可丢弃的任务药水**（Potion）；补给池满时**仍先拿 3 个**，再丢弃超出上限的部分。
- 净化 = **2 行动 + 1 药水**，复用现有行动计数/交互。
- 目标房旁置 `room:p003`（需要）。

## 3. Dem Bones（`quest:p004`，I 级，p4）

卡文（已入库）：

> Objective Rooms are {icon:700c7def3e} 7. A Hero must spend 2 actions in the {icon:0fd119772a} Area to recover the bones.
> Set aside the room {icon:700c7def3e} 7 at the start of the quest; you will not use it in other meetings.
> Objective Rooms are cleared only if the bones have been collected.

**绿区 = A4，与 Ancestor's Glory 同区**：

- room 7 = **Tomb of Ancestor**（`room:p007`），对应板块 `room_tile:p004:front`（TILES FRONT p4，R-065 已批）。
- 该板块的绿星就在 **A4**（容量 3；防御/支援的怪物起始格）。A4 同时是房间卡 Tomb of Ancestor 的 **Ancestor's Glory** 区域：卡文「Heroes standing here are immune to Blight, Bleed, Debuff, Stun, Mark and target Shuffle. Remove any of these Conditions if already applied.」——2026-10-14 已按 R-065 接线为 A4 的站立效果（`specialRegions`，`runtimeReady: true`）。
- 所以 A4 同时承载「绿区（取骨）」与「Ancestor's Glory」是**同一格的两条规则**，并非登记错误；Dem Bones 运行时按 A4 取骨，Ancestor's Glory 继续按战斗内站立效果结算。

**已确认（R-197）**：① 绿区 = A4（第二行第一格，容量 3）；② **2 行动、任意顺序**；③ **任意英雄**均可取骨，**骨头取完再移除**；④ room 7 旁置与 Purify 同语义（`room:p007`）。

## 交付方式

- 三项只补「SPECIAL 运行时 + 目标房清理判定 + 摘要」；不动 `usable` / `combatReady` / 任务白名单。
- 依赖项：Curio 守卫战接线（Rising Threat）、任务药水补给与净化消耗（Purify）、A4 取骨判定（Dem Bones）。
