# UX-02A · 地牢探索地图与信息精简（交付说明）

- 基线：`main` @ `1b05f3760b429bfd983969215b90a40de8c5dff2`（UX-01 已合并）
- 范围：仅 `apps/web` 表现层 + 定向测试 + 本文档；**未**改 engine/data、存档、S4、UX-02B、UX-03
- 状态：**Draft PR，待 Kyries 1280×800 / 1920×1080 截图验收后合并**

## 1. 修改文件与差异摘要

| 文件                                                                              | 说明                                                                          |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `apps/web/src/dungeon-sandbox/formal/formal-dungeon-exploration-view.tsx`         | 去掉与顶栏重复的任务标题/目标；地图占满中央行，房间代币叠在地图右下角         |
| `apps/web/src/dungeon-sandbox/expedition/formal-tabletop-scouting-panel.tsx`      | **新增**：正式探索专用侦察区——决策 / 命令 / 可折叠档案三分区                  |
| `apps/web/src/dungeon-sandbox/expedition/scouting-panel.tsx`                      | `layout=tabletop` 时委托新面板；沙盒/mock 路径不变                            |
| `apps/web/src/tabletop/tabletop-formal-shell.tsx`                                 | 探索阶段顶栏投影补给 `n/16`、柴火状态                                         |
| `apps/web/src/tabletop/sections/tabletop-top-bar.tsx`                             | 展示补给与柴火资源位                                                          |
| `apps/web/src/tabletop/tabletop.css`                                              | UX-02A 探索网格：地图优先、行动区限高、侦察三分区响应式                       |
| `apps/web/src/dungeon-sandbox/expedition/formal-tabletop-scouting-panel.test.tsx` | Curio 当前/已结算分离单测                                                     |
| `vitest.config.ts`                                                                | 纳入 `apps/web/**/*.test.tsx`（与既有 `tabletop-detail-panel.test.tsx` 一致） |

## 2. 信息归属与操作入口（UX-02A 清单）

### 2.1 常驻（首屏优先）

| 信息 / 操作                                                                             | 宿主                                | testid / 备注                                                                               |
| --------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------- |
| 金币、光照、任务进度、补给 `n/16`、柴火                                                 | 顶栏 `TabletopTopBar`               | `tabletop-gold`、`tabletop-quest-progress`、`tabletop-provision-count`、`tabletop-firewood` |
| 四人伤口/压力/状态/饰品                                                                 | 左栏 `TabletopPartyColumn`          | 各 `tabletop-hero-row-*`                                                                    |
| 地牢 QuestMap + 队伍位置 + 可选房间节点                                                 | 中央 `FormalDungeonExplorationView` | `quest-map-frame`、`formal-dungeon-exploration`                                             |
| 当前房间卡/代币（点开详情）                                                             | 地图角标                            | `tabletop-current-room-card`                                                                |
| **待处理决策**（pending、房间结算、阻塞原因、未结算探索骰、活跃 Curio、战役失败、替补） | 侦察「决策」列                      | `dungeon-exploration-decisions`、`dungeon-pending-choice`、`dungeon-curio`（仅 active）     |
| **探索命令**（侦察/路线/返回/休息/离开/房间战斗链/补给 fieldset 等）                    | 侦察「命令」列                      | `dungeon-exploration-commands`（**未**搬到底栏，留 UX-02B）                                 |
| 引擎事件摘要                                                                            | 顶栏「日志」抽屉                    | `tt-log`；中央档案内保留 `dungeon-events` 副本                                              |

### 2.2 折叠档案（可追溯，非当前决策）

| 内容                                                                       | 宿主                                                  |
| -------------------------------------------------------------------------- | ----------------------------------------------------- |
| 流程检查点、探索骰次数、柴火全文、补给明细、金币副本、四人压力/疾病/状态栈 | `<details data-testid="dungeon-exploration-archive">` |
| 已结算探索骰                                                               | `dungeon-rolls-settled`                               |
| **已结算 Curio**（`curio.last`，不与 active 混显）                         | `dungeon-curio-settled`                               |
| 房间牌池/印刷转录、怪物池余牌、RNG/命令计数                                | 档案内 `<details>`                                    |

### 2.3 未改动的路径

- Mock / 非 `formal` 沙盒：`ScoutingPanel` 原单栏布局与 `shownCurio = active ?? last` 行为保留（e2e `dungeon.spec.ts` 不变）
- S3 战斗底栏、Portal、`formal-battle.spec.ts` 保护项未动

