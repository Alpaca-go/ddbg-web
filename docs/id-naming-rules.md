# ID 命名规范 v1.1（已确认 2026-11-22）

> **必读**：新增或修改 `packages/data` 的 raw / normalized / engine ID 前先读本文件。
> 本文件只定义 ID 形状、包段、编号和引用；规则数值与效果仍以
> [rulings.md](./rulings.md) 和规格书为准（R-001 / R-048）。
>
> **执行原则**：新内容一律按本规范命名；旧 ID 按 §8 分批迁移。迁移完成前，
> 不得新增旧形式 ID。违反本规范的 PR 不合入。

## 1. 总语法

```text
房间族    <category>:<location>:NN        // room / room_tile / stygian_room
其他核心  <category>:pNNN[:face]
其他分包  <category>:<pack>:pNNN[:face]
英雄      <category>:<pack>:hNN:pNNN[:face]   // 18 名全部可选，pack 只用于归类
```

- `<category>`：小写 snake_case，与 normalized 文件名一致。
- `<location>`：`ruins` / `darkest` / `weald` / `cove`。核心盒 `location` 字段的
  `darkestDungeon` 在 ID 里写 `darkest`。
- `<pack>`：
  - 其他类别：内容包 `weald` / `cove` / `warrens`（未来扩展先登记）；`musketeer`
    不是内容包，不出现在其他类别里。
  - 英雄：`HERO_PACKS` 的 `core` / `cove` / `warrens` / `weald` / `musketeer`，
    **只用于归类，不用于可用性筛选**。
- `hNN`：英雄编号 `h01`–`h18`，顺序固定，见 §4.2。
- `NN`：两位房间号（`01`–`99`），必须等于 `number` 字段。
- `pNNN`：三位页索引。其他类别的 `pNNN` = `source.page`；英雄的 `pNNN` =
  全英雄目录索引，见 §4。
- `:face`：只有同一张卡的正反面会被分别引用时才写（`hero_stat`、部分 `monster_large`）；
  房间族和 `hero_skill` 不写。
- 一个实体只有一个 canonical ID，不设别名。存档、命令日志、交叉引用只写 canonical ID。

**一眼判断**：

1. 是 `room` / `room_tile` / `stygian_room`？是 → 房间族 v2，见 §2。
2. 是 `hero_stat` / `hero_skill`？是 → 加英雄归类包 + `hNN`，见 §4；英雄始终全部可选。
3. 是扩展自己的卡？是 → 加内容包段。
4. 正反面会不会被分别引用？会 → 加 `:face`；不会 → 不加。
5. 房间族用 `NN = number`；其他类别用 `pNNN = source.page`；英雄用 `pNNN` 目录索引。
6. 交叉引用和存档只写 canonical ID，不写 rawId 或别名。

## 2. 房间族（v2）：按房间号命名

### 2.1 形状

```text
room:<location>:NN
room_tile:<location>:NN
stygian_room:<location>:NN
```

- 房间、板块、Stygian 替换房共享同一个 `NN`。
- `NN` 是**房间号**，不是页码；印刷页写在 `source.page`。
- 不写 `:face`：一个房间号只对应一张板块面；`source.face` 继续记录印刷面。

### 2.2 对照示例

| 内容                          | 旧 ID（v1）                                     | v2 canonical                               |
| ----------------------------- | ----------------------------------------------- | ------------------------------------------ |
| 遗迹 1 号 Ritual Chamber      | `room:p001` / `room_tile:p001`                  | `room:ruins:01` / `room_tile:ruins:01`     |
| 遗迹 3 号 Healing Fountain    | `room:p003` / `room_tile:p002:front`            | `room:ruins:03` / `room_tile:ruins:03`     |
| 最暗 1 号 Pool of Rebirth     | `room:p014` / `room_tile:p009:front`            | `room:darkest:01` / `room_tile:darkest:01` |
| 最暗 12 号 Ancestor Room      | `room:p025` / `room_tile:p014:back`             | `room:darkest:12` / `room_tile:darkest:12` |
| Weald 6 号 Chase in the Woods | `room:weald:p006` / `room_tile:weald:p003:back` | `room:weald:06` / `room_tile:weald:06`     |
| Weald 10 号 Hag（Boss）       | `room:weald:p010` / `room_tile:weald:p005:back` | `room:weald:10` / `room_tile:weald:10`     |
| Weald 6 号 Stygian            | `stygian_room:weald:p006`                       | `stygian_room:weald:06`                    |
| Cove 10 号 Siren（Boss）      | `room:cove:p010`                                | `room:cove:10`                             |

