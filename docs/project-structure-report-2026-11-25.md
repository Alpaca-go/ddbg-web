# 项目结构与数据结构报告（2026-11-25）

> 2026-11-26 补记：第 3.2 节描述的英雄注解层「两种文件形态」已在同日重构中统一为
> 「一个 `hNN-*.ts` 一个模块，`entries` + 可选 `fixes`，全部 canonical ID」。
> 最新结构以 [注解层 README](../packages/data/src/core/heroes/annotations/README.md) 和
> [统一计划](plans/PLAN-2026-11-25-hero-annotations-unification.md) 为准。

本报告按当前工作区（HEAD `ce06bd08`，2026-11-25）逐目录说明：**每个文件夹、每个子文件夹里放的是什么、为什么这样分层、数据长什么样**。
统计口径：不含 `.git`、`node_modules`、`.cache`、`test-results`、`__pycache__` 与构建产物。

---

## 0. 一句话总览

这是一个 **「印刷 PDF → 提取 JSON → 规范化 JSON → 纯 TS 引擎 → React UI」** 的五段式仓库：

- **唯一事实来源**是本地印刷 PDF（不入库），
- 仓库里保存的是**提取结果**（`packages/data/extract`）和**规范化结果**（`packages/data/normalized`），
- **Zod schema + 构建器**（`packages/data/src`）负责把前者校验、收窄、补上人工核准字段后写成后者，
- **规则引擎**（`packages/engine`）直接 import 规范化 JSON，用命令/事件/存档回放驱动，
- **Web 客户端**（`apps/web`）只订阅引擎状态、派发命令、渲染卡面。

规则文字在 `docs/spec`，裁定在 `docs/rulings.md`，命名规范在 `docs/id-naming-rules.md`，测试与部署边界在 `docs/repo-layout.md`。

---

## 1. 顶层结构

| 路径              | 类型         | 作用                                                                      | 入库 |
| ----------------- | ------------ | ------------------------------------------------------------------------- | ---- |
| `packages/data`   | workspace 包 | Zod schema、提取/规范化 JSON、图标词典、逐卡测试                          | 是   |
| `packages/engine` | workspace 包 | 纯 TypeScript 规则引擎：状态、命令、事件、Boss 脚本、地牢/村庄流程        | 是   |
| `apps/web`        | workspace 包 | Vite + React + Tailwind 客户端，含 Playwright 冒烟                        | 是   |
| `tools/pipeline`  | workspace 包 | 印刷 PDF 提取（Python）、卡图切图（Python）、规范化与卡图映射脚本（Node） | 是   |
| `docs`            | 文档         | 规格书、裁定、计划、逐批次开发记录、审阅、交接                            | 是   |
| `assets`          | 静态资源     | 目前只有 UI 用的字体                                                      | 是   |
| `.github`         | CI/模板      | GitHub Actions 与 issue/PR 模板                                           | 是   |
| `.cache`          | 本地缓存     | 印刷 PNG、旧 Node 运行时、重组备份；**gitignored**                        | 否   |
| `test-results`    | 测试产物     | Playwright 的 `.last-run.json`；gitignored                                | 否   |
| `node_modules`    | 依赖         | pnpm 安装结果                                                             | 否   |
| `deploy/web`      | 部署产物     | `pnpm package:web` 生成；gitignored                                       | 否   |

根目录配置文件：

| 文件                                                        | 作用                                                                                                                              |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`                                              | 根脚本：`dev/build/typecheck/lint/format/test/test:e2e/package:web`；`typecheck` 依次跑 engine、data、pipeline、web 四个 tsconfig |
| `pnpm-workspace.yaml`                                       | workspace = `packages/*`、`apps/*`、`tools/*`；`minimumReleaseAge` 1 天                                                           |
| `tsconfig.base.json`                                        | 四个子项目共享的编译选项                                                                                                          |
| `vitest.config.ts`                                          | 单测入口：`packages/**/*.test.ts`、`apps/web/**/*.test.ts(x)`、`tools/pipeline/scripts/**/*.test.ts`；`maxWorkers: 2`             |
| `eslint.config.js` / `.prettierrc.json` / `.prettierignore` | 代码风格；词典 CSV/JSON 不参与 Prettier                                                                                           |
| `.nvmrc` / `packageManager`                                 | Node 24.21.0、pnpm 12.9.1                                                                                                         |
| `.gitignore`                                                | 排除依赖、构建、缓存、印刷 PNG、部分本地交接笔记                                                                                  |
| `AGENTS.md`                                                 | 给编码代理的硬约定（命名、规则来源、质量闸门、PR 规则）                                                                           |
| `README.md`                                                 | 项目简介、开发命令、卡图缓存用法、历史进度补记                                                                                    |

---

## 2. 全局数据流

```text
本地印刷 PDF（不仓库化）
   │  tools/pipeline/extract-print（PyMuPDF + Pillow + imagehash）
   ▼
packages/data/extract/<pack>/raw/*.json          schema: ddbg-raw-v1
   │   （文字 span / 图标 iconId / 阅读顺序 / 每页 bbox）
   │   部分类别再由提取器解析
   ▼
packages/data/extract/<pack>/parsed/*.json       schema: ddbg-parsed-v0
   │   （技能行、怪物技能、饰品上下半区等结构化字段）
   │
   │  packages/data/src/**/*.build.ts（Zod 校验 + 人工核准表 + 词典 v1.8）
   ▼
