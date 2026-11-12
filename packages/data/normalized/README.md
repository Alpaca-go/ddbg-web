# 核心盒规范化数据

`ddbg-normalized-v0`。由 `packages/data/src/normalize/` 从 parsed（英雄技能、怪物、饰品）和 raw（怪癖、美德 / 折磨）生成，图标含义来自词典 v1.8。

重新生成：

```bash
pnpm --filter @ddbg/pipeline normalize
```

印刷 PDF 和图标切图不在这里。Musketeer 不在这批数据里（R-008）。

## Weald 首批普通怪物

同一 normalize 命令也生成 `extension/weald/monster_medium.json` 与 `monster_large.json`：I 级五种普通怪物，14 张牌堆实体卡，另有两张大型战斗卡，不混入 Boss、高等级卡或 Brigand Matchman。
复用核心结构转换，来源指向 Weald；核心逐卡核准表只应用于核心。R-230、R-232 已确认的属性、抗性/免疫、姿态与 13 项技能记录已附加；原始图标命名状态继续保留。`buildWealdMonsterCatalog` 严格核对核准记录与源字段后构造纯战斗目录，不自动登记正式牌堆；三个召唤技能的部署继续停点。核对进度见 [首批审阅记录](../../../docs/weald-level-one-monster-review-2026-11-11.md)。Blight 中文统一为腐蚀（R-231）。

## Weald 奇物

同一 normalize 命令生成 `extension/weald/curio.json`，独立校验 16 张、64 行，R-233 逐卡核准，同名卡不合并。来源、图标和印刷数字漂移会使生成失败，不修改全局图标词典。核心 24 张目录约束保持不变；当地目录与通用卡组合在开发步骤 2 接入。效果按印刷顺序规划，Torch 只抑制负面效果，未知行继续整卡停点。见 [奇物审阅记录](../../../docs/weald-curio-review-2026-11-11.md)。

## Weald 普通房间与板块

`extension/weald/room.json` 与 `room_tile_geometry.json` 使用独立 schema（`ddbg-weald-room-v1` / `ddbg-weald-room-tile-geometry-v0`），写入 R-234–R-238 已核准的九张普通房间与对应板块。2–6、8–9 号含完整通行几何、容量、部署、真菌与星标效果区域；5 号含零容量区 I。1 号仅占位容量／部署（R-234），不写通行边、不绑定 Toxic Mushrooms 星标；7 号仅写入已核准的 4 对通路、1 对角点与 A 高地，裂隙仍挂 Q-186。全部 `usable=false`，不开放出征；由 `pnpm --filter @ddbg/data test` 中 `weald-rooms.test.ts` 校验，可用 `WRITE_NORMALIZED=1` 重写 JSON。见 [房间审阅记录](../../../docs/weald-room-review-2026-11-12.md)。

## 和 parsed 的差别

- 图标解析成 `naming`。只有 `confirmed` 和 `confirmed_rulebook` 可以当名字用。`needs_review`（`pending_` key）、`unsure`、`unreviewed`，以及词典没有的 iconId，都是 `unverified`。卡上有这种图标时，`verification.unverified` 为 true（R-048）。提取器标成 `decor` 的放置（面板、细条、文字底板）不是游戏图标，不放进这层，也不因此把卡标成未验证。
- 印在 Crit / Acc 标签里的数字留在 `printed_labels`。标签旁边、以及没有标签的数字在 `unlabeled_numbers`，不使用 `crit_value` / `acc_value`。
- 怪物心形里的数字叫 `life`（规则书第 24 页）。parsed 里的字段名是 `hp`。
- Abomination 变身卡用 `back_face_skill`。背面名字可以和正面不同。
- 怪癖的正负都来自 `Quirks_FRONT.pdf`，对照规则书 R26–R27。美德和折磨都来自 `virtue_afflictions_FRONT.pdf`。两个 BACK 文件只有卡背，没有文字或图标。卡面没有印 Virtue / Affliction。`role` 按 R-053 写成 `virtue` 或 `affliction`（Kyries 称这一边为折磨，字段仍叫 affliction）；对不上名单的留空，原因是 `role_not_printed`。其余未确认图标仍使卡未验证。不使用卡背箭头来分组（rank 108、138、327 仍未决）。

疾病、房间卡、Curio、任务等还没有规范化。parsed 里大型怪物参考卡没有 `life`，数值在 `monster_large`。

## 单张获批战斗板块几何

`corebox/room_tile_geometry.json` 使用独立的 `ddbg-room-tile-geometry-v0` schema，包含 Kyries 批准的 25 张房间板块面。容量、高低地与邻接来自人工映射；E-F 按 R-054 黑墙阻隔，`blocked=true`，F 没有通行邻接。通行边须同时满足 `blocked=false` 和 `cornerOnly=false`。

核心盒**没有走廊板块**（Q-161 关闭）：TILES FRONT p8 / TILES BACK p8 是 PvP 地形，TILES BACK p1 是 Old Road 教程地图，其余 25 页即 25 张房间板块；旧 `corridor_tile_geometry.json` 已移除，QuestMap 边绑定仍见 `corridor_layout_bindings.json`（`review: pending`）。

`geometryVerified=true` 只批准几何；`usable=false` 保留完整板块的可用卡池限制。未命名标记只保留原始 ID / 空语义，不赋数值，不改词典状态（R-048）。本文件没有出生 / 交互效果、精确多边形、移动或寻路逻辑。通过现有 normalize 命令生成，其他板块没有默认几何。