### 2.3 地点段

- 核心盒：`ruins`（遗迹 1–13）、`darkest`（最暗 1–12）。
- 扩展：`weald`（1–12）、`cove`（1–12）；`warrens` 未来有房间时同样用 `NN`。
- 一个内容包如果包含多个地点，房间族用**地点**段，不用包段；包段只用于 §3 的其他类别。
- 核心盒 `room.json` 的 `location` 仍是 `ruins` / `darkestDungeon`；ID 段写
  `ruins` / `darkest`，两者由 schema 映射。

### 2.4 约束

- `room.number === room_tile.number === NN`。
- `room_tile.roomId === room:<location>:NN`。
- `stygian_room.replacesCardId === room:<location>:NN`。
- `source.page` 记录实际印刷页。板块按面记录 `source.file` 和 `source.face`，
  房间卡和 Stygian 替换卡用 `source.front`、`source.back` 记录同一张卡的双面来源。
- Boss 房和普通房同形：`room:<location>:NN`，`boss: true`；不另造 `boss_room` 类别。
- `room_tile` 不再有 `:front` / `:back`；旧 ID 迁移见 §8。

### 2.5 不把房间名写进 ID

`name` 继续作为字段。理由：

- 名称是展示数据，勘误 / 本地化 / 译名变化不应改 ID。
- 名称含空格、撇号、破折号，需要 slug 规则，容易再产生第二套规范。
- 房间号已经唯一、可读。需要 URL 或显示短名时，另加可选 `slug`，不改 canonical ID。

## 3. 其他类别：沿用页码

| 类别                                                       | 核心包                | 分包                        | 分包时加包段     | 说明                                        |
| ---------------------------------------------------------- | --------------------- | --------------------------- | ---------------- | ------------------------------------------- |
| `quest`                                                    | `quest:pNNN`          | `quest:weald:pNNN`          | 是               | `pNNN` = 任务卡页                           |
| `quest_map`                                                | `quest_map:pNNN`      | `quest_map:weald:pNNN`      | 是（未来）       | 当前只有核心                                |
| `monster_medium`                                           | `monster_medium:pNNN` | `monster_medium:weald:pNNN` | 是               | `pNNN` = 首次印刷页；`pages` 记录全部副本页 |
| `monster_large`                                            | `monster_large:pNNN`  | `monster_large:weald:pNNN`  | 是               | 同上                                        |
| `boss_ability`                                             | `boss_ability:pNNN`   | `boss_ability:weald:pNNN`   | 是               | `pNNN` = Boss Abilities 页                  |
| `curio`                                                    | `curio:pNNN`          | `curio:weald:pNNN`          | 是               |                                             |
| `trinket`                                                  | `trinket:pNNN`        | `trinket:weald:pNNN`        | 是（未来）       | 当前只有核心                                |
| `disease` / `quirk` / `virtue_affliction` / `hamlet_event` | `<category>:pNNN`     | `<category>:weald:pNNN`     | 只有分包内容才加 | 目前这些类别只有核心                        |
| `punchboard`                                               | `punchboard:pNNN`     | `punchboard:weald:pNNN`     | 是               | 目前只有 raw                                |
| `monster-deck`                                             | `monster-deck:pNNN`   | `monster-deck:weald:pNNN`   | 是               | 局内实例，跟随卡牌所属包                    |
| 其他局内实例                                               | 由卡牌展开            | 同左                        | 跟随卡牌         | 不单独造 ID 空间                            |

**非内容包的来源集**（`ADD_014`）：`ADD_014` 是核心盒的补印文件
`00_ADD_014_CORE/..._ADD.pdf`，只有两张 III 级 Reflection（Perfect / Imperfect，
R-214），不是扩展包。它的 p001/p003 与核心怪物页冲突，所以保留
`monster_medium:ADD_014:pNNN`，并在 `SOURCE_SETS` 登记，`cardContentPack` 映射 `core`。
以后新增补印先登记来源集，再使用；不要把它当内容包。

## 4. 英雄：18 名全部可选，ID 保留归类信息

