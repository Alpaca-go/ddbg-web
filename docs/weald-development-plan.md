# Weald 扩展开发计划

Kyries 于 2026-11-11 确认此顺序，后续 session 以本文件作为 Weald 开发入口。
本计划是开发安排，不新增规则裁定；规则来源仍遵守 AGENTS.md、R-001、R-048。

## 当前进度与下一步

- **当前阶段：步骤 5 已接通 `quest:weald:p001`–`p005`（**R-252**／**R-244**／**R-245**／**R-248**／**R-242**）；须选 Weald 包；村庄分地点抽 2 选 1，Hamlet 可出征五任务。步骤 2 地点切换与正式格式日志存档首批已验证；五任务自然通关留待 I 级阶段验收。步骤 4 战斗真菌链路不变。**
- **当前批次**：已选 Weald 包时的正式开局第一趟分地点抽选、起点存档与浏览器冒烟，详见「步骤 5 第十五批」，正在全量验证。
- **下一刀：I 级普通任务阶段验收。Crone #651 已合入；地点切换与存档首批 #652 已 squash 合入 main（`14027146`）。Boss、II／III 与 Stygian 随后推进。字段核准遵守 R-048。**
- 步骤 0 已完成，提交 `e7fd17e1`；地点战役尚未开放。
- 导入与计划两批已合入并推送 `main`（`3be97c65`）。步骤 1 怪物批次已合入并推送 `main`（`7075f4d8`）。
- Houndmaster、Shieldbreaker 已接入，沿用现有英雄实现，不重做。
- Hag I 已有部分运行时；Brigand Pounder、Shrieker 仍有身份占位，不能视为正式 Boss 闭环。
- 普通九张房间与板块几何批已结案（R-239）；Boss 房、Stygian 与其余扩展仍按各自审阅批次推进，不按本批类推。
- 奇物批次 `40b2617f` 与步骤 2 首批组池改动已合入 `main`：16 张、64 行由 Kyries 确认（R-233），独立目录与 Torch 效果规划已接入。见 [奇物审阅记录](weald-curio-review-2026-11-11.md)。第十四批已在 I 级换任务时按地点重建当地＋通用奇物来源，整体可玩验收仍随后进行。
- 首批更正见 R-230；Blight 中文统一为腐蚀（R-231）；抗性/免疫和大型卡灰栏见 R-232。技能选区已结案，不再送审。原始图标命名状态与实际部署能力分别记录。

## 开发顺序与完成标准

按“数据核实 → 普通任务闭环 → Boss → 完整战役”推进。完成一项后更新本文件，再进入下一项。

| 步骤                    | 状态   | 开发内容                                                                      | 完成标准                                                         |
| ----------------------- | ------ | ----------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 0．资料导入             | 已完成 | 地点 raw/parsed、规则规格书、正反面和图标审阅页                               | 资料可追溯、可复跑，解析失败明确保留                             |
| 1．普通怪物与奇物       | 进行中 | 从 I 级普通怪物开始，随后核实当地奇物；确认大型参考卡与实际副本               | 已核实字段进入 normalized 和相应运行适配；未知字段显式保留待审   |
| 2．地点牌堆             | 进行中 | 按目标地点建立“当地怪物＋通用怪物”“当地奇物＋通用奇物”                        | 包属过滤正确，副本守恒，选包与存档回放一致，无跨地点串池         |
| 3．普通房间与板块       | 进行中 | 核实 9 张普通房间及对应板块容量、邻接、墙、高低地、标记                       | 已核实房间能够正确部署；未核实几何不提供默认值                   |
| 4．Weald 专属机制       | 进行中 | 零容量区域通行与回合结束限制；真菌放置、全场禁疗、技能摧毁                    | 引擎与 UI 完成合法操作，拒绝非法操作；遵循 W-03、W-04            |
| 5．I 级任务闭环         | 审阅中 | 核实 I 级任务分布、目标、XP、特殊规则并接线                                   | 村庄选任务 → 出征 → 探索与战斗 → 结算回村，存档可恢复            |
| 6．三个 Boss I 级       | 待推进 | 顺序为 Hag → Brigand Pounder → Shrieker；补齐房间、部署、能力、附属单位、清场 | 每个 Boss 都能从正式战役入口自然进入并结算，逐个完成再推进下一个 |
| 7．II／III 级与 Stygian | 待推进 | 先补高等级怪物、任务、Boss，再接 Stygian 房间替换                             | 各等级按实际卡面核实，不从 I 级推算；相应任务和战斗链可用        |
| 8．完整战役与收尾       | 待推进 | 多地点任务选择、Boss 池、跨幕推进、回村、升级、存档兼容                       | 核心＋Weald 完整战役通过质量闸门和关键路径冒烟                   |

## 步骤 1 的首批工作

1. 阅读当前版 Weald 怪物卡正反面，按印刷等级和用途区分普通怪物、大型参考卡、Boss、召唤物；不按页码或模型数量猜测牌堆资格。
2. 核实 I 级普通怪物的 Life、Dodge、Speed、抗性/免疫、姿态、技能和目标选择；对照核心图标词典，仅使用已有核准或本批获确认的语义。
3. 核实实际副本页和大型战斗卡对应关系。I 级五种怪物已按 R-230／R-232 核准；高等级及 Boss 不从首批推算。
4. 将核实结果接入 normalized 和已有战斗原语；规则歧义查裁定，没有裁定则记录待确认项，不填猜测值。
5. 增加对应的引擎单元/场景校验，检查核心内容和未启用 Weald 的战役不受影响。
6. 更新本文件的进度、剩余卡牌/字段和下一刀，再继续当地奇物与后续步骤。

Brigand Pounder 类型行、Shrieker’s Nest 和 Cauldron Empty 的专属卡面结构仍有解析停点，详见导入记录；它们不阻止先核实其他普通怪物。

## 步骤 2 的接续入口

核心规则 R9：通用卡没有地点图标，地点专属卡有地点图标；R10 和 Weald W3 规定组合当地与通用牌堆。当前核心 Curio FRONT p1–8 的旗帜无地点图标，p9–24 为 Ruins 门形图标；raw 对应两个已确认的地点旗帜图标组（`3825ad46df` / `27fe03d7a2`），地点身份与独立奇物组池入口已建立（`a503b370`）。不可把核心全部 24 张加入 Weald。

怪物可从既有 `packages/data/src/monster-pool.ts` 的 Common 身份及实体副本映射接续，结合 Weald 已核准目录，按等级过滤。正式接线前同时核对创建、守恒、回村和存档中现有核心专用目录校验，不能只放宽牌堆长度。

## 跨 session 接续

新 session 开始时，先读本文件“当前进度与下一步”，再核对工作区实际状态和最近提交。随后阅读当前步骤涉及的规格书、裁定及数据，继续最早未完成的步骤，避免重复导入资料或重做英雄。

每次结束前更新：当前步骤、已完成的具体内容及提交、剩余待确认字段、下一刀、实际验证结果。只有满足完成标准才将步骤标为已完成；导入成功、解析成功和正式可玩分别记录。

保持一个主题的小批提交，涉及规则注明规格书页码或裁定编号。沿用仓库质量闸门；阶段结束增加 1–3 条 Playwright 关键路径冒烟，不建立全量回归墙或 evidence/proof 链。纯文档变更检查格式和链接即可。

## 资料入口

