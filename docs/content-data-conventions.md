# 内容数据文件命名与结构规范

基线为 `2d144ea0`。本规范适用于 `packages/data` 的九类内容，Cove 和 Warrens 后续开发沿用同一目录、文件命名和数据边界。实体 ID 以 [ID 命名规范](id-naming-rules.md) 为准，卡面之外的规则与数值以官方规则书和 [项目裁定](rulings.md) 为准。

## 通用约定

| 用途                 | 路径与命名                                                     | 职责                                                                                                      |
| -------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 运行时 schema 与读取 | `src/<pack>/<type>/<name>.ts`                                  | Zod schema、派生类型、已校验目录的读取函数                                                                |
| 归一化构建           | `src/<pack>/<type>/<name>.build.ts`                            | 接收已解析的 raw／parsed 数据，核对来源与身份，应用核准数据，输出经 schema 校验的目录                     |
| 核准表               | 同类型的普通 `.ts`，如 `trinket-rules.ts`                      | 以 canonical ID 或印刷页索引核准事实。重复校验与转换用共享处理器                                          |
| 文件读写             | `src/<pack>/write.ts`，经 `@ddbg/data/write` 导出              | 读提取文件、调用构建器、写 JSON。沿用 `loadNormalized<Pack><Content>` 和 `writeNormalized<Pack><Content>` |
| 测试                 | `tests/<pack>/<type>/<name>.build.test.ts` 或 `<name>.test.ts` | 镜像源码路径，覆盖印刷漂移、引用和输出                                                                    |

- **包在第一层，类型在第二层。** 源码包段用 `core`、`weald`、`cove`、`warrens`。TypeScript 文件用 kebab-case，Zod 导出用 `*Schema`，构建函数用 `build*`。跨包复用的解析、格式化和归一逻辑放 `shared/`。
- **提取和发布各有入口。** 扩展提取放 `extract/extension/<pack>/{raw,parsed}/`，发布文件放 `normalized/extension/<pack>/`。核心盒对应 `extract/corebox/` 和 `normalized/corebox/`。JSON 文件名沿用 snake_case，如 `boss_ability.json`、`quest_cards.json` 和 `room_tile_geometry.json`。英雄使用下文的共享发布目录。
- **沿用同类目录的顶层结构。** 使用现有 `schema` 标识、`cards` 或 `tiles` 容器、来源字段、字段名和空值约定。通用卡牌目录已有 `dictionary_version`、`category`、`sources`、`stats` 的按 schema 填写。Curio 使用 `dictionaryVersion`。包级数量、页段和身份校验按对应印刷目录扩展。
- **印刷身份、审核状态和运行时准入分别记录。** 保留原印刷文字、来源文件、页码及必要的面。未确认数据按该类 schema 记录原因或停点。已有 `usable`、`combatReady`、`runtimeReady` 或 `poolEligible` 时按对应准入条件设置。规则结算放在 `packages/engine`。
- **图标指纹归所属内容的数据层。** 印刷核准以现有卡牌 ID、面和行定位，复用该类型的校验入口。经核准的效果用有语义的规则字段表达。运行时需要防止卡面漂移时调用数据层校验函数，引擎源码中读取 `iconId` 或写入十六进制指纹会触发 ESLint。已发布目录保留用作印刷校验和旧档回放的字段。
- **引用只用 canonical ID。** 页码型实体使用印刷页，怪物重复印刷用首印页和 `pages`。房间族使用地点与房间号。若现有目录将来源分布在页数组、分面字段或文件级 `sources`，沿用该类 schema 的来源形状。历史 `rawId` 仅追溯提取实体。

完整的读写与发布边界见 [仓库布局](repo-layout.md)。当前暴露的读写入口见 [write.ts](../packages/data/src/write.ts)。

## bosses

- **文件**使用 `bosses/<boss>/<boss>.ts` 存首级或主体内容，已有高等级独立目录时沿用 `<boss>-higher.ts`。从提取记录构建目录时配套 `.build.ts`。多位 Boss 的印刷能力卡可聚合在 `boss-abilities.ts`／`boss-abilities.build.ts`。
- **能力卡**使用 `boss_ability:<pack>:pNNN`，页码来自 Boss Abilities 印刷目录。保留身份、行动数、原始文字及可核对的印刷来源。双面独立核对的能力卡保留 `front`／`back`，当前核心盒双面能力目录还有 `bossId`、`level` 和 `sourcePage`。
- **战斗内容**按 Boss 保存已核准记录，引用 `monster_medium`／`monster_large` 战斗卡、`boss_ability` 能力卡、对应 `room` 和 `room_tile`。能力卡、怪物卡各自只有一个正式实体。现有 Weald Boss 的能力卡身份直接登记在每个 Boss 的 `abilities` 中，包含印刷页专用字段，如 Shrieker 的 `descriptionCardId` 和 `combatCardId`。派生牌池可以重复引用正式战斗卡。Boss 房间归入房间目录，Boss 专属板块资料可随 Boss 内容保存。
- **Cove／Warrens**须先录入对应印刷能力卡和怪物卡目录，再按真实印刷页迁移 14 个既有占位 ID 及其引用。当前占位清单见 [开发计划](plans/weald-development-plan.md)。