英雄是跨包共享目录，但 ID 保留 pack + 英雄编号，方便归类和塞入包内。
**pack 只用于归类，不用于可用性筛选**：所有 18 名正式英雄始终可选，
不按开局勾选的内容包过滤。

### 4.1 形状

```text
hero_stat:<pack>:hNN:pNNN:face
hero_skill:<pack>:hNN:pNNN
```

- `<pack>`：`HERO_PACKS` 的 `core` / `cove` / `warrens` / `weald` / `musketeer`。
  与 `CONTENT_PACK_IDS` 分开；`musketeer` 是英雄归类包，不是内容包。
- `hNN`：英雄编号 `h01`–`h18`，顺序固定，见 §4.2。
- `pNNN`：全英雄目录页索引。STAT 为 1–37，SKILL 为 1–378；前 17 名按
  TDH 合计页顺序，Musketeer 追加在末尾。
- `:face`：`hero_stat` 才写；`hero_skill` 一个 ID 覆盖正反面。
- `source` 必填：`{ file, page }` 记录实际印刷 PDF 和物理页。
  `pNNN` 与 `source.page` 可以不同：Musketeer 和部分扩展英雄的自身 PDF 从 1 开始；
  以 `source` 为准。
- `hero` 字段写英雄名（`HOUNDMASTER` 等）。Abomination 的变身卡 `hero` 可为 null，
  但 `hNN` 仍是 `h11`。
- `rawId` 可以保留来源集写法（如 `hero_stat:weald:houndmaster:p001`），
  它只表示“从哪张印刷卡提取”，**不得用于游戏逻辑、交叉引用或存档**。
  每个 rawId 必须能唯一映射到一个 canonical ID，由测试校验。

### 4.2 英雄编号与页段

顺序固定为：Crusader → Hellion → Bounty Hunter → Highwayman → Vestal → Jester →
Plague Doctor → Arbalest → Grave Robber → Occultist → Abomination → Man-at-Arms →
Flagellant → Leper → Antiquarian → Shieldbreaker → Houndmaster → Musketeer。

| hNN | 英雄          | pack      | STAT 页段                   | SKILL 页段    |
| --- | ------------- | --------- | --------------------------- | ------------- |
| h01 | Crusader      | core      | `p001`–`p002`               | `p001`–`p021` |
| h02 | Hellion       | core      | `p003`–`p004`               | `p022`–`p042` |
| h03 | Bounty Hunter | core      | `p005`–`p006`               | `p043`–`p063` |
| h04 | Highwayman    | core      | `p007`–`p008`               | `p064`–`p084` |
| h05 | Vestal        | core      | `p009`–`p010`               | `p085`–`p105` |
| h06 | Jester        | core      | `p011`–`p012`               | `p106`–`p126` |
| h07 | Plague Doctor | core      | `p013`–`p014`               | `p127`–`p147` |
| h08 | Arbalest      | core      | `p015`–`p016`               | `p148`–`p168` |
| h09 | Grave Robber  | core      | `p017`–`p018`               | `p169`–`p189` |
| h10 | Occultist     | core      | `p019`–`p020`               | `p190`–`p210` |
| h11 | Abomination   | core      | `p021`–`p023`（三张 front） | `p211`–`p231` |
| h12 | Man-at-Arms   | cove      | `p024`–`p025`               | `p232`–`p252` |
| h13 | Flagellant    | cove      | `p026`–`p027`               | `p253`–`p273` |
| h14 | Leper         | warrens   | `p028`–`p029`               | `p274`–`p294` |
| h15 | Antiquarian   | warrens   | `p030`–`p031`               | `p295`–`p315` |
| h16 | Shieldbreaker | weald     | `p032`–`p033`               | `p316`–`p336` |
| h17 | Houndmaster   | weald     | `p034`–`p035`               | `p337`–`p357` |
| h18 | Musketeer     | musketeer | `p036`–`p037`               | `p358`–`p378` |

STAT 每个英雄两页对应三张卡：`pNNN:front` = I 级，`pNNN:back` = II 级，
`p(NNN+1):front` = III 级。Abomination 是例外：三张都是 `front`，页段 `p021`–`p023`。

### 4.3 页索引与 source

- `h01`–`h11`：全局 STAT 页 1–23，与核心盒 STAT PDF 页号相同；source 可以继续用
  核心盒 PDF，`pNNN` 不变。