- [Weald 规则规格书](spec/weald-rules-spec-v0.1.md)：W1–W4，含 W-01–W-05。
- [导入记录与解析停点](weald-location-intake-2026-11-11.md)。
- [内容包隔离约定](content-pack-isolation-2026-11-11.md)。
- [裁定与 Q-186](rulings.md)。
- 原始资料目录：`C:\Users\kyrie\Desktop\新建文件夹\DARKEST DUNGEON EN_FILES\DARKEST_DUNGEON_PRINT_EN_WAVE 2\MG_DD_06_EN_WEALD`。
- 已导入数据：`packages/data/extract/extension/weald/`。
- 本地私有审阅页：`node_modules/.cache/weald-review/cards/index.html`；可按导入记录用 `--review` 重建，页面与图片不提交。

## 接续记录

| 日期       | 已完成                                                                                                                                                                                         | 下一步                                                                                       | 验证                                                                                                                                                              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-11 | 步骤 0，提交 `e7fd17e1`；本计划获 Kyries 确认                                                                                                                                                  | 步骤 1：I 级普通怪物核实与接线                                                               | 导入批：Node 24.21.0；typecheck、lint、build 通过；481 个测试文件通过，3,674 测通过、1 测跳过                                                                     |
| 2026-11-11 | 两批已合入并推送 main（`3be97c65`）；步骤 1 首批完成五种普通怪物待审规范化、Life 定位修正和 Windows 生成命令；代码与本记录在同一提交，可用 `git log -1 -- docs/weald-development-plan.md` 定位 | 等 Kyries 逐项更正属性与姿态候选，再核实技能、抗性/免疫并接战斗；尚未推进奇物                | Node 24.21.0；typecheck、lint、build 通过；483 个文件通过，3,685 测通过、1 测跳过；针对性 30 测通过                                                               |
| 2026-11-11 | R-230–R-232 确认五种 I 级怪物属性、抗性/免疫与 13 项技能；大型卡灰栏结案。译名及旧档兼容 `97132ce3`，核准数据 `494356b1`；引擎目录与本记录同一提交（用本文件 git log 定位）                    | 继续当地奇物；房间/容量/单位部署链接通后完成三项召唤，不能省略召唤执行伤害。技能选区不再送审 | Node 24.21.0；typecheck、lint、build 全通过；487 文件、3,725 测通过、1 测跳过；68 项针对性检查及 2 项旧档兼容通过                                                 |
| 2026-11-11 | R-233 确认 Weald 16 张奇物、64 行效果；独立规范化目录及 Torch 效果规划接入，当前记录与代码同一提交                                                                                             | 步骤 2：当地＋通用牌堆；召唤部署仍跟踪房间／容量依赖                                         | Node 24.21.0；typecheck、lint、build 通过；全量 487 文件通过、1 文件因既有 20 秒时限超时（3,736 通过、1 跳过），该存档文件单独复跑 9 项全通过；生成检查 31 项通过 |

### 步骤 2 首批：奇物地点目录

- 依据核心 R9–R10 与 Weald W3，新增 `curioPoolIdentity` 和 `locationCurioPool`：核心 p1–8 是通用卡，p9–24 是遗迹卡；Weald 独立目录为当地卡。
- 遗迹仍返回完整核心 24 张；Weald 返回 8 张通用＋16 张当地。校验完整输入目录后组池，保持输入顺序及每张实体身份，不修改输入、不洗牌。
- 回归检查 raw 的两个旗帜图标组（`3825ad46df` / `27fe03d7a2`）、跨地点排除、副本守恒、乱序保序及缺卡／重复／混包拒绝。
- 此入口仅供后续战役接线使用；现有引擎核心 24 张目录校验保持不变。未开放 Weald 出征；选包、种子洗牌、回村和存档回放一致性仍未完成，因此步骤 2 不能标为完成。
- 待确认项：无新增规则问题；既有 Q-186 和三项召唤部署停点继续跟踪。
- 本批验证：Node 24.20.0（本机实际版本，低于约定的 24.21.0）、pnpm 12.9.1；typecheck、lint、build 通过；全量 Vitest 489 文件通过，3,740 测通过、1 测跳过（1,135.11 秒）；新增针对性 3 测通过。构建保留既有 Vite 导入路径及大块文件提示。本批仅数据入口，步骤 2 未完成，尚未新增阶段末 Playwright 冒烟。本记录与组池代码同一提交，使用 `git log -1 -- docs/weald-development-plan.md` 定位；与 R-233 奇物批次一并合入 main。

### 步骤 2 第二批：I 级怪物地点目录

- 核心 R9–R10、Weald W3 与 R-230／R-232：新增 `buildWealdLevelOneMonsterPool`，先检查内容包已选和完整核心目录，再由已有 Weald 核准战斗目录验证当地输入。
- 输出未洗牌的 31 张 I 级通用＋14 张 Weald 实体，排除遗迹、Boss 和高等级条目。当地实例使用 `monster-deck:weald:pNNN`，核心实例 ID 保持不变。
- medium p4、p5 各保留一份，均映射 `monster_large:weald:p001`；大型板不额外增加副本。只有 Fungal Artillery p12–14 为 Back，其他当地实体为 Front；拒绝前后排及 Large 标签漂移。
- 回归覆盖包选择、缺卡／重复、跨地点排除、实体守恒、大型战斗卡映射及输入不变；三项召唤继续整招停点。II／III 级不从 I 级推算，本入口仅支持 I 级。
- 当前仅构造目录，未替换现有核心战役牌堆和旧档重放入口；Weald 任务及房间仍未开放。创建、守恒、回村、存档仍需统一接线，步骤 2 保持进行中。
- 待确认：无新增规则问题；Q-186 其余卡面与几何、三项召唤部署继续跟踪。本记录与怪物组池代码同一提交，本次合入 main；使用本文件 git log 定位。
- 后续接线核对点：`DungeonState.monsterPool` 的目录类型、`monster-pool-runtime.ts` 的实例 ID 解析与累计等级池、`dungeon.ts`／`dungeon-quest-entry.ts` 的创建校验、`dungeon-monsters.ts` 的部署校验、`hamlet-campaign.ts`／`hamlet-return-pools.ts` 的回村守恒，以及存档来源重建。奇物同样需要覆盖 `dungeon-curio*.ts` 的完整核心目录校验，不能只替换创建时的数组。
- 本批验证：Node 24.20.0（本机实际版本，低于约定的 24.21.0）、pnpm 12.9.1；typecheck、lint、build 通过；全量 Vitest 490 文件通过，3,743 测通过、1 测跳过（1,284.03 秒）；新增针对性 3 测通过。构建保留既有 Vite 导入路径提示。本批无可玩入口变更，步骤 2 尚未完成，阶段末 Playwright 冒烟待战役接线后补充。

### 步骤 2 第三批：奇物运行时共用校验