参考 [核心盒能力卡构建](../packages/data/src/core/bosses/ruins-boss-abilities.build.ts) 和 [Weald Hag 目录](../packages/data/src/weald/bosses/hag/hag.ts)。

## curios

- **文件**使用 `curios/curio.build.ts`。沿用已有 Curio 公共 schema、效果判别联合和印刷行格式化函数。来源路径、页段和核准表按包登记，输出 `curio.json`。
- **卡牌**使用 `curio:<pack>:pNNN`。目录包含 `schema`、`dictionaryVersion`、`cards`。单卡保留 `id`、`name`、`text`、`copies`、`source: { front, back, page }` 和按印刷顺序排列的 `rows`。
- **效果行**使用 `{ printed, iconId, effect, reason }`。核准行填写结构化 `effect`，`reason` 为 `null`。待确认行填写 `effect: null` 和停点原因。逐卡核准的图标含义按卡面范围使用。

参考 [Curio schema](../packages/data/src/core/curios/curio.ts) 和 [Cove 构建器](../packages/data/src/cove/curios/curio.build.ts)。

## hamlet

- **文件**按子类命名，如 `hamlet/hamlet-event.ts`／`hamlet-event.build.ts`、`disease.ts`／`disease.build.ts`、`quirk.build.ts`、`virtue-affliction.build.ts`。对应发布文件是 `hamlet_event.json`、`disease.json`、`quirk.json`、`virtue_affliction.json`。
- **身份**使用相应类别的页码 ID。只有扩展专属印刷内容带包段。保留名称和印刷来源，规则字段沿用子类已有 schema。
- **结构**分别沿用各子类。事件保留日数、印刷效果行和 `runtime` 记录；疾病保留印刷行、图标、`verification` 与核准的 `rule`；怪癖保留 `polarity` 与其来源，美德／折磨保留 `role` 与其来源，已核准触发写入 `rules`。正反面来源按各子类现有字段记录。

参考 [村庄事件 schema](../packages/data/src/core/hamlet/hamlet-event.ts)、[疾病 schema](../packages/data/src/core/hamlet/disease.ts) 和 [美德／折磨构建器](../packages/data/src/core/hamlet/virtue-affliction.build.ts)。

## heroes

- **文件**按提取来源将属性构建器放在 `<pack>/heroes/hero-stat.build.ts`。技能归一和注解放在 `core/heroes/`。逐英雄文件固定为 `annotations/hNN-<hero>.ts`，只导出一个 `hNN` 模块。
- **模块**声明 `id`、`hero`、`entries`、`fixes`。普通注解放 `entries`，逐卡修正数据放 `fixes`，无修正时为 `null`。共享处理器负责签名校验、图标处理和效果行重建。
- **身份**使用 `hero_stat:<pack>:hNN:pNNN:<face>` 和 `hero_skill:<pack>:hNN:pNNN`。编号和目录页按 ID 规范固定。单卡 `source: { file, page }` 记录物理印刷来源，聚合文件 `sources` 列出对应提取输入。
- **发布**统一写入 `normalized/corebox/hero_stat.json` 和 `hero_skill.json`。属性卡保留面、等级、生命、闪避、速度和审核信息。技能卡保留正反面、印刷栏、效果行、图标和核准 `rules`。Cove 的 h12–h13、Warrens 的 h14–h15 均在 18 名常驻选池内，英雄包段只用于归类。