- `h12`–`h17`：全局 STAT 页 24–35，按 TDH 顺序；它们自己的 PDF 页可能是 1–4，
  `source.page` 记录实际页，`pNNN` 是全局索引。
- `h18`：STAT 追加 `p036`–`p037`，SKILL 追加 `p358`–`p378`；
  source 为 Musketeer PDF，STAT 物理页 1–2，SKILL 物理页 1–21。
- 前 17 名的 SKILL 页段已经是 1–357，按上表保持；只有 Musketeer 从
  `hero_skill:musketeer:p001`–`p021` 改为 `p358`–`p378`。

前 17 名的目录页序以 The Darkest Heroes（TDH）合计目录为基准。当前单卡的实际印刷来源如下。

| 英雄编号    | STAT 来源 | SKILL 来源 |
| ----------- | --------- | ---------- |
| `h01`–`h11` | 核心盒    | 核心盒     |
| `h12`–`h13` | Cove      | TDH        |
| `h14`–`h15` | TDH       | TDH        |
| `h16`–`h17` | Weald     | TDH        |
| `h18`       | Musketeer | Musketeer  |

聚合目录的 `sources.raw` 列出核心盒及 Warrens、Cove、Weald、Musketeer 的提取文件。
SKILL 的 `sources.parsed` 也列出这五份来源，STAT 的 `sources.parsed` 为 `null`。
每张卡的 `source.file` 和 `source.page` 记录实际使用的印刷文件与页。

### 4.4 可用性

- 所有 18 名正式英雄**始终可选**；不按 `core` / `cove` / `warrens` / `weald` /
  `musketeer` 勾选过滤。
- `cardContentPack` 对英雄仍返回 `core`；`pack` 段是归类元数据。
- 不要用英雄 ID 的 pack 段做内容包筛选；需要按包归类时，读 `hero` / `HERO_PACKS`。

### 4.5 示例

```text
hero_stat:core:h01:p001:front       // Crusader I
hero_stat:cove:h12:p024:front       // Man-at-Arms I
hero_stat:weald:h17:p034:back       // Houndmaster II
hero_stat:musketeer:h18:p036:front  // Musketeer I
hero_skill:core:h01:p001            // Smite I
hero_skill:weald:h17:p337           // Hound's Rush I
hero_skill:musketeer:h18:p358       // Aimed Shot I
```

### 4.6 英雄注解层（annotations）

`packages/data/src/core/heroes/annotations/` 的逐卡审校数据也只用 canonical ID：

- 文件固定为 `hNN-<hero>.ts`，每个文件只导出一个 `hNN` 模块
  （`id: "hNN"`、`hero`、`entries`、`fixes`）。没有逐卡修正的模块写 `fixes: null`。
- `entries` 里的 `status` / `range` / `damage` / `shuffle` / `ignores` 等表，
  以及 `fixes` 中每条记录的 `id`，全部写 `hero_skill:<pack>:hNN:pNNN`。
- **禁止**在注解层新写 `hero_skill:pNNN` 或 `hero_skill:musketeer:pNNN`
  这类旧形式；读取旧形式只允许出现在存档兼容代码里。
- 需要页码时读 `card.pages[0]` 或用 `printedPageOf(canonicalId)`，
  不要从 ID 末尾 `slice(-3)` 猜（Musketeer 的目录页是 358–378，本地页是 1–21）。
- 文件内不再单独导出数据表；索引由 `index.ts` 从各模块的 `entries` 泛型聚合。

## 5. `NN` / `pNNN` / `number` 对照

- **房间族**：`NN` = 房间号；`source.page` = 印刷页；`number` = `NN`。
  例：`room:darkest:01` 的 `number` 是 1，`source.page` 是 14；
  `room_tile:darkest:01` 的 `source.page` 是 9，`source.face` 是 `front`。
- **其他类别**：`pNNN` = 印刷页；`number` = 该地点/该套内的印刷编号。
  如果卡面编号与页不同，以 `number` 字段为准，ID 仍用页。
- **英雄**：`hNN` = 固定英雄编号；`pNNN` = 全英雄目录页索引；`source.page` = 物理页。
  `pNNN` 与 `source.page` 可以不同（Musketeer、部分扩展英雄），以 `source` 为准。
