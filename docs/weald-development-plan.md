# Weald 扩展开发计划

Kyries 于 2026-11-11 确认此顺序，后续 session 以本文件作为 Weald 开发入口。
本计划是开发安排，不新增规则裁定；规则来源仍遵守 AGENTS.md、R-001、R-048。

## 当前进度与下一步

- **当前阶段：步骤 5 的 `quest:weald:p001`–`p005` 已补齐固定种子自然场景（**R-252**／**R-244**／**R-245**／**R-248**／**R-242**）；须选 Weald 包，村庄分地点抽 2 选 1，Hamlet 可出征五任务。地点切换和正式日志存档已验证；I 级阶段待收尾核对，完整战役尚未验收。**
- **当前批次**：PR #673 已按 Kyries 指令 squash 合入 main（`2f4258ca`），合入时 CI 尚在运行。步骤 6 第十四批接新版本 Hag p019 的地点出征来源及探索／回村一致校验；UI 尚未开放。
- **下一刀：完成来源批质量检查；Q-187 已由 Kyries 裁定并登记 R-257：直接进入空姿态；R-030 阵亡补位已复核。Hag 自然战役、UI 与阶段冒烟继续待验，不因真实停止状态可回放而标为闭环。**
- 步骤 0 已完成，提交 `e7fd17e1`；完整地点战役尚未验收。
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
| 6．三个 Boss I 级       | 进行中 | 顺序为 Hag → Brigand Pounder → Shrieker；补齐房间、部署、能力、附属单位、清场 | 每个 Boss 都能从正式战役入口自然进入并结算，逐个完成再推进下一个 |
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
- 代码提交 `28b377de`／`6d32db10`，PR #653。typecheck、lint、build 全通过；全量 Vitest **514 文件通过，3,884 项通过、1 项沿用跳过，无失败**，耗时 1,428.27 秒。地图预览对齐后重跑生产构建与两条 Playwright，全部通过（两条 34.9 秒，未启用重试）。最终 Prettier 与 git diff --check 通过。尚未宣称五任务自然通关；Boss／Stygian／II–III／房间 usable 不变。
- 下一刀：先补 Disinfection 的 UI 消毒入口及存档命令白名单（当前只有引擎命令入口），再逐张验收 I 级五任务的探索、战斗、目标与 XP／回村；之后按 Hag → Brigand Pounder → Shrieker 推进。

### 步骤 5 第十六批：Disinfection UI／命令存档与首目标自然场景

- 起点 main `e5b07a81`（#653 已合入）；分支 `codex/weald-disinfection-ui-save`。依据 R-245、R-038 与核心行动／战斗结束流程，不新增规则或图标裁定。
- 消毒资格由引擎统一投影到 UI；「战利品」分页提供「消毒橡树（1行动＋1药水）」，已完成状态持续展示。未选包／无机制时隐藏，非星区、无药水、无行动、强制移动或待选时禁用／拒绝；末怪死亡后不能再操作。
- savedCommandSchema 接纳仅带 actorId 的 disinfectInfectedOak，仍拒绝计数、药水、区域和 XP 等注入字段；保存与读取继续按完整公开日志严格重建。
- 修复消毒花掉最后行动后停在 0 行动的死点：复用 finishTurn 推进回合，正常结算 Poisonous Roots 腐蚀；不会提前在尚有行动时结算毒根。
- 按 R-245「每消毒一棵」在命令成功时即记录进度，移除旧代码附加的胜利计数门槛；按地图房间 ID 去重，胜利交接不会再加一次，同一房间再次开战会投影已消毒状态。
- 固定 seed 2、真实规范化任务入口，用公开命令走到首个目标房消毒前后、战斗胜利、合法撤离与回村。四名英雄和驿站各获 1 XP，消毒前后及回村存档均严格回放。目标房优先移动到可消毒星区／消毒为具名可选测试决策，不改变既有自然策略默认行为，不注入牌序、房间、伤害或快照。
- 针对性三文件 7 项通过；原 p003 与消毒测试首轮 12 项通过。新增一条 Playwright，读取真实日志停点、点击消毒、核对药水和命令仅扣／记一次、保存刷新恢复；初轮仅保存提示定位器匹配到两个状态元素而失败，收窄后复跑通过（未启用重试）。截图已查看，未提交图片。
- 代码提交 `6b180281`，PR #654。计数时机修正后四文件 17 项针对性复测通过；冻结该版本后 typecheck、lint、build 与一条 Playwright 全通过（浏览器 1.9 分钟，未启用重试）。全量 Vitest **516 文件通过，3,889 项通过、1 项沿用跳过，无失败**，耗时 1,119.59 秒；运行期间未改代码。首轮全量与计数修正交错，曾出现旧计数断言失败及既有 quest-save 20 秒超时，不作为最终结果；冻结重跑两项均通过，未调整种子、断言或超时预算。最终 Prettier 与 git diff --check 通过。
- 限制：本批只验收一个目标房与 1 XP 回村，未宣称三棵橡树、五任务自然通关或完整战役完成。Boss／Stygian／II–III／usable 不变。
- 下一刀：Fungal Research 目标保留真菌、带回计数和 XP 的自然场景，再接其余 I 级任务及 Disinfection 三目标完整验收。

### 步骤 5 第十七批：Fungal Research 自然场景与真菌姿态轨修正

- 起点 main `c99bca59`（#654 已合入）；分支 `codex/weald-fungal-research-save`。依据 W-04（Weald W3）、R-234／R-236、R-246、R-252／R-038，不新增规则裁定。
- 真实任务入口、固定 seed 7，用两种具名测试玩家偏好走同一目标房：保留一枚真菌时，带回 1、目标成立、每英雄与驿站 1 XP；全砸毁时，带回 2、目标不成立、每英雄与驿站仍得 2 XP。均公开命令合法撤离、回村，不注入牌序、房间、伤害、计数或奖励。测试偏好不进入产品、不改变既有自然策略默认行为。
- 战斗创建、摧毁前后、胜利交接、摘要及回村均严格日志回放；快照伪造带回计数会被拒绝。计数只在清房交接增加，战斗中摧毁不提前增加。
- 自然流程暴露并修复：真菌摧毁原先误当怪物阵亡，触发姿态轨补位，造成存活怪物重叠；活真菌也曾误入 Shuffle 姿态轨校验。真菌不参加轨道校验／顺移／补位，其兼容姿态字段不因真实怪物阵亡而移动；合法区域位移流程保留。
- 结算摘要对该任务展示带回真菌数、目标已取得／未取得及实际 XP；不再显示误导的「巢穴清理」分母。新增一条 Playwright，对照两种公开日志摘要、保存刷新恢复；通过（1.1 分钟，未启用重试），截图已查看。
- 验证（2026-11-14 汇总）：代码提交 `190b1012`，PR #655。首轮三文件 27 项、最终五文件 51 项通过；本地 typecheck、lint、build 与一条 Playwright 通过。本地全量 Vitest 未留下完成报告，进程已结束，不记为通过；同一代码提交的 [GitHub CI](https://github.com/Alpaca-go/ddbg-web/actions/runs/43433352940) 已成功，逐步核对 typecheck、lint、完整 pnpm test、build 均为 success，完整 Playwright 检查亦成功。CI 详细日志下载返回 401，未据此填写全量测试数量。最终 Prettier 与 git diff --check 通过。
- 限制：本批仅首个目标房与提前撤离回村，不宣称三个目标、五任务或整条战役完成。探索用 seed 1 曾在战斗召唤处被 `monsterStanceAreas` 未核实闸门拒绝，留作下一刀核实部署数据接线；不绕过 R-048，不把当前固定场景通过当作所有种子都可玩。
- 待确认：本批无新增规则歧义；Boss／Stygian／II–III／usable 保持原边界。下一刀先核实召唤部署映射，再续其余 I 级任务自然验收。

