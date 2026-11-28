# 规范化数据

各类 JSON 的 schema、目录和来源字段见[内容数据文件命名与结构规范](../../../docs/content-data-conventions.md)。构建器位于 `packages/data/src/<pack>/<type>/`，写入入口是 `@ddbg/data/write`。

重新生成：

```bash
pnpm --filter @ddbg/pipeline normalize
```

印刷 PDF 和图标切图不在这里。

18 名正式英雄一律按核心内容（R-200，Musketeer 纳入并覆盖 R-008）：`corebox/hero_skill.json` 收全部 378 张技能（5 个 pack 来源都在这一份里），`corebox/hero_stat.json` 收全部 54 面属性卡。ID 里的 pack 段（如 `hero_skill:weald:h17:p337`）只用于归类，不表示文件要放进 `extension/`；这些英雄卡不要按包拆出去。

## Weald 首批普通怪物

同一 normalize 命令也生成 `extension/weald/monster_medium.json` 与 `monster_large.json`：I 级五种普通怪物，14 张牌堆实体卡，另有两张大型战斗卡，不混入 Boss、高等级卡或 Brigand Matchman。
复用核心结构转换，来源指向 Weald；核心逐卡核准表只应用于核心。R-230、R-232 已确认的属性、抗性/免疫、姿态与 13 项技能记录已附加；原始图标命名状态继续保留。`buildWealdMonsterCatalog` 严格核对核准记录与源字段后构造纯战斗目录，不自动登记正式牌堆；三个召唤技能的部署继续停点。核对进度见 [首批审阅记录](../../../docs/reviews/weald-level-one-monster-review-2026-11-11.md)。Blight 中文统一为腐蚀（R-231）。

## Weald 奇物

同一 normalize 命令生成 `extension/weald/curio.json`，独立校验 16 张、64 行，R-233 逐卡核准，同名卡不合并。来源、图标和印刷数字漂移会使生成失败，不修改全局图标词典。核心 24 张目录约束保持不变；当地目录与通用卡由地点牌堆组合。效果按印刷顺序规划，Torch 只抑制负面效果，未知行继续整卡停点。见 [奇物审阅记录](../../../docs/reviews/weald-curio-review-2026-11-11.md)。

`extension/cove/curio.json` 由 `buildCoveCurios` 生成，独立校验 16 张、64 行；仅词典已确认的压力与补给骰写入效果，其余行 **Q-186** 停点。见 [Cove 奇物审阅](../../../docs/reviews/cove-curio-review-2026-11-21.md)。

## Cove 房间

`extension/cove/room.json`（`ddbg-cove-room-v0`）由 `buildCoveRooms` 生成，包含普通房 `room:cove:01`–`09` 及 Boss 房 `room:cove:10`–`12`。Boss 房保留 `boss: true`、`poolEligible: false` 及各自的印刷来源。Cove 战役出征仍待接入。见 [Cove 房间审阅](../../../docs/reviews/cove-room-review-2026-11-22.md)。

## Cove 板块印刷目录

`extension/cove/room_tile_catalog.json`（`ddbg-cove-room-tile-catalog-v0`）由 `buildCoveRoomTiles` 生成，登记 `room_tile:cove:01`–`12` 与房间卡同名绑定。`DD_COVE_TILES_FRONT.pdf` / `DD_COVE_TILES_BACK.pdf` 各 6 页已对照印刷房间号。全部 `geometryVerified=false`、`usable=false`，几何提案见审阅稿、未写 `room_tile_geometry.json`。`packages/data/tests/cove/tiles/room-tile.build.test.ts` 校验；见 [Cove 板块审阅](../../../docs/reviews/cove-room-tile-review-2026-11-28.md) 与 [几何提案](../../../docs/reviews/cove-room-tile-geometry-review-2026-11-28.md)。

## Weald 普通房间与板块

`extension/weald/room.json` 与 `room_tile_geometry.json` 使用独立 schema（`ddbg-weald-room-v1` / `ddbg-weald-room-tile-geometry-v0`），写入 R-234–R-239 已核准的九张普通房间与对应板块。含完整通行几何、容量、部署、真菌与星标效果区域；5 号零容量 I、7 号零容量 H／I／J；1 号 C／E／F／G 绑定 Toxic Mushrooms（R-239）。`usable` 与正式出征的独立核准选择器分别校验；由 `pnpm --filter @ddbg/data test` 中 `packages/data/tests/weald/rooms/room.build.test.ts` 校验，可用 `WRITE_NORMALIZED=1` 重写 JSON。见 [房间审阅记录](../../../docs/reviews/weald-room-review-2026-11-12.md)。