- **禁止**从 `number` 反推 `pNNN`，也禁止从 `pNNN` 反推 `number`。
  核心遗迹与最暗地牢、Weald 普通与 Boss、英雄 STAT 与 SKILL 的页/号关系都不同。

## 6. 交叉引用与存档

- `room_tile.roomId`、`stygian_room.replacesCardId`、`quest.setAsideRoomCardId(s)`、
  `questId`、`cardId`、`abilityCardId`、`tileId` 等全部写 canonical ID。
- 每个 `roomId` 必须能解析到一张房间卡。Boss 房也必须如此：
  扩展 Boss 房统一为 `room:<location>:NN`，放在 `room.json` 并标 `boss: true`；
  印刷来源记录在房间的 `source` 中。
- 存档 / 命令日志只写 canonical ID。ID 改名必须同时提供：
  1. 旧 ID → 新 ID 的读取兼容（至少一个发布周期）；
  2. 或明确的存档版本迁移；不能静默回退。
- 核心盒从 v1 迁到 v2 需要版本化迁移；Weald / Cove 未发布，可直接换 ID。

## 7. 校验规则

### 7.1 Schema

> 下面的正则只是形状示例；`location` / `pack` 列表应从已登记 registry 生成，
> 新增地点或内容包时只改 registry，不在各个 schema 里逐个补字符串。

- 房间族：
  - `^room:(?:ruins|darkest|weald|cove):\d{2}$`
  - `^room_tile:(?:ruins|darkest|weald|cove):\d{2}$`
  - `^stygian_room:(?:ruins|darkest|weald|cove):\d{2}$`
- 其他类别：
  - `^quest:(?:(?:weald|cove|warrens):)?p\d{3}$`
  - `^monster_medium:(?:(?:weald|cove|warrens):)?p\d{3}$`
  - `^curio:(?:(?:weald|cove|warrens):)?p\d{3}$`
- 英雄：
  - `^hero_stat:(?:core|cove|warrens|weald|musketeer):h\d{2}:p\d{3}:(?:front|back)$`
  - `^hero_skill:(?:core|cove|warrens|weald|musketeer):h\d{2}:p\d{3}$`
- 其他类别的 `<pack>` 必须是已登记内容包；英雄的 `<pack>` 必须是 `HERO_PACKS`。
  核心文件不得出现其他类别的包段（英雄 ID 是明确例外）。
- 房间族：`NN === number`；`room_tile.roomId === room:<location>:NN`；
  `stygian_room.replacesCardId === room:<location>:NN`。
- 非英雄：`source.page` 必填；`pNNN === source.page`（房间族除外，见上）。
- 英雄：`source` 必填；`hNN` 必须是 §4.2 的固定编号；`pack` 必须与英雄归属一致；
  `pNNN` 必须落在该英雄的 STAT / SKILL 页段内；`id` 与 `rawId` 通过映射表校验；
  `hero` 必须在正式英雄目录内。
- 英雄可用性：`pack` 段只用于归类；所有正式英雄始终可选，不按内容包过滤。
- `roomId` / `replacesCardId` / `setAsideRoomCardId(s)` 必须解析到已登记卡。

### 7.2 测试

- **全局唯一性**：按正式实体目录合并 `id`，同一 ID 重复定义即失败。派生牌池的引用可重复使用正式战斗卡 ID。
- **房间族闭环**：每个 `room` 都有唯一 `room_tile`（有板块的盒），
  `NN`、`number`、`roomId`、`source.page` 互相一致。
- **包段一致**：Weald 文件里只能出现 `weald` 包段；核心文件的其他类别不得出现包段
  （英雄 ID 是明确例外，按 `HERO_PACKS` 校验）。
- **页码一致**：非房间族 `pNNN === source.page`；英雄按 §4.2 页段。
- **英雄闭环**：18 个 `hNN` 顺序固定、不重号；每个 `hero_skill.hero` 都能在
  `hero_stat.name` 找到；每个正式英雄至少有一张 STAT 和一套技能；
  `pack` 与英雄归属一致；英雄可用性不读 `pack`。
- **任务一致**：`basicQuests` 的 `name` / `level` / `restPoints` 与
  `quest_cards.json` / `higher_quests.json` 一致，Boss 通用任务的印刷等级与战役等级分别记录。
- **引用闭环**：所有 `roomId`、`setAsideRoomCardId(s)`、`replacesCardId` 都能解析。