packages/data/normalized/<pack>/*.json           schema: ddbg-normalized-v0 / 各目录 vN
   │
   │  packages/data/src/index.ts 导出 schema 与目录/池读取函数
   ▼
packages/engine（纯函数：applyCommand(state, command) → state/events/pendingChoice）
   │
   ▼
apps/web（Zustand 订阅 + 派发命令 + 卡面渲染）
```

关键边界（来自 `docs/repo-layout.md`）：

- `extract` **不参与运行时**，删掉不影响构建，但会失去重生成与审计能力。
- `normalized` **是运行时数据**，引擎和 Web 直接 `import`，Vite 会把它打进 `battle-catalogs` / 主包。
- `tests` 不进部署包；部署只上传 `deploy/web`（或 `apps/web/dist`）。
- 卡图映射 `apps/web/src/card-art/*.json` 参与运行时；印刷 PNG 只进 `.cache/print-card-art/`。

---

## 3. `packages/data` —— 数据层

文件规模：`src` 165 个文件 / 1.04 MB，`tests` 100 个 / 0.42 MB，`extract` 56 个 / 10.44 MB，`normalized` 67 个 / 8.27 MB，`dictionary` 12 个 / 1.18 MB。

### 3.1 包内分层

| 目录           | 内容                                             | 作用                                          |
| -------------- | ------------------------------------------------ | --------------------------------------------- |
| `src/`         | TypeScript：Zod schema、构建器、目录/池读取函数  | 数据的「程序侧」；唯一导出入口 `src/index.ts` |
| `extract/`     | 从 PDF 提取的原始/解析 JSON                      | 只读 fixture，供构建器消费与测试对账          |
| `normalized/`  | 构建器产出的规范化 JSON                          | 运行时数据，引擎/Web 直接 import              |
| `dictionary/`  | 图标含义词典（JSON/CSV/CHANGELOG）               | `iconId → 语义/状态`，规范化时解析图标        |
| `tests/`       | Vitest：逐卡、逐房间、逐 Boss 的 schema/证据测试 | 镜像 `src/` 的目录结构                        |
| `package.json` | 包名 `@ddbg/data`，唯一依赖 `zod`                | 无构建步骤，`exports` 直指 `src/index.ts`     |

### 3.2 `src/` 的组织规则

同一类别通常由 **一对文件** 组成：

- `<name>.ts`：Zod schema + 类型 + 纯读取/配对函数（例如 `room.ts`、`curio.ts`、`quest-cards.ts`）。
- `<name>.build.ts`：从 raw/parsed 构造规范化数据的构建器（例如 `room.build.ts`、`curio.build.ts`）。
- 少数是「数据表 + applier」：`verified-*.build.ts` 附上人工核准的数值；`*-data.ts` 存纯数据。
- 命名规范见 `docs/id-naming-rules.md`：房间族 `room:<location>:NN`，其他核心 `category:pNNN`，分包 `category:<pack>:pNNN`，英雄 `category:<pack>:hNN:pNNN`。

#### `src/shared/` —— 跨包基础设施

| 文件                                            | 做什么                                                                                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build.ts`                                      | 总构建器 `buildNormalizedCorebox`：把 raw/parsed + 词典 + 核准表组装成全部核心盒 JSON；同时调用英雄注解层                                         |
| `schema.ts`                                     | 规范化通用 schema：`normalizedIconSchema`、文本/图标 `Segment`、`printed_labels`、`unlabeled_numbers`、英雄/怪物/饰品/怪癖/美德卡、`verification` |
| `icons.ts`                                      | `createIconLookup`：把 `iconId` 解析成词典条目；`confirmed/confirmed_rulebook` 才能命名，其余标 `unverified`                                      |
| `rules.ts`                                      | 把规则字段挂到卡上（`withHeroSkillRules`、`withMonsterCardRules`、`withVirtueRules`）                                                             |
| `write.ts` / `write-cove.ts` / `write-weald.ts` | 读 raw/parsed、调构建器、写 `normalized/**`；测试只在 `WRITE_NORMALIZED=1` 时才触发写盘                                                           |
| `content-packs.ts`                              | 内容包 ID 与启用判断（core/weald/warrens/cove）                                                                                                   |
| `exploration.ts`                                | 探索骰面 schema                                                                                                                                   |
| `quest-save.ts`                                 | 存档 schema：`QuestStart`、`QuestSave`、`savedCommandSchema`（命令白名单）                                                                        |
| `quest-summary.ts`                              | 任务结算摘要类型                                                                                                                                  |
| `quirk-polarity.ts`                             | 怪癖正负表（来自规则书 R26–R27）                                                                                                                  |

`src/shared/dictionary/schema.ts`：词典条目 schema、6 种 `iconStatus`、key 命名约定检查。
`src/shared/extract/{common,raw,parsed,reports}.ts`：提取层的 schema —— bbox/图标/页码等公共类型、`ddbg-raw-v1`、`ddbg-parsed-v0`、`summary.json` 与对账报告。

#### `src/core/` —— 核心盒内容

| 子目录                | 文件与用途                                                                                                                                                                                                                                                                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bosses/`             | 4 组 Boss 数据 schema + 构建器（`absolute-nothingness-support`、`darkest-boss-abilities`、`darkest-boss-content`、`ruins-boss-abilities`）；`verified-collected-life`（Collector 收集生命）、`verified-heart-of-darkness-ranges`（终战技能距离）核准表                                                                                             |
| `curios/`             | `curio.ts`（24 张奇物 schema）+ `curio.build.ts`；`curio-pool.ts`（地点池身份）；7 个房间专属奇物构建器：`eldritch-power-chamber`、`eldritch-vault`、`evil-eye`、`teleporters`、`temple-of-the-chosen`、`torture-chamber`、`toxic-chamber`                                                                                                         |
| `hamlet/`             | `disease.ts/.build.ts`（11 张疾病）、`hamlet-event.ts/.build.ts`（16 张村庄事件）、`hall-of-ascension` / `pool-of-rebirth` 房间效果断言、`virtue-role`（美德/折磨归类）                                                                                                                                                                            |
| `heroes/`             | `hero-registry.ts`（18 名英雄 `h01`–`h18`、页面→canonical ID）、`hero-stat.build.ts`（54 面属性卡）、`musketeer-hero-stat.build.ts`、`core-higher-skills.build.ts`（II/III 级技能）、`hero-higher-defence.build.ts`、`reviewed-hero-stances.build.ts`、`hero-skill-trinkets.ts`（技能绑定饰品）                                                    |
| `heroes/annotations/` | 逐卡审校层（见下）                                                                                                                                                                                                                                                                                                                                 |
| `monsters/`           | `monster-pool.ts/.build.ts`（遗迹怪物池）、`darkest-monster-pool.*`（最暗池）、`monster-resistances*`、`monster-stance.build.ts`、`monster-effects.ts`、`quest-monster-plan.ts`、`ruins-pool-admission.build.ts`、`verified-*.build.ts`（速度/姿态/生命/保护/伤害/压力/效果/入场等人工核准表）                                                     |
| `quests/`             | `basic-quests.ts`（手写任务目录与沙盒入口）、`quest-cards.ts/.build.ts`（19 张任务卡）、`quest-map-pairing.ts`（任务↔QuestMap 配对）、`scout-rest.ts`、`approved-resolve-icons.build.ts`、`verified-resolve-triggers.build.ts`                                                                                                                     |
| `rooms/`              | `room.ts/.build.ts`（25 张房间牌）、`room-tile.build.ts`（25 面板块几何）、`stygian-rooms.ts/.build.ts`（17 张替换房）、`room-distribution-expand.ts`（房型代币展开）、`room-tile-selection.build.ts`，以及 8 个 Boss 专属房间构建器：`ancestor`、`collector`、`fanatic`、`mammoth-cyst`、`necromancer`、`prophet`、`shuffling-horror`、`templars` |
| `tiles/`              | `dungeon-layout.ts`（QuestMap 节点/边 schema）、`corridor-layout-bindings.ts`（地图边↔走廊绑定）、`approved-ruins-tiles.build.ts`                                                                                                                                                                                                                  |
| `trinkets/`           | `core-trinket-bindings.ts`（免费饰品 ID 等绑定）、`trinket-rules-data.build.ts`（逐饰品规则数据）                                                                                                                                                                                                                                                  |

#### `heroes/annotations/`（41 个文件）

`normalized/corebox/hero_skill.json` 的**逐卡人工审校层**，在总构建器里按顺序叠加到规范化结果上。

- `h01-*.ts`–`h11-*.ts`：纯数据表（`statusEntries` / `rangeEntries` / `damageEntries` / `layoutEntries` / `supportEntries` / `targetStressEntries` / `bountyStatusRows` …）。
- `h12-*.ts`–`h18-*.ts`：数据 + 逐卡 patch（工厂函数 + `HeroSkillPatch[]` + `HeroAnnotationModule`），用于重建效果行、替换图标 key、重写数字锚点。
- applier 与数据一一对应：`status-effects.ts`、`ranges.ts`、`self-effects.ts`、`target-stress.ts`、`removal.ts`、`target-counts.ts`、`support-effects.ts`、`layout.ts`、`damage.ts`、`rallying-flare.ts`、`bounty-statuses.ts`、`text-rules.ts`。
- 共享工具：`index.ts`（`applyHeroAnnotations` 总入口）、`patch-helpers.ts`（签名断言）、`shared.ts`、`types.ts`。
- `README.md` 写明了两种文件形态和「改写后必须零 diff」的验证流程。

#### `src/cove` / `src/warrens` / `src/weald` —— 扩展包

| 目录                                    | 内容                                                                                                                         |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `cove/curios/curios.build.ts`           | Cove 16 张奇物（64 行）构建                                                                                                  |
| `cove/heroes/hero-stat.build.ts`        | Cove 英雄属性卡                                                                                                              |
| `cove/rooms/room.ts` + `rooms.build.ts` | Cove 房间 schema（`ddbg-cove-room-v0`）与构建（普通 p1–p9 入目录，Boss p10–p12 仅来源登记）                                  |
| `warrens/heroes/hero-stat.build.ts`     | Warrens 英雄属性卡（Warrens 地点战役尚未开放）                                                                               |
| `weald/bosses/{hag,pounder,shrieker}/`  | 三名 Weald Boss 的 I 级与高等级内容 schema                                                                                   |
| `weald/curios/curios.build.ts`          | Weald 16 张奇物                                                                                                              |
| `weald/heroes/hero-stat.build.ts`       | Weald 英雄属性卡                                                                                                             |
| `weald/monsters/`                       | `crone.ts`（任务例外怪）、`higher-monsters.ts`、`monster-pool.ts`、`monster-rulings.ts`（打印字段裁定）、`monsters.build.ts` |
| `weald/quests/`                         | `quest-cards.ts/.build.ts`（I 级五张）、`higher-quests.ts/.build.ts`（II/III 级任务）                                        |
| `weald/rooms/`                          | `room.ts`、`rooms.build.ts`（12 面）、`stygian-rooms.ts/.build.ts`（9 张替换房）                                             |

`src/index.ts` 是唯一公共出口：导出各类 schema、类型、目录常量、配对/展开函数、`buildNormalizedCorebox`、`load/writeNormalizedCorebox`。

### 3.3 `normalized/` —— 运行时 JSON

卡表/目录类文件通常是 `{ schema, category, sources, stats, cards }`（各目录 schema 版本不同）；任务分布文件则轻量得多，只有 `{ questId, source, counts[] }`（可选 `randomizeNonObjective`）。

核心盒 43 个文件，按用途分五组：

| 组          | 文件                                                                                                                                                                                                             | 内容                                          |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 大卡表      | `hero_skill.json`（378 张，4.5 MB）、`hero_stat.json`（54 张）、`monster_medium.json`（54 张）、`monster_large.json`（20 张）、`trinket.json`（38 张）、`quirk.json`（35 张）、`virtue_affliction.json`（10 张） | 规范化卡面：文本/图标段、印刷标签、校验状态   |
| 内容目录    | `room.json`（25）、`stygian_rooms.json`（17）、`curio.json`（24）、`quest_cards.json`（19）、`hamlet_event.json`（16）、`disease.json`（11）                                                                     | 房间/奇物/任务/事件/疾病目录                  |
| 怪物与 Boss | `monster_pool.json`（24）、`darkest_monster_pool.json`（9）、`darkest_boss_content.json`、`darkest_boss_abilities.json`（9）、`ruins_boss_abilities.json`（12）、`absolute_nothingness_support.json`             | 牌堆构成、Boss 能力与终战编排                 |
| 地图与几何  | `dungeon_layouts.json`（14 张 QuestMap）、`dungeon_layout_p001.json`、`room_tile_geometry.json`（25 面）、`corridor_layout_bindings.json`、`exploration_die.json`                                                | 探索图节点/边、板块通行几何、走廊绑定、探索骰 |
| 任务分布    | `*_distribution.json` × 19（break_them、clear_the_path、scout_ahead、warm_up_the_halls、dem_bones …）                                                                                                            | 每张任务卡的房型代币配比                      |

扩展：

- `extension/weald/` 21 个：`quest_cards`（5）、`higher_quests`（10）、`curio`（16）、`room`（12）、`room_tile_geometry`、`stygian_rooms`（9）、`monster_medium`（6）、`monster_large`（1）、`higher_monsters`（2）、`quest_exception_monsters`（1）、`hag_i/hag_higher`、`pounder_i/pounder_higher`、`shrieker_i/shrieker_higher`、5 张任务分布。
- `extension/cove/` 2 个：`curio`（16）、`room`（12）。

> 注意：Weald 的 `monster_medium` / `monster_large` 在 `stats` 里仍是 `unverified`——这里的统计按**图标命名**计，属性/抗性/姿态等字段已按 R-230、R-232 核准；这是「数据已入库、图标仍未全部命名」的显式状态，不是遗漏。

### 3.4 `extract/` —— 提取层

| 目录                       | 内容                                                                                                                                                                                                                                                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `corebox/raw/`             | 23 个 `ddbg-raw-v1`：16 个卡牌类别（hero_skill、hero_stat、hero_pvp、monster_medium、monster_large、boss_ability、trinket、curio、room、stygian_room、quest、hamlet_event、quirk、disease、virtue_affliction、player_aid）+ 7 个版面类（save_sheet、letter、hamlet_board、punchboard_300x300/200x300/130x106、dungeon_tile） |
| `corebox/parsed/`          | 4 个 `ddbg-parsed-v0`：hero_skill、monster_medium、monster_large、trinket（其余类别直接由 raw 构建）                                                                                                                                                                                                                         |
| `corebox/reports/`         | `summary.json`（每个输出的 sha1）、`reconciliation.json`、`reconciliation.md`（部件对账）                                                                                                                                                                                                                                    |
| `extension/<pack>/raw/`    | 各扩展的原始提取：weald 11 类、cove 4 类、warrens 2 类、musketeer 2 类                                                                                                                                                                                                                                                       |
| `extension/<pack>/parsed/` | weald 3（技能/中型/大型怪）、cove 1、warrens 1、musketeer 1（均为 hero_skill）                                                                                                                                                                                                                                               |

`extract/README.md` 说明了为什么版面类也入库（印刷 PDF 不在仓库，这些 JSON 是唯一文字提取）、以及「还不命名的东西」（图标只有 `iconId`，数字分 `unlabeled_numbers`）。

### 3.5 `dictionary/` —— 图标词典

- `icon-dictionary-v1.8.json`：983 条，`iconId → status/key/kind/meaning_en/meaning_zh/value`；6 种 status；`confirmed` 与 `confirmed_rulebook` 才能命名，`needs_review`/`unsure`/`unreviewed` 一律 `unverified`（R-048）。
- `icon-dictionary-v1.8.csv`：同表 CSV。
- `icon-dictionary-v1.{1..8}-CHANGELOG.md`：每版归类批次说明。
- `start_locations_by_placement.csv`：房间卡起始站位的逐处归类。
- `README.md`：版本、条数、使用规则。

### 3.6 `tests/` —— 数据测试

镜像 `src/`：`core/{bosses,curios,hamlet,heroes,monsters,quests,rooms,tiles,trinkets}`、`cove/{curios,heroes,rooms}`、`warrens/heroes`、`weald/{bosses,curios,heroes,monsters,quests,rooms}`、`shared/{dictionary,extract}`。

- 每个 `*.build.test.ts` 校验构建器输出与人工核准值、逐卡字段和 schema。
- `shared/normalize.build.test.ts` 是「零 diff」总闸：`WRITE_NORMALIZED=1` 时重写 JSON 并期望 git diff 为空。
- `tests/shared/extract/` 对账 raw 的 sha1 与 parsed 的交叉字段。

---

## 4. `packages/engine` —— 规则引擎

规模：`src` 375 个文件 / 2.39 MB，`tests` 565 个 / 4.18 MB（含快照）。

### 4.1 状态与命令模型（先看这里）

入口 `src/index.ts` 导出：

- `createInitialState(seed)` → `{ seed, notes: [] }`；
- `applyCommand(state, command)` → `{ state, events, pendingChoice? }`；
- `PendingChoice`：`{ id, prompt, options[{id,label}], actorId? }`，需要玩家决策时挂在状态上，UI 只呈现选项。

状态是**浅根 + 两个大子状态**：

```ts
GameState = {
  seed, notes,
  battle?: BattleState,     // 战斗沙盒/遭遇战
  dungeon?: DungeonState,   // 战役/地牢：出征、探索、村庄、回村都在这
}
```

- `DungeonState`（`shared/dungeon/dungeon.ts`）是一个**扁平的大状态包**：`layout/mode/heroes/rooms/phase/curio/roomCards/monsterPool/inventory…`，加上大量可选字段表示「某个机制正在进行」：`hamlet`、`hamletReturn`、`replacementPreparation`、`pending`、`nextQuestOffers`、`activeBossThreatScriptId`、`poolRebirthRooms`、`stagecoachHeroes` 等。
- `BattleState`（`shared/battle/battle.ts`）= `BattleSetup` + 运行时：`entities`、`areas`（含容量/高低地/星标区效果）、`skills`、`monsters`、`light`、`rngCursor`、`monsterAction`、`pending`、`encounter`，以及每个 Boss/奇物自己的战斗字段（`hagCauldron`、`impendingDoomDie`、`woodenPews` …）。
- 存档（`data/src/shared/quest-save.ts`）：`QuestSave = { format:"ddbg-core-quest", version:1, start, commands[], snapshot }`；`start` 只含种子/任务/难度/队伍，状态由**命令日志回放重建**，`snapshot` 仅用于一致性校验。

### 4.2 `src/shared/` —— 与包无关的机制

| 子目录      | 文件数 | 内容                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core/`     | 36     | 根 reducer `command.ts`、`rng.ts`（种子 d10/洗牌）、`status.ts`、`conditions.ts`、`passive*`、`monster-skill/stance/target`、`pressure.ts`、`spawn.ts`、`provision-use.ts`、`resolve-trigger.ts`、`shuffle.ts`、`crowding.ts`、`inventory-overflow.ts`、`monster-pool-runtime.ts`、`formal-roster-catalog.ts`、`content-packs.ts`、`registry.ts`（Boss 脚本注册）、`advance-ruins-act.ts`、`stygian-room-effects.ts` 等 |
| `battle/`   | 50     | 战斗状态与逐机制模块：移动（英雄/怪物/召唤）、目标/区域、饰品（攻击/免费/特殊）、治疗与光、状态、Boss 支援（ancestor、abyssal-puff、infected-oak、old-abbey…）、奇物战斗（eldritch-vault、evil-eye、hall-ascension、teleporters、temple-of-the-chosen、toxic-mushrooms、spiked-pit…）、`battle-monster-auto.ts` 等                                                                                                      |
| `dungeon/`  | 30     | 地牢状态与流程：`dungeon.ts`、探索/回溯、房间/目标、陷阱、奇物（catalog/effects/room）、光照、压力、战斗准入/准备、`encounter.ts`、`dungeon-exit/rest/forward-camp/provision*`、`corridor-tile-catalog.ts`、`expedition-room-catalog.ts`、地牢怪部署                                                                                                                                                                    |
| `hamlet/`   | 46     | 战役与村庄：`campaign-entry.ts`、`hamlet-buildings/actions/event/embark/return`、各建筑服务（abbey/tavern/sanitarium/survivor/blacksmith/nomad/guild/graveyard/stagecoach）、16 张村庄事件实现、升幕 `act-transition-*`、补人 `replacement-*`、重生池 `pool-rebirth-*`、站位 `embark-roster-placement`、任务抽选                                                                                                        |
| `quest/`    | 6      | `core-quest-decks.ts`（任务牌堆）、`location-quest-sources.ts`（地点任务源）、`quest-monster-spawn/deployment.ts`（任务强制怪）、`quest-provisions.ts`、`quest-save.ts`（读档/回放校验）                                                                                                                                                                                                                                |
| `trinkets/` | 7      | `loot.ts`（战利品/补给骰）、`trinket-acquisition.ts`（饰品池）、`trinket-lifecycle.ts`、`trinket-reactions.ts`、`trinket-exploration-reactions.ts`、`core-trinket-free.ts`、`trinket-save-upgrade.ts`                                                                                                                                                                                                                   |

### 4.3 `src/core/` —— 核心盒规则

| 子目录     | 文件数           | 内容                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bosses/`  | 25 + 11 个子目录 | **框架**：`types.ts`（脚本/钩子类型）、`hooks.ts`、`registry.ts`、`ensure-core-boss-scripts.ts`、`combat-entry.ts`、`deploy-heroes.ts`、`edge-room-placement.ts`、`encounter-rules.ts`、`monster-initiative.ts`、`objective-room-entry.ts`、`quest-bridge.ts`、`rules.ts`、`threat-*.ts`（威胁抽牌/描述/被动/战役）、`apply-active-boss-threat.ts`、`establish-imminent-threat.ts`、`set-active-boss-threat.ts`、`face-the-threat-*.ts`、`fixture-skeleton.ts`、`index.ts` |
|            |                  | **每 Boss 一个目录**：`ancestor`（祖先 I/II：复制、反射、时间治愈、绝对虚无）、`collector`、`darkest`（中 Boss 脚本）、`fanatic`、`final`（终战多形态/预兆/召唤）、`mammoth-cyst`、`necromancer`（I–III）、`prophet`（I–III）、`ruins`（高等级遗迹威胁）、`shuffling-horror`、`templars`                                                                                                                                                                                   |
| `darkest/` | 7                | 最暗地牢入口、挖掘点、普通遭遇部署、完成战斗、Boss 支援                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `heroes/`  | 11               | `formal-heroes.ts`（正式 18 英雄名单/待接状态）、`hero-skill.ts`（技能结算）、`hero-health.ts`（生命/死门）、`hero-death-cards.ts`、`hero-death-estate.ts`（遗产）、`fallen-heroes.ts`、`hero-loadout.ts`（技能/饰品槽）、`abomination-skills.ts`、`core-higher-skill-catalog.ts`、`skill-actor-health.ts`、`skill-hero-health.ts`                                                                                                                                         |

### 4.4 `src/cove` / `src/warrens` / `src/weald`

| 目录       | 内容                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cove/`    | `index.ts`（Boss 注册）、`catalog.ts`、`bosses/siren-i*.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `warrens/` | `index.ts`、`catalog.ts`、`bosses/flesh-i*`、`swine-prince-i*`                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `weald/`   | 顶部 23 个：`catalog.ts`、任务机制（`disinfection-quest`、`fungal-research-quest`、`patrol-the-woods-initiative`、`task-*`）、怪物（`monster-catalog/pool`、`higher-*`、`crone-catalog`、`task-monster-catalog`、`monster-summon`）、房间（`room-catalog`、`room-tile-selection`、`mechanics`）、环境（`burning-oak`、`whispering-woods`、`necrotic-fungus`）；`bosses/` 50 个（hag、pounder、shrieker 的 deploy/content/runtime/finish，加 `boss-act-entry`、`higher-boss-entries`、`threat-pool`） |

### 4.5 `tests/`

镜像 `src/`：`shared/{battle,core,dungeon,hamlet,quest,trinkets}`、`core/{bosses,darkest,heroes}`、`cove/bosses`、`warrens/bosses`、`weald/{bosses,monsters,rooms}`。

- `helpers/`（70 个）：**不是测试**，是可复用的场景构造器 —— 任务沙盒、自然流程、补人、终战、Boss 对局、种子搜索等（`core-quest.ts`、`campaign-quest-sandbox.ts`、`natural-*.ts`、`weald-*.ts`）。
- `weald/__snapshots__/`、`weald/bosses/__snapshots__/`：整段战役/种子回放的快照，用于检测无意的规则漂移。
- 每个 `*.test.ts` 对应 `src` 的一个模块或一条规则。

---

## 5. `apps/web` —— Web 客户端

### 5.1 根目录与构建

| 文件                           | 作用                                                                                                        |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `index.html`                   | Vite 入口                                                                                                   |
| `vite.config.ts`               | React + Tailwind 插件、`@ddbg/engine` 源码别名、`battle-catalogs`/`vendor` 分包                             |
| `battle-data-plugin.ts`        | 虚拟模块：构建时读取 `normalized/corebox/*.json`，用 Zod 校验后只打包沙盒需要的卡；共享目录去重             |
| `battle-data-shared.ts`        | 把多个虚拟目录的相同条目合并成 `entries[]`，避免重复打包                                                    |
| `card-art-cache-plugin.ts`     | 开发/预览时把 `.cache/print-card-art/` 挂到静态路径；缺失时回退占位                                         |
| `playwright.config.ts`         | 冒烟测试配置（端口 8080、`testDir: e2e`、本地串行）                                                         |
| `playwright.preview.config.ts` | 构建产物冒烟（端口 8081，只跑 `home/initial-threat/content-packs` 三条）                                    |
| `vite.save-profile.config.ts`  | 把 `tools/pipeline/scripts/quest-save-profile.ts` 编译成 Node 性能探针，输出到 `.cache/quest-save-profile/` |
| `docs/print-card-art-local.md` | 本地卡图缓存说明                                                                                            |

`src/App.tsx` 是唯一路由（查 query string）：

- `?view=tabletop` → 桌面 mock 原型；
- `?view=battle` 或 `?phase=2` → 战斗沙盒；
- `?phase=3&play=1` → 正式战役入口 `DungeonQuest`；
- `?phase=3` → 地牢调试沙盒 `DungeonSandbox`；
- 默认 → 正式战役入口。

### 5.2 `src/` 顶层（24 个文件）

- 入口：`main.tsx`、`App.tsx`、`index.css`。
- 战斗沙盒：`battle-store.ts`（Zustand）、`battle-view.tsx`、`battle-step.ts`、`battle-stance-track.tsx`、`battle-data.d.ts`。
- 事件/技能展示：`resolve-event-details.tsx`、`state-event-details.tsx`、`encounter-event-details.tsx`、`monster-action-details.tsx`、`skill-results.tsx`、`skill-card-text.tsx`、`skill-requirements.tsx`、`core-trinket-actions.tsx`、`infected-oak-action.tsx`。
- 小工具：`choice-display-label.ts`、`provision-labels.ts`、`dungeon-stance-order.tsx`、`dungeon-sandbox.tsx`（转发出口）。
- 就近测试：`*.test.ts(x)`。

### 5.3 `src/battle/`

只有 `resolve-battle-room-tile-id.ts` 与其测试：把战斗房间 id 解析到板块几何。

### 5.4 `src/card-art/`（62 个文件）

两类东西：

1. **映射 JSON**（运行时数据）：`hero-skill-print-art-map.json`、`monster-print-art-map.json`、`monster-stance-print-art-map.json`、`hero-stat-print-art-map.json`、`hero-standee-print-art-map.json`、`curio-print-art-map.json`、`quest-print-art-map.json`、`room-tile-print-art-map.json`、`room-token-print-art-map.json`、`trinket-print-art-map.json`、`exploration-print-art-map.json`、`hamlet-board-print-art-map.json`、`hamlet-building-tile-print-art-map.json`、`player-aid-print-art-map.json`。
2. **解析器与卡片组件**：`resolve-print-*.ts` 把卡 id 映射到 `.cache` 里的 PNG（无缓存则占位）；`card-face.tsx`、`hero-stat-card-face.tsx`、`monster-card-face.tsx`、`room-card-face.tsx`、`monster-stance-board.tsx`、`battle-room-tile-board.tsx`、`battle-position-raster.tsx` 等负责渲染。

### 5.5 `src/dungeon-sandbox/` —— 正式入口 + 调试沙盒

根目录：`dungeon-sandbox.tsx`（调试外壳）、`store.ts`（Zustand）、`dungeon-data.ts`（读布局/奇物）、`fixture-setup.ts`/`fixture-types.ts`（沙盒场景）、`task-sources.ts`（按内容包组装任务数据）、`quest-save-storage.ts`（localStorage 存档）、`labels.ts`、`view-props.ts`、`initial-threat.ts`、`curio-effect-label.ts`、`fundraiser-choice.tsx`、`quest-save-controls.tsx`。

子目录：

| 子目录          | 内容                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| `quest-setup/`  | 出征准备：`dungeon-quest.tsx`（正式入口壳）、英雄选择/队伍条、技能与姿态选择、出征准备区、正式队伍数据 |
| `expedition/`   | 探险阶段：地牢头部、侦察面板、出征开始动作、遗迹/最暗 Boss 房动作、补人动作                            |
| `dungeon-map/`  | QuestMap 展示：图框与面板                                                                              |
| `formal/`       | 正式探险视图与目标行文案                                                                               |
| `hamlet/`       | 村庄事件区                                                                                             |
| `quest-return/` | 任务结算：摘要、战役胜利、战役失败面板                                                                 |

### 5.6 `src/tabletop/` —— 桌面 mock 原型

- 根：`tabletop-view.tsx`、`tabletop-formal-shell.tsx`、`tabletop-types.ts`、`tabletop-initial-state.ts`、`tabletop-card-stack.tsx`、`standee-token.tsx`、`tabletop-raster-*.tsx`、`tabletop-detail-*`、`use-tabletop-*.ts`（引擎会话、显示状态、mock machine）、`tabletop.css`。
- `phase/`：阶段机与适配层 —— `flow-phase.ts`、`dungeon-flow-step.ts`、`engine-bridge.ts`（`GameState → TabletopWorld`）、`adapt-game-state-to-tabletop-world.ts`、`formal-display-state.ts`、`project-quest-setup-heroes.ts`、`debug-drawer.tsx`。
- `sections/`：界面分区 —— 顶栏、中央舞台、地图舞台、队伍列、控制轨、行动坞、详情面板、先攻面板、条件/补给/房间玩家辅助、战斗行动面。

### 5.7 `e2e/`

- `core/` 38 个：核心盒关键路径（建队、地牢、村庄、终战、各 Boss 存档、正式战斗/探险）。
- `weald/` 27 个：Weald 任务、Boss、奇物、存档与威胁链。
- `fixtures/` 20 个：Playwright 用的场景/种子/队伍构造器（`hag-i.ts`、`pounder-i.ts`、`zero-capacity.ts` …）。
- 另有两个非 spec 辅助：`initial-threat-setup.ts`、`ssr-test.ts`。

冒烟原则：每个阶段只做 1–3 条关键路径，不做全量回归墙（见 `AGENTS.md`）。

---

## 6. `tools/pipeline` —— 数据流水线

规模：96 个文件 / 0.46 MB（不含生成的 PNG）。

| 子目录            | 内容                                                                                                              | 作用                                                                                                                                                                                                                                                                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `extract-print/`  | `README.md`、`REPORT.md`、`UPSTREAM.md`；`scripts/` 8 个 Python 脚本；`scripts/ddbg_extract/` 9 个模块            | 印刷 PDF 提取器（1.0.4 原样复制）。`run_all.py` 跑核心盒；`extract_weald_location.py`、`extract_cove_*`、`extract_warrens_*`、`extract_musketeer_*` 跑扩展；`ddbg_extract/` 内是 `assemble/catalog/cluster/config/pageextract/...` 提取实现。**不进 CI**，需要本机 PDF                                                                            |
| `print-card-art/` | `ddbg_print_art/` 17 个模块、`fixtures/` 5 个 CSV/manifest、`tests/` 7 个 unittest + 重定向包、`requirements.txt` | 印刷卡图批处理：裁出血、刀线、按页 PNG、manifest、品类映射。`bleed.py`、`diecut.py`、`export_pdf.py`、`classify.py`、`hero_standees.py`、`hamlet_board.py`、`room_tokens.py` … 分别处理不同印刷件                                                                                                                                                 |
| `scripts/`        | 28 个 `.mjs` + `quest-save-profile.ts` + `lib/` 4 个                                                              | Node 侧工具：`normalize.mjs`（重写 normalized）、`build-print-*-art-map.mjs` × 13（生成 Web 卡图映射）、`export-print-*.mjs`（调 Python 导出 PNG）、`audit-*.mjs`（英雄注解/图标语义审计）、`import-*-extract-from-ce.mjs`（导入扩展提取）、`package-web.mjs`（生成 `deploy/web`）、`quest-save-profile.ts`；`lib/` 是 CSV/路径/Python 解析小工具 |
| `src/`            | `index.ts`、`normalize-corebox.ts`                                                                                | 只做转发的薄封装，真正实现在 `packages/data`                                                                                                                                                                                                                                                                                                      |

`pnpm --filter @ddbg/pipeline normalize` 与 `test:print-card-art` 的入口都在 `package.json`。

---

## 7. `docs` —— 文档

规模：551 个文件 / 5.89 MB。

| 路径           | 内容                                                                                                                                                                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spec/`        | 规则规格书：`core-rules-spec-v0.3.md`（现行）、v0.2 历史快照、v0.3 changelog、`weald-rules-spec-v0.1.md`、`README.md`                                                                                                                          |
| `plans/`       | `weald-development-plan.md`（当前开发顺序）、3 份 2026-11-23 迁移计划（A2 迁移、图标语义解耦、规则字段迁移）                                                                                                                                   |
| `phases/`      | 按阶段的逐批次记录：`phase2` 5 篇、`phase3` 69 篇、`phase4` 95 篇、`phase5` 270 篇（Weald 逐 Boss/逐卡）、`phase6` 6 篇、`phase7` 5 篇                                                                                                         |
| `reviews/`     | 逐卡/逐 Boss 的数据审阅与审计：英雄、怪物、房间、奇物、Boss、规格复核；含 docx/xlsx/json 证据                                                                                                                                                  |
| `handoffs/`    | 13 份会话交接（给 Codex / Grok / DeepSeek Harness）                                                                                                                                                                                            |
| `screenshots/` | UX 截图与几何导出                                                                                                                                                                                                                              |
| 根目录         | `plan.md`（大纲 v0.2）、`rulings.md`（R-xxx 裁定，368 KB）、`id-naming-rules.md`（必读）、`repo-layout.md`、`data-legend.md`（图标图例）、`manual-room-tile-survey.md`，以及各类单主题记录（交付边界、收尾状态、图标处置、奇物切片、UX 评审…） |

---

## 8. 其它顶层目录

| 路径                                               | 内容                                                                           |
| -------------------------------------------------- | ------------------------------------------------------------------------------ |
| `assets/fonts/`                                    | `DwarvenAxe BB W00 Regular.ttf`，标题字体                                      |
| `.github/workflows/ci.yml`                         | CI：`typecheck → lint → test → build`；另跑 Python unittest 与 Playwright 冒烟 |
| `.github/ISSUE_TEMPLATE/`                          | `task.md`、`data-error.md`、`rule-ambiguity.md`、`config.yml`                  |
| `.github/PULL_REQUEST_TEMPLATE.md`                 | PR 模板（中文描述、测试、规则引用）                                            |
| `.cache/print-card-art/`                           | 从印刷 PDF 导出的 PNG 与 `manifest.csv`；运行时卡图源                          |
| `.cache/node-24.21.0/`、`.cache/reorg-2026-11-24/` | 本地运行时/重组备份                                                            |
| `test-results/`                                    | Playwright 上次运行结果                                                        |
| `apps/web/.vite/`                                  | Vite 依赖预构建缓存；gitignored                                                |

---

## 9. 核心数据模型速查

### 9.1 四层数据（`docs/repo-layout.md`）

| 层       | 路径                                     | 运行时读 | 部署带            |
| -------- | ---------------------------------------- | -------- | ----------------- |
| 提取源   | `packages/data/extract/**/*.json`        | 否       | 否                |
| 规范化   | `packages/data/normalized/**/*.json`     | **是**   | **是**（打进 JS） |
| 测试     | `packages/*/tests/**`、`apps/web/e2e/**` | 否       | 否                |
| 卡图映射 | `apps/web/src/card-art/*.json`           | **是**   | **是**            |

### 9.2 规范化卡的统一骨架

```jsonc
{
  "schema": "ddbg-normalized-v0",
  "dictionary_version": "1.8",
  "category": "hero_skill",
  "sources": {
    "parsed": "extract/corebox/parsed/hero_skill.json",
    "raw": "extract/corebox/raw/hero_skill.json",
    "dictionary": "dictionary/icon-dictionary-v1.8.json",
  },
  "stats": { "cards": 378, "verified": 378, "unverified": 0 },
  "cards": [
    {
      "id": "hero_skill:core:h01:p001",
      "pages": [1],
      "copies": 1,
      "name": "Smite",
      "level": 1,
      "source": { "file": "...SKILLS_FRONT.pdf", "page": 1 },
      "printed_labels": [{ "label": "Acc", "raw": "Acc 9", "value": 9 }],
      "unlabeled_numbers": [
        {
          "text": "13",
          "numeric": 13,
          "anchor": { "type": "printed_label", "label": "Crit" },
        },
      ],
      "effect_lines": [
        [
          { "type": "icon", "icon": { "iconId": "8d4bbe5e11", "naming": "confirmed" } },
          { "type": "text", "text": " +1 vs Unholy" },
        ],
      ],
      "top_row_icons": [{ "iconId": "978f861dea", "key": "stance_support_unlit" }],
      "name_row_icons": [],
      "stats_line": null,
      "rules": {
        "damage": { "lineIndex": 0, "amount": 1, "condition": "unholy" },
        "targets": { "hero": 0, "monster": 1, "heroOrMonster": 0 },
        "effect": "damage",
      },
      "front_icons": [],
      "back_icons": [],
      "issues": [],
      "verification": { "unverified": false, "reasons": [] },
      "hero": "CRUSADER",
      "back_name": "Smite",
      "back_level": 1,
    },
  ],
}
```

要点：图标不直接写「伤害/压力」等语义，只写 `iconId + 词典解析结果 + naming`；数字分「印在标签里」和「无标签」，不预设规则名（R-048）。

### 9.3 ID 形状（`docs/id-naming-rules.md`）

```text
房间族    room|room_tile|stygian_room : <location> : NN      // 房间号，不是页码
其他核心  <category> : pNNN[:face]
其他分包  <category> : <pack> : pNNN[:face]
英雄      <category> : <pack> : hNN : pNNN[:face]            // 18 名始终可选，pack 只归类
```

- 一个实体只有一个 canonical ID；存档与交叉引用只写它。
- 房间族不写 `:front/:back`；`room.number === room_tile.number === NN`。
- `hero_stat` 的 `:front/:back` 只在正反面需分别引用时写。

### 9.4 关键 schema 位置

| 数据                      | schema 文件                                                          |
| ------------------------- | -------------------------------------------------------------------- |
| 提取 raw / parsed / 报告  | `packages/data/src/shared/extract/{raw,parsed,reports}.ts`           |
| 规范化通用卡              | `packages/data/src/shared/schema.ts`                                 |
| 房间 / 板块几何 / Stygian | `src/core/rooms/{room.ts, room-tile.build.ts, stygian-rooms.ts}`     |
| 奇物                      | `src/core/curios/curio.ts`                                           |
| 怪物池                    | `src/core/monsters/{monster-pool,darkest-monster-pool}.ts`           |
| 任务卡 / QuestMap         | `src/core/quests/quest-cards.ts`、`src/core/tiles/dungeon-layout.ts` |
| 村庄事件 / 疾病           | `src/core/hamlet/{hamlet-event,disease}.ts`                          |
| 存档                      | `src/shared/quest-save.ts`                                           |
| 图标词典                  | `src/shared/dictionary/schema.ts`                                    |

---

## 10. 规模一览（当前工作区）

| 区域                       | 文件数 | 体积     |
| -------------------------- | ------ | -------- |
| `packages/engine/src`      | 375    | 2.39 MB  |
| `packages/engine/tests`    | 565    | 4.18 MB  |
| `packages/data/src`        | 165    | 1.04 MB  |
| `packages/data/tests`      | 100    | 0.42 MB  |
| `packages/data/extract`    | 56     | 10.44 MB |
| `packages/data/normalized` | 67     | 8.27 MB  |
| `packages/data/dictionary` | 12     | 1.18 MB  |
| `apps/web/src`             | 191    | 1.02 MB  |
| `apps/web/e2e`             | 85     | 0.37 MB  |
| `tools/pipeline`           | 96     | 0.46 MB  |
| `docs`                     | 551    | 5.89 MB  |

内容量（规范化层）：英雄技能 378 张、英雄属性 54 面、中型怪物 54、大型怪物 20、饰品 38、怪癖 35、美德/折磨 10、房间 25、Stygian 房 17、奇物 24、任务卡 19、村庄事件 16、疾病 11、QuestMap 14、房间板块几何 25。

---

## 11. 已知的文档/路径漂移（阅读时注意）

2026-11-25 的 P2–P7 重组把测试从 `src` 移到 `tests`，部分说明文件还指向旧路径：

1. `tools/pipeline/scripts/normalize.mjs` 里写死的四个测试路径（`packages/data/tests/core/misc/normalize.build.test.ts`、`tests/weald/monsters/weald-monsters.build.test.ts`、`tests/weald/curios/weald-curios.build.test.ts`、`tests/weald/quests/weald-higher-quests.build.test.ts`）**当前不存在**；实际文件分别在 `tests/shared/normalize.build.test.ts`、`tests/weald/monsters/monsters.build.test.ts`、`tests/weald/curios/curios.build.test.ts`、`tests/weald/quests/higher-quests.build.test.ts`。运行 `pnpm --filter @ddbg/pipeline normalize` 前先核对。
2. `packages/data/normalized/README.md` 仍写「由 `packages/data/src/normalize/` 生成」，该目录已不存在；现入口是 `tools/pipeline/src/normalize-corebox.ts` → `packages/data/src/shared/write.ts`。
3. `packages/data/dictionary/README.md` 写「Zod schema 在 `packages/data/src/dictionary/`」，实际在 `src/shared/dictionary/schema.ts`。
4. `packages/data/src/core/heroes/annotations/README.md` 的零 diff 命令指向 `packages/data/src/normalize/normalize.test.ts`，实际是 `packages/data/tests/shared/normalize.build.test.ts`。
5. `README.md` 与 `tools/pipeline/print-card-art/README.md` 中的若干 `docs/phase4-*.md` 链接，实际文件在 `docs/phases/phase4/` 下。
6. 上述 README 里的测试文件名（如 `weald-rooms.test.ts`、`cove-rooms.test.ts`）是重组前的名字，现为 `*.build.test.ts`。

这些不影响已入库的 JSON 与运行时代码，但会影响「按文档重跑生成/验证」的操作。

---

## 12. 想改什么，该动哪里

| 目标                              | 入口                                                                                                                                         |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 新增/修正一张卡的文字、图标、数值 | `packages/data/extract/**`（源）→ `packages/data/src/**/*.build.ts` + 核准表 → 跑对应 `packages/data/tests/**` → 重生成 `normalized`         |
| 改英雄技能的人工裁定              | `packages/data/src/core/heroes/annotations/hNN-*.ts`，再跑零 diff                                                                            |
| 新增房间/板块                     | `src/core/rooms/*`、`room_tile_geometry`，同步 `normalized` 与 `engine/src/shared/core/room-tile-selection.ts`                               |
| 新增 Boss                         | `packages/data/src/core/bosses`（数据）+ `packages/engine/src/core/bosses/<boss>`（脚本/钩子/运行时），在 `ensure-core-boss-scripts.ts` 注册 |
| 改一条规则                        | 先查 `docs/spec` 与 `docs/rulings.md`；实现落在 `packages/engine/src/shared/**` 或对应 Boss 目录，补黄金测试                                 |
| 改 UI 流程                        | `apps/web/src/dungeon-sandbox`（正式入口/沙盒）或 `apps/web/src/tabletop`（mock 原型）                                                       |
| 改卡图映射                        | `tools/pipeline/scripts/build-print-*.mjs` 生成 `apps/web/src/card-art/*-print-art-map.json`                                                 |
| 改存档格式                        | `packages/data/src/shared/quest-save.ts`（schema/版本）+ `packages/engine/src/shared/quest/quest-save.ts`（回放校验）                        |
| 改图标含义                        | `packages/data/dictionary/icon-dictionary-v1.8.json` + CHANGELOG；不要改全局词典去迁就单张卡                                                 |