- 第二批怪物组池已提交、合入并推送 main（`4e66d984`）。本批在 `codex/weald-curio-runtime` 接续。
- 核心 R9–R10、Weald W3：新增按地点选择的完整奇物目录 schema。Weald 必须有 8 张唯一通用卡及完整 16 张当地卡；24 张核心卡、混入遗迹、重复或缺卡均拒绝，输入顺序保留。
- 创建、探索抽牌、房间奇物、效果结算和回村回收改用共用的任务地点校验。地点取自已登记任务，不从扩展勾选或卡牌 ID 推断，因此当前遗迹任务即使启用 Weald 也拒绝其奇物池。
- 未新增状态字段或改写核心快照；无任务旧沙盒及现有最暗流程沿用原核心目录校验。没有放宽守恒等式、抽牌规则或 Torch 时序。
- Weald 任务尚未登记，正式出征仍关闭；本批准备其目录校验能力，不声称完成地点创建、回村与存档闭环。怪物状态类型、实例解析、来源重建和存档仍待接线；Q-186 与三项召唤部署保持原停点，无新增规则待确认项。
- 本批验证：Node 24.20.0（本机实际版本，低于约定的 24.21.0）、pnpm 12.9.1；typecheck、lint、build 通过；针对性 4 文件、41 项通过。全量 491 文件中 490 通过、1 文件失败，3,745 项通过、1 项跳过、1 项触发既有显式 20 秒时限（1,636.41 秒），不是首轮全绿。
- 超时核对：`quest-save.test.ts` 自然战斗回放用例全量及首次单独复跑均超时（其余 8 项通过）。独立 main 基线 `4e66d984` 同文件 9 项通过（40.60 秒）；当前分支再次单独复跑 9 项通过（42.62 秒），原种子、策略、断言、显式时限未改。未复现稳定逻辑回归，但时限波动仍保留。临时基线工作树已清理。
- 本批未开放新地点任务，未新增阶段末浏览器冒烟；构建保留既有 Vite 导入路径与大块文件提示。本记录与奇物运行时校验代码同一提交，本次合入 main；使用本文件 git log 定位。下一步继续怪物状态／实例解析、来源重建与存档接线，地点出征仍依赖后续任务和房间核实。

### 步骤 2 第四批：怪物状态与实例解析

- 第三批奇物共用校验已提交、合入并推送 main（`30f531f5`）。本批在 `codex/weald-monster-state` 接续。
- 核心 R9–R10、Weald W3、R-230／R-232：新增严格的 Weald I 级 14 实体目录 schema，以及 `createWealdLevelOneMonsterPoolState`。保留完整核心来源目录，显式记录地点及当地实例，待后续出征链按种子洗牌；旧核心状态不新增字段。
- `DungeonState.monsterPool` 复用共用状态类型。`dungeonMonsterPoolThrough` 按明确地点重建 31 通用＋14 当地实例；永久移除战斗卡会排除对应所有实体，但不删减来源目录。Weald 暂只允许 I 级，不能用核心高等级池补齐。
- 实例解析区分核心 `monster-deck:pNNN` 与当地 `monster-deck:weald:pNNN`；Weald 中不解析遗迹实体。完整当地目录校验在解析和重建前执行，缺卡、重复、战斗引用／前后排／姿态槽漂移均拒绝；遗迹状态不能携带当地目录。
- 回归覆盖 JSON 状态往返后的同目录重建、全部实例反查、大型卡两个实体永久移除、同页码不串池、非法目录、高等级拒绝及旧核心 I–III 级实例不变。此处 JSON 往返只验证状态数据，不等于正式命令日志存档已接线。
- 本批只建立状态与运行时基础；未将 Weald 任务／房间加入正式出征入口，未完成任务地点绑定、部署／回村完整守恒和来源重建／正式存档验证。Q-186 和三项召唤部署停点不变，无新增规则待确认项。本记录与怪物状态代码同一提交，本次合入 main；使用本文件 git log 定位。
- 本批验证（2026-11-12 收尾）：Node 24.20.0（本机实际版本，低于约定的 24.21.0）、pnpm 12.9.1；typecheck、lint、build 通过。全量 Vitest 492 文件通过，3,752 项通过、1 项跳过（1,359.42 秒），本轮无超时失败；针对性 2 文件、9 项通过。初次 typecheck 的 Map 键类型过窄已修正，复跑通过，规则逻辑未改。构建保留既有 Vite 导入路径与大块文件提示；本批无正式可玩入口变更，阶段末浏览器冒烟待后续接线。

### 步骤 2 第五批：部署、升幕与回村边界

- 第四批状态与实例解析已提交、合入并推送 main（`c862b405`）。本批在 `codex/weald-monster-boundaries` 接续。
- 核心 R9–R10、R25／R32、Weald W3：新增地点目录共用校验，将完整核心来源和目标地点分别校验。Weald 目录仅允许已核准 I 级；任务地点来自已登记任务，不从扩展勾选或当地卡反推。
- 普通部署、奇物守卫、任务指定部署／额外实例检查、战斗结算分区改用任务地点校验；升幕与旧 I→II 预览明确只接受遗迹目录。非法当地状态会返回拒绝，而不是抛出运行时异常或混进核心房间。
- 回村前检查怪物余牌＋弃牌的完整唯一实例集合，扣除永久移除实例；缺卡、重复、活动遭遇、未初始化堆同时有弃牌均拒绝，不自动补牌。旧无怪物池沙盒沿用原行为；未改变既有回村洗牌顺序与 RNG。
- 针对性 5 文件、24 项通过，覆盖新增拒绝、永久移除后的守恒、旧核心部署、守卫、升幕和回村。新增测试第一次将既有成功状态名误写为 ready，已改为实际的 resolved 并复跑通过，业务逻辑未为此修改。
- Weald 任务／房间仍未核准接入，正式出征入口保持关闭。本批补齐校验边界，不表示 Weald 部署与回村可玩闭环已完成；来源重建和正式命令日志存档仍需接线，并核对房间与任务依赖。Q-186 和三项召唤整招停点保持原状，无新增规则待确认项。本记录与地点守恒校验代码同一提交，本次合入 main；使用本文件 git log 定位。
- 后续来源入口已核对：`apps/web/src/dungeon-sandbox/task-sources.ts` 提供当前与历史 `CoreQuestSources`；`quest-save.ts` 读取时仍从 `createCoreDungeonQuest(start, sources)` 重建并严格比对快照。后续必须让地点来源随 start 中的任务与包选择重建，不能仅向快照加入 Weald 状态字段；旧来源分支继续保留。
- 本批验证（2026-11-12）：Node 24.20.0（本机实际版本，低于约定的 24.21.0）、pnpm 12.9.1；typecheck、lint、build 通过；针对性 5 文件、24 项通过；全量 Vitest 493 文件通过，3,756 项通过、1 项跳过（1,302.16 秒），本轮无超时失败。构建保留既有 Vite 导入路径与大块文件提示。本批无可玩入口变更，阶段末 Playwright 冒烟待后续正式接线。

### 步骤 2 第六批：可信来源与存档重建准备