## 8. 迁移

### 8.1 当前状态

- 核心、Weald、Cove 的现行房间目录采用 v2。核心房间族由 `424c187b` 迁移。
- 英雄 STAT 与 SKILL 已采用 v1.1，分别见 `d11fd8af` 与 `91b4bc6a`。
- v1 存档读入口识别迁移前核心房间族和英雄 STAT／SKILL ID，转换起点、日志及快照后严格回放。重存沿用 v1 格式并只写 canonical ID。历史目录中的 `verified_*` 字段按已核规则路径校验，规则结果或其他快照字段不符时拒绝。以下条目保留迁移批次范围。

### 8.2 Weald / Cove

- Weald：12 间房 + 12 张板块 + 9 张 Stygian，改为 `room:weald:01`–`12` /
  `room_tile:weald:01`–`12` / `stygian_room:weald:01`–`09`。
- Cove：12 间房改为 `room:cove:01`–`12`；Boss 房同时从 `boss_room_sources.json`
  迁入 `room.json`。
- 迁移时同步 `roomId`、`replacesCardId`、`setAsideRoomCardId(s)`、引擎常量、测试。
- 迁移后 `room_tile:weald:p006:back` 之类的页号/重号全部消失。

### 8.3 核心盒

- 遗迹 1–13：`room:ruins:01`–`13` / `room_tile:ruins:01`–`13`；
  Stygian `stygian_room:ruins:01`–`09`。
- 最暗 1–12：`room:darkest:01`–`12` / `room_tile:darkest:01`–`12`；
  Stygian `stygian_room:darkest:01`–`08`。
- 旧 `room:pNNN` / `room_tile:pNNN[:face]` / `stygian_room:pNNN` 写入迁移别名；
  读取旧存档和旧命令日志时映射到 v2，新写入只用 v2。
- 核心 4 个缺 `:front` 的旧 ID 一并消失，不需要单独补。

### 8.4 英雄

- 建立 `HERO_PACKS`：`core` / `cove` / `warrens` / `weald` / `musketeer`；
  与 `CONTENT_PACK_IDS` 分开，英雄可用性不读它。
- `hero_stat`：18 名全部改为 `<pack>:hNN:pNNN:face`。
  h01–h11 的 `pNNN` 维持 1–23；h12–h18 改为全局 `p024`–`p037`。
- `hero_skill`：18 名全部改为 `<pack>:hNN:pNNN`。
  h01–h17 的 `pNNN` 维持 1–357；h18 从 `musketeer:p001`–`p021` 改为 `p358`–`p378`。
- 已给 `hero_skill` 补 `source: { file, page }`，并补齐 `hero_stat.json` /
  `hero_skill.json` 的聚合提取文件清单，见 §4.3。
- 英雄仍全部可选；`cardContentPack` 对英雄保持 `core`，不按 pack 段过滤。
- 更新 `ROSTER_PENDING_STAT_IDS`、`ABOMINATION_DOUBLE_FACED_SKILL_IDS`、
  `WARRENS/COVE/WEALD_VERIFIED_SKILL_PAGE_BLOCKS` 和相关测试。

### 8.5 其他

- `quest:weald:p008` 卡面为 12 点。新 Web 休息命令登记印刷口径，既有无标记日志沿用 8 点。
- `basicQuests.name` 沿用界面和日志的显示名称，`printedName` 读取卡面目录。目录校验等级，休息点数直接读取卡面目录。
- 全局唯一性测试上线后，清理 `ADD_014` 之外的非标准来源集。

## 9. 变更记录

- **v1.1（2026-11-22，Kyries 确认）**：英雄改为带固定编号 `h01`–`h18`，
  ID 保留归类 pack（`core` / `cove` / `warrens` / `weald` / `musketeer`）；
  STAT 全局页 1–37，SKILL 全局页 1–378，Musketeer 追加在末尾；
  18 名英雄全部可选，pack 只用于归类，不参与内容包过滤。
- **v1.0（2026-11-22，Kyries 确认）**：房间族改为按房间号命名（v2）；
  `ADD_014` 登记为来源集；Boss 房统一为 `room` 卡；
  接受核心盒一次存档迁移。英雄部分被 v1.1 修订。
- **v0.1（2026-11-22，草案）**：初版以核心包页码为基准，房间族曾用 `pNNN`。