### 步骤 5 第十八批：召唤部署映射接线与自然日志回放

- 起点 main `56a52656`（#655 已 squash 合入）；分支 `codex/weald-summon-deployment`。旧 PR 远端分支已删除，本地旧分支与未跟踪交接稿保留。
- 核对 R-230、R31／R-034 与 R-234–R-239 已核准房间目录：`selectWealdRoomTile` 已检查身份、几何、部署审阅和未解析标记，返回可靠的 `deployment.monsters`。停点来自 `startDungeonBattle` 只为 Necromancer III 传递 `monsterStanceAreas`，Weald 漏传；现复用同一已核准部署映射，不补猜测区域、不放宽 R-048，也不改变召唤技能或 RNG。
- 新增固定 seed 1 的 Fungal Research 公开命令回归：自然首战实际召唤、落点对照房间姿态映射、召唤前后严格日志存档恢复；不注入怪物、伤害、房间或牌序。沿用具名保留真菌策略，首战后合法撤离；不宣称三目标或全任务通关。
- 验证：代码 `553d1c7e`，PR #656；召唤单测与新自然场景共 2 文件、7 项通过；typecheck、lint、build 通过，既有 Fungal Research Playwright 1 条通过（1.6 分钟，未启用重试，两个摘要截图已查看）。新测试初次类型检查发现只读包数组与存档类型不符，显式使用 QuestStart 后复测通过。[同一代码提交的 CI](https://github.com/Alpaca-go/ddbg-web/actions/runs/43535722469) 全绿：typecheck、lint、完整单测、build、完整 Playwright 均成功；下载日志核实 **518 文件、3,894 项通过、1 项沿用跳过**（648.58 秒）。
- 本地全量不计为通过：`dungeon-battle-l2-admission.test.ts` 的核心 II 级长用例约 315 秒后报告失败（原预算 240 秒）；尚无最终失败栈，不能据耗时断言仅为超时。CI 完整结果确认后主动停止本地重复运行，未修改该测试的种子、断言或预算。本机 Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1；最终文档格式和 git diff --check 通过。
- 待确认：无新增规则歧义；Boss／II–III／Stygian／房间 usable 保持原边界。下一刀 Circle of Witches 的自然目标房、Crone 击杀、XP／回村与存档验收，再续其余 I 级任务及 Disinfection 三目标。

### 步骤 5 第十九批：Circle of Witches 一／三目标自然验收