- 第五批地点与守恒校验已提交、合入并推送 main（`e863b64f`）。本批在 `codex/weald-source-rebuild` 接续。
- `CoreQuestSources` 增加独立可选的 Weald 核准来源（medium／large、当地奇物）。页面当前可信来源加载本仓库 normalized 数据；旧核心目录保持原样。按包选择过滤时，未选 Weald 就剔除其来源。
- 核心 R9–R10、Weald W3：新增 `rebuildLocationQuestDecks`，从可信来源与明确地点／等级／包选择生成目录；Weald 仅支持 I 级，重建 24 张奇物、45 张怪物实例及所需通用＋当地战斗目录，通用战斗引用缺失或重复拒绝。没有读取快照自带目录作为规则来源。
- 现有 `createCoreDungeonQuest` 调用共用来源重建的核心分支；最暗仍按既有 setup 流程处理。当前正式任务仍全部是核心地点，未伪造 Weald 任务或房间，也未改变旧状态字段及命令日志格式。
- 新增核对：同一可信来源确定性重建、包隔离、缺来源与高等级拒绝、新增来源前后核心任务状态一致、无包选择旧档和已选包档的交叉来源严格回放、伪造当地怪物快照拒绝。此处验证的是核心存档兼容与地点来源准备，不等于 Weald 自然任务存档闭环。
- 依赖结论：完整 Weald 创建／部署／回村／日志存档验证必须有已核准任务与房间。继续堆叠独立目录包装不能解除依赖；下一刀推进计划步骤 3 的普通房间与板块核实，任务到步骤 5 核准登记后回补步骤 2 的正式验证。步骤 2 继续标为进行中，三项召唤仍整招停点；Q-186 其余卡面与几何不变。本批无新增规则待确认项，改动未提交。
- 兼容回归修复：首轮全量 494 文件中 493 通过，p019 旧布局快照篡改测试失败（3,758 通过、1 失败、1 跳过，1,385.23 秒）。独立 main 基线该文件 4 项通过。定位到核心创建静态加载扩展战斗模块改变循环依赖初始化顺序，导致 layoutWiringHold 为 undefined；现将核心来源重建拆到仅依赖数据校验的 core-quest-decks.ts，扩展重建复用它，核心入口不加载扩展战斗模块。原测试及断言未改，修复后 p019 与来源测试 2 文件、7 项通过；诊断文件和基线工作树已清理，修复后已复跑全部质量闸门，最终结果见下条。

- 最终验证（2026-11-12）：Node 24.20.0（本机实际版本，低于约定的 24.21.0）、pnpm 12.9.1；修复后 typecheck、lint、build 通过；第二轮全量 494 文件中 493 通过，3,758 项通过、1 项跳过，唯一失败为 quest-save.test.ts 既有自然战斗回放用例的显式 20 秒超时（1,362.38 秒），p019 回归已通过。全量结束后该存档文件独立复跑 9 项全通过（38.31 秒），原种子、策略、断言和时限未改；不能称第二轮全量全绿。
- 针对性：来源与内容包 2 文件、9 项通过；修复后 p019 与来源 2 文件、7 项通过。构建保留既有 Vite 导入路径与大块文件提示。未开放新地点任务，未新增阶段末浏览器冒烟。本记录与来源重建代码同一提交，本次合入 main；下一刀核实普通房间与板块，之后按任务登记进度回补步骤 2 的正式 Weald 存档闭环。

### 步骤 3 首批：房间与板块审阅入口

- 来源重建批已提交、合入并推送 main（`2e387fdd`）。本批在 `codex/weald-room-review` 接续。
- 新增[普通房间首批审阅](weald-room-review-2026-11-12.md)：对照房间卡图像，登记九张普通房间名称、效果候选及与六张双面板块的印刷编号关系；将三个 Boss 房单独留给步骤 6。
- 1 号板块记录八个可见区域的容量点数候选及部署／效果标记；尚未核准容量、邻接、墙、高低地或真菌落点，其他八张普通板块几何仍待逐格核对。
- Q-186 延续本批卡面及几何审阅，不新增裁定；九张房间效果及 1 号板块容量／标记已由 Kyries 修改核准（R-234）；其余几何仍待审。未将候选写入 normalized，没有开放 Weald 出征，三项召唤继续整招停点。
- 下一刀：核实九张房间效果图标并逐张补板块几何，已确认字段再接运行目录；步骤 2 正式日志存档闭环待房间与任务登记后回补。本批文档及 R-234 一并提交合入 main，提交可用本文件 git log 定位。
- 本批验证：两份 Markdown 的 Prettier 检查与 git diff --check 通过；来源记录和审阅稿引用路径存在；私有总览图经 git check-ignore 确认在忽略目录中。仅文档与私有缓存变更，未重跑运行代码质量闸门。

### 步骤 3 核准接续（2026-11-12）

- Kyries 已直接修改核准房间效果和 1 号板块表格，登记 R-234，清除对应旧待审说明。
- 下一刀继续逐图核对板块邻接、墙、高低地和效果区域；其余八张普通板块容量与部署仍待审。正式目录和出征入口未开放，步骤 2 存档闭环及三项召唤依赖不变。
- 本批仅文档；Prettier 与 git diff --check 通过，未重跑运行代码质量闸门。

### 步骤 3 几何接续批

- 核准文档批已提交、合入并推送 main（053236a1）。本批在 codex/weald-tile-geometry 接续。
- 对照 TILES FRONT p1、BACK p1 原图，为 1 号板块登记 13 对共边候选，为 2 号 Ambush 板块登记九个区域的容量、部署与白框标记候选，见房间审阅表末节。
- 新增内容全部继续按 Q-186 待审；共边不等于通行，白框／三角不推定规则语义。R-234 已核准字段不重复送审。下一步核实这些几何候选并继续 3–9 号板块；未开放出征，未解除召唤停点。
- 本批只有文档；Prettier 检查及 git diff --check 通过，未重跑运行代码质量闸门。图像继续留在忽略的私有缓存。

### 步骤 3 第二次核准

- Kyries 修改核准几何接续表，登记 R-235：1 号 C–D、E–G 更正为角点，2 号 B 高地、H 低地，容量与部署按表核准。已清除对应旧待审说明。
- 本批提交合入 main，提交可用本文件 git log 定位。下一步继续 3–9 号板块审阅及完整通行／墙登记，未核实字段不填默认值。
- 仅文档；Prettier 与 git diff --check 通过，未重跑运行代码质量闸门。

### 步骤 3：3–9 号板块首轮逐区转录

- R-235 批次已提交、合入并推送 main（312581e9），本批在 codex/weald-tiles-3-9-review 接续。
- 已逐张查看 TILES FRONT／BACK p2–4 及 FRONT p5，补齐 3–9 号板块共 59 个有容量标记区域的容量、姿态部署、宝箱、高低地图标及其他标记候选；新增字段均继续关联 Q-186 待审。
- 5 号中央树冠与 7 号裂隙尚未分类，不猜测零容量或通行。下一步核实本轮表格，再逐面登记完整共边、角点、墙与通行，接独立规范化目录。
- 当前未修改运行代码或开放出征；三项召唤及步骤 2 正式日志存档依赖不变。本批随 R-236 提交合入 main，提交可用本文件 git log 定位。
- 验证：两份 Markdown 的 Prettier 检查与 git diff --check 通过；私有图像仍位于忽略缓存，未重跑运行代码质量闸门。

### 步骤 3 第三次核准

- Kyries 核准 3–9 号表格并补充真菌与无容量区域含义，登记 R-236：8 号 E 为一枚真菌，5 号中央树冠为零容量 I。已清除对应旧待审说明。
- 59 个有容量标记区域加 5 号零容量区已核准；7 号裂隙分类及各面完整通行几何仍待审。下一步逐面登记共边、角点、墙、通行及效果区域，接独立目录。
- 仅文档；Prettier 与 git diff --check 通过，未重跑运行代码质量闸门。

### 步骤 3：2–4 号板块通行几何

- R-236 已提交、合入并推送 main（7f73c35a），本批在 codex/weald-tile-paths-review 接续。
- 对照完整图像，新增 2–4 号共 32 对通路、8 对仅角点候选及黑色矩形墙定位，均按 Q-186 待审；未写入运行数据。1 号保留 R-235 核准登记。
- 下一步核实本轮几何并继续 5–9 号，明确零容量 I 的邻接、7 号裂隙分类及房间效果区域，随后接独立规范化目录。此前已核准容量、部署、真菌及图标不再送审。
- 本批随 R-237 提交合入 main；两份 Markdown 的 Prettier 检查、git diff --check 通过，未重跑运行代码质量闸门。