## Weald Stygian 九张房间（审阅入库）

`extension/weald/stygian_rooms.json`（`ddbg-weald-stygian-rooms-v1`）由 `buildWealdStygianRooms` 生成，九张各 1 份，替换同名 `room:weald:01`–`09`；与核心 17 张 `corebox/stygian_rooms.json` 隔离。六张有效果段 `reviewedEffect.runtimeReady=true`；Boss 房 p010–p012 不在替换范围（R-036）。`WRITE_NORMALIZED=1` 可重写；`packages/data/tests/weald/rooms/stygian-rooms.build.test.ts` 校验。见 [Stygian 房间审阅记录](../../../docs/reviews/weald-stygian-room-review-2026-11-17.md)。

## Weald I 级普通任务

`extension/weald/quest_cards.json`（`ddbg-weald-quest-cards-v1`，仅 I 级五张）与五张 `*_distribution.json` 由 `buildWealdLevelOneQuestCards` 生成，分布 kind 按 **R-240**–**R-249**；与 `basicQuests` 中 `quest:weald:p001`–`p005` 交叉核对。`WRITE_NORMALIZED=1` 可重写；`packages/data/tests/weald/quests/quest-cards.build.test.ts` 校验。沙盒出征见 `quest:weald:p001`（**R-246** brought back + **R-252** 封顶）、`quest:weald:p004`（**R-248** 当地牌堆）、`quest:weald:p005`；正式出征使用相应的地点任务版本，详见 [Weald 开发计划](../../../docs/plans/weald-development-plan.md)。

## 和 parsed 的差别

- 图标解析成 `naming`。只有 `confirmed` 和 `confirmed_rulebook` 可以当名字用。`needs_review`（`pending_` key）、`unsure`、`unreviewed`，以及词典没有的 iconId，都是 `unverified`。卡上有这种图标时，`verification.unverified` 为 true（R-048）。提取器标成 `decor` 的放置（面板、细条、文字底板）不是游戏图标，不放进这层，也不因此把卡标成未验证。
- 印在 Crit / Acc 标签里的数字留在 `printed_labels`。标签旁边、以及没有标签的数字在 `unlabeled_numbers`，不使用 `crit_value` / `acc_value`。
- 怪物心形里的数字叫 `life`（规则书第 24 页）。parsed 里的字段名是 `hp`。
- Abomination 变身卡用 `back_face_skill`。背面名字可以和正面不同。
- 怪癖的正负都来自 `Quirks_FRONT.pdf`，对照规则书 R26–R27。美德和折磨都来自 `virtue_afflictions_FRONT.pdf`。两个 BACK 文件只有卡背，没有文字或图标。卡面没有印 Virtue / Affliction。`role` 按 R-053 写成 `virtue` 或 `affliction`（Kyries 称这一边为折磨，字段仍叫 affliction）；对不上名单的留空，原因是 `role_not_printed`。其余未确认图标仍使卡未验证。不使用卡背箭头来分组（rank 108、138、327 仍未决）。

核心疾病见 `corebox/disease.json`，Weald II／III 级普通任务见 `extension/weald/higher_quests.json`。parsed 里大型怪物参考卡没有 `life`，数值在 `monster_large`。

## 单张获批战斗板块几何

`corebox/room_tile_geometry.json` 使用独立的 `ddbg-room-tile-geometry-v0` schema，包含 Kyries 批准的 25 张房间板块面。容量、高低地与邻接来自人工映射；E-F 按 R-054 黑墙阻隔，`blocked=true`，F 没有通行邻接。通行边须同时满足 `blocked=false` 和 `cornerOnly=false`。

核心盒**没有走廊板块**（Q-161 关闭）：TILES FRONT p8 / TILES BACK p8 是 PvP 地形，TILES BACK p1 是 Old Road 教程地图，其余 25 页即 25 张房间板块；旧 `corridor_tile_geometry.json` 已移除，QuestMap 边绑定仍见 `corridor_layout_bindings.json`（`review: pending`）。

`geometryVerified=true` 只批准几何；`usable=false` 保留完整板块的可用卡池限制。未命名标记只保留原始 ID / 空语义，不赋数值，不改词典状态（R-048）。本文件没有出生 / 交互效果、精确多边形、移动或寻路逻辑。通过现有 normalize 命令生成，其他板块没有默认几何。
