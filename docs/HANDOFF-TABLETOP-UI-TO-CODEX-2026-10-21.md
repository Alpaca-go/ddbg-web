# DDBG · Tabletop UI 交接给 Codex（2026-10-21，Asia/Shanghai）

> **读者**：即将接手的 Codex（或其他本地编码代理）。  
> **作者**：DDBG·桌游 UI（Grok Bot 侧 UI 协调）。  
> **仓库 tip**：main **`0e72e33`**（合并 [PR #273](https://github.com/Alpaca-go/ddbg-web/pull/273) 之后）。  
> **本地检出**：Kyries 电脑 `D:\ddbg-web`（hostname `DESKTOP-50QHUR1`，machineId `b56e2651-c5ab-4795-bff7-f7d49993b1f4`），应用 `git pull --ff-only` 对齐。  
> **交接原因**：Kyries 要求 tabletop UI 后续改由 Codex 推进。本文只覆盖 **桌面 UI 重制线（T0–T13）**；引擎 / Phase 4 规则进度仍以既有 `docs/HANDOFF-FROM-CODEX-*.md` 与 `docs/plan.md` 为准。

---

## 0. 开场必读（按顺序，不要跳）

1. 本文件全文。  
2. 仓库根目录 [`AGENTS.md`](../AGENTS.md)。  
3. [`docs/plan.md`](plan.md)（开发大纲 v0.2）。  
4. [`docs/rulings.md`](rulings.md)——**R-001（只认官方规则书）、R-048（不自创印刷几何）尤其重要**。  
5. UI 原型规划（**不在仓库里**，在共享工作区）：  
   - `/workspace/ddbg-ui-prototype-plan.md` —— 设计稿五区映射、切片 **T0–T14**、待确认 **V-01..V-16**。  
   - `/workspace/ddbg-ui-flow-plan.md` —— 更早的 P1–P16 / U-01..U-15 流程规划。  
6. 代码入口：`apps/web/src/tabletop/`（尤其 `tabletop-view.tsx`、`phase/`、`sections/`）。

读完再改代码。不要凭电子游戏 Darkest Dungeon、TTS 模组布局或旧仓库猜 UI / 规则。

---

## 1. 这条线在做什么

把网页沙盒 UI 改成**正俯视、像真实桌游桌面**的布局，只改 **`apps/web` 表现层**。

| 已定约束（Kyries 拍板） | 说明 |
|---|---|
| 正俯视、不倾斜 | 不要 3D / CSS 透视桌面 |
| 固定 4 个玩家位 | 不按人数伸缩席位 |
| 疾病 / 正负怪癖 / 美德 / 苦难牌堆 **不常驻桌面** | 触发时再滑出翻开（T9） |
| 布局为网页重设计，**不抄 TTS 模组桌** | TTS 截图只作「桌游感」参考 |
| 美术只用印刷稿导出 | 路径见下；**禁止 TTS 图、禁止 AI 图** |
| R-048 | 不自创印刷几何；未核实图标用文字占位 |
| U-01（已批） | 翻牌 / 掷骰 / 移动 token 可用 **≤300ms CSS** 过渡；**不加音效**（破例进首版范围） |
| 不进 Phase 5 | |
| CI | GitHub Actions 因未充值不可用；**以本机闸门为准**，CI 红可以忽略 |

设计稿是一张 AI 图（电子 RPG 风：HP 条、PROT%、火把库存、End Turn 等）。规划里已逐项改写成桌游真实部件；找不到的删除或标「待确认」。**不要把设计稿上的电子游戏概念原样搬进代码。**

---

## 2. 仓库与本机环境

| 项 | 值 |
|---|---|
| GitHub | https://github.com/Alpaca-go/ddbg-web （private） |
| 当前 main | `0e72e33` |
| 本地路径 | `D:\ddbg-web`（不要同步到 `C:\Users\kyrie` 下的原始资料目录） |
| 合并后同步 | `git -C D:\ddbg-web pull --ff-only` |
| Node | `24.21.0`（`.nvmrc`） |
| 包管理 | pnpm `12.9.1` |
| 本机 Python | `py -3`（没有 `gh` CLI 时用其它方式） |
| Vite 本地端口 | **8080 只留本机，不提交** |

```bash
pnpm install
pnpm dev          # apps/web
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

**本机验 PR 惯用流程**（在 `D:\ddbg-web` 旁开 worktree，避免弄脏 main）：

```powershell
cd D:\ddbg-web
git fetch origin <branch>
git worktree add ..\ddbg-web-prNNN FETCH_HEAD
cd ..\ddbg-web-prNNN
pnpm install --frozen-lockfile
pnpm typecheck; pnpm lint; pnpm test; pnpm build
# 通过后：
cd D:\ddbg-web
git worktree remove ..\ddbg-web-prNNN --force
git pull --ff-only
```

**已知 flaky**：`packages/engine/src/web-quest-catalog.test.ts` 全量跑偶发超时（约 65s+）；单独 `pnpm vitest run packages/engine/src/web-quest-catalog.test.ts` 能过。**UI PR 若未改 `packages/`，该失败可记在 PR 描述里，不当作本 PR 回归。** 真正属于 UI 的失败必须修。

---

## 3. 怎么打开新 UI

- 新桌面：**只在** `?view=tabletop`。  
- 首页默认仍是旧 sandbox（Kyries 尚未要求切首页）。  
- 接引擎读状态：`?view=tabletop&engine=battle` 或 `&engine=dungeon`。  
- 无 `engine` 参数时用 mock（`use-tabletop-mock-machine.ts`）。  
- 调试切阶段：调试抽屉默认**收起**；也可用 `?demoPhase=hamlet|dungeonExploration|…`（T3 验收用法）。

---

## 4. 代码地图（`apps/web/src/tabletop/`）

| 路径 | 作用 |
|---|---|
| `tabletop-view.tsx` | 五区壳入口 |
| `tabletop.css` | 桌面样式（体量大，改布局先看这里） |
| `tabletop-types.ts` / `tabletop-initial-state.ts` | mock / 显示用类型与初始数据 |
| `tabletop-raster-image.tsx` / `tabletop-raster-piece.tsx` | 印刷稿加载；`onError` → 占位 |
| `asset-placeholder.tsx` | 缺图占位：**只显示中文 `label`**，素材 key 放 `data-asset-type`，不要把 key 拼进可见文案 |
| `phase/flow-phase.ts` / `phase-zone-plan.ts` | 阶段枚举与各区按阶段显示什么 |
| `phase/adapt-game-state-to-tabletop-world.ts` | **引擎 GameState → 桌面投影**（T2/T3 已用） |
| `phase/engine-bridge.ts` / `use-tabletop-engine-session.ts` | 引擎会话桥 |
| `phase/debug-drawer.tsx` | 调试抽屉（默认收起） |
| `sections/tabletop-top-bar.tsx` | 顶栏 |
| `sections/tabletop-party-column.tsx` | 左栏队伍（T2） |
| `sections/tabletop-detail-panel.tsx` | 右栏详情（T3） |
| `sections/tabletop-center-stage.tsx` / `tabletop-map-stage.tsx` | 中央舞台 |
| `sections/tabletop-action-dock.tsx` | 底栏行动区（T5 再做真交互） |
| `sections/tabletop-initiative-panel.tsx` | 先攻相关壳（T4 要接真战斗） |
| `resolve-monster-skill-display.ts` | 怪物本回合选招只读展示 |

**硬边界**：

- **只改 `apps/web` 表现层。**  
- **不要改** `packages/engine`、`packages/data`、存档 schema、规则数值。  
- 规则或核心交互要动 → 标「待确认」，等 Kyries 拍板；需要引擎同学时走 **DDBG·开发** 线，不要自己在 UI 里推算规则。

---

## 5. 已合并进度（到 tip `0e72e33`）

| 切片 | PR | tip / 合并 commit | 内容 |
|---|---|---|---|
| T0 | [#270](https://github.com/Alpaca-go/ddbg-web/pull/270) | `d799da1` | 五区布局 + mock 状态机 + `tabletop.spec` e2e |
| T1 | [#271](https://github.com/Alpaca-go/ddbg-web/pull/271) | `f655482` | 六段阶段导航、`resolveFlowPhase`、EngineBridge、中央舞台、`TabletopRasterImage`、调试抽屉默认收起 |
| T2 | [#272](https://github.com/Alpaca-go/ddbg-web/pull/272) | `c1faf7b` | 左栏 `PartyColumn` 经 `adaptGameStateToTabletopWorld` 读引擎；QuestThumb 缺图显示「Q」+ 标题 |
| T3 | [#273](https://github.com/Alpaca-go/ddbg-web/pull/273) | `0e72e33` | 右栏 `DetailPanel`：怪物 / 英雄 / 房间 / 建筑 / 任务；选中切换；怪物 `battle.monsterAction` 只读 |

**未合并 / 已关闭**：

- [#269](https://github.com/Alpaca-go/ddbg-web/pull/269) P1 阶段壳：**关闭未合**，内容并入 T1。

**docs/plan.md**：UI 切片进度**尚未**写回 plan（已知欠账；交接后请补一段 tip 或单独 UI 进度段）。

---

## 6. 建议下一步（严格按规划顺序）

规划建议顺序：

`T0 → T1 → P2 → P3 → T2 → T3 →` **`T4 → T5 → T7 → T6 → T8 → T9 → T12 → T10 → T11 → T13`**；T14 / P15 等确认。

**当前 tip 已完成 T0–T3。下一块是 T4。**

### T4 — 战斗：中央 + 左下先攻（🖼 先截图给 Kyries）

- 把现有 `BattleView`（或等价战斗表现）放进新五区布局。  
- 中央：姿态轨 + 区域网格（区域印刷坐标未核实前继续网格，**U-12 / V-10**）。  
- 左下：先攻牌堆 + 已翻开的牌 + 回合轨（第 r/4 轮）。  
- 验收：原有战斗冒烟全过；1280 宽无横向滚动；typecheck / lint / test / build 本机全绿。  
- **视觉大改：合并前先发 1280×800（及建议 1920）截图给 Kyries。**

其后简要：

| # | 内容 | 备注 |
|---|---|---|
| T5 | 底栏行动分页 + 技能手牌 + 确认 | 手牌目前 mock/列表偏「全部技能」；**只显示已装备**在 T5 做（V-05） |
| T7 | `ChoiceTray` 统一 PendingChoice | |
| T6 | `DiceTray` + 结束回合按钮 | 按钮语义依赖 **V-01**；前端禁止 `Math.random` |
| T8 | 探索画面 | 不新增未核实坐标（R-048） |
| T9 | 卡牌滑出 CardReveal | 疾病/怪癖/苦难美德 |
| T12 / T10 / T11 / T13 | 回村 / 村庄 / 出征 / 开局建队 | |
| T14 | 木桌蜡烛氛围 + 动效 | U-01 已批；氛围图是否允许纯 CSS 见 **V-06** |
| P2 | 拆分 `dungeon-sandbox.tsx` | 流程规划保留项 |
| P3 | 素材 map 第一批 | T9 依赖 |
| P15 | 战斗板块热区 | 等 U-12 |

一个任务一个 PR；小改可合成一个。提交信息、PR 标题与描述**一律中文**。普通 UI PR 本机闸门全绿可合并；**视觉方向大改先截图**。

---

## 7. 待确认清单（交给 Kyries，不要擅自定案）

### 规划 V 项（原型规划 §6）

| 编号 | 问题 | 建议默认（未拍板前可按此做，并在 PR 标「待确认」） |
|---|---|---|
| V-01 | 有无「结束回合 / 放弃剩余行动」？引擎命令？ | 没有 → 按钮文案「抽下一张先攻」 |
| V-02 | 火把计数 | 改成光照 0–5 |
| V-03 | 钥匙 / 徽记计数 | 钥匙删；徽记位按阶段显示柴火或驿站 XP |
| V-04 | Room 2 of 7 进度 | 改成任务 XP 目标 + 已清理房间数 |
| V-05 | 技能张数 | 按引擎已装备数量，不固定 5 |
| V-06 | 木桌蜡烛纯 CSS | 允许纯 CSS，不用氛围图 |
| V-07 | 英雄头像裁切 | **只缩小整张，不裁切**（R-048） |
| V-08 | punchboard 代币映射（U-04） | 无核实 → 文字+颜色占位 |
| V-09 | 怪物风味文字 | 删掉该格 |
| V-10 | 战斗中央房间板块整图 | 继续区域网格 |
| V-11 | 左栏排序 | 按姿态顺序，行上标席位号 |
| V-12 | `?view=tabletop` 去留 | 暂时保留 mock；T13 再定 |
| V-13 | #269 | 已关闭；T1 已做完，可忽略 |
| V-14 | 引擎字段名 | 以 `packages/engine` 类型为准，UI 不猜 |
| V-15 | 右栏 Focus/Attack | **已按默认删掉**（T3） |
| V-16 | 饰品「每回合一次」是谁的回合 | 按引擎现状 |

### T2 / T3 PR 里仍标着的占位

- 白 / 红压力面美术  
- `hero_stat` 印刷稿接入方式  
- 英雄头像（受 V-07 约束）  
- 怪物 `targetPriority` 等引擎无字段时显示「待确认」  
- 村庄服务选项与价格、升级费用、今日看守占用  
- 建筑热区几何（U-07）；人手裁切的 `manual\hamlet-building-tiles` 仍待 Kyries  
- 31 张未归类印刷图归属待确认  

### 流程规划 U 项（未关闭的）

U-02 素材路径、U-03 骰面、U-04 punchboard、U-07 村庄热区、U-10 dungeon_tile/quest_map、U-12 板块区域坐标、U-13 先攻卡背。**U-01 已批。**

---

## 8. 美术资产

- **统一来源**：本机 `D:\ddbg-web\.cache\print-card-art\`（gitignore，不入库）。  
  结构大致：`library\<category>\<expansion>\<front|back|single>\`。  
- **可直接用整张的**（此前盘点）：`hero_skill`、`hero_stat`、`hero_standee`×8、怪物卡、房间、tiles、quest_map 等。  
- **仍需裁切 / 没有的**：头像（V-07）、punchboard token、骰面（从 `dice_net`）、**没有**怪物立牌、**没有**氛围图。  
- 缺图：用 `AssetPlaceholder` / `TabletopRasterImage` 回退，**可见文案用中文短名**，不要把 `hamlet_board` 这类 key 拼进 UI。

共享资料（只读，不要改 Kyries 原始资料）：

- `/workspace/ddbg-src/`、`/workspace/ddbg-spec/`、`/workspace/ddbg-plan/`  
- 原型规划：`/workspace/ddbg-ui-prototype-plan.md`

---

## 9. 工作方式约定（给 Codex）

1. **中文**沟通与 PR。拿不准标「待确认」，等 Kyries。  
2. 一个主题一个 PR；有效改动建议别涨太大。  
3. 视觉大改：先截图（1280×800 必给），Kyries「可以」再合并。  
4. 合并权：本机闸门全绿的普通 UI PR 可合；合后 `git pull --ff-only`。  
5. **不要**为了 UI 去改引擎测例来「绕过」失败；`virtual:battle-data` 之类 Vite 虚拟模块在**根目录 vitest** 解析不了——参考 T3 对 `adapt-game-state-to-tabletop-world.test.ts` 的 `vi.mock` + 读 `packages/data/normalized/...` JSON 的写法。  
6. 不要聊作品集 / 妙作 / 插画 / 餐饮品牌（其它机器人的事）。  
7. 队友：规则与引擎进展问 **DDBG·开发**；进度流水账可交给 **DDBG·进度记录**。本线 UI 决策默认找 Kyries。

---

## 10. 验收速查（每个 UI PR）

- [ ] 只动了 `apps/web`（或文档）；`git diff origin/main...HEAD -- packages tools` 为空（除非 Kyries 另批）  
- [ ] `pnpm typecheck` / `lint` / `test` / `build` 本机绿  
- [ ] 相关 Playwright（`tabletop.spec` 等）不回归  
- [ ] 无 TTS / AI 图；未核实图标仍是占位  
- [ ] 1280 宽无横向滚动；调试抽屉默认收起  
- [ ] PR 中文描述列出「待确认」  
- [ ] 若 🖼：截图已给 Kyries 且口头/消息通过  

---

## 11. 一句话当前状态

**T0–T3 已在 main（`0e72e33`）。下一步做 T4（战斗中央 + 左下先攻），合并前先截图。首页仍是旧 sandbox；新 UI 仅 `?view=tabletop`。**