### 步骤 3：2–4 号几何核准

- Kyries 核准本轮 32 对通路、8 对仅角点及墙定位，登记 R-237；审阅表已清除本节旧待审说明。
- 下一步继续 5–9 号通路、角点、墙与效果区域，特别是 5 号零容量 I 的连接及 7 号裂隙分类。三项召唤和正式任务入口尚未接通。
- 仅文档；Prettier 与 git diff --check 通过，未重跑运行代码质量闸门。

### 步骤 3：5–9 号通行几何接续

- R-237 已提交、合入并推送 main（01906a4e），本批在 codex/weald-tiles-5-9-paths 接续。
- 逐图登记 5、6、8、9 号共 38 对通路、18 对角点候选、黑色墙体定位及 5／9 号星标效果绑定；5 号零容量 I 的 B／D／E／G 连接单独列出。
- 7 号仅列 4 对可定位通路、1 对角点候选；裂隙分类与连接仍未判定，不伪装成完整图。新增字段均按 Q-186 待审，尚未进入运行目录。
- 下一步核实本轮候选，补 7 号裂隙与 1 号最终通行／效果绑定，再接独立目录。三项召唤与步骤 2 正式日志存档依赖不变。
- 本批随 R-238 提交合入 main；两份 Markdown 的 Prettier 检查与 git diff --check 通过，未重跑运行代码质量闸门。

### 步骤 3：5–9 号本轮核准

- Kyries 核准 5–9 号已列通路、角点、墙和效果区域，登记 R-238；7 号原稿未给结论的裂隙部分继续 Q-186，未擅自补边。
- 下一步补 1 号最终通行／效果区域及 7 号裂隙分类与连接，随后接独立目录。本批仅文档，Prettier 与 git diff --check 通过，未重跑运行代码质量闸门。

### 步骤 3：2–9 号核准数据入库（7 号裂隙、1 号通行除外）

- R-238 文档批起点 `a4774a3a`。本批在 `cursor/weald-rooms-2-9-normalized-680d` 接续。
- 新增 `packages/data/normalized/extension/weald/room.json` 与 `room_tile_geometry.json`，以及 schema／校验（R-234–R-238）。2–6、8–9 号写入已核准容量、部署、通路、角点、墙注记、真菌与星标效果区域；5 号零容量 I 按 R-236／R-238。
- 1 号仅 R-234 容量／部署占位，`edges` 为空，不绑定 Toxic Mushrooms 星标。7 号仅 4 对通路、1 对角点、A 高地与墙注记，显式 `pendingReview` 挂 Q-186，不补裂隙边。
- 引擎侧 `expansions/weald/room-catalog.ts` 只读目录；未选 Weald 包或 `usable=false` 时不开放出征。未接步骤 4 禁疗／零容量回合限制、三项召唤；未新增 Playwright 冒烟。
- 下一刀：1 号通行与效果绑定、7 号裂隙核准后入库；再接运行时与召唤部署。
- 本批验证：Node 24.20.0（本机实际版本）、pnpm 12.9.1；typecheck、lint、build 通过；全量 Vitest 496 文件通过，3,768 项通过、1 项跳过（624.90s）；新增 weald-rooms 7 项与 room-catalog 2 项通过。未开放出征，未新增 Playwright 冒烟。

### 步骤 3：剩余 1 号与 7 号几何候选

- R-238 已提交、合入并推送 main（a4774a3a），本批先在本地分支 `codex/weald-remaining-geometry`（14f5ee2c）暂存，再基于当前 main（e70874a1）接入。
- 重新查看 1／7 号板块及 1 号房间完整图像，补 1 号 11 对最终通路候选、全普通地形及 C／E／F／G 的 Toxic Mushrooms 绑定。
- 7 号新增 H／I／J 三个零容量区域候选及范围，新增 11 对通路、3 对角点，与已核准 4 通路／1 角点分别记录，不改写旧核准。新候选全部继续 Q-186，未进入运行目录。
- 2–9 号已核准几何已入库；下一步核实本轮 1 号与 7 号裂隙候选后补入目录。三项召唤和正式任务闭环待运行接入，不将审阅通过视为可玩完成。
- 本批仅文档候选，继续 Q-186，不进运行目录。两份 Markdown 的 Prettier 检查与 git diff --check 通过，未重跑运行代码质量闸门。

### 步骤 3：1 号通行与 7 号裂隙入库（R-239）

- Kyries 于 2026-11-13 核准审阅稿「1 号最终通行与 7 号裂隙补全」节，登记 **R-239**。
- 更新 `weald-rooms.ts` 与 normalized：`room.json`（1 号 `effectAreaBinding: confirmed`）、`room_tile_geometry.json`（1 号 11 通路／2 角点／C–E–F–G Toxic；7 号 H／I／J 零容量、15 通路／4 角点、无 D–G）。放宽 schema 中 1／7 号占位限制，7 号完整几何禁止 D–G 直连。
- 未做：步骤 4 禁疗与零容量回合限制、召唤部署、出征、`usable` 仍为 false、无 Playwright 冒烟。
- 下一刀：步骤 4 运行时与召唤部署。

### 步骤 4 首批：W-03／W-04 引擎运行时

- 依据 `docs/spec/weald-rules-spec-v0.1.md` W-03、W-04 与核准目录：引擎新增零容量区 `zeroCapacity` 投影、`necroticFungus` 实体、全场禁疗与 `finishTurn` 拒绝；须 `contentPacks` 含 `weald` 且 `BattleSetup.wealdMechanics`。
- 未做：三项召唤部署、战斗创建接线、`usable` 出征、Playwright 冒烟。
- 验证见对应 PR。

### 步骤 4 第二刀：R-230 三项召唤部署

- 接通 `readWealdMonsterAttack` 召唤投影、`continueWealdMonsterSummon` 收尾：首空姿态位、姿态对应 `monsterStanceAreas`、容量挤占待选（R-034）、满轨无效（R31）、先攻洗入当前牌堆；须 `contentPacks` 含 `weald`。W-03 零容量区不得作为召唤落点。
- 未做：战斗创建自动 `wealdMechanics`／真菌、`usable` 出征、Hag／任务／Boss 其余项、Playwright 冒烟、步骤 5 任务闭环。
- 验证见对应 PR。

### 步骤 4 第三刀：战斗创建接线与自动真菌

- `startDungeonBattle`：已选 Weald 包且房间为核准 `room:weald:*` 时走 `selectWealdRoomTile`（不要求 `usable=true`）；出征地点为 Weald（任务 `expeditionRegion` 或怪物池 `location=weald`）时自动 `wealdMechanics`、零容量投影与 `necroticFungusAreas` 放置（W-03、W-04）。
- 未选包、遗迹出征或未核准板块：不开启机制、不放置真菌；核心遗迹战斗路径不变。
- **待确认**：Playwright 冒烟依赖 Weald 出征闭环，本刀未加 UI 冒烟；引擎测试覆盖创建路径。
- 未做：出征入口、`usable` 自开、步骤 5 任务、Hag／Brigand Pounder／Shrieker Boss 闭环、Stygian、英雄 II/III 战斗技能、PvP。
- 验证见本 PR。

### 步骤 5 首批：I 级普通任务证据审阅（仅文档）