## 3. 信息迁移前后对应表

| 原正式探索主区展示                                             | UX-02A 后唯一/主位置                    | 原数据是否仍可达                         |
| -------------------------------------------------------------- | --------------------------------------- | ---------------------------------------- |
| 中央 H1 任务名 + `dungeon-quest-objective`                     | 顶栏任务进度 + 地图下一句位置           | 任务名仍在顶栏 breadcrumb / 地图 caption |
| 四人压力伤口长段 `dungeon-pressure`                            | 左栏英雄行                              | 档案内短副本                             |
| 共享金币 `dungeon-gold`                                        | 顶栏金币                                | 档案内副本                               |
| 公共补给 `dungeon-provision-count` / 明细 `dungeon-provisions` | 顶栏 `n/16`；使用仍靠命令列 fieldset    | 档案内完整明细                           |
| 柴火 `dungeon-firewood`                                        | 顶栏柴火 + 档案全文                     | 是                                       |
| 探索加成 `dungeon-bonus`                                       | 档案                                    | 是                                       |
| 疾病/怪癖/饰品/状态栈                                          | 左栏 + 详情；主区不再重复               | 档案                                     |
| 历史事件 `dungeon-events`                                      | 顶栏日志；档案摘要                      | 是                                       |
| Curio `active ?? last` 混在同一卡面                            | **仅 active** 在决策列；**last** 在档案 | 是                                       |
| 房间牌印刷页/牌池 9 张/转录                                    | 档案内 details                          | 是                                       |
| 开发行「命令 n · RNG 游标」                                    | 仅档案                                  | 是                                       |
| 探索操作按钮群                                                 | 仍在中央（命令列），未迁底栏            | 全部保留                                 |

## 4. 截图

| 视口      | 基线（UX-00/01）                                             | UX-02A 后                                                                                |
| --------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| 1280×800  | 见 `docs/ux00-ui-baseline-audit-2026-10-22.md` §2 截图 03–07 | PR 附件 / CI 产物：`docs/screenshots/ux02a-1280-exploration.png`（本地生成后随 PR 上传） |
| 1920×1080 | 同上 §2 截图 03–07 @1080p                                    | `docs/screenshots/ux02a-1920-exploration.png`                                            |

> 截图需在合并前由执行环境用正式探索 fixture 导出；若 PR 未附图为验收阻塞项。

## 5. 质量命令（本机 2026-10-22）

| 命令                                                                                                   | 结果                                                            |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `pnpm typecheck`                                                                                       | 通过                                                            |
| `pnpm exec eslint`（UX-02A 触及的 `apps/web` 源文件 + `vitest.config.ts`）                             | 通过                                                            |
| `pnpm lint`（全仓库）                                                                                  | 失败：工作区存在未忽略的 `/.cache/check.cjs`（与本次改动无关）  |
| `pnpm build`                                                                                           | 通过                                                            |
| `pnpm exec vitest run apps/web/src/dungeon-sandbox/expedition/formal-tabletop-scouting-panel.test.tsx` | 2/2 通过                                                        |
| `pnpm test:e2e -- apps/web/e2e/formal-exploration.spec.ts`                                             | 通过；生成 `docs/screenshots/ux02a-{1280,1920}-exploration.png` |
| `pnpm test:e2e -- apps/web/e2e/formal-battle.spec.ts`                                                  | 通过（S3 底栏回归）                                             |

## 6. 未解决问题

- 顶栏资源仍较挤（1280 下任务进度 ellipsis）；UX-02B 迁探索命令后可能缓解
- 档案内事件仍来自当次 `dispatch` 的 `events` 切片，**非**持久战役日志（与 UX-00 A11 一致）
- 房间牌池/怪物池统计仍在档案，未做右栏详情专页
- 「离开地牢」等文案与引擎能力对齐未在本轮逐条改（A10 留 UX-02/05）

## 7. 回滚

Revert 本 PR 单提交即可；无存档/schema 变更。

## 8. UX-02B 拟实施范围（本轮未做）

- 将探索命令列（侦察/路线/骰盘触发/补给托盘等）迁入正式底栏或右侧控制轨，与 `phase-zone-plan` 中 dock/diceTray 对齐
- 1280 下决策列与命令列的单列堆叠可改为「当前决策浮层」以减少纵向争抢
- 与日志/档案的统一「战役时间线」展示（仍不改 engine 事件存储）