- 起点 main `7b588a60`（#656 已 squash 合入）；分支 `codex/weald-circle-of-witches-save`。依据 R-244／R-247／R-253、R-038 与核心第 15／16／25 页，不新增规则裁定。
- 固定 seed 2，以公开命令分别走一目标提前撤离与三目标流程。三间不同地图目标房均使用 The Clearing（9 号），每场一只 II Crone，战斗交接后任务组件恢复可用，击杀计数依次 1／2／3；Crone 不进入 45 张 I 级随机池。
- 测试玩家显式采用保守战斗、伤压后休息、公开替补和达到指定击杀数后撤离。三目标途中 Hellion 阵亡，经 prepareReplacementHero／升级待选／joinPreparedReplacements 自然补入 Bounty Hunter；不注入房间、怪物、伤害、牌序或任务计数，不改变既有自然策略默认行为。
- 战斗创建、Crone 击杀前后、胜利交接、任务摘要及回村均严格公开日志存档回放；伪造击杀计数的快照被拒绝。摘要与回村在队四英雄／驿站分别为 1／3 XP；不重复计击杀或奖励。
- UI 摘要改为显示 Crone 击杀数，移除该任务误导的巢穴清理分母。新增一条 Playwright 对照 1／3 击杀与 XP、保存刷新恢复，通过（1.2 分钟，未启用重试）；两张截图已查看，未提交图片。
- 本地针对性四文件 25 项通过（新日志 2、p002 9、召唤自然回归 1、Crone 13）；typecheck、lint、build 通过。代码 `cb6b2756` 的 [PR CI](https://github.com/Alpaca-go/ddbg-web/actions/runs/43539915718) 与 push CI 均成功；typecheck、lint、完整单测、build、完整 Playwright 全通过。下载日志核实 **519 文件、3,896 项通过、1 项沿用跳过**（1,002.89 秒）。PR #657 已转待审，未启动本地重复全量；本机 Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1。
- #656 最新纯文档 head 的补跑记录：完整单测与 build 通过；push Playwright 成功，PR Playwright 失败于既有 hamlet 游商保存刷新断言中异步「无本地卡图」提示差异（43537610617），不是交易牌或价格变化。按 Kyries 本次指示合入，不改本批无关的浏览器测试。
- 待确认：本批无新增规则歧义。仅 Circle of Witches 一／三目标与回村获得自然场景验收，不宣称五任务或完整战役完成；Boss／II–III／Stygian／房间 usable 不变。下一刀继续其余 I 级任务自然验收及 Disinfection 三目标。

### 步骤 5 第二十批：Disinfection 三目标自然验收

- 起点 main `dcf9f758`（#657 已 squash 合入）；分支 `codex/weald-disinfection-three-targets`。依据 R-245／R-038、R-091 与核心第 15／18／29／32 页，不新增规则裁定。
- seed 7 自然进入三间不同目标房（均 Infected Oak 5 号）、各消毒一次并清理三房；seed 2 消毒三棵但只清理两目标房，仍按实际消毒数计 3 XP。逐次检查 Potion 只扣一枚、计数 1／2／3、地图房间 ID 去重和重复消毒拒绝；不注入房间、牌序、伤害、补给或计数。
- 测试玩家显式使用保守战斗、伤压后休息、公开替补及第三次消毒后合法撤离。自然流程暴露测试驱动遇双死亡只准备一名就尝试入队；改为全部死者均有替补才 join，不修改引擎替补准入、不放宽校验，默认未启用 handleDeaths 的自然策略不变。seed 2 覆盖双死亡双替补；seed 1 曾合法耗尽等待英雄而战役失败，不作为三目标成功种子。
- UI 摘要按实际消毒棵数展示，不再将本任务显示为巢穴清理。新增一条 Playwright 对照两个真实日志摘要、3 XP、保存刷新恢复，通过（未启用重试，两张截图已查看）。
- 本地 typecheck、lint、build 与既有四文件 16 项回归通过。新三目标日志最终两项通过（141.71 秒），加既有回归合计五文件 18 项；消毒前后、战斗交接、双替补前后、任务摘要与最终回村均严格回放，拒绝伪造消毒计数或房间 ID 快照，四名在队英雄与驿站各获 3 XP。首轮 seed 7 在回村意志转换后需替补，直接 finishReturnToHamlet 被正确拒绝；补齐替补与独立准备待选后通过，保留原种子、断言和时限。最终测试改动后引擎 typecheck、ESLint 与 Prettier 再检查通过。代码 `bc3e0f75` 的 [完整 CI](https://github.com/Alpaca-go/ddbg-web/actions/runs/43546308424) 成功：typecheck、lint、完整单测、build、完整 Playwright 全通过；下载日志核实 **520 文件、3,898 项通过、1 项沿用跳过**（716.94 秒），PR #658 已转待审。不启动本地重复全量；Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1。
- 待确认：本批无新增规则歧义；不宣称五任务或完整战役完成，Boss／II–III／Stygian／房间 usable 不变。下一刀 Fungal Research 三目标、Purge the Woods 与 Patrol the Woods 剩余自然验收。

### 步骤 5 第二十一批：Fungal Research 三目标与 secured 旁置牌

- 起点 main `e3180908`（#658 已 squash 合入）；分支 `codex/weald-fungal-three-objectives`。依据 R-246／R-252／R-038、W-04 与核心第 29 页，不新增规则裁定。#658 代码已有完整 CI；合入时末次纯验证文档提交的补跑仍进行中，不将其写作已完成。
- 修复 R-246「secured 后弃掉」遗漏：过去从完整 3／6／8 号旁置集合重复抽取；现在以任务进度 `fungalResearchSecuredRoomCardIds` 记录已取得牌，后续抽取排除这些牌。只有胜利清理目标房且仍有未砸毁真菌才加入；全砸不会移出。已取得牌以专用列表保留，不混入普通洗牌堆；完整地点九张来源与原守恒检查不放宽。重复／非旁置记录及候选耗尽拒绝；仅 Fungal Research 使用该列表，Circle／Disinfection 单旁置复用不变。换任务走既有显式状态重建，不继承此任务进度。
- 固定 seed 1，显式保留真菌、保守战斗与休息，经公开命令取得三间不同地图目标房及 3／8／6 三张牌，每场结束均至少留一枚真菌；带回累计 4，但每英雄及驿站 XP 封顶 3。测试核对每场只在胜利交接计带回、真实摧毁量与计数增量一致，并在战斗创建、首次摧毁前后、三次交接、摘要及回村严格存档回放；篡改已取得牌列表被拒绝。
- 首轮使用 seed 2 的三间清房当作三目标，断言暴露其第一目标已全砸、并未 secured；未将它写作取得三目标。改用确实取得三目标的 seed 1；另修正普通牌堆尚未洗牌时为 null 的测试断言，以及负例夹具删除可选 battle 字段的 TypeScript 写法。不修改伤害、牌序、种子驱动 RNG 或目标条件来迁就测试。既有首目标保留／全砸对照继续通过。
- 本地 typecheck、lint、build 通过；五文件 21 项通过（新三目标 1、既有四文件 20）。两条 Playwright 通过（1.4 分钟，未启用重试）：首目标保留／全砸对照，三目标带回 4／3 XP 及保存刷新；新三目标截图已查看。代码 `b9f52a6d` 的 [完整 CI](https://github.com/Alpaca-go/ddbg-web/actions/runs/43549091769) 全绿：typecheck、lint、完整单测、build、完整 Playwright 均通过；下载日志核实 **521 文件、3,899 项通过、1 项沿用跳过**（1,090.37 秒），PR #659 已转待审。未运行本地重复全量；Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1。
- 存档继续按公开日志严格重建，不静默补齐旧快照中缺失的 secured 记录；受本次修正影响、已经取得目标的旧 Fungal Research 快照不保证兼容。无新增规则待确认；本批不宣称五任务或完整战役完成，Boss／II–III／Stygian／房间 usable 不变。下一刀 Purge the Woods、Patrol the Woods 自然验收。

### 步骤 5 第二十二批：Purge the Woods 三巢穴自然验收

- 起点 main `b1df982d`（#659 已 squash 合入）；分支 `codex/weald-purge-natural-save`。依据 R-248／R-251、R-038 与核心规则书第 15／29／32 页，不新增规则裁定或任务特判。#659 代码完整 CI 已通过；合入时末次纯文档提交补跑尚在运行，不记作已完成。
- 固定 seed 4，以公开命令完成三间巢穴及回村。测试玩家显式保守战斗、伤压后休息、正常准备替补与入队，不注入牌序、英雄、伤害、怪物、房间或清理计数。探索种子 1／2／3 曾耗尽等待英雄，seed 7 的测试驱动曾停于 heroesDefeated；均不记为成功，不声称所有种子可通关。
- 本卡实际 Dark×3／Lair×3／Trap×2 分布中，记录的战斗全部来自巢穴，所有部署实例为 Weald 当地实体；各存档停点验证 monsterDrawScope=wealdLocalOnly 与 14 张目录。保留核心战斗目录内通用引用，不把它们误当随机牌池；没有给其他任务加仅巢穴开战的特判（R-251）。
- 实际进入 Dark 与 Trap；Dark 每次入口光照减 1（不低于 0），Dark／Trap 代币均保留、未清理。保存首战部署、首次 Dark／Trap 入口、每次胜利清理交接和最终摘要／回村；严格公开日志回放，篡改当地池限定快照被拒绝。最终清三巢穴，摘要与四名在队英雄／驿站均 3 XP，回村牌池守恒。
- 本批只新增测试与夹具，规则引擎和 UI 无改动。新测试首轮将可选 cleared 的 undefined 写作 false 断言，修正为明确布尔投影，并补齐 recoverHamletPools 的 seed 参数与正确 resolved 状态；场景数据和规则未改。新增一条 Playwright 显示三巢穴／3 XP、保存刷新后仍为当地限定池，通过（37.3 秒、未启用重试），截图已查看。
- 本地 typecheck、lint、build 通过；既有四文件 29 项回归通过（p004／p005、Weald 怪物目录、核心房间），新严格日志最终复跑 1 项通过（45.77 秒），合计五文件 30 项。代码 `17bd2a27` 的 [完整 CI](https://github.com/Alpaca-go/ddbg-web/actions/runs/43551996022) 全绿：typecheck、lint、完整单测、build、完整 Playwright 均通过；下载日志核实 **522 文件、3,900 项通过、1 项沿用跳过**（747.46 秒），PR #660 已转待审。不启动本地重复全量；Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1。
- 无新增规则待确认；不宣称五任务或完整战役完成，Boss／II–III／Stygian／usable 不变。下一刀 Patrol the Woods 的六间可清理房、首轮怪物先攻规则与 XP／回村自然验收，再核对 I 级阶段收尾。

### 步骤 5 第二十三批：Patrol 六房与首轮先攻自然验收

- 起点 main `51e7ff20`（#660 已 squash 合入）；分支 `codex/weald-patrol-natural-save`。依据 R-242／R-038、核心第 25／29／32 页与种子 RNG 约定，不新增规则裁定。#660 代码完整 CI 已成功；合入时末次纯文档补跑尚未结束，不记为已完成。
- 固定 seed 3，公开命令清理 Empty×1、Curio×2、Treasure×1、Lair×2，共六房；Trap×2 不清理。显式保守战斗、伤压后休息与正常替补；战斗实际使用通用实例，45 张当地＋通用混池不带 Purge 的当地限定。种子 1／2 曾耗尽等待英雄，不记作成功，不声称所有种子必胜。
- 核对每次首轮与第二轮起的先攻序列、首轮待抽前／后、首次第二轮、逐房清理、摘要和回村严格公开日志回放。四名在队英雄及驿站最终各 3 XP，替补与待选正常完成，不注入英雄、怪物、伤害、清理记录或奖励。
- 修复发现的 RNG 接线缺陷：`rollPatrolTheWoodsBattleStartD10` 已消费一随机数，但用于洗牌的本地 RNG 未同步，重用了该次掷骰。仅在 Patrol 第 1 轮将本地 RNG 同步前进一位，游标总消费量不变，d10 与洗牌依次消费；其它任务及第二轮起不变。自然场景低光照多触发置顶会掩盖差异，另用明确标识的受控先攻夹具核对不触发时序列；修正前 seed 4／roll 5／light 5 的序列断言失败，修正后通过。受控夹具与自然回放分开，不把受控 seed／光照作为自然流程证据。
- 摘要由误导的「巢穴清理 6／3」改为「已清理 6 间房（每 2 间 1 XP）」。新增一条 Playwright 核对六房／3 XP、保存刷新及混池范围，通过（1.4 分钟、未启用重试），截图已查看。
- 本地 typecheck、lint、build 通过；六文件 43 项针对性通过（新场景与 Patrol 先攻 3，核心 encounter／最暗普通先攻／p004／p005 共 40）。代码 `94e5c5a5` 的 [完整 CI](https://github.com/Alpaca-go/ddbg-web/actions/runs/43555180003) 全绿：typecheck、lint、完整单测、build、完整 Playwright 均通过；下载日志核实 **523 文件、3,901 项通过、1 项沿用跳过**（686.94 秒），PR #661 已转待审。不启动本地重复全量；Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1。因修正 Patrol 洗牌随机序列，受影响的旧 Patrol 日志／快照不保证兼容，不静默补齐或跳过严格回放。
- I 级固定种子场景已覆盖：Fungal Research 三目标／带回 4 封顶 3 XP（第二十一批）；Circle of Witches 三 Crone／组件复用／3 XP（第十九批）；Disinfection 三棵与未清房仍计消毒／3 XP（第二十批）；Purge 三巢穴／当地池／3 XP（第二十二批）；Patrol 六房／混池／首轮先攻／3 XP（本批）。上述是逐任务自然场景，不等于同一战役连续通关、所有种子必胜或完整地点战役完成。
- 无新增规则待确认；步骤 5 暂保留验收状态。下一刀先核对 I 级阶段剩余停点与房间 usable 等边界，再接 Hag I 的正式任务入口、Boss 房与专属能力；Boss／II–III／Stygian 尚未开放。

### 步骤 6 首批：Hag I 印刷映射与 W4 部署前置

- 起点 main `5035038a`（#661 已 squash 合入）；分支 `codex/weald-hag-entry-review`。合入时 #661 代码完整 CI 已成功，末次纯文档补跑仍在进行中，不记作已完成。
- I 级收尾核对：五任务的固定种子自然场景、XP／回村与日志已补齐；普通九房经独立选择器运行，但 schema 的 usable 仍显式 false，泛用地点开放、Boss／Stygian 与同一完整战役验收不是本批顺带放行项。步骤 1–5 不一并标为完成，步骤 6 仅标前置审阅。
- 使用当前官方 Weald 印刷源逐页渲染核对 W4、Hag／Cauldron I 能力与战斗卡、10 号房间及板块全图，图片仅存忽略缓存。新增 [Hag I 印刷接线审阅](weald-hag-i-review-2026-11-14.md)，记录真实 raw 页序、旧别名、卡面候选与独立待审边界；沿用 Q-186，不发明新裁定、不将候选写入 normalized。旧 Phase 5 Hag 记录加历史说明，避免继续当作已核准数据。
- 官方 W4 已明确空锅位于 Ranged，修正旧 Aggressive 声明；部署须来自显式 monsterStanceAreas，并检查区域实际存在，移除从同姿态英雄位置推断区域的回退（R-048）。受控测试把怪物部署区与英雄所在区明确分开；缺映射或区域不存在时保持原状态并拒绝。不把受控区域当作已批准的 10 号几何。
- Hag 两次行动与整场三张怪物先攻分开：printedInitiativeCards=2 是旧 Hag 自身声明，不能直接改成 3 后另加锅一张。完整 Hag＋锅先攻适配、空锅跳过、英雄入锅／释放、移除锅、正式任务入口与清场仍待接线；锅 Full 背面身份及迁移策略待定。旧测试 100／120 Life 等人工数值不作为印刷来源。
- 本地 Hag 两文件 20 项、核心威胁／遭遇／Necromancer／Prophet 四文件 43 项通过，合计六文件 63 项；typecheck、lint、build 通过。既有 Weald 首趟抽选／锁定抽法／出征刷新恢复 Playwright 一条通过（12.8 秒，未启用重试）；未新增伪造的 Hag 浏览器场景，正式 Boss 闭环尚未到阶段验收。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1；代码 `e6db26c6` 的 [完整 CI](https://github.com/Alpaca-go/ddbg-web/actions/runs/43563088729) 全绿：typecheck、lint、完整单测、build、完整 Playwright 均成功；日志核实 **523 文件、3,902 项通过、1 项沿用跳过**（878.34 秒）。PR #662 已转待审，不启动本地重复全量。
- 待确认字段与后续顺序见新审阅表；新 Boss 数值、技能图标与 10 号逐区几何继续 Q-186。此次姿态／部署来源修正可能使旧的独立 Hag 试验状态不再准入；不提供英雄区域回退或猜测几何来兼容。未扩大普通池、任务白名单、usable、II／III 或 Stygian。

- CI 等待期间补齐仅文档的 10 号板块首轮候选：11 区容量／部署、17 对通路、两处角点及两黑墙分类，高低地仍待核定。未写生产几何；格式和链接路径核对通过。

### 步骤 6 第二批：Hag I／10 号板块更正与核准（R-254）

- Kyries 先更正脚印／等级右侧数字、B–F 与胸甲语义，随后明确 10 号板块无高低地、其它内容核准通过。按更正后的审阅表登记 R-254，仅结案本表 Hag I／Cauldron I 与 10 号板块，不扩展 Q-186 其他内容。
- Hag I 的生命上方脚印为 Speed 2；绿色 I 右侧数字为 Dodge 1。Empty／Full Speed 均 0。B–F 改记仅角点，不列为可通行边或墙阻隔区域对；10 号 A–K 全部 normal，其余表列属性、技能、能力、容量、部署与 17 对通路等按核准值保留。
- Empty 胸甲为内置 Protection，沿用 R-019 常驻不可移除；攻击伤害只减半一次并向上取整，叠代币不再减半，Bleed／Blight 伤口不减半。更新 R-019 交叉说明；不将胸甲记成可累加数值 1，不自动继承到 Full 无胸甲面。
- 本批只改审阅表、裁定、规格书与进度，不把字段核准等同于生产数据接入或正式 Boss 开放。核对 statusProjection、攻击减伤及持续伤口路径已与 R-019 一致；既有 status／hero-skill／monster-skill／encounter-health 四文件 111 项通过，未增加重复实现测试。文档执行 Prettier、链接路径检查与 git diff --check；不重跑无代码变化的全量、build 或浏览器。
- 下一刀按 R-254 写 Hag I／锅独立目录与 10 号生产几何，再接真实 ID 与旧别名、完整先攻／锅生命周期和正式任务闭环；其他 Boss、II／III、Stygian 与全局 usable 不变。

### 步骤 6 第三批：Hag I 独立印刷目录与 10 号生产几何

- PR #662 已合入 `62534e0e`，合入前最新头 `1a8d4871` 两组完整 CI 均通过。
- 新建 `normalized/extension/weald/hag_i.json` 与 Zod 校验，录入 R-254 核准的三个卡面、技能数值／效果、选招、能力摘要、威胁及 W4 开场要求。未印刷伤害保持 null；Empty／Full 共用 raw `monster_large:weald:p013`，用 face 区分，没有给背面臆造运行 ID 或增加组件。
- 10 号 11 区、17 通路、三角点、部署及墙体说明写入专用目录。区域全为 normal；复用共用几何校验和现有战斗区域投影，普通目录仍仅允许原有 1–9 号。Boss 卡不进入普通 14 实体池，`combatReady`／`usable` 保持 false。
- 新增真实 raw 来源映射、卡面属性／选招、目录隔离及战斗相邻投影测试；覆盖 B–F／E–K／H–J 不通行、E–G 墙体不通行、C–F／D–G 剩余共边可通行、部署区独立与投影不改源数据。相关八文件 55 项、本地 typecheck／lint／build 已通过；代码 `74d19889` 的 [完整 CI](https://github.com/Alpaca-go/ddbg-web/actions/runs/43571352285) 通过 typecheck、lint、全量单元／场景测试、build 和完整 Playwright。本批未改 UI，也未完成 Boss 阶段，不新增浏览器用例。后续仅文档补录验证，格式及 diff 检查通过，不重复全量。
- 下一刀为真实 ID 与旧别名迁移，再实现 Hag 两次＋锅一次先攻、空锅跳过、入锅／释放和正式任务闭环；未描述的生命周期细节继续按规则核对，不按字段核准类推。

### 步骤 6 第四批：Hag I 真实运行 ID

- 起点 main `ec857bd1`（#663 已合入），分支 `codex/weald-hag-print-identities`。依据 R-254 与已核准独立目录，不新增规则裁定。
- 描述卡／Hag 能力／锅能力分别对应 `boss_ability:weald:p013`／`p016`／`p019`；Hag 与空锅对应 `monster_large:weald:p010`／`p013`。补齐锅能力常量及公共导出，去掉过时 TTS／未核实页序注释。
- 满锅采用 `monster_large:weald:p013:back` 作为运行卡面 ID，映射同一个 raw p13 的 back，不新增印刷卡或组件；既有 Empty→Full 转换保留实体 ID、实体数量及原状态不可变性。独立卡面查询保留 Empty 66 Life／内置 Protection 与 Full 9 Life／无内置 Protection；未将旧受控测试数值当生产来源。
- 兼容策略：旧 Hag 占位 ID 不再识别，不建立别名回退或静默快照改写；旧 Hag 试验日志／快照不保证兼容，存档沿用严格公开命令回放及快照一致性校验。其他 Boss 和核心存档格式未改。普通池、combatReady／usable、正式出征资格保持原状。
- 无新增规则待确认；正式部署、完整先攻、空锅跳过、入锅／释放与清场仍未完成，本批不宣称 Boss 自然闭环。未改 UI，也未到 Boss 阶段末，不新增浏览器场景。
- 验证：Hag 相关七文件 54 项通过；本地 typecheck／lint／build 通过。核心 quest-save 九项中八项通过，自然战斗回放场景触发既有 20 秒时限，单独复跑仍超时（未修改时限）。代码 `389d3fad` 的两组完整 CI 全绿；[PR 完整 CI](https://github.com/Alpaca-go/ddbg-web/actions/runs/43574649627) 日志核实 **526 文件通过、3,916 项通过、1 项沿用跳过**（1,060.77 秒），包括 quest-save 全部九项；typecheck、lint、build 与完整 Playwright 均成功。PR #664 转待审，不合入本批。后续仅文档补录结果，格式与 diff 检查通过，不重复全量。Node 24.20.0（低于约定 24.21.0），pnpm 12.9.1。

### 步骤 6 第五批：W4 完整先攻与空锅跳过

- 起点 main `3344c4a3`（#664 已合入），分支 `codex/weald-hag-w4-battle`。#664 代码完整 CI 已全绿，合入时末次仅文档补跑尚在运行。依据 Weald W4、R-254 及既有按姿态选行动者规则，不新增规则裁定。
- Hag 活着且遭遇识别为 Hag I 时，在实体各一张的基础上仅补一张怪物先攻；开场四英雄＋Hag／锅为 4／3 张。Hag 两次回合结束后才进入 actedIds，轮末计数重置；锅仍只占一张，不将 Hag 自身 printedInitiativeCards 从 2 改成全场 3。非 Boss 遭遇不受全局脚本注册影响。
- 空锅保留先攻／回合开始补给窗口，沿用回合开始触发、状态与死亡收尾后自动结束，不选招、不增加 RNG 消费。Full 保留正常怪物回合。正式英雄入锅、释放、锅死亡和 Hag 清场尚未实现，本批不把既有 Empty→Full 试验当完整生命周期。
- 受控测试经 startBattle、drawInitiative、finishMonsterTurn 检查 4／3 张、种子重复一致／原状态不变、两次 Hag、一次空锅、下一轮重置；英雄回合直接调用 finishTurn，不称为公开日志自然战役。既有受控 100／120 Life 和旧技能模板不作为生产来源，正式数值仍仅认独立目录。补给窗口、Full 不跳过与普通遭遇隔离覆盖。
- 正式出征仍依赖专用技能投影（Into the Pot 未印刷伤害不得补 0）及完整入锅流程。原计划中的正式部署不在本刀提前开放；普通池、usable／combatReady、任务白名单不变。无新增规则待确认，未到 Boss 阶段末、不新增浏览器用例。
- 验证：四文件 80 项针对性通过（Hag、核心遭遇、Fanatic、Prophet）。2026-11-14 核实代码 `e65c83b2` 的 [完整 CI](https://github.com/Alpaca-go/ddbg-web/actions/runs/43577067382) 全绿：typecheck、lint、全量单元／场景测试、build 和完整 Playwright 成功；下载日志核实 **526 文件、3,921 项通过、1 项沿用跳过**（743.08 秒）。本地 typecheck、build 通过；Hag 审阅表仅整理排版后 lint 复跑通过。既有 Weald 首趟抽选／锁定抽法／出征刷新恢复 Playwright 一条通过（44.7 秒，未启用重试），使用配置已有的 PLAYWRIGHT_CHROMIUM_EXECUTABLE 指向本机 Chromium 1234；默认所需 1243 未安装，首次启动失败不计为通过。
- 本地重复全量在终止前报告 quest-save 自然战斗回放、II 级五任务守卫战及 Disinfection 两个自然回放场景共四项超时；核实同一代码完整 CI 成功后停止该次重复全量，**本地全量未完成、不记作通过**，也未完成这些超时用例的独立复跑。不修改测试时限、种子或断言，不将其断言为已证明的资源问题。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1。
- 本次只补录验证及审阅表排版，保留未跟踪的旧交接文档；不新增规则待确认项。下一刀仍为 R-254 专用技能／属性投影与 10 号正式部署，再接入锅／释放及清场；Hag 正式出征、其他 Boss、II／III 与 Stygian 均未开放。本批尚未合入，不以 CI 成功代替正式 Boss 自然验收。

### 步骤 6 第六批：Hag I 运行投影与初始部署数据

- 起点 main `6f4f6ab3`（#665 已 squash 合入并同步本机，远端分支已删除）；分支 `codex/weald-hag-combat-projection`。#665 代码完整 CI 全绿，末次纯文档提交的补跑未在合入前等待，不将其写作已完成。
- 依据 R-254／W4，将独立目录三面投影为运行卡面：60／66／9 Life、Speed／Dodge、内置 Protection、抗性／免疫、选招及目标／范围／目标数。Hag 两个普通攻击与 Boil 经共用攻击及效果结算器读取伤害、压力和减益；不复制结算逻辑、不从旧人工数值生成目录。
- Into the Pot 只投影实际 Acc、范围、目标及效果文字，不添加未印刷 Crit／伤害数字或伤害图标。新增专用拒绝标记，运行卡面在通用攻击入口明确拒绝尚未接入的入锅／释放；旧受控翻锅夹具不代表该正式卡面已经可执行。
- 新增 10 号初始怪物部署数据，Hag 在 B／Aggressive、Empty 在 F／Ranged，各占两格；Full 仅为同一锅的背面卡面，不额外增加实体。几何及部署来自核准目录并返回新数据。此函数尚未接入正式战役任务入口，不称为正式出征部署已完成；普通池、usable／combatReady 与正式出征资格不变。
- 验证：六文件 72 项针对性通过，覆盖三面属性／选招、空伤害与拒绝、真实攻击结算、B／F 部署及目录不变，兼顾旧 Hag／核心怪物／Weald 普通攻击回归；本地 typecheck／lint／build 均通过。代码 `6712e7a8` 的 [完整 CI](https://github.com/Alpaca-go/ddbg-web/actions/runs/43580888315) 全绿，typecheck、lint、全量单元／场景测试、build 和完整 Playwright 均成功；下载日志核实 **527 文件、3,924 项通过、1 项沿用跳过**（1,103.26 秒）。PR #666 转待审，本批不合入；后续只补录验证文档，格式和 diff 检查通过，不重复全量。本机 Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1。未到 Boss 阶段末，不新增伪造的浏览器场景。
- 无新增规则待确认。下一步补齐入锅／释放、锅完整生命周期及 Hag 清场，再接正式战役部署入口、日志自然回放和阶段末冒烟。未跟踪的旧交接文档保留，本批不提交它。

### 步骤 6 第七批：W4 空锅清场与 R-255 入锅／释放状态原语

- 起点 main `4ba1fb3a`（#666 已 squash 合入、本机同步并删除远端分支）；分支 `codex/weald-hag-empty-clear`。#666 代码完整 CI 全绿；合入时末次纯文档补跑仍进行中，不将其写作已完成。
- 复核官方 W4、Hag／锅能力与 Into the Pot 卡面图像后提出三项 Q-186 问题。Kyries 本次逐项确认，已登记 R-255 并同步 [Hag 审阅表](weald-hag-i-review-2026-11-14.md)：英雄离板上锅卡、无原姿态／先攻且不可操作或选中；每次 Hag 空锅回合先入锅再同回合第二招；Full 打翻或 Hag 清场时释放到邻接合法区，英雄 Aggressive、其余后移。不再将这三项列为待确认，不使用 FAQ。
- 先接 W4 无歧义的空锅清场：在明确 Hag 本次死亡的 Boss 遭遇交接中移出仍存活的 Empty，沿用既有伴战角色保留日志身份和死亡标志的实现，伤口与 Life 不变，不追加 RNG／战利品。随后由共用死亡交接与胜利检测收尾。未发生本次死亡、非 Boss 遭遇或 Full 均不类推处理；不把该空锅受控场景写成锅完整生命周期。
- 新增 R-255 入锅／释放状态原语：英雄从棋盘实体列表移入锅内记录，不保存原区域或姿态；移除尚未用掉的一张英雄先攻，后方英雄前移。Full 按核准 Life／Protection 翻面清伤。释放通过公开 resolveChoice 选择合法邻区，英雄 Aggressive、其余后移，Empty 恢复 Life／Protection 并清伤，不补先攻、不抢用其他英雄剩余先攻。重复请求保留原待选；无合法容量、非法选择与重复释放原子拒绝，不提供猜测落点。
- 修正强制选招由每轮首次改为每次 Hag 空锅回合，钩子契约同步更名，避免保留误导的 firstActionEachRound。技能自身拉近／命中、同回合第二招、Boil 与自动释放触发尚未连接这些状态原语，正式投影卡的 Into the Pot 拒绝仍保留；不把可调用的状态原语写成完整技能或战役已完成。
- 验证：新增四项入锅／释放受控测试，最终七文件 83 项回归通过；其中释放待选走公开 resolveChoice，但夹具人工英雄属性及直接调用入锅原语不算自然战役或正式存档。新增空锅清场两项仍通过。本地 typecheck／lint／build 通过；代码 `79a50a1b` 的 [完整 CI](https://github.com/Alpaca-go/ddbg-web/actions/runs/43586515880) 全绿：typecheck、lint、全量单元／场景测试、build 和完整 Playwright 均成功。下载日志核实 **528 文件、3,930 项通过、1 项沿用跳过**（1,013.59 秒）；早期仅空锅清场代码的 CI 不充当扩大范围后的完整验证。PR #667 转待审，本批不合入；末次仅文档／注释补录，格式与 diff 检查通过，不重复全量。本机 Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1。未到 Boss 阶段末，不新增伪造的浏览器场景。
- 下一步接完整技能编排、自动释放、满锅清场、正式 Boss 部署与自然日志场景。三项 Q-186 已结案为 R-255，无新增规则待确认。新增锅内记录尚未由正式命令日志生成，不宣称其正式存档兼容；旧 Hag 试验清场结果改变，不静默改写旧快照。正式入口、普通池、usable／combatReady、其它 Boss 与 II／III／Stygian 均不扩大。未跟踪旧交接文档仍保留，不提交它。

### 步骤 6 第八批：Into the Pot 命中与同回合第二招

- 起点 main `09026274`（#667 已 squash 合入并同步本机，远端分支已删除）；分支 `codex/weald-hag-into-pot-turn`。#667 代码 `79a50a1b` 完整 CI 已全绿，末次文档／注释补录的补跑未在本轮合入前额外等待，不将其写作已完成。
- 依据 R-254／R-255／R-020，逐字段核对核准技能后，Acc 与 Self Pull 复用共用怪物命中、自身效果、位移和待选续接；未印刷 Crit／伤害继续缺省，不增加 damage 图标或填 0。共用自身效果完成后，命中才调用入锅原语；落空不翻锅、不移除英雄。Hag 自身 Pull 1 沿用 R-020 防御，本卡实际被阻止，未为测试取消防御。
- 命中／落空均保留当前 Hag 回合，第二招走正常姿态选招、目标、定位和攻击；期间不再强制 Into the Pot，不重复回合开始效果，也不提前增加本轮回合计数。第二招完成才结束这一次先攻，清除第二招标记；下一次 Hag 先攻仍按当时锅面判断。正式投影 Hag 必须使用已准备的技能／目标，Full 运行卡缺失或未核准在掷骰／移动前原子拒绝。
- 新增固定 seed 7 命中／落空受控命令对照：保留真实 Hag 目录与 10 号几何，人工调整英雄位置及闪避以覆盖命中／落空，不称自然部署。通过 prepareMonsterAction／moveMonsterToRange／playMonsterSkill／resolveShuffles 等公开命令完成两招；核对无伤害、仅命中入锅、同回合配额、第一招只消费一次攻击骰、下一次 Hag 先攻及原状态不变／重复确定性。漂移技能与非法 Full 目录拒绝；同一卡面 JSON 字段顺序变化不误拒绝，数组顺序和实际内容继续核对。另修正全灭判断：锅内存活英雄仍计存活，不从棋盘实体列表误判队伍全灭；死亡投影的受控回归不算自然战役。新文件四项、八文件 95 项回归通过；字段顺序修正后另复跑新文件四项通过。
- 验证：本地 typecheck／lint／build 已通过；最终代码 `edfbd79c` 的 [完整 CI](https://github.com/Alpaca-go/ddbg-web/actions/runs/43591331388) 全绿：typecheck、lint、全量单元／场景测试、build 和完整 Playwright 均成功。下载日志核实 **529 文件、3,934 项通过、1 项沿用跳过**（908.00 秒）。前两个代码提交的补跑已随新提交自动取消，不充当最终验证。PR #668 转待审、本批不合入；末次仅文档补录，格式与 diff 检查通过，不重复全量。本机 Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1。
- 正式战役入口、Boil 对锅内英雄的结算、伤害／死门／Hag 死亡触发的自动释放及原技能续接仍未接通，不把本批写成锅完整生命周期或正式可玩。没有新增规则待确认；普通池、usable／combatReady、其它 Boss 与 II／III／Stygian 保持原状。旧 Hag 试验日志／快照不保证兼容，严格回放不静默补齐。未到 Boss 阶段末，不新增伪造浏览器场景；未跟踪旧交接文档保留、不提交。

### 步骤 6 第九批：自动释放与原技能／回合续接

- 起点 main `4caf9eee`（#668 已 squash 合入、本机同步，远端分支已删除）；分支 `codex/weald-hag-auto-release`。#668 代码 `edfbd79c` 完整 CI 全绿；末次纯文档补跑未在本轮合入前额外等待，不写作已完成。
- 依据 R-254／R-255 与 Weald W4，Full 伤口达到 Life、Hag 死亡或锅内存活英雄到达死门时，在死亡移除／胜利判断之前先返回邻接区域 PendingChoice；释放后翻 Empty 清伤，Hag 已死亡则继续 W4 移除锅与清场。入锅即已在死门的英雄也立即释放，再继续原 Hag 回合第二招。
- 待选只保存可序列化的已结算事件、死亡 ID 与收尾阶段；分别续接玩家技能、怪物技能、回合开始状态后的收尾或 Hag 第二招。回合开始拆出已完成状态后的续接入口，不重新运行攻击、状态与已完成 RNG。选择过期／非法仍拒绝；重复选择不再扣行动或结算攻击。
- 新增六项受控测试：真实 Smite 打翻 Full／击败 Hag、Hag 被反击击败、回合开始流血击败 Hag、命中已在死门英雄，以及 Boil 误攻拒绝。释放走公开 resolveChoice，核对 JSON 状态往返、原技能不重发、行动仅扣一次、RNG 不重复、原状态不变及清场／同回合第二招续接。受控初始入锅、伤口与 Buff 不算自然战役或正式命令日志验收。最终八文件 93 项回归、本地 typecheck／lint／build 均通过。
- 验证：最终代码 `168ee67d` 的 [完整 CI](https://github.com/Alpaca-go/ddbg-web/actions/runs/43595633977) 全绿：typecheck、lint、全量单元／场景测试、build 和完整 Playwright 均成功。下载日志核实 **530 文件、3,940 项通过、1 项沿用跳过**（1,098.80 秒）。PR #669 转待审、本批不合入；末次仅文档补录，格式与 diff 检查通过，不重复全量。本机 Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1。
- Boil 专用结算未完成，现有 Full 在有锅内记录时明确拒绝普通选招／攻击，避免把射程 0 的 Boil 误用到锅外英雄；纯卡面数据与旧无锅内记录的受控夹具不冒充 Boil 已完成。续核的锅内心脏病问题已获 Kyries 确认，登记 R-256：移走死亡英雄、不放邻区，锅翻 Empty 并清伤；不改变 R-255 其它释放。本批只登记此裁定，尚未实现该 Boil 死亡分支。
- 下一步按 R-256 接锅内伤害／压力及死亡移除，并复用自动释放；没有新增规则待确认。随后接正式部署／自然日志。正式入口、普通池、usable／combatReady、其它 Boss 及 II／III／Stygian 不变。旧 Hag 试验日志／快照不保证兼容，严格回放不静默补齐。未到 Boss 阶段末，不新增伪造浏览器场景；保留未跟踪旧交接文档、不提交。

### 步骤 6 第十批：Boil 锅内结算

- 起点 main `9df3cc76`，PR #669 已按 Kyries「合入，继续」squash 合入，本机同步并删除远端分支；本批分支 `codex/weald-hag-boil`。
- 依据 R-254／R-255／R-256，Full 的当前回合选招入口直接结算锅内英雄，复用核准 Boil 卡面、攻击骰、有序生命效果、暴击压力与意志检定。锅内英雄仅在内部生命／压力视图中出现，不加入外部选区。普通攻击入口仍拒绝误攻锅外英雄。
- 存活英雄到死门复用已有 PendingChoice 和原技能收尾；心脏病死亡保留死亡实体交给现有死亡移除层，不提供邻区选择，锅翻 Empty 并清伤。检查卡面与上下文后才消费 RNG，拒绝不改变输入。
- 受控测试覆盖锅内伤害与压力、死门释放后续接、心脏病死亡清锅、JSON 往返确定性、输入不变和篡改卡面拒绝；非正式战役日志验收。Hag 八文件 56 项通过，补充拒绝用例后单文件 10 项通过。本地 typecheck／lint／build 通过；全量测试仍运行中；quest-save.test.ts 的显式 20 秒超时已出现，单独复跑也有 1 项超时、8 项通过（58.40 秒），尚未完成本批 main 基线对照，不声称全绿；PR #670 保持草稿，远端 CI 待完成。本机 Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1。
- 无新增规则待确认；下一步接正式 Boss 部署与自然日志场景。未到 Boss 阶段末，不新增伪造 Playwright 场景；其它 Boss／高等级／Stygian 不在本批范围。未跟踪旧交接文档保留、不提交。

### 步骤 6 第十一批：Hag I 目标房绑定与专用部署

- 起点 main `5d11f88f`（#670 按 Kyries「合入，继续」squash 合入，同步本机并删除远端分支）；分支 `codex/weald-hag-deploy`。合入时 #670 CI 尚在运行，不能写作全绿。上一批本地全量有存档回放超时且未完成；跨分支后已终止该轮，不将混合工作区期间运行的结果作为本批验证。
- R30／Weald W4／R-254：Face the Threat 实际威胁为 Hag I 时，绑定独立的 `room:weald:p010`，不从普通房间牌堆抽取。须显式选 Weald、I 级、正确威胁与出征计划、已揭示且未清理目标房；冷启动注册缓存不构成权限来源。Stygian 待后续核实，当前明确拒绝。
- 新增可保存的 `deployHagI` 命令：验证四英雄属性／装备技能和上下文，按核准 10 号板块部署英雄 A/I/J/J、Hag B、Empty F；保留伤口、压力、状态、补给、意志牌、战利品与 RNG／选择游标，等待显式 startBattle。启动后怪物先攻共三张、能力威胁停止。只从独立核准目录生成 Boss，不向普通怪物池补卡。
- 抽出 Fanatic 原有英雄部署校验供两者复用；原有 Fanatic 各等级行为不变。受控目标房测试覆盖部署、冷缓存、JSON 往返、命令 schema、无重复部署、池与 RNG 守恒，及未选包／错误威胁／计划／等级／Stygian／技能拒绝。不称自然任务或正式命令日志验收。
- 验证：13 文件 89 项针对性回归通过；冷缓存修正后 3 文件 11 项通过；最终上下文修正后 4 文件 17 项通过。lint、build、改动文件格式与 diff 检查通过；最终 typecheck 通过；本批全量测试已启动，完整 CI 尚待本批 PR。测试夹具的可选字段写法错误已修正后复跑。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1。
- 待确认：无新增规则问题。下一批接胜利／失败交接、XP／回村、自然命令日志和 UI 入口后，再做 1–3 条 Playwright 冒烟。本批不把受控部署称作正式可玩，不改普通目录 usable／combatReady，不扩展其它 Boss 或等级。未跟踪旧交接文档保留、不提交。

### 步骤 6 第十二批：Hag 战斗胜负与任务结算交接

- 起点 main `906afd92`，#671 按 Kyries「合入，继续」squash 合入，同步本机并删除远端分支；合入时 CI 尚在运行，不追记全绿。分支 `codex/weald-hag-finish`。
- R30／R38／R-044／R-122、Weald W4／R-254–256：finishDungeonBattle 识别真实 Hag 专属房部署，严格核对等级、包、威胁、计划、四英雄、终局、游标和战利品；仍有锅内记录、待选／位移、未处置战利品或双方全灭时拒绝。胜利清房、清除威胁、记录 bossQuestVictory，回传英雄状态、补给、有限战利品池和游标；普通房间／怪物牌池保持原样，不在交接时发 XP。英雄全灭则保留战场并设置战役失败。
- R-256 锅内死亡英雄可以没有棋盘姿态；交接保留其原地牢元数据，存活英雄仍采用释放后当前姿态，不恢复入锅前姿态。Hag 不写进 defeatedRuinsBossIdentities，不假造已击败遗迹 Boss。
- 受控测试：胜利／全灭、存档 JSON 状态往返、重复交接与重复回村拒绝、普通池与 RNG 守恒、定额摘要及回村每名英雄 3 XP；非法包／威胁／终局／身份／游标／战利品原子拒绝，R-256 无姿态死亡与未释放锅内英雄。另有真实公开 Smite→释放选择→战斗胜利→交接链，保留释放后的英雄姿态。其初始房间／伤口／位置受控，不称自然战役；回村测试的 exited 阶段亦为受控前置，不称自然撤离。
- 验证：十二文件 87 项针对性回归通过；补充公开技能收尾后本文件 13 项通过。最终 typecheck、lint、build 已通过；本批全量测试与远端 CI 待完成，PR #672 保持草稿。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1。测试前置的 halted 字段与 Smite 射程已修正，业务规则没有为测试放宽。
- 下一步依赖已核对：establishImminentThreat／drawImminentThreatAfterActAdvance 目前仍基于遗迹池及 defeatedRuinsBossIdentities，尚不能据本批声称 Hag 正式自然出征／完整战役闭环。需按官方地点 Boss 规则接来源与击败记录，再补正式日志、自然回村和 1–3 条 Playwright 冒烟后开放 UI。无新增规则裁定；不自动类推其它 Boss／高等级／Stygian。旧未跟踪交接文档保留、不提交。

### 步骤 6 第十三批：完整地点描述池与独立击败记录

- 起点 main `3c95373c`（#672 按 Kyries「合入，继续」squash 合入、本机同步，远端分支已删除）；分支 `codex/weald-threat-source`。合入时 CI 尚在运行，不称已通过。
- 按 Weald W3／W-02 第 2 项，必须混洗所有启用地点的同级 Boss，不能只加已实现的 Hag。逐图核对本地印刷审阅图：I Shrieker 为 Boss Abilities FRONT p1，I Brigand Pounder 为 p7；Hag p13 沿用 R-254。仅登记描述卡名称／等级／身份，不核准另外两位的数值、技能、房间或参战资格；II／III 的目录仍留空。
- 显式 `establishImminentThreat { locationBosses: true }` 从 4 遗迹＋3 Weald 的完整 I 级池抽取，写入 locationBossThreats 版本标记；当前只接受显式核心＋Weald，缺包、其它未接地点组合、高等级来源拒绝。未实现 Boss 保留未注册停点，不从池中删除或重抽。缺省命令继续原 4 张遗迹池和 RNG 消耗，旧日志不因新代码改变；命令 schema 支持新字段，篡改版本字段严格回放拒绝。
- Hag 在新版本战役中独立写 defeatedWealdBossIdentities，保持遗迹击败记录原样；换任务保留版本与两地击败记录。II／III 升幕仍明确停点，不用 I 级数据或遗迹计数冒充。该显式命令尚未挂到 UI 自动入口。
- 固定 seed 17／23／7 的新旧抽取、完整池及排除守恒、包拒绝、冷注册、重复定威胁拒绝和严格命令存档回放；Hag 受控胜利核对独立击败记录。测试玩家增加显式地点版本选项及 Hag 专用部署识别，缺省日志与策略不变。seed 17 的公开起点流程实际抽到 `boss_ability:weald:p007`，一条定威胁命令后停于 Brigand Pounder 未注册，精确状态与停点严格回放；未换种子、未声称自然 Hag 胜利或回村。
- 验证：首批三文件 25 项通过；地点流程与 Hag 交接两文件 19 项通过；最终回归 14 文件中 13 文件通过、104 项通过，唯一失败为 initial-threat-save.test.ts 的显式 30 秒超时；随后单独复跑该文件 2 项通过（28.68 秒），原时限／断言未改。typecheck、lint、build 通过；全量与远端 CI 待完成，不能称完整全绿。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1。存档测试的 readonly 类型及快照生成后的格式问题已修正，业务规则未为测试放宽。
- 下一步仍须完成 Boss 地点对应的普通出征来源／房间与正式自然日志，不能因 Boss 房部署完成而把 p019 的遗迹普通池当作 Weald 出征池。Hag 的完整自然战役尚未验收，UI 与阶段末冒烟继续关闭；之后才进入 Brigand Pounder 主线。无新增规则裁定，Q-186 其他卡面不因此获批。旧未跟踪交接文档保留、不提交。

### 步骤 6 第十四批：Hag p019 的地点出征来源

- 起点 main `2f4258ca`（#673 按 Kyries「合入，继续」squash 合入，本机同步、远端分支删除）；合入时 CI 尚在运行，不能写成已通过。分支 `codex/weald-boss-location`。
- W3／W-02 第 4–6 项：p019 不再一律把遗迹当作运行地点。显式定威胁命令新增 `locationSources: true`，且必须同时开启 locationBosses；写入 bossLocationSources 版本标记。若本次 p019 起点抽到 Hag，则在补给前从程序交付的核准来源重建 Weald 普通怪物／奇物／房间；只替换未使用来源，不额外掷骰／洗牌。此前只有 locationBosses 的命令保持旧行为，避免静默改写上一批试验日志。
- Hamlet 换任务时按新版本与实际 Hag 威胁选地点，保留 core 战斗来源以供后续切回遗迹；p019 的印刷 level=3 占位不再误用于地点来源，使用实际战役等级。固定 bossExpeditionRegion 用于当前 p019 探索与回村；Hag 被击败清除激活威胁后仍保持该趟来源，不把 Weald 池当遗迹回收。普通任务不会继承该趟覆盖。
- 房间读取、普通怪物目录、奇物目录和回村守恒共用该地点；未选包、错地点来源继续拒绝。旧命令和旧任务仍走原路径，未开放 UI 或其它 Boss／高等级／Stygian。
- 验证：首批来源／旧地点回放三文件 14 项通过；加入固定 seed 23／7 的真实流程后，三文件 16 项通过，均严格命令回放。seed 7 在探索英雄死亡后 awaitingReplacement；seed 23 实际抽到 Fanatic，死亡和 Shuffle 后因 Irrational 中间空姿态触发明确拒绝，已登记 Q-187 并询问 Kyries，尚未改规则。测试精确核对这两个停止状态，不把拒绝计作自然流程验收；没有更换种子或调策略。最终 typecheck、lint、build 通过；回归 5 文件 27 项通过。全量测试已启动，远端 CI 待完成，不称全量全绿。
- 下一步：完成本批质量检查，按已获 R-257 裁定处理该边界（本节历史停止结果见后续接记录）；继续 Hag 正式自然日志与回村验收，再开放 UI、补 1–3 条关键路径冒烟。Hag 仍未整体结案，Brigand Pounder 尚未进入主线实现。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1；未跟踪旧交接文档保留、不提交。

### 第十四批续接：R-257 空姿态与阵亡补位

- Kyries 明确确认 Irrational 直接进入空姿态，同时重申前方英雄阵亡时后方依次向前补位；Q-187 结案，登记 R-257，沿用 R-030。
- 意志姿态效果允许进入空格，只有目标格有存活英雄才交换；尽头按实际四格姿态轨判定，不能按存活英雄人数截断。棋盘区域不变，不额外扣行动或重掷触发骰。已有阵亡补位实现符合 R-030，补充前排／中排死亡前移及区域不动的回归，不另改死亡规则或 Shuffle 行为。
- 原 seed 23／7 和策略不变：此前 Irrational 空位拒绝已消除，真实结果与严格存档回放通过；不把通过误称为 Hag 自然通关。针对性三文件 31 项通过；最终 typecheck／lint／build 与全量 CI 待补录。代码随现有 PR #674 更新，尚未合入。