- 起点 main `8b92693d`（步骤 4 战斗创建批）。本批在 `cursor/weald-l1-quest-review-1478` 接续。
- 对照 `packages/data/extract/extension/weald/raw/quest.json`（`MG_DD_06_EN_WEALD` 任务 PDF p1–15），列出 **Quest I 背面五张**普通任务候选表：名称、Rest、SPECIAL、XP、卡底分布行（图标 hash 保留）、与 Weald 房间编号交叉引用；**不含** II／III、Boss、Stygian。
- 盘点村庄选任务、出征、探索／战斗、回村、选包隔离、存档回放依赖；结论见 [I 级任务审阅稿](weald-level-one-quest-review-2026-11-13.md)。**未**写 normalized、**未**改 `usable`、**未**开放出征。
- 待确认：Q-186 延续（任务分布图标、`p002` Crone LvL 2 部署、`p001` 真菌目标等）；核准前不接 `basicQuests`／`rebuildLocationQuestDecks` 任务侧。
- 验证：两份 Markdown 的 Prettier 检查与 `git diff --check`；未重跑运行代码质量闸门。

### 步骤 5 第二批：Kyries 2026-11-13 口头确认登记（仅文档）

- 起点 main `4c62bb34`。分支 `cursor/weald-l1-quest-kyries-2026-11-13-beef`。
- 登记 **R-240**（六项分布 hash）、**R-241**（p004 地点图标与巢穴 SPECIAL）、**R-242**（p005 先攻 d10 与分布构成）；更新 [I 级任务审阅稿](weald-level-one-quest-review-2026-11-13.md) 误归（`56ea9289ab` 非地点旗帜、`d3a3e38ee9` 非报酬图标、重叠检出）。
- Kyries 明确「先审这些，剩下的我还在查」：p001–p003 目标、`1154a8a4d4` 等未点名 hash、顶端徽章／蜡封、p004 巢穴抽牌法仍 **待确认**。
- **未**写 normalized、**未**改 `usable`、**未**开放出征；步骤 5 规范化仍待其余项审完后。
- 验证：三份 Markdown 的 Prettier 与 `git diff --check`；未重跑运行代码质量闸门。

### 步骤 5 第三批：Kyries 第二批口头确认（p002／p003、R-243）

- 在同一分支 `cursor/weald-l1-quest-kyries-2026-11-13-beef`（PR #641）追加提交。
- 登记 **R-243**（任务 PDF 黄底蘑菇包属与 SPECIAL 房间编号）、**R-244**（Circle of Witches／II Crone 例外）、**R-245**（Disinfection／Potion 与消毒）；p003 Provisions→Potion 更正；p003 三目标房共用 5 号 tile 已确认。
- 仍待确认：p001 真菌状态机；p002 姿态栏与 3 目标房／2 卡；p004 巢穴抽牌；Q-186 未点名 hash。
- **未**写 normalized、**未**改 `usable`、**未**开放出征。
- 验证：三份 Markdown Prettier + `git diff --check`；未重跑运行代码质量闸门。

### 步骤 5 第四批：群拍板结案（p001／p002／p004、Q-186）

- 在同一分支 PR #641 追加提交。
- 登记 **R-246**（Fungal Research brought back／objective）、**R-247**（Circle of Witches 三进 9 号房与 Crone 部署）、**R-248**（Purge 仅用 Weald 当地牌堆）、**R-249**（`1154a8a4d4` 巢穴、`56ea9289ab` 正面 I 级徽、装饰物）。
- **R-241**／**R-244** 仅追加「后续确认」交叉引用，不改原裁定正文。
- I 级五张普通任务卡面玩法待确认项已收窄；步骤 5 规范化仍待后续。
- **未**写 normalized、出征仍关。
- 验证：三份 Markdown Prettier + `git diff --check`。

### 步骤 5 第五批：I 级五张任务数据刀（规范化 + basicQuests）

- 起点 main `7da08d29`（#641 squash：R-240–R-249）。本批 `cursor/weald-l1-quest-normalize-eb25`。
- `buildWealdLevelOneQuestCards`（`packages/data/src/normalize/weald-quest-cards.ts`）：仅 I 级五张（`quest:weald:p001`–`p005`）；分布 kind 按 **R-240**／**R-249**（含 `1154a8a4d4` 巢穴、重叠 hash）；raw 卡底行校验。
- 产出 `normalized/extension/weald/quest_cards.json` 与五张 `*_distribution.json`；`basicQuests` 登记 **`expeditionRegion: weald`**、SPECIAL 数据字段（含 **R-248** `monsterDrawScope: wealdLocalOnly`）；**未**实现 Purge 运行时抽牌。
- 包隔离：`questsForContentPacks`（未选 Weald 不进村庄 I 级池）；`basicQuestEnabledForContentPacks` 用于存档；选了包可读登记，但 `expeditionLocationEmbarkBlockReason`／`questsForCampaignLevel` 排除 weald，出征仍关；房间 `usable` 未改。
- **待确认**：无新增玩法待确认；**R-248** 运行时、任务 SPECIAL 状态机、QuestMap Weald 图待接线 PR。
- 本批验证：Node 24.21.0、pnpm 12.9.1；typecheck、lint、build；针对性 Vitest（`weald-quest-cards.test.ts`、`weald-basic-quests.test.ts`）；`pnpm exec prettier --check` 触及文件、`git diff --check`。

### 步骤 5 第六批：Patrol the Woods 沙盒出征第一刀

- 起点 main `b9b2fdf7`（#643 squash：p001 `xpKind: broughtBack`）。分支 `cursor/weald-p005-sandbox-embark-c9e8`。
- **沙盒 allowlist**：仅 `quest:weald:p005`；`sandboxEmbarkQuestsForPacks` / `sandboxExpeditionEmbarkBlockReason`；UI `apps/web/src/dungeon-sandbox/quest-setup/dungeon-quest.tsx` 出征列表按 `contentPacks` 追加；须勾选 Weald 包。
- **村庄闸门不变**：`questsForCampaignLevel`／`questsForContentPacks` 仍排除 `expeditionRegion === "weald"`；`expeditionLocationEmbarkBlockReason` 对 Hamlet 正式出征不变。
- **创建**：`createCoreDungeonQuest` 在 Weald 沙盒任务时 `rebuildLocationQuestDecks` + `WEALD_APPROVED_ROOM_CARDS`（九张普通房间，`usable` 未改）；怪物池写入完整 `location: weald` 状态。
- **QuestMap**：**R-250**（Kyries 2026-11-13）— 无 Weald 专属 QuestMap；`questMapLayoutMatchesExpedition` 使 Weald 八代币任务从核心 `dungeon_layouts.json` confirmed 八槽池择图（**R-116**）；已删除占位 `extension/weald/dungeon_layouts.json`。
- **R-242**：`patrol-the-woods-initiative.ts` 于 `startRound` 第 1 轮掷 d10，严格大于光照则怪物先攻置顶。
- **回村守恒**：`expedition-room-catalog.ts` 泛化九房目录校验；Weald 怪物／奇物／房间牌池与 `recoverHamletPools` 针对性测试。
- **未接线**：p001 brought back、p002–p004 SPECIAL、村庄抽 2 选 1、Playwright、房间 `usable: true`。
- 验证：typecheck、lint、Prettier；Vitest `weald-p005-sandbox-embark.test.ts`、`patrol-the-woods-initiative.test.ts`、`weald-basic-quests.test.ts`；`git diff --check`。

### 步骤 5 第七批：Purge the Woods 沙盒出征 + R-248 当地牌堆