参考 [英雄注解维护说明](../packages/data/src/core/heroes/annotations/README.md) 和 [英雄来源约定](id-naming-rules.md#43-页索引与-source)。

## monsters

- **文件**扩展入口沿用 `monsters/monsters.build.ts`。跨包构建复用 `shared/monsters/monster.build.ts`。抗性、图标、战斗字段核准按独立数据表或审核模块维护。怪物池、特殊召唤和任务分布放相应子目录文件。
- **卡牌**输出 `monster_medium.json` 与 `monster_large.json`。ID 为 `monster_medium:<pack>:pNNN` 或 `monster_large:<pack>:pNNN`。按同一实体的首印页生成 ID，`pages`、`copies` 和 `copy_variants` 记录副本信息。分面约定见 ID 规范。
- **结构**保留名称、等级、印刷定位、正反面图标、技能行与审核状态。战斗卡用 `life`、`life_icon` 及经核准的速度、站姿、抗性、免疫等字段。大型怪物参考卡沿用 `card_kind: "large_monster_reference"` 分支。派生牌池通过 `combatCardId` 指向正式战斗卡。

参考 [共享怪物构建器](../packages/data/src/shared/monsters/monster.build.ts)、[Weald 构建入口](../packages/data/src/weald/monsters/monsters.build.ts) 和 [核心盒牌池 schema](../packages/data/src/core/monsters/monster-pool.ts)。

## quests

- **文件**使用 `quests/quest-cards.ts`／`quest-cards.build.ts`。高等级目录单独发布时沿用 `higher-quests.ts`／`higher-quests.build.ts`。对应 JSON 为 `quest_cards.json`、`higher_quests.json`。任务板和分布按类型及既有目录拆分。
- **卡牌**使用 `quest:<pack>:pNNN`。普通印刷目录保留名称、印刷等级、休息点、印刷正文／特殊规则行和双面来源。派生的出征定义通过同一 ID 引用该卡，并校验等级与休息点。通用 Boss 任务分别记录印刷等级和战役等级。
- **扩展任务**按印刷及裁定填写 `distribution`、`xp`、`approvedOverrides`、`verifiedRules` 与准入状态。核准的例外覆盖按任务页或 canonical ID 列成数据。保留房和替换房引用房间目录的 canonical ID。

参考 [Weald I 级目录](../packages/data/src/weald/quests/quest-cards.ts)、[高等级目录](../packages/data/src/weald/quests/higher-quests.ts) 和 [高等级核准表](../packages/data/src/weald/quests/higher-quests.build.ts)。

## rooms

- **文件**使用 `rooms/room.ts`／`room.build.ts`。Stygian 替换使用 `stygian-rooms.ts`／`stygian-rooms.build.ts`。输出 `room.json` 和 `stygian_rooms.json`。
- **房间卡**使用 `room:<location>:NN`，`number` 与 `NN` 一致。保留名称、地点、份数、印刷行与 `source: { front, back, page }`。`boss` 判别普通和 Boss 房，Boss 房的准入和待复核字段按相应 schema 记录。
- **替换卡**使用 `stygian_room:<location>:NN`，`replacesCardId` 必须解析到同地点、同号的普通房。已有 Cove 目录按印刷房号核对。Warrens 接入时以印刷房号登记地点映射和页段。

参考 [Cove 房间 schema](../packages/data/src/cove/rooms/room.ts) 和 [Weald Stygian schema](../packages/data/src/weald/rooms/stygian-rooms.ts)。

## tiles

- **文件**使用 `tiles/room-tile.ts`／`room-tile.build.ts`，普通房板块几何发布为 `room_tile_geometry.json`。走廊和地牢布局用各自的 schema 文件，房间专属校验仍可随对应房间或 Boss 保存。
- **身份**使用 `room_tile:<location>:NN`，与房间卡共享 `number`，`roomId` 指向同地点同号的房间。实际印刷面使用 `source: { file, page, face }`，需要追溯提取时保留 `rawId`。
- **结构**用 `tiles` 容纳板块。每块板保留 `areas`、`edges`、印刷几何核准状态、部署和标记资料。区域 ID 唯一，边和标记只引用已登记区域，同一印刷面只能对应一条记录。保留 `unresolvedMarkers`，按各包 schema 校验 `usable` 与部署／几何核准条件。

参考 [核心盒板块 schema](../packages/data/src/core/tiles/room-tile.ts) 和 [Weald 板块 schema](../packages/data/src/weald/tiles/room-tile.ts)。

## trinkets

- **文件**使用 `trinkets/trinket.build.ts` 和 `trinket-rules.ts`，输出 `trinket.json`。核准的用法或触发按 canonical ID 编入规则表。持久化的饰品引用沿用卡牌 ID。
- **卡牌**使用 `trinket:<pack>:pNNN`。目录保留 `pages`、`copies`、`name`、正背等级、正反图标、问题和审核状态。一张饰品卡包含 `upright_half` 与 `inverted_half`，每半面记录名称、等级、效果行和印刷旋转；经核准的附加规则写入 `rules`。扩展按同类 schema 接入。

参考 [饰品构建器](../packages/data/src/core/trinkets/trinket.build.ts) 和 [饰品核准规则表](../packages/data/src/core/trinkets/trinket-rules.ts)。

## 新包接入与验证

1. 从印刷目录登记来源文件、页段、副本和实体 ID，核对现有 schema 是否已接受该包。Cove／Warrens 的覆盖差异由各自印刷来源决定，Weald 的卡数、页段、数值和准入规则留在 Weald。
2. 依次校验来源、实体身份、已核准数据和跨目录引用。新增类别或包段的校验与构建器一并提交。读写通过 `@ddbg/data/write`，需要加入批量归一时同步更新 [normalize.mjs](../tools/pipeline/scripts/normalize.mjs) 的显式清单。
3. 在临时输出目录重建受影响文件。结构重构要求 `extract` 和 `normalized` 零 diff。新增印刷内容时逐项核对预期的数据差异，并检查现有包的输出。运行 `pnpm typecheck`、`pnpm lint`、`pnpm test` 和 `pnpm build`。阶段收尾按仓库约定验证 1–3 条 Playwright 关键路径。