- 起点 main `99230b4b`（#644 squash）。分支 `cursor/weald-p004-r248-a1e6`。
- **沙盒 allowlist**：`quest:weald:p004` 与 p005 并列；须勾选 Weald 包；村庄 `questsForCampaignLevel`／`questsForContentPacks` 仍排除 weald。
- **R-248**：`MonsterPoolDeckState.monsterDrawScope: wealdLocalOnly`；`dungeonMonsterPoolThrough`／`prepareDungeonMonsters` 可抽实例仅 14 张 Weald 当地实体；战斗 catalog 仍含通用引用。p005 混池（45 张）不变。
- **巢穴 XP**：沿用 `xpKind: lair`；0–3 巢穴清理对应 0–3 XP 测试。
- **R-251**：**仅 Purge the Woods 本卡**（Dark×3／巢穴×3／Trap×2）叠核心规则书第 15 页后的开战结论；核心同节 Treasure／Objective／Curio 1–5 仍会开战，本卡无那些代币。**禁止**泛化成「所有任务只有巢穴开战」。#645 运行时仍只实现 **R-248** 牌堆范围。
- **未接线**：p001 brought back、p002–p003 SPECIAL、村庄抽 2 选 1、Playwright、房间 `usable: true`。
- 验证：typecheck、lint、Prettier；Vitest `weald-p004-sandbox-embark.test.ts`、`weald-p005-sandbox-embark.test.ts`、`weald-basic-quests.test.ts`、`weald-monster-state.test.ts`；`git diff --check`。

### 步骤 5 勘误补丁：p001 Fungal Research XP 登记

- 起点 main `84569cb5`（#642 squash）。分支 `cursor/weald-p001-xp-fix-8fa3`。
- `quest:weald:p001`：`xpKind: broughtBack`、`broughtBackSubject: necroticFungus`、`roomsPerXp: 1`；废止 `xpKind: all` + `maxRooms: 8` 冒充清房 XP。**R-246**；`questPrintedXpCap` 需 `broughtBackCount`。**R-038** 封顶 3 已由 **R-252**（核心规则书第 29 页）结案。
- **未**实现砸毁／brought back 运行时；**未**开放出征；p002–p005 XP 计数未改。
- 验证：typecheck、lint、Vitest（`weald-basic-quests.test.ts`）、`git diff --check`。

### 步骤 5 第八批：Fungal Research 沙盒 + brought back

- 起点 main `eb063770`（#644 squash：Purge 沙盒）。分支 `cursor/weald-p001-brought-back-af2a`。
- **沙盒 allowlist**：`quest:weald:p001` 与 p004、p005 并列；须勾选 Weald 包；村庄 `questsForCampaignLevel`／`questsForContentPacks` 仍排除 weald。
- **R-246 运行时**：清房叠加 `necroticFungusBroughtBackCount`；目标房 objective 须至少 1 个未砸毁真菌。
- **R-252**：回村 `xpPerHero = min(3, broughtBackCount)`；`questPrintedXpCap` 同步封顶。
- **怪物池**：混池（无 `wealdLocalOnly`）；QuestMap **R-250** 核心八槽。
- **目标房 3／6／8**：`setAsideRoomCardIds` + `prepareObjectiveRoomBattle` 随机旁置；无新增几何状态机。
- **未接线**：p002–p003 SPECIAL、村庄抽 2 选 1、Playwright、房间 `usable: true`。
- 验证：typecheck、lint、Prettier；Vitest `weald-p001-sandbox-embark.test.ts`、`fungal-research-brought-back.test.ts`、`weald-basic-quests.test.ts`；`git diff --check`。

### 步骤 5 第九批：Circle of Witches 沙盒 + II Crone 例外部署

- 起点 main `0069ca58`（#646 p001、#645 p004 已合）。分支 `cursor/weald-p002-sandbox-crone-c413`。
- **沙盒 allowlist**：`quest:weald:p002` 与 p001、p004、p005 并列；村庄战役与 Hamlet 正式出征闸门不变。
- **目标房**：旁置 `room:weald:p009`（The Clearing）；`readExpeditionRoomTile` 使 Weald 板块在 `prepareDungeonMonsters`／目标房链路可走 `selectWealdRoomTile`（`usable` 未改）。
- **R-247 运行时**：`circle-of-witches-spawn.ts` — 目标房先部署 `monster_medium:weald:p015`（例外目录 `quest_exception_monsters.json`，**不**并入 I 级 14 实体池），再 I 级混池补满；战斗结束组件可再部署；`questExceptionCroneKills` 驱动回村 XP（**R-244** 1 XP／Crone，**R-038** 封顶 3）。
- **未核准**：Crone dodge／技能／抗性未发明；`startDungeonBattle` 仍按 **R-048** 拒绝未核实技能；本刀止于半场部署／位序／守恒／摘要 XP。
- **未做**：p003、村庄抽选、Playwright、房间 `usable: true`。
- 验证：typecheck、lint、Prettier；Vitest `weald-p002-sandbox-embark.test.ts`、`weald-p001-sandbox-embark.test.ts`、`weald-p004-sandbox-embark.test.ts`、`weald-p005-sandbox-embark.test.ts`、`weald-basic-quests.test.ts`；`git diff --check`。

### 步骤 5 第十批：Disinfection 沙盒 + SPECIAL

- 起点 main `ce1a318a`（#647 p002 已合）。分支 `cursor/weald-p003-disinfection-fed9`。
- **沙盒 allowlist**：`quest:weald:p003` 与 p001–p005 并列（须 Weald 包）；村庄 `questsForCampaignLevel`／`questsForContentPacks` 仍排除 weald。
- **目标房**：旁置恒为 `room:weald:p005`（Infected Oak）；混池；QuestMap **R-250** 核心八槽。
- **R-245 运行时**：`startingPotions: 3` 接入公共补给池（非 **R-197** 任务药水）；`disinfectInfectedOak`（1 行动 + 1 Potion，星区 B/D/E/G）；`disinfectionOakCount` → 回村 XP（**R-038** 封顶 3）；5 号板块 `poisonousRoots` 仅 `specialRegions.runtimeReady`，房间 `usable` 仍为 false。
- **未做**：村庄抽选、Playwright、Boss／Stygian。
- 验证：typecheck、lint、Prettier；Vitest `weald-p003-sandbox-embark.test.ts`、`battle-infected-oak.test.ts`、`weald-basic-quests.test.ts` 与既有 p001／p002／p004／p005 沙盒测；`git diff --check`。

### 步骤 5 第十一批：村庄地点任务堆抽 2 选 1

- 起点 main `f5443cae`（#648 p001–p005 沙盒已合）。分支 `cursor/weald-village-draw-b928`。
- **已选 Weald 包**：`offerNextQuest` 维护遗迹与 Weald 独立 I 级普通任务堆（Weald 仅 p001–p005；II/III Weald 堆为空）；不混洗成单一池。合法时可选「遗迹抽 2」「Weald 抽 2」「两地各 1」；多抽法时先 `hamlet-quest-draw` 待选（不消耗 RNG），再分堆洗牌进入既有 `hamlet-next-quest` 2 选 1。
- **未选 Weald 包**：行为与改前一致（`questsForCampaignLevel` / `questsForContentPacks` 混合过滤，不含 weald）。
- **Hamlet 出征**：`chooseNextQuest` 对 p001–p005 + weald 包放行；仅 `expeditionRegion` 的正式闸门仍拒绝全部 Weald。房间卡 `usable` 仍为 false；未开 Boss／Stygian／II–III Weald 任务堆。
- **I→II 沙盒预览**：已选 weald 包时剩余 Weald I 普通任务写入 `discardedQuests`，避免错误回流。
- **未做**：正式开局第一趟抽选、Playwright、Boss／Stygian、Warrens／Cove 等地任务堆。
- 验证：typecheck、lint、Prettier；Vitest `hamlet-weald-location-draw.test.ts`、`content-packs.test.ts`、`weald-basic-quests.test.ts`、`hamlet-embark.test.ts`、`natural-wipeout-save.test.ts` 与 Face the Threat／最暗地牢相关测；`git diff --check`（遗迹堆经 `campaign-quest-pool`，与黄金池夹具一致）。

### 步骤 5 第十二批：Crone 战斗字段审阅（Q-186）

- Kyries 同意按接续建议顺序推进；当前先补 Circle of Witches 的 II 级 Crone，不重做已完成的部署。
- 新增 [Crone 审阅稿](weald-crone-review-2026-11-13.md)，逐页核对印刷 FRONT p15／p16，核对缓存 BACK p15；原始 PDF 只读，图片只存忽略缓存。
- 已登记属性、防御、三个技能和姿态表的候选值。核心第 19 页无 Acc 直接生效有现有规格书及 R-025 依据；本卡闪避／效果图标语义与技能 3 光照结算仍在 Q-186 待核准。
- 未改 normalized／运行时，combatReady 仍为 false，未开放 II 级随机池或提前进入 Boss。
- 下一步：核准 Crone 审阅表，明确技能 3 光照结算后接独立任务例外战斗目录及场景测试；随后继续正式日志存档闭环。
- 验证：两份 Markdown 的 Prettier 检查、git diff --check 通过；仅文档，未运行 typecheck／单元测试／build。

### 步骤 5 第十三批：II Crone 例外战斗接线（R-253）

- Kyries 回复「三项全部核准」，登记 R-253：Dodge 3、腐蚀与减益抗性、无免疫、姿态表及三个技能；Embrace the Dark 不掷攻击骰，每目标压力 +1，整次光照只减 1。
- 独立任务例外战斗目录接入 Weald 地点来源；normalized 例外条目标记 combatReady，保持不进入 I 级 14 实体池、不开放 II 级随机池。
- 修复出征创建仍沿用原始战斗目录的问题，使用重建的地点目录；战斗准入识别已核准 Weald 当地实体，并只对目标房指定 Crone 实例放行 II 级例外。
- 新增 Crone 13 项技能／选招／多目标光照／RNG 测试，并将 p002 部署场景推进到真实 startDungeonBattle；现有 XP、组件复用与守恒测试保留。
- 下一步：步骤 2 正式日志存档闭环；随后正式开局第一趟抽选与 I 级阶段验收。Boss／Stygian／房间 usable 未开放。
- 下一刀重点：`chooseNextQuest` 当前沿用上一趟 `battleCatalog`／房间／怪物／奇物来源，须核实遗迹 → Weald、Weald → 遗迹的地点切换，不能把「Hamlet 可选择任务」当成来源已经切换完成；正式存档兼容尚未验收。
- 验证：typecheck、lint、build 通过；全量 Vitest 512 文件，511 通过、1 文件旧断言失败（原断言将战斗目录等同随机牌池，未排除 Crone 任务例外），3,874 项通过、1 项失败、1 项沿用跳过，耗时 1,313.67 秒。修正该断言并明确验证 Crone 不进 45 张随机池后，来源／Crone／p002 三文件共 25 项复测全部通过；其余文件未重复运行。最终 Prettier 与 git diff --check 通过。交接文档仅修正 Markdown 格式以通过 lint，未改变内容；本刀未新增 Playwright，待 I 级阶段验收。

### 步骤 5 第十四批：地点切换与正式格式日志存档首批

- 起点 main `5d65df09`（#651：Crone R-253 已合入）；分支 `codex/weald-location-save`。依据 Weald W-02（W3）、核心 R9–10／R15／R32 及 R-248，不新增规则裁定。
- `chooseNextQuest` 在进入或离开 Weald 时重建目标地点怪物、奇物、房间来源；公共条件／饰品／英雄／金币等战役资源继续保留；新牌堆沿用首次抽取时的种子洗牌，不额外消耗 RNG。核心 → 核心沿用旧路径。
- 保留可信核心战斗引用供 Weald 后切回；Crone 始终是任务例外。Purge 的当地专用范围不流入其它任务；p002、p003 的任务计数按新任务初始化。
- 修复 Weald 旁置目标房的回村守恒：普通堆加旁置牌仍须恰好九张，不通过放宽长度绕过。
- 新增只用公开命令的跨任务日志场景：遗迹 → Weald → 遗迹，在抽法待选、任务待选、开局补给处保存／恢复；另从 Weald 探索进入真实战斗，保存恢复后继续 startBattle／drawInitiative；检查包选择、地点来源和战斗 RNG 的快照篡改会拒绝。
- 限制：跨地点场景按规则提前撤离，未宣称五张任务都已自然通关；早期未闭环 Weald 沙盒旧快照不作静默修补，仍严格核对日志与快照。核心旧档回归保留。正式开局第一趟抽选、阶段 Playwright、Boss／Stygian／usable 仍未开放。
- 下一刀：正式战役开局第一趟分地点抽选；之后 I 级普通任务阶段验收。
- 代码提交 `b730fe5f`，PR #652。验证：typecheck、lint、build 全通过；既有七文件 51 项、新场景三项针对性通过；全量 Vitest **513 文件通过，3,878 项通过、1 项沿用跳过，无失败**，耗时 1,446.76 秒。最终 Prettier 与 git diff --check 通过；阶段 Playwright 尚未执行。

### 步骤 5 第十五批：正式首趟分地点抽选

- 起点 main `14027146`（#652 已合入）；分支 `codex/weald-initial-quest-draw`。依据 Weald W-02（W3）、R-037 与已有地点堆约定，不新增图标或规则裁定。
- 已选 Weald 包时，出征准备先选「遗迹抽 2／Weald 抽 2／两地各 1」再揭示两张候选；揭示后锁定抽法，任务选项来自引擎 PendingChoice。未选 Weald 包保留旧显式任务入口。
- 首趟与村庄复用同一分堆洗牌函数，遗迹继续经过 campaign-quest-pool 黄金池过滤。抽牌 RNG 消耗后再布图、洗房间代币和掷补给；未选卡进入永久弃置。
- 新增可选 initialQuestDrawMode 起点字段，读取时由种子、包选择与抽法重建候选，拒绝选择候选之外的任务；跨任务保留该标记。缺少新字段的旧日志仍走原入口，不静默追加抽牌。
- 针对性四文件 23 项通过；两条 Playwright 冒烟通过（多包开局／Weald 首趟抽选锁定与保存刷新恢复），未启用重试。首次默认浏览器启动因缺少当前版本 Chromium 失败，随后使用配置已有的 PLAYWRIGHT_CHROMIUM_EXECUTABLE 指向本机 Chrome，未改仓库浏览器配置；截图已查看，卡图缓存缺失时保留原占位。
- typecheck、lint、build 已通过，全量 Vitest 运行中。尚未宣称五任务自然通关；Boss／Stygian／II–III／房间 usable 不变。
- 下一刀：先补 Disinfection 的 UI 消毒入口及存档命令白名单（当前只有引擎命令入口），再逐张验收 I 级五任务的探索、战斗、目标与 XP／回村；之后按 Hag → Brigand Pounder → Shrieker 推进。
