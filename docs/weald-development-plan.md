# Weald 扩展开发计划

Kyries 于 2026-11-11 确认此顺序，后续 session 以本文件作为 Weald 开发入口。
本计划是开发安排，不新增规则裁定；规则来源仍遵守 AGENTS.md、R-001、R-048。

## 当前进度与下一步

- **当前阶段：普通九房、Weald 专属机制及独立 I 级五任务已按原完成标准验收（步骤 3／4 限 I 级普通内容，步骤 5 为单任务闭环）；连续战役、高等级／Stygian 与三个 Boss 尚未验收。Fungal Research seed1 原策略败局和新保全策略 0 XP 均保留。**
- **当前批次**：#733 已按指令合入 main（`355e3884`）；剩余 II／III 普通任务连续拆为 #734–#740，显式 `tasks-v1` 接全部十卡。Q-188 已由 R-266 确认，#741 接通所有背包完整获得后丢弃超额，收尾 #742 将 p010 打开；#734–#742 已全部合入 main（`82e2a08c`）。十卡 runtimeReady=true，无剩余任务规则待确认。旧 true／无标记版本保持原池；自然跨幕养成与人工实机仍未验收。
- **下一步：核实 Hag II／III 房间复用并接正式入口／严格日志，随后推进其它高等级 Boss 与 Stygian。** #744 已按指令合入 main（`9431d384`）。R-267 独立目录、入锅状态原语、指定补给威胁，以及本批独立回合的强制选招／先攻／释放续接已接；combatReady=false，高等级 Face the Threat 正式准入仍不扩展。自然跨幕养成／人工实机继续后置。

- 步骤 0 已完成，提交 `e7fd17e1`；完整地点战役尚未验收。
- 导入与计划两批已合入并推送 `main`（`3be97c65`）。步骤 1 怪物批次已合入并推送 `main`（`7075f4d8`）。
- Houndmaster、Shieldbreaker 已接入，沿用现有英雄实现，不重做。
- Hag I 与 Brigand Pounder I 的已核准运行时、页面和日志入口已接；两者跨任务养成／自然胜利验收仍有缺口。Shrieker I 的核准数据、技能／三行动、Nest 生命周期、双威胁、正式出征／交接、日志和页面已接齐；完整版本开放开战，旧无标记命令保留旧停点。三个 Boss 的自然养成／实机验收仍不结案。
- 普通九张房间与板块几何批已结案（R-239）；Boss 房、Stygian 与其余扩展仍按各自审阅批次推进，不按本批类推。
- 奇物批次 `40b2617f` 与步骤 2 首批组池改动已合入 `main`：16 张、64 行由 Kyries 确认（R-233），独立目录与 Torch 效果规划已接入。见 [奇物审阅记录](weald-curio-review-2026-11-11.md)。第十四批已在 I 级换任务时按地点重建当地＋通用奇物来源，整体可玩验收仍随后进行。
- 首批更正见 R-230；Blight 中文统一为腐蚀（R-231）；抗性/免疫和大型卡灰栏见 R-232。技能选区已结案，不再送审。原始图标命名状态与实际部署能力分别记录。

## 开发顺序与完成标准

按“数据核实 → 普通任务闭环 → Boss → 完整战役”推进。完成一项后更新本文件，再进入下一项。

2026-11-15 Kyries 调整优先级：先跳过人工实机测试，优先补 Weald 内容。Hag／Pounder 的未实测项继续保留，但不作为 Shrieker 数据与机制开发门槛；自动类型、lint、单元／场景与阶段页面检查仍按既有质量闸门执行。此前接续记录中的“等待玩家／不越过 Pounder”是历史安排，本次指令已调整其对内容实现的阻断范围。

| 步骤                    | 状态      | 开发内容                                                                      | 完成标准                                                         |
| ----------------------- | --------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 0．资料导入             | 已完成    | 地点 raw/parsed、规则规格书、正反面和图标审阅页                               | 资料可追溯、可复跑，解析失败明确保留                             |
| 1．普通怪物与奇物       | 进行中    | 从 I 级普通怪物开始，随后核实当地奇物；确认大型参考卡与实际副本               | 已核实字段进入 normalized 和相应运行适配；未知字段显式保留待审   |
| 2．地点牌堆             | 进行中    | 按目标地点建立“当地怪物＋通用怪物”“当地奇物＋通用奇物”                        | 包属过滤正确，副本守恒，选包与存档回放一致，无跨地点串池         |
| 3．普通房间与板块       | I级已验收 | 核实 9 张普通房间及对应板块容量、邻接、墙、高低地、标记                       | 已核实房间能够正确部署；未核实几何不提供默认值                   |
| 4．Weald 专属机制       | I级已验收 | 零容量区域通行与回合结束限制；真菌放置、全场禁疗、技能摧毁                    | 引擎与 UI 完成合法操作，拒绝非法操作；遵循 W-03、W-04            |
| 5．I 级任务闭环         | 已验收    | 核实 I 级任务分布、目标、XP、特殊规则并接线                                   | 村庄选任务 → 出征 → 探索与战斗 → 结算回村，存档可恢复            |
| 6．三个 Boss I 级       | 进行中    | 顺序为 Hag → Brigand Pounder → Shrieker；补齐房间、部署、能力、附属单位、清场 | 每个 Boss 都能从正式战役入口自然进入并结算，逐个完成再推进下一个 |
| 7．II／III 级与 Stygian | 进行中    | 先补高等级怪物、任务、Boss，再接 Stygian 房间替换                             | 各等级按实际卡面核实，不从 I 级推算；相应任务和战斗链可用        |
| 8．完整战役与收尾       | 待推进    | 多地点任务选择、Boss 池、跨幕推进、回村、升级、存档兼容                       | 核心＋Weald 完整战役通过质量闸门和关键路径冒烟                   |

## 步骤 1 的首批工作

1. 阅读当前版 Weald 怪物卡正反面，按印刷等级和用途区分普通怪物、大型参考卡、Boss、召唤物；不按页码或模型数量猜测牌堆资格。
2. 核实 I 级普通怪物的 Life、Dodge、Speed、抗性/免疫、姿态、技能和目标选择；对照核心图标词典，仅使用已有核准或本批获确认的语义。
3. 核实实际副本页和大型战斗卡对应关系。I 级五种怪物已按 R-230／R-232 核准；高等级及 Boss 不从首批推算。
4. 将核实结果接入 normalized 和已有战斗原语；规则歧义查裁定，没有裁定则记录待确认项，不填猜测值。
5. 增加对应的引擎单元/场景校验，检查核心内容和未启用 Weald 的战役不受影响。
6. 更新本文件的进度、剩余卡牌/字段和下一刀，再继续当地奇物与后续步骤。

导入时 Brigand Pounder 类型行、Shrieker’s Nest 和 Cauldron Empty 曾有专属结构解析停点；Hag I／Pounder I 后续已建立独立核准目录与适配，不能继续把旧解析停点当成它们的当前状态。Shrieker 及高等级仍须分别核实。

## I 级收尾核对（2026-11-15）

本节已按 `bcd59bca` 及阶段收尾批次更新；历史结果与本批实际重跑分别记录，不能混记。表内区分数据、运行时和验收，不仅凭 `usable`／`runtimeReady` 字段判定可玩。

| 步骤              | 已有实现与验证                                                                                                                                                                                                                   | 剩余项与结论                                                                                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1．普通怪物与奇物 | R-230／R-232 的五种 I 级普通怪物、R-233 的 16 张奇物已规范化并接运行；三项召唤部署已接                                                                                                                                           | I 级数据批已交付；II／III 级不在本批完成范围，步骤整体保留进行中                                                                                                    |
| 2．地点牌堆       | [跨地点严格日志场景](../packages/engine/src/weald-location-save.test.ts)覆盖遗迹 → Weald → 遗迹的来源重建、包选择和篡改拒绝；普通任务回村检查副本守恒；Purge 当地限定池与 Patrol 混池分别验证                                    | I 级地点来源与存档已验证；高等级和完整战役仍待推进，不能沿用早期“创建／回村／存档尚未接线”的描述                                                                    |
| 3．普通房间与板块 | R-239 核准九房完整几何；[独立选择器](../packages/engine/src/expansions/weald/room-tile-selection.ts)校验身份、几何与部署，正式普通战斗已使用                                                                                     | I 级九房几何与已核准效果均已有运行时及验收，见下表；历史卡级元数据保留兼容，不据此否定实际接线。Boss／Stygian 不在此结案范围                                        |
| 4．Weald 专属机制 | [机制测试](../packages/engine/src/expansions/weald/weald-mechanics.test.ts)覆盖零容量通行／结束回合拒绝、真菌放置／禁疗／技能摧毁；[自然召唤日志](../packages/engine/src/weald-summon-deployment-save.test.ts)覆盖真实落点和恢复 | 英雄零容量通行／必须移出、怪物真实穿行／受控非法结束回合、真菌技能摧毁与存活禁疗均有页面验收；不将受控非法站位冒充自然日志                                          |
| 5．I 级任务闭环   | p001–p005 均有逐任务自然场景、目标／XP／回村及严格日志；正式首趟、Hamlet 分地点抽选和阶段浏览器路径已有记录                                                                                                                      | 当前页面版本五任务各有正常退出与回村的严格日志：四任务 3 XP，Fungal Research 保全策略 0 XP。已满足本步骤单任务闭环；同一战役连续推进归步骤 8，不能新增为步骤 5 门槛 |
| 6．Boss I 级      | Hag／Pounder 的已核准机制、正式入口、页面与日志已接；Hag seed6 单任务自然胜利，Pounder seed17 自然败局均保留                                                                                                                     | Hag 两普通任务后自然抵达与回村、Pounder 实际养成与自然胜利尚未验收；Shrieker I 工程已接齐，真实跨任务养成／自然胜利与实机验收仍后置，三个 Boss 验收不结案           |

### 普通房间效果的实际接线状态

卡面语义沿用 [R-234–R-239](rulings.md)及[房间审阅稿](weald-room-review-2026-11-12.md)，不新增规则。核对 [房间生成器](../packages/data/src/normalize/weald-rooms.ts)、[区域投影](../packages/engine/src/expansions/weald/weald-mechanics.ts)与[数据 schema](../packages/data/src/weald-room.ts)：区域投影仍只接 `poisonousRoots`；Toxic Mushrooms 按核准房间身份与星区独立结算，schema 已允许 1 号 Toxic Mushrooms 与 4 号 Precious 的区域效果开启 `runtimeReady`。2／8 号是全房间触发，不能因 `specialRegions` 为空误记为没有效果。

| 房间                 | 已核准效果       | 当前状态／后续触发位置                                                                                                                                                                                                   |
| -------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1．Fungal Spores     | Toxic Mushrooms  | 新标记命令已接；怪物攻击未命中后，仅目标所在 C／E／F／G 星区活英雄腐蚀 1·2t；旧命令不触发；seed4 自然触发／严格日志及页面位移续接已验收                                                                                  |
| 2．Ambush            | Unprepared!      | 新 startBattle 显式标记已接；所有活英雄减益 2t，抗性／免疫沿用既有规则；seed2 自然严格日志及页面开始按钮冒烟通过                                                                                                         |
| 3／6／7              | 无独立卡面效果段 | 不新增特效；几何、部署及 7 号零容量规则仍适用                                                                                                                                                                            |
| 4．Stash             | Precious         | 新战斗版本已接共用结束回合钩子；怪物在 D 结束回合时作用于所有其他活怪物，两项增益各为 2t；seed22 定向玩家完整严格日志／页面移动待选续接已验证                                                                            |
| 5．Infected Oak      | Poisonous Roots  | 已接 B／D／E／G 的回合结束腐蚀；seed2 完整日志及页面结束回合已验收；见 [运行时及测试](../packages/engine/src/battle-infected-oak.test.ts)。房间卡 `verifiedEffect.runtimeReady=false` 为早期元数据，不能据此否认实际接线 |
| 8．Fungal Overgrowth | Abyssal Puff     | 新战斗版本已接；每枚新摧毁真菌分别使全房间活战斗怪物增益 2t；seed1 destroy-all 完整严格日志与页面摧毁检查点通过                                                                                                          |
| 9．The Clearing      | Clearing／Ours!  | Ours! 新版本已接：任意区域成功拾箱后全房间活怪物减益 1t／增益 2t，seed21 完整日志与页面奖励续接已验证；Clearing 英雄恢复压力与怪物随机移箱已接新版本（R-260），seed21 两类完整日志／页面及有限池跨房间恢复已验收         |

当前页面版本的 I 级独立任务与机制阶段验收已完成；旧命令／日志仍保持兼容。步骤 1／2 涉及高等级内容而保留进行中；步骤 6／7／8 另按原计划推进，不把本批 I 级结论扩大为完整战役完成。

本节最初为代码核对记录，后续完成项已按接续批次更新；各批实际验证见末尾记录，不将历史测试视为本批重跑。

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
- 原 seed 23／7 和策略不变：此前 Irrational 空位拒绝已消除，真实结果与严格存档回放通过；不把通过误称为 Hag 自然通关。针对性三文件 31 项通过（最终复跑 43.59 秒），最终 typecheck、lint、build 全部通过；完整 CI 待完成。代码 `cb61958f` 已更新至 PR #674，尚未合入。

### 步骤 6 第十五批：Hag 自然单任务、严格存档与页面入口（2026-11-15）

- 起点 main `85e9f12a`，#674 按 Kyries「合入，继续」squash 合入并同步，远端分支已删除；合入时 CI 尚在运行，不追记为绿。分支 `codex/weald-hag-natural`。
- 事先固定完整 0–6 矩阵，使用原 standard／coreParty 与现有自然策略，全部结果均保留：0、4、5 在死亡后等待替补，1、3 抽到未开放的 Brigand Pounder，2 在战斗全灭停住，6 实际抽到 Hag、自然抵达、部署、入锅／释放、击败并退出。没有按输赢重新选种子、改变队伍／策略／难度或注入游戏状态。小型 Vitest 黄金快照只核对这七条结果，不建立 evidence/proof JSON 链。
- seed 6 在真实部署、startBattle、入锅和释放待选处分别创建命令日志存档，JSON 往返后严格回放一致；胜利交接保留 defeatedWealdBossIdentities=[hag]，回村每名英雄和驿站仅发一次 3 XP；最终回村日志严格恢复、篡改金币拒绝、重复 finishReturnToHamlet 拒绝。全部输入仍从显式 p019 单任务起点开始，不声称已经验收“两个普通任务→Boss”的完整战役养成。
- 页面：standard／radiant 且仅核心＋Weald 的开局按钮使用完整混池与新地点来源，说明 Weald 当前仅 Hag 战开放；抽到未开放 Boss 保留结果并暂停补给，底层同一新版本也拒绝继续掷补给，旧版本不改。Hag 专属目标房显示部署按钮，Stygian／缺包继续不显示；房卡与详情从普通房间目录区分，避免读取不存在的 roomCard 崩溃。其它地点组合与高等级仍沿原入口，不在本批扩大范围。
- 验证：固定矩阵 7 项通过；部署／开战／入锅／释放和回村扩展后仍 7 项通过（67.28 秒）；页面单元 2 文件 18 项通过；组合回归 4 文件 31 项通过（87.25 秒）。页面最后复跑 2 文件 18 项通过；浏览器冒烟 1 项通过（53.8 秒，重试 0，使用本机 Chromium 1234），验证部署、先攻、释放与未开放 Boss 暂停。最终 typecheck、lint、build 全部通过；全量测试与完整 CI 待完成。PR #675（代码 `f8cd5602`）保持草稿，尚未合入。
- 本机 Playwright 缺默认 Chromium 1243，改用配置已有 PLAYWRIGHT_CHROMIUM_EXECUTABLE 指向本机已装 1234，不改仓库配置；首次启动失败不计页面验证。随后浏览器验证发现专属房卡的两处普通目录假设，已修复后重跑；失败／取消轮次不计通过。冒烟夹具是 seed 6 的真实公开命令检查点，不伪造伤口或胜利，页面验证部署、三张怪物先攻与释放选择；同时验证未开放 Boss 的提示和补给暂停。
- 下一步：完成本批检查，再从 Hamlet 的两个普通任务后进入 Hag 做跨任务战役回放；随后推进 Brigand Pounder。完整 Weald 战役、其它 Boss／II／III／Stygian 仍未验收，无新增规则待确认。旧未跟踪交接文档保留、不提交。

### 步骤 6 第十六批：普通任务真实完成计数与跨任务日志（2026-11-15）

- 起点 main `4aca63ef`（#675 按 Kyries「合入，继续」squash 合入，本机同步，远端分支删除）；合入时 CI 尚在运行，不称已通过。分支 `codex/weald-hag-campaign`。
- R-126／R-122、核心规格书 §2.1 与 Weald W3：新地点来源版本之前仍由 discardedQuests 数量推算普通任务次数，首趟未选卡可能提前推进 Boss，且 Weald 普通任务无法统一计入。现在仅在 finishReturnToHamlet 成功结算普通任务时追加 completedRegularQuests（任务 ID＋战役等级），换任务保留该记录；未选卡不计、Boss 不计、重复结算不重记，Boss 出征只读取当前等级真实完成记录。缺新来源版本的旧日志保持原算法；修复前曾在新来源版本中完成普通任务的试验快照若与重放不同，严格拒绝，不静默改写。
- 固定 0–6 序列从正式首趟 Ruins 二选一抽出的首张任务开始，原 standard／coreParty／战斗策略不变。保留不自动替补的原停点，以及已有跨任务公开替补／Speech／首个建筑服务流程的对照；每条完整命令日志均从首任务重放，不重置种子、游标、资源或目录。真实路径已验证一次回村不出 Boss、两次回村才提供 p019；Hag 激活及含 Weald 完成记录的同一门槛另以明确机制夹具验证，不冒称自然抵达。
- 测试驱动器修复：替补循环中途若战役已失败，立即保留失败状态返回，不再发 prepareReplacementHero；不改战斗、等待英雄数量或替补选择。
- seed 6 原村庄策略停于瘟疫医生无建筑服务，实际仍有 Experimental Vapours 目标。Kyries 本轮明确批准追加「按英雄固定顺序选首个合法村庄技能目标」，新增独立对照案例，保留原停点。该输入实际由 replacement-6 对 hero-1 使用 Experimental Vapours，完成村庄并进入第二个任务 Scout Ahead，随后等待英雄耗尽，终止为 noWaitingHeroes；整段日志严格回放通过。未换种子、队伍、难度或调整战斗策略以寻求胜利，R-190 继续有效。
- 验证：计数＋两组固定矩阵首轮 15 项通过；加入用户授权对照后 16 项通过（62.13 秒）；Hag 两任务入口机制夹具与计数核对 2 项通过。旧出征钩子／回村与 Hag 单任务回归 3 文件 37 项通过。最终组合回归 4 文件 53 项通过（83.36 秒），最终 typecheck／lint／build 全部通过；完整 CI 待完成。
- 组合回归曾发现先加载 Hag 战斗脚本时，描述目录因循环导入捕获 undefined，三条原有黄金结果失败；没有更新快照掩盖问题。描述目录改为直接保存 R-254 核准卡 ID，去除对运行时脚本的依赖，原黄金结果恢复通过。
- 已验证的边界：首趟未选卡不推进次数；Weald 和遗迹普通任务同计；一次已结算任务不开放 Hag，两次才绑定 Hag；没有达到该输入下的跨任务自然 Hag 战斗／回村，不能声称它已经通关。后续按真实输入与 R-190 保留这些结果；完整 Weald 战役、其它 Boss／II／III／Stygian 尚未验收。未跟踪旧交接文档保留、不提交。

### 步骤 6 第十七批：跨任务中间存档与完成记录防篡改（2026-11-15）

- 起点 main `63f39973`，#676 在两组质量闸门与 Playwright CI 均成功后，按 Kyries「合入，继续」squash 合入并同步，远端分支已删除。分支 `codex/weald-campaign-checkpoints`。
- 沿用 R-126／R-122／R-190 与第十六批固定矩阵。在 seed 1 原替补流程及 seed 6 已获授权的村庄技能对照中，于每次成功结算回村及选择下一任务后创建 JSON 日志存档，严格恢复后用恢复状态续行同一流程。显式断言检查点序列，避免路径提前停止却漏跑验收。
- 六个检查点各核对：删除一条完成记录、重复一条记录、把记录等级改为 II 均被严格回放拒绝；重复 finishReturnToHamlet 被原子拒绝，恢复状态不变。测试断言错误直接抛出，避免原有自然流程停止捕获将其包装成玩家停止原因。
- 首轮篡改测试直接传递含 undefined 的运行时对象，被 JSON 格式校验提前拒绝；已改为真实 JSON 往返，要求实际命中快照与回放不一致。原黄金结果、种子、队伍、策略、规则和业务实现均未修改。
- 验证：原固定矩阵连同新增检查点共 17 项通过（97.66 秒），未更新黄金快照；typecheck、lint、build 通过，最终文档格式及 diff 空白检查通过。完整 CI 待完成。本批仅补引擎存档验收，不新增页面路径或阶段末冒烟。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1。
- 下一步：Hag 跨任务自然抵达仍无覆盖，不能把 seed 1 的遗迹 Boss 出征或 seed 6 的英雄耗尽称作 Hag 通关；保留此缺口，后续按 R-190 以真实玩家输入补验。未进入 Brigand Pounder 主线，无新增待裁定规则。未跟踪旧交接文档保留、不提交。

### Brigand Pounder I 审阅准备（2026-11-15）

- #677 已合入 `0de65e6d`，合入时 CI 仍在运行，不记全绿。Kyries 明确选择保留 Hag 跨任务自然抵达缺口，先准备 Pounder 审阅资料；这不等于 Hag 结案或批准 Pounder 运行时。
- 分支 `codex/weald-pounder-review`：新增 [候选审阅稿](weald-pounder-i-review-2026-11-15.md)，逐图查看 W4、描述 p7／能力 p10 正反面、medium p20／p23 正反面、room p12 与 tile p6 背面。重新渲染 W4 和旋转后的村庄威胁，图像只留忽略缓存。
- 记录已由 W4 明确的 1 怪物／4 英雄初始先攻及击败后移除 Brigands；候选转录 Pounder／Matchman 属性、技能、增援、Ranged 进入威胁、村庄轰炸，并列 12 区容量／共边／墙待核对表。I 区未读到容量点，不填 0；特殊页脚、未标签图标、增援缺失判定、触发时序保留待审，沿用 Q-186。
- 玩家日志文件入口另在草稿 PR #678：导出／严格导入已完成，存储单元 3 项、typecheck、lint、build 与既有浏览器冒烟扩展 1 项通过；不将它混入本次纯审阅文档 PR。
- 下一步：Kyries 核准卡面与几何后才接独立 Boss 数据；Hag 缺口及原败局保留，不自动批准高等级、Shrieker 或 Stygian。验证：本批仅文档，执行格式、相对链接及 diff 空白检查，不重复跑引擎全量。旧未跟踪交接文档保留、不提交。

### Pounder 审阅续核（2026-11-15）

- Kyries 填写战斗卡与几何，并明确炮击要求同一区域、增援按等级能力补足满员、无高低地且其它几何核准，登记 R-258；清理旧候选待确认句。
- 只剩 Bullseye Guillotine I／Bombardment I 两段威胁，均来自 Boss Abilities BACK p10。先向 Kyries 标明来源，不提前核准；生产数据和运行时未修改。
- 本批验证：文档格式与 diff 空白检查；不跑纯文档无关的引擎测试。下一步待确认两段威胁，再接独立 Boss 数据。

### Pounder 两段威胁续核（2026-11-15）

- Kyries 在获知 Boss Abilities BACK p10 来源后核准地牢与村庄威胁，登记 R-259：进入怪物姿态轨 Ranged 获得增益 2t＋反击 1t；每日轰炸按卡文结算，Caretaker 同处例外优先。
- 审阅稿表列项已全部核准；下一步建立独立 I 级 Boss 数据与核心同级 Fusilier 来源核对。生产数据与运行时尚未改，Hag 缺口保留，不扩大其它等级或 Stygian。
- 验证：仅文档格式、相对链接与 diff 空白检查；未运行无关引擎测试。

### Pounder I 独立数据目录（2026-11-15）

- 起点 main `f52496ef`，#679 按指令 squash 合入并同步，远端分支删除；合入时 CI 尚在运行。分支 `codex/weald-pounder-content`，#678 玩家日志文件入口仍为独立草稿，未混入本批。
- R-258／R-259、Weald W4：录入 `pounder_i.json`，保留真实卡 ID、Pounder 仅触发技能、Matchman 同区域触发、按组成补足增援、进入姿态槽威胁、村庄轰炸 Caretaker 例外。独立 12 号板块包含十二普通区域、16 对共边、五对仅角点与墙体说明，部署和普通池不变。
- 共用几何基础 schema 增加 R-258 枚举，普通九房 schema 仍限定原裁定及 1–9 号，Pounder 不进入普通目录；`combatReady`／`usable` 均保持 false。几何投影及来源函数不注册脚本、不掷骰、不抽牌、不创建召唤实体。
- 核对完整核心来源：I 级通用 Brigand Fusilier 为 `monster_medium:p027`，实体页 p27／28／29，共三份；校验完整目录和至少两份同级来源，缺失拒绝，不修改来源。尚未完成召唤卡实际战斗投影与牌池守恒，不声称增援运行时已交付。
- 验证：首批 10 项通过；与 Hag 数据、普通房间及 Hag 几何组合 4 文件 24 项通过。最终 typecheck、lint、build 均通过（Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1）；完整 CI 待完成；首次 typecheck 发现共用 schema 裁定枚举缺 R-258，已补入且未放宽普通目录。无新增规则待确认，原未跟踪交接文档保留、不提交。
- 下一步：接 Boss 注册与两段威胁，再做增援与炮击，之后正式部署、先攻、清场、地点出征、回放与 UI。Hag 缺口和高等级／Stygian 边界继续保留。本批不是阶段末，不新增浏览器路径。

### Pounder I 显式注册与威胁结算核（2026-11-15）

- 起点 main `108a5323`，#680 按指令 squash 合入并同步，远端分支删除；合入前检查 CI 尚在运行。首次 ready 请求遇网络错误，重试成功后才执行合入。分支 `codex/weald-pounder-threat-plans`。
- R-258／R-259：显式脚本读取独立核准目录，提供真实三卡引用、1 张怪物先攻与 1 次行动声明、两个类型化威胁钩子；正式出征、部署与召唤钩子返回 stub。没有加入自动注册或页面入口，普通目录和原日志不变。
- Ranged 结算核以状态变更输入计算新增 Buff 2t／Riposte 1t，保留已有状态堆、停留不刷新、离开再进入再次触发；英雄、死亡怪物、离开 Ranged 不触发，损坏状态拒绝。轰炸结算核只消费调用方已掷 d10，沿用原建筑映射，返回伤害／降级／免除计划；Caretaker 优先，不重掷，I 级不再降级。函数不读活动威胁或隐式耗 RNG，调用方仍须检查权限。
- 尚未交付：公开命令的姿态进入与日末收尾接线、真实英雄建筑占用记录、5 点伤害和死门／死亡待选、版本化自动启用及严格日志验收。不能把结算计划函数称作完整威胁运行时；未开始增援或炮击。
- 验证：首批 2 文件 20 项通过；最终组合回归 5 文件 51 项通过（9.50 秒）；typecheck、lint、build 均通过，完整 CI 待完成。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1。补充负向测试时曾误改停留案例变量，已修正；测试建筑表补为完整类型，最终 typecheck 通过；未改业务规则或黄金快照。本批不是阶段末，不增加页面路径。无新增规则待确认，旧未跟踪交接文档保留、不提交。

### Pounder I 地牢威胁公开命令与版本隔离（2026-11-15）

- 起点 main `44cc6997`；此前 GitHub 网络故障导致未创建 PR，本轮补建 #681 并按指令合入、同步、删除远端分支，未称 CI 已通过。分支 `codex/weald-pounder-threat-runtime`。
- R-259：公开命令结算后消费怪物进入 Ranged 的姿态变化，追加独立 Buff 2t／Riposte 1t 及投影，不以区域变化判断；原子拒绝保留命令前状态。无持续时间的旧沙盒状态不补值覆盖，内置 Protection 不误作缺失持续时间的代币。
- 开局命令新增显式 `pounderDungeonThreats: true`，须同时有完整地点池和地点来源，只允许 I 级普通出征，Stygian／p019 明确拒绝。版本标记进入命令 schema、状态及跨任务保留；显式抽牌时才注册脚本。描述解析默认排除新脚本，即使注册缓存已存在，旧日志仍保留原未注册停点与 RNG 消耗；全局自动注册与 UI 默认入口不变。
- 村庄轰炸尚未挂接时，新版本激活 Pounder 的村庄命令明确拒绝，保留回村状态和骰序，不提供跳过轰炸的半场运行。未实现 Boss 出征、增援、炮击；本批不声称完整两段威胁交付。
- 固定 seed 17 新旧定威胁及 JSON 严格恢复、删版本标记篡改拒绝；新版本激活 Pounder 后沿原自然策略跑 Scout Ahead，实际 exited、无失败／停止原因，完整日志严格恢复。没有换种子或调策略，不是自然 Boss 通关。真实 Disorienting Blast→Push→Ranged 的受控机制夹具验证追加状态、重复命令拒绝；旧版本／威胁已停止不触发，错包拒绝。村庄停止另以明确夹具验证。
- 验证：首批 4 项通过；负向补充组合 4 文件 35 项通过；加自然日志后本文件 8 项通过（11.78 秒）。首次夹具未设战斗阶段触发开局补给拒绝，已修正夹具；测试起点 readonly 类型及适配器显式 stance 参数已修正。最终组合 4 文件 36 项通过（19.71 秒），typecheck、lint、build 均通过；完整 CI 待完成。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1。无新增规则裁定；旧未跟踪交接文档保留、不提交。
- 下一步仍是村庄轰炸适配和严格回放，不越过该停点去声称战役可玩。本批非阶段末，无新增网页入口或浏览器冒烟。

### Pounder I 村庄轰炸与日末续接（2026-11-15）

- #682 网络重试后按指令 squash 合入 `03022088`；本批先在其提交上开发，成功合入后已用 autostash rebase 同步到新 main，跟踪修改已恢复。分支 `codex/weald-pounder-hamlet-threat`。
- R-259／R33：以 `pounderHamletThreats: true` 独立命令版本接两段威胁，要求同时启用已有地牢威胁版本；标记进入存档 schema 与跨任务保留。旧 D-only 日志继续在村庄停住。UI 与全局自动注册仍未扩大。
- 共享村庄建筑识别，逐条成功命令记录实际英雄占用；待选完成或正常四英雄／Speech 日末才轰炸一次，使用移走英雄／看守人前的记录，不从 actedHeroes 猜建筑。最后动作 Intimidate 已移走看守人时不再免除。Caretaker 同处优先，最低等级不降，Guild／Graveyard 没有升级等级则不假造等级。
- 伤害合批 R-222 Fragile／Syphilis 追加量，调用统一生命／种子死门和 damageTaken 被动，英雄与已有战斗投影同步；死亡／压力10经 hamletThreat 转入原有意志／补员／死者饰品流程，续接不重掷轰炸或重复扣天。任何拒绝均沿公开命令事务回滚费用、行动和 RNG。
- 固定 seed17 沿用原自然战斗与村庄 Speech／首建筑服务策略，普通任务实际退出、回村后三天结算3次轰炸并完成准备，整段日志严格恢复；换到下一任务后两个版本标记均保留，整段日志严格恢复。不重新选种子、队伍或难度，不称 Boss 通关。受控日末／死门及0–6夹具明确区分，不冒充自然养成。
- 验证：首批6项中战斗投影断言因夹具未建立 combat 失败，补齐受控完整投影后7项通过；组合4文件41项通过。建筑降级／换任务补充后本文件8项通过；最终组合5文件50项通过（22.68秒），typecheck、lint、build 通过；随后补 R-222 承伤追加量及 Fragile＋Off Guard 回归，最终5文件51项通过（21.69秒），该回归单独复核通过；最终 typecheck、lint、build 均通过，完整 CI 待完成。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1。测试 heroStatId 的 exactOptional 类型已修正，无业务规则放宽。旧未跟踪交接文档保留、不提交。
- 下一步是增援、炮击与正式 Boss 入口；当前两段威胁接线不代表 Boss 战役闭环。无新增规则裁定，不扩大高等级／Stygian。本批非阶段末，无新网页入口或冒烟。

### Pounder I 增援缺额与炮击触发计划（2026-11-15）

- #683 按指令从草稿转为 ready 后 squash 合入 `c17d04db`，同步 main 并删除远端分支；合入时两组质量闸门与 Playwright 均仍运行，不记全绿。分支 `codex/weald-pounder-reinforcement-plans`。
- R-258：纯计划读取实际活体怪物，Matchman 在场不增援；缺席时补 1 名 Matchman 与至多补齐 2 名 Fusilier，已有活体计入、尸体不计入，不删除超额实体。Pounder 已死亡或不在场时不发动。
- Fire in the Hole! 只接受活体 I 级 Matchman；与活体 Pounder 同区域才返回立即触发技能 1 的计划。无额外 Matchman 命中掷骰，不将炮击视作自动命中；异区或 Pounder 缺席返回不触发。重复 ID、多个活体 Pounder、错误演员及缺失触发区域拒绝。
- 两函数不修改输入、不消费 RNG、不分配实体卡、不创建召唤物、不占区域，不挂到公开命令或注册钩子；部署、牌池守恒、容量待选、炮击目标与普通命中／伤害续接仍未交付。无新增规则待裁定，不扩大高等级／Stygian，Hag 跨任务缺口继续保留。
- 验证：新增 7 项通过；组合 5 文件 44 项通过（29.61 秒），typecheck、lint、build 均通过。完整 CI 待完成。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1。本批非阶段末，无新增网页路径或冒烟，旧未跟踪交接文档保留、不提交。
- 下一步：增援实际卡牌分配／守恒与部署、炮击普通目标／命中流程，然后正式 Boss 入口、清场、严格日志与 UI。本批纯计划不能称为 Boss 战斗运行时。

### Pounder I 战斗投影与初始部署构造（2026-11-15）

- #684 转 ready 后按指令 squash 合入 `78f967e2`，同步 main 并删除远端分支；合入时 CI 仍运行，不记全绿。分支 `codex/weald-pounder-combat-projection`。
- R-258：独立投影 Pounder／Matchman 的真实卡 ID、属性、Human、内置 Protection、抗性和免疫；Matchman 四姿态固定技能 1，Pounder 无自动选招分组。Matchman 不填 Crit／Acc／伤害，普通攻击结算仍拒绝，专属同区触发计划另行消费。
- 炮击投影保留 Crowded、射程 5、最多四目标、Crit 0／19、Acc 9／伤害 9 以及命中压力 +2；实际调用共用解析器验证命中、落空、带一堆 Buff 后的暴击、超射程拒绝。用实际实体接同区触发计划后再读 Pounder 卡结算；不因此声称已完成玩家命令、多目标选择或生命／死门续接。
- W4 初始部署构造只放 B 区 Aggressive 的 Pounder（1 格），不预放三名附属怪；另提供专属实体工厂，显式姿态映射核准区域。返回独立可变副本，不注册自动入口、不消费 RNG、不改普通牌堆。召唤姿态／容量挤占／先攻需按核心 R31、R-034 接现有流程，卡牌分配及守恒仍未交付。
- 验证：首轮 5 项中两项测试断言不符合既有引擎约定（落空伤害为 null；印刷 Crit 0 时骰 1 不暴击），修正断言，并用真实 Buff +1 验证暴击19后 5 项通过。类型检查发现按数组下标读取联合类型无法收窄炮击专属字段，已改为按角色显式查找并校验技能专属字段后收窄；未改变规则数据。最终组合 5 文件 31 项通过（8.36 秒），最终 typecheck、lint、build 均通过。完整 CI 待完成，Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1。
- 下一步仍为实际增援分配／守恒、首空姿态与挤占、先攻洗入以及炮击公开命令；随后正式 Boss 入口、清场、严格日志与 UI。无新增待裁定规则，不扩大高等级／Stygian；Hag 跨任务缺口保留。本批非阶段末，无新网页路径或冒烟；旧未跟踪交接文档保留、不提交。

### Pounder I 增援公开命令与挤占续接（2026-11-15）

- #685 转 ready 后按指令 squash 合入 `aee0068d`，同步 main 并删除远端分支；合入时两组 CI 均仍运行，不记全绿。分支 `codex/weald-pounder-reinforcement-runtime`。
- R-258／核心 R31／R-034：接 `applyPounderIReinforcements` 与严格命令 schema，仅接受显式两段威胁新版本、I 级非 Stygian、实际 Pounder Boss 本体回合。Matchman 在场拒绝；已有 Fusilier 计入缺额，按计划实际创建 Matchman 与核心同级 Fusilier，首空姿态及核准区域逐只部署。沿用已有召唤实体模型和完整核心来源目录，不抽取或改写探索怪物牌堆；尚不能声称已完成完整任务池／回村守恒验收。
- 复用 Weald 区域挤占与当前先攻洗入函数：满轨召唤无效，不耗先攻 RNG；成功召唤各洗入 1 张先攻。挤占待选保存剩余组成，续接不重新检查已补上的 Matchman 并重造首只。错误／重复选择、晚期落点拒绝均保留该条命令前状态。网页阶段表增加对应待选提示，不增加出征按钮。
- Pounder 普通攻击命令明确拒绝，防止绕过同区 Matchman；炮击专属命令仍待接。受控机制夹具验证三只真实属性、已有 Fusilier、满轨、版本／包属／等级／演员边界、第二只挤占停点、JSON 状态往返续接与确定性、重复拒绝、第三只落点失败回滚、召唤进入 Ranged 的威胁效果。不是自然 Boss 通关或正式日志严格回放。
- 验证：首轮8项中两项夹具缺少关联核心卡，被创建校验拒绝，补齐真实目录后通过；挤占夹具初漏 choiceId，修正后9项通过；后续命令 schema、直接炮击拒绝及晚期回滚继续补测。首次 typecheck 发现网页阶段表未覆盖新待选类型，已补齐；最终新增12项、组合5文件38项通过（14.62秒），typecheck、lint、build 均通过；最终文档格式与diff空白检查通过。Node 24.20.0 低于约定24.21.0，pnpm12.9.1；完整CI待完成。
- 下一步：Matchman 同区触发的炮击公开命令、多目标与生命／死门续接，然后正式 Boss 部署、清场、严格日志、UI 与完整任务池／回村守恒验收。无新增待裁定规则，不扩大高等级／Stygian，Hag 跨任务缺口保留。本批非阶段末，不新增浏览器冒烟；旧未跟踪交接文档保留、不提交。

### Pounder I Matchman 触发炮击公开命令（2026-11-15）

- #686 转 ready 后按指令 squash 合入 `0cfe2d4d`，同步 main 并删除远端分支；合入时 CI 仍运行，不记全绿。分支 `codex/weald-pounder-fire-runtime`。
- R-258：`applyPounderIFireInTheHole` 只接受显式两段威胁新版本、I级非Stygian实际Boss战中的活体 Matchman 当前回合；校验两者实际同区及核准运行卡面。Matchman 不额外掷命中骰，炮击由 Pounder 使用既有 Crowded／Guard 选择和最多四目标的共享技能骰结算；不接受调用方指定目标或骰面。
- 触发上下文保留真正伤害使用者 Pounder，并在共用结算完成后结束 Matchman 回合，Pounder 不被记为已行动；生命／压力等待过程中保留上下文，终局清理。普通直接炮击仍拒绝，错误命令沿现有事务回滚。
- 本轮复核 R-258 审阅表，发现前两批将印刷「0–5」误投影为固定5。补独立数据／schema 的 `minRange: 0`，怪物视图显式接已有 verified_range 能力，核对0、1、4、5可结算，6拒绝；不修改全局射程规则或新增裁定。首轮为满足错误固定射程临时将夹具炮台移至A，发现误投影后已恢复真实初始B区并重跑，不把该临时夹具当自然流程。
- 受控测试：两目标同骰伤害9／压力2、Crowded与Guard优先级、伤口16及17时统一生命／死门处理、重复命令、错区／演员／版本／损坏卡面拒绝和命令schema。首轮夹具未关联真实英雄属性面被创建校验拒绝，已使用真实Crusader I（17 Life）属性面；未降低校验或改规则。
- 验证：初始7项通过，补目标及生命边界后10项通过；最终组合5文件53项通过（13.99秒），typecheck、lint、build均通过；最终文档格式及diff空白检查通过。Node24.20.0低于约定24.21.0，pnpm12.9.1；完整CI待完成。
- 下一步：正式Boss入口／部署、击败后Brigands清场、完整任务池与回村守恒、严格日志、UI及自然场景；炮击专属饰品／压力待选仍须单列验收，不以复用共用流程称作已完整覆盖。Hag跨任务缺口保留，不扩大高等级／Stygian。本批非阶段末，无新增网页按钮或浏览器冒烟；旧未跟踪交接文档保留、不提交。

### Pounder I 目标房部署与 Brigands 清场（2026-11-15）

- #687 按指令转 ready 后 squash 合入 `176521cb`，同步 main 并删除远端分支；合入时一组质量闸门与两组 Playwright 已成功，另一组质量闸门仍运行。分支 `codex/weald-pounder-deploy`。
- W4／R-258／R30：目标房绑定独立 `room:weald:p012`，`deployPounderI` 校验实际威胁／描述／计划、核准房间、四英雄、I级非Stygian和两段显式威胁版本；要求真实 Weald 地点来源及怪物／奇物目录有效。使用共用英雄部署携带装备、条件、补给、战利品、压力和伤口；12区只部署B区Aggressive的Pounder，英雄K／J／L／J，不预放附属怪。
- 地点来源构造显式支持新版本 Pounder 的 Weald p019：仍使用当地＋通用普通池，保留核心目录供切回；旧版本不因此改来源。不改脚本出征stub、全局自动注册或旧版p019停止边界，未提供自然出征入口。
- 显式startBattle生成1张怪物先攻并停止战斗威胁。本体死亡进入共用阵亡移出流程后清除其余I级Brigands（真实卡名／等级及Matchman身份，不按Human类型全清），保留本体与英雄身份供后续胜负交接；重复清场不重复移出。不提前发奖励或结算任务。
- 验证：首批部署7项通过；增援后本体死亡清场、重复清场、版本／地点负向补充后10项通过（8.98秒）。受控夹具构造实际威胁和出征计划、进入目标房，并明确控制本体回合；不是自然抵达、自然Boss通关或完整正式日志回放。最终组合5文件46项通过（31.56秒），typecheck、lint、build均通过；最终负向夹具改为真实删除可选版本字段；复核发现地点标记仅允许weald或缺失，已将错误的ruins输入改为删除标记后重跑类型与用例，未放宽业务校验。最终格式与diff空白检查通过。Node24.20.0低于约定24.21.0，pnpm12.9.1；完整CI待完成。
- 下一步：胜利／全灭与地牢交接、回村守恒、版本化出征准入与严格日志，再接UI及自然场景。炮击专属饰品／压力待选与Hag跨任务缺口继续保留；无新增规则待确认，不扩大高等级／Stygian。本批非阶段末，无新网页按钮或浏览器冒烟；旧未跟踪交接文档保留、不提交。

### Pounder I 胜负、地牢与回村交接（2026-11-15）

- #688 按指令转 ready 后 squash 合入 `a07da087`，同步 main 并删除远端分支；合入时两组CI均仍运行，不记全绿。分支 `codex/weald-pounder-finish`。
- R30／W4／R-258／R-044／R-122：`finishDungeonBattle` 识别真实12号房部署的Pounder，要求两段显式威胁新版本、I级非Stygian、Weald来源、完整怪物／奇物目录与实例守恒、核准出征计划全部引用匹配、无待选／炮击上下文／未处置战利品、四英雄身份和游标一致。
- 胜利清理目标房与实际威胁、记录brigandPounder击败身份，交还英雄伤口／压力／状态／条件／装备、金币、光照、补给和游标。保留普通房间与怪物池，不额外洗牌或发XP；死亡英雄交给已有补员停点。英雄全灭记录Boss任务战役失败并保留战场；双方全灭、不实胜利、活体Boss／怪物、错误计划／卡池／英雄／游标等原子拒绝。
- 受控终局夹具验证胜利后实际调用leaveDungeon、全员同意、摘要及回村，两处3XP各只发一次，重复finishReturnToHamlet拒绝；清除威胁后recoverHamletPools仍能验证Weald池并接收回村。初始目标房抵达及终局事实仍为显式夹具，不能称自然Boss通关或正式日志严格回放。
- 验证：首批9项通过；新增状态／死亡英雄与计划／炮击上下文／缺卡负向后13项通过。首次缺卡夹具误写不存在的deck字段，未击中守恒检查且被类型检查发现，已更正为真实remaining字段；未改业务守恒规则。组合4文件43项通过（51.02秒），最终公开离开路径本文件13项复核通过（13.45秒），typecheck、lint、build均通过；文档格式及diff空白检查通过。Node24.20.0低于约定24.21.0，pnpm12.9.1；完整CI待完成。
- 下一步：版本化出征准入、严格日志、UI及自然场景。炮击专属饰品／压力待选与Hag跨任务缺口保留，不扩大高等级／Stygian；无新增规则裁定。本批非阶段末，不新增页面按钮或浏览器冒烟；旧未跟踪交接文档保留、不提交。

### Pounder I 版本化出征准入与严格日志（2026-11-15）

- #689 按指令转 ready 后 squash 合入 `bc2e2c8f`，同步 main 并删除远端分支；合入时CI仍运行，不记全绿。分支 `codex/weald-pounder-entry-version`。
- R-258／R-259／W3–W4：新增 `pounderBossBattles: true` 命令与状态版本，须同时启用已有两段威胁、完整地点来源和Weald包；I级非Stygian，p019开局要求既有R30边缘房布局。只在该标记存在时，Pounder出征钩子调用共用核准出征计划；未改全局自动注册，旧D／Hamlet版本仍保留p019拒绝和原出征stub。标记进入严格命令schema并跨任务保留。
- 新p019定威胁后重建Weald当地＋通用来源并重绑实际出征计划，不将临时Ruins开局来源带进Boss房。自然任务测试驱动仅在新版本实际Pounder目标房使用已有deployPounderI命令，不改英雄战斗策略、种子、队伍、牌序或黄金快照。
- 固定seed17保留两个真实结果：默认策略探索伤亡后停awaitingReplacement，无部署；启用此前已有补员流程后自然抵达并公开部署Pounder，实际停在 `prepareMonsterAction: 缺少已核实的姿态选招分组（R-015、R-048）`。两段全部公开日志严格恢复；不把到达／部署说成Boss战自然通关。首轮误要求默认路径必到达，已按真实停点改为显式断言；补员对照初漏传handleDeaths，修正参数后才记录独立结果。
- 同seed17原普通任务／村庄Speech＋首建筑服务策略跑完回村轰炸及下次选任务，新标记与原两段版本均保留，整段日志严格恢复。删快照版本标记拒绝；新注册缓存下，旧p019输入仍原子拒绝，旧出征解析仍返回refused。缺依赖／错包／Stygian／高等级拒绝且骰序不变。
- 验证：新增8项、组合4文件35项通过（43.67秒），最终typecheck、lint、build均通过，文档格式与diff空白检查通过。首次类型检查发现测试存档起点as const产生只读contentPacks，已改为明确QuestStart兼容类型，无业务规则变化。Node24.20.0低于约定24.21.0，pnpm12.9.1；完整CI待完成。
- 下一步以本轮真实停点为准：怪物回合准入、Pounder增援／无触发时收尾、Matchman向Pounder移动并触发炮击，再继续严格日志与UI。炮击专属饰品／压力待选、实际养成跨任务抵达、Hag原缺口保留，不扩大高等级／Stygian；无新增规则裁定。本批非阶段末，无新页面按钮或浏览器冒烟；旧未跟踪交接文档保留、不提交。

### Pounder I／Matchman 怪物回合准入与自然败局（2026-11-15）

- #690 按指令转 ready 后 squash 合入 `43c7df22`，同步 main 并删除远端分支；合入时CI仍运行，不记全绿。分支 `codex/weald-pounder-monster-turn`。
- W4／R-258／核心R24、R-023：仅显式pounderBossBattles版本将两个核准角色接prepareMonsterAction。本体无Matchman时调用已有增援命令，有Matchman则正常结束本体回合，不自行炮击、不掷选招骰。Matchman固定Pounder为唯一目标，不走英雄优先级排序。
- 复用已有moveMonsterToRange的墙／容量／Speed／待选／靠近后跳过流程，专属分支只允许该实际Matchman行动定位到活体Pounder。定位成功后经原playMonsterSkill入口调用同区触发命令；未定位或未同区不炮击，Matchman不掷命中骰，炮击共享一次既有技能骰。保留历史卡面投影，唯一目标数量由R-258专属定位分支处理，不给旧投影新增图标。
- 机制夹具验证本体增援／空行动、Matchman D→A按Speed靠近并跳过、下个明确受控回合A→B同区炮击、满员不瞬移、旧版本不启用且拒绝怪物目标越界；复用既有移动路径，不添加Boss专属寻路算法或规则数值。
- 沿用上批固定seed17、队伍、自然战斗策略与已有补员流程：默认路径仍停awaitingReplacement；补员路径越过原选招停点后实际停 `battle halted: heroesDefeated`。追加公开finishDungeonBattle，得到bossQuestHeroesDefeated并保留战场；全部战斗命令和失败状态严格恢复。首轮旧停止断言失败后，明确改断言为真实败局，未换种子、策略、队伍、RNG或黄金快照，不称自然胜利或完整战役完成。
- 验证：首批机制3项通过，加旧版本边界后4项；组合4文件48项通过（44.65秒），最终typecheck、lint、build均通过，文档格式与diff空白检查通过。Node24.20.0低于约定24.21.0，pnpm12.9.1；完整CI待完成。
- 下一步：新版本网页入口／回合提示、炮击专属饰品／压力待选及真实玩家日志；实际养成跨任务抵达与自然胜利、Hag原缺口继续保留。无新增规则待裁定，不扩大高等级／Stygian。本批非阶段末，无新增网页路径或浏览器冒烟；旧未跟踪交接文档保留、不提交。

### Pounder I 网页入口、回合提示与受伤饰品窗口（2026-11-15）

- #691 按指令转 ready 后 squash 合入 `5b06c7d8`，同步 main 并删除远端分支；合入时CI仍运行，不记全绿。分支 `codex/weald-pounder-web-entry`。
- 新开核心＋Weald非Stygian页面定威胁命令显式携带两段威胁及pounderBossBattles版本；页面说明Hag／Pounder已接、Shrieker仍暂停。已定威胁的旧存档不补标记；Pounder部署按钮要求原三段版本、Weald包／来源／地点及实际任务房／计划，Stygian仍无入口。增加本体增援／空行动、Matchman定位／同区触发的中文阶段提示，页面仍只派发既有命令。
- 发现页面playMonsterSkill的damageStoneWindow在Matchman转入Pounder时丢失，已透传至真实炮击命令；不改变未请求窗口的历史命令。真实Damage Stone反面机制夹具验证：窗口前不扣血／耗骰，JSON续接后只有持有者追加2伤口、多目标其余英雄不追加、同一骰序且只结束Matchman回合。首轮饰品夹具缺英雄等级被原校验拒绝，补显式I级后通过。
- 真实seed17原补员路径采集目标房绑定及首次本体回合页面检查点，不注入伤口／站位／骰序；页面夹具在所需检查点齐全后停止，且本体回合检查点要求无待选。新增Pounder冒烟覆盖部署／单怪物先攻／增援按钮／页面新版本抽威胁。原Hag用例末尾seed1抽Pounder不再暂停，更新为相同种子的实际新结果，不变更Hag部署／释放测试。浏览器首轮进一步发现正式探索面板仅渲染Hag专属房，导致Pounder部署按钮未显示；已补Pounder专属房渲染，随后无重试复跑。
- 验证：引擎／页面组件组合3文件30项通过，typecheck、lint、build均通过；最终既有Hag冒烟无重试通过（44.8秒），新增Pounder冒烟单独无重试通过（42.0秒，整次47.5秒）；最终typecheck、lint、build及文档格式、diff空白检查均通过。中间并行修改脚本说明触发Vite重载打断页面检查，已停止源码修改后独立复跑通过，不将该轮记为全绿。首次浏览器因缺Playwright指定版本未启动，改用配置已有PLAYWRIGHT_CHROMIUM_EXECUTABLE指定本机Chrome；未改CI配置。完整CI待完成，Node24.20.0低于约定24.21.0，pnpm12.9.1。
- 下一步：炮击压力／意志待选与实际玩家日志、跨任务养成抵达及自然胜利；Hag原缺口与seed17败局保留，不扩大高等级／Stygian，无新增规则裁定。本批新增1条关键页面冒烟并复核既有Hag用例，不称整个Weald阶段完成。旧未跟踪交接文档保留、不提交。

### Pounder I 炮击压力／意志与 Selfish 待选验收（2026-11-15）

- #692 按指令转 ready 后 squash 合入 `ff2d6e97`，同步 main 并删除远端分支；合入时CI仍运行，不记全绿。分支 `codex/weald-pounder-pressure-resume`。
- R-258／R28／R-048／R-057／R-091：补独立机制测试，不修改规则或业务实现。两名英雄各以8压力承受炮击，验证各只检定一次、不同意志卡、检定后压力归零、真实伤害、只结束Matchman回合，并精确核对1个炮击骰＋2个意志骰＋每个首次使用的美德／苦难牌堆4次洗牌RNG。
- 缺完整意志目录时整条炮击原子拒绝，伤口／压力／骰序／回合保持原样；已有卡再到10压力直接心脏病、无需另掷意志或死门骰，既有死者共享意志牌回收仍按R-091消耗洗牌RNG，终局不遗留炮击上下文。首轮夹具漏了正常地牢必有的resolveDecks，补齐空字典后回收正常；未放宽卡池校验。
- Selfish消耗补给待选发生于之后的英雄回合，不与首次达到10压力混为一个时点。明确受控seed17、起始游标1及已知Selfish在顶的完整苦难牌堆：实际炮击后抽卡、下一次公开drawInitiative触发Selfish、错误选择／其他命令冻结、JSON状态往返选择补给、重复选择拒绝；确认只消耗所选补给，不重放炮击、不再耗骰、不产生普通食物治疗。起始游标0真实结果为美德，保留首个多目标检定测试；该Selfish夹具不是自然战役或完整正式日志，不修改原seed17自然败局。
- 验证：首批4项中两项夹具问题如上修正后4项通过（9.30秒）；补精确RNG及冻结断言后组合5文件32项通过（19.06秒），typecheck、lint、build均通过；文档格式与diff空白检查通过。Node24.20.0低于约定24.21.0，pnpm12.9.1；完整CI待完成。本批仅引擎机制验收，无新页面路径或浏览器冒烟。
- 下一步仍需真实玩家日志、实际养成跨任务抵达与自然胜利；Hag原跨任务缺口、seed17自然败局继续保留。无新增待裁定规则，不扩大高等级／Stygian，不能将四项机制测试称为整个Weald战役验收完成。旧未跟踪交接文档保留、不提交。

### 真实玩家日志文件交接准备：同步独立草稿 #678（2026-11-15）

- #693 按指令转 ready 后 squash 合入 `bd2a9761`，同步 main 并删除远端分支；合入时CI仍运行，不记全绿。按当前最早余项继续R-190真实玩家日志准备，不越过Pounder验收去实现Shrieker，不搜索胜利种子或改玩家策略。
- 沿用此前独立草稿#678 `codex/quest-save-files`（原提交 `256f71ff`），将当前main合入该分支。仅进度文档冲突，保留完整最新main进度并补本条接续记录；不将旧交接文件纳入提交，不自动合入#678。
- 原草稿提供JSON文件导出／导入：复用严格回放及可信旧目录，异步读文件时进度已变化则拒绝，失败保留当前游戏，导入不覆盖本机存档槽；不改变存档协议或接受文件内自带规则。
- 扩展现有seed17真实Pounder页面夹具，允许使用页面实际taskSources构造同一公开命令路径，并在首次本体回合返回完整命令存档。新增文件交接冒烟：从页面导入完整日志、导出带deployPounderI和版本标记的文件、删除快照版本被严格拒绝、刷新后导入导出文件恢复原战斗、本机存档槽保持原样。不注入胜利／伤口／金币／RNG，不把文件交接称自然胜利。
- 验证：存储及Pounder严格日志组合2文件11项通过（59.80秒），原最暗文件冒烟无重试通过（19.7秒），build／lint通过；最终typecheck、lint、build均通过，新增Pounder文件冒烟无重试通过（52.1秒，整次1.0分钟），文档格式与diff空白检查通过；完整CI待完成。新增篡改拒绝首次等待5秒不足，页面随后已显示可信旧目录回放不一致；该完整日志需核对多个旧目录，增加此项断言预算至60秒，无业务校验放宽。浏览器沿用配置支持的本机Chrome，未改CI配置。Node24.20.0低于约定24.21.0，pnpm12.9.1。
- 下一步：#678合入后可导出真实玩家JSON文件供验收；实际养成跨任务抵达、自然胜利和Hag原缺口仍需真实输入，seed17败局保留。无新增规则裁定，不扩大高等级／Stygian；本批补1条文件交接冒烟并复核既有最暗路径，不称Weald阶段完成。

### Toxic Mushrooms 独立结算原语（2026-11-15）

- #694 转 ready 后 squash 合入 main（`496dae97`）；合入时 CI 运行中，不记全绿。分支 `codex/weald-toxic-mushrooms`。
- R-234／R-239：新增独立结算函数，读取核准的 1 号房 C／E／F／G。每次怪物未命中只向目标当时所在星区活英雄施加腐蚀 1·2t，复用已核实抗性／免疫与状态堆叠；缺防御目录整次拒绝。要求调用方传入攻击位移前状态。
- 本批没有调用该原语，未更改目录 runtimeReady、正式攻击、UI 或旧存档行为，不能称房间特效已开放。下一刀先加显式日志版本，再接单／多目标攻击时序、位移和严格回放；Boss 自然胜利缺口继续保留，无新增规则裁定。
- 验证：最终组合 2 文件 8 项通过（9.91 秒）；typecheck、lint、build 已通过，完整 CI 待完成。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1。首次夹具漏区域，随后复制英雄字段到怪物导致准入拒绝；均修正夹具，未放宽业务校验。本批非阶段末，无新页面路径，不新增浏览器冒烟；旧未跟踪交接文件保留、不提交。

### Toxic Mushrooms 攻击命令版本与正式接线（2026-11-15）

- #695 转 ready 后 squash 合入 `ceff1b62`，同步 main；合入时 CI 运行中。分支 `codex/weald-toxic-attack`。
- R-234／R-239：`playMonsterSkill.toxicMushrooms: true` 显式开启本次效果，严格命令 schema 与读取器保留标记；无标记的历史命令不变。页面派发新标记，不修改既有存档。单／多目标共用原攻击骰，逐次 miss 影响目标所在星区，不去重同区多次未命中。复用状态防御，效果拒绝时返回整次攻击输入。
- 效果位于目标攻击结算后、后续位移前；自身 Pull 沿用既有自身阶段先行，在目标阶段续接才施加。JSON 状态往返后位移续接不重放腐蚀、也不额外耗骰。该机制夹具不是自然任务存档。
- 验证：3 文件 50 项通过（46.08 秒），typecheck、lint、build 通过；命令 schema 新旧及错误版本值校验通过。首轮夹具遗漏地牢 phase／heroes、怪物距离不合卡面，修正夹具后通过；自身 Pull 初始断言错把自身阶段当成目标结算，按现有流程修正。第一次并行检查下历史自然日志测试超过既有 20 秒时限，最终组合复跑通过，无时限或业务规则放宽。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1；完整 CI 待完成。
- 下一步：补新标记的自然 Weald 完整严格日志与页面冒烟，同步数据目录 runtimeReady；当前 schema／目录的区域投影仍只标记 Poisonous Roots，Toxic Mushrooms 读取核准房间身份与星区独立结算。随后补 2 号 Unprepared!，其余效果、Boss 自然胜利与跨任务养成缺口继续保留。不新增规则裁定，本批非阶段末；旧未跟踪交接文件保留、不提交。

### Toxic Mushrooms 自然检查点、严格日志与页面验收（2026-11-15）

- #696 转 ready 后 squash 合入 `68f8361b`；分支 `codex/weald-toxic-acceptance`。合入时 CI 运行中，不记全绿。
- R-234／R-239：1 号板块四个 Toxic 星区标记 runtimeReady，schema 只允许核准 1 号身份，不开放其他效果；生成目录一致性及错房间／错效果拒绝已验证。房间卡 verifiedEffect 的历史 false 元数据未改，避免改变存档中的卡目录；该字段不能单独判断是否已实现。
- 自然驱动新增显式 toxicMushrooms 选项，缺省旧策略／旧命令不变；观测器提供实际事件。seed1 原 Fungal Research、Purge、Patrol 均未进入 1 号房；随后对 Patrol seed2–5 做一次有界普通房间采样，仅 seed4 满足触发。最终固定 seed4、原 survival 与公开补员策略，不修改站位、伤口、牌序或 RNG；不搜索 Boss 胜利。
- seed4 首次真实触发发生在自身位移后的目标攻击续接。保存 resolveShuffles 前后的完整命令日志，JSON 后严格恢复相同状态；删掉原 playMonsterSkill 的版本标记则快照不一致而拒绝。这里只验收到首次触发，不称整个任务或战役通关。
- 页面使用同一自然路径的攻击前检查点，经真实按钮“结算怪物技能 → 结算位移”，核对命令新标记、Toxic 事件及所有实际实体状态等于自然结果。冒烟无重试通过（单用例 23.0 秒，整次 32.9 秒）；浏览器沿用配置支持的本机 Chrome。首轮旧夹具错误地要求触发命令必须是 playMonsterSkill，实际为 resolveShuffles；已改成真实时点。首轮浏览器等待旧检查点按钮时终止，修正后独立无重试运行通过。生成修改首次误改卡级 false 被 schema 拒绝，已恢复，仅改四处区域字段。
- 最终组合 4 文件 49 项通过（28.59 秒）；页面冒烟如上通过；typecheck、lint、build 最终检查通过，diff 空白检查通过。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1，完整 CI 待完成。下一刀：2 号 Unprepared!，随后其余已核准效果；Boss 跨任务养成与自然胜利、其他机制 UI 验收继续保留。无新增规则裁定，旧未跟踪交接文件保留、不提交。

### Ambush／Unprepared! 战斗开始版本与自然日志（2026-11-15）

- #697 转 ready 后 squash 合入 `1d7cb847`，同步 main；合入时 CI 运行中。分支 `codex/weald-unprepared`。
- R-234、rooms FRONT p2：新增 startBattle.wealdUnprepared:true，只在已启用 Weald 机制且实际绑定普通 2 号房时施加；所有活英雄跨区域减益 2t，不给怪物施加。沿用已核准状态防御，缺目录时整条开始命令原子拒绝；旧 startBattle 不补标记。Stygian 保留未开放，不类推普通卡。
- 通过原战斗开始准入后、建先攻前接入；重复开始由既有 encounter 检查拒绝。页面开始按钮派发新标记，严格 schema／读取器保留标记。真实 Jester 减益抗性缩短至 1t；普通英雄状态沿用回合开始消耗机制。
- 自然测试固定此前普通房间采样已观察到 2 号房的 seed2 Patrol，使用原 survival／公开补员策略，只开启命令版本；首次 Unprepared 触发前后完整命令日志 JSON 严格恢复，删最后开始命令标记时拒绝。不改牌序、站位、伤口、骰序或 Boss 策略，不称任务／战役通关。
- 最终组合 4 文件 21 项通过（28.90 秒）；typecheck、lint、build 通过，新增抗性测试后的最终 typecheck／lint 通过，diff 空白检查通过。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1，完整 CI 待完成。下一刀先补 Ambush 页面冒烟，再补 4 号 Precious；2 号全房间效果不伪装成区域特效，房间卡级历史 runtimeReady=false 元数据保留兼容。其他房间效果与 Boss 跨任务自然胜利缺口继续保留；无新增裁定，旧未跟踪交接文件保留、不提交。本批非阶段末，未新增按钮或浏览器冒烟。

### Unprepared! 自然检查点页面冒烟（2026-11-15）

- #698 转 ready 后 squash 合入 `5d5f7c3b`，同步 main；合入时 CI 运行中。分支 `codex/weald-ambush-ui`。
- R-234：从现有严格日志测试提取共用 seed2 Patrol 自然检查点，保留队伍、种子、公开命令、survival／补员策略与触发时点。引擎与浏览器使用同一函数，避免另建站位／伤口夹具。业务规则未修改。
- 新增 1 条页面冒烟：从真实开始前检查点点击“开始战斗”，确认 startBattle.wealdUnprepared:true、Unprepared 只触发一次、所有实体状态／先攻／RNG 与自然结果一致，开始按钮消失。不是完整任务或完整战役验收；没有假造 UI 胜利。
- 验证：共用夹具后的严格日志与机制测试 2 文件 6 项通过（24.77 秒）；页面首轮无重试通过（28.8 秒），补先攻／RNG／触发次数后最终独立无重试通过（22.8 秒，整次 30.2 秒）。最终 typecheck、lint、build 与 diff 空白检查均通过。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1；完整 CI 待完成。
- 下一刀已核对 R-234／R-237：4 号 Stash 的 D 星区，怪物结束回合使所有其他怪物获得两项增益 2t，不能去重或合并为 4t。下一批接运行时与显式版本，不将本批验收提前写成 Precious 已实现。剩余四类效果及 Boss 跨任务自然胜利缺口继续保留；无新增裁定，旧未跟踪交接文件保留、不提交。

### Precious 战斗版本与共用结束回合接线（2026-11-15）

- #699 转 ready 后 squash 合入 `ec986091`，同步 main；合入时 CI 运行中。分支 `codex/weald-precious`。
- R-234／R-237：startBattle.wealdPrecious:true 仅在启用 Weald 机制、普通 4 号 Stash 实际绑定时写入战斗版本；页面派发新标记，严格命令 schema／读取器保留。旧开始命令不启用；不按普通卡类推 Stygian。
- 在共用 finishTurn 接入：D 区活怪物结束回合，所有区域其他活怪物分别获得两项增益 2t；不去重，不合并 4t，不影响使用者或英雄。复用既有状态防御，缺受益目标防御目录拒绝。正式 playMonsterSkill 的回合收尾已测试进入钩子；后续位移续接沿用该共用入口，尚待自然日志验收。
- 机制夹具通过底层 applyEncounterCommand 验结束回合；首轮误用正式地牢不允许的 finishMonsterTurn 被原准入拒绝，已改用底层夹具并另加真正公开技能命令测试，未放宽跳回合限制。缺防御目录时公开技能整条回滚，含伤口、RNG 和回合；旧版本、非 D、死者、错房间、错包与 Stygian 边界保留。
- 最终组合 4 文件 59 项通过（32.78 秒）；typecheck、lint、build 通过，最后新增边界测试的引擎类型／格式复核通过，diff 空白检查通过。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1；完整 CI 待完成。下一批补 Precious 自然完整严格日志、页面操作及区域 runtimeReady 元数据，再补 8／9 号剩余效果。本批非阶段末，未新增按钮或浏览器冒烟；无新增裁定，Boss 跨任务自然胜利缺口及旧未跟踪交接文件继续保留，不提交该文件。

### Precious 定向玩家完整日志、页面移动待选与区域元数据（2026-11-15）

- #700 转 ready 后 squash 合入 `ac52a223`，同步 main；合入时 CI 运行中。分支 `codex/weald-precious-acceptance`。
- R-234／R-237：4 号 D 星区 runtimeReady 改 true；schema 仅允许核准 Stash 身份。生成目录一致、错房间与未开放效果拒绝已验证。卡级历史 verifiedEffect.runtimeReady=false 继续保留兼容，不凭该字段判断可玩。
- 原 survival／公开补员策略 seed1–32 有界采样均无 Precious；其中 seed4、22 进入 Stash。seed4 的支援怪物从 D 移向英雄所在处，不能将到过 Stash 当成触发。随后明确新增测试玩家偏好：仅 Stash 按已核准通路、英雄移动上限与公开 moveHero 趋向 D，其他行动换姿态；mustMove 时交回原驱动，不注入状态、牌序、伤口或 RNG。seed4 的早期 E 区尝试及最终 D 区策略仍未触发，已观察到 Stash 的 seed22 在 D 区策略下触发，最终固定 seed22，不扩大采样、不搜索 Boss 胜利。
- 首次实际触发命令为怪物移动待选的 resolveChoice：选 D 后怪物因未到射程跳过技能并结束回合，由共用钩子给其他活怪物双增益。真实路径已发生英雄伤亡，不称自然通关、原默认策略成功或完整战役验收。完整初始命令前缀分别保存触发前后，JSON 后严格恢复同状态；删除最近开始命令 wealdPrecious 则拒绝。
- 页面共用上述检查点：开始前点击“开始战斗”确认写入战斗版本；再在真实移动待选检查点选择实际选项，核对单次 Precious、实体、先攻、RNG 与引擎结果。首轮错误地仅映射技能／移动按钮，未处理真实 resolveChoice 而失败；补实际待选按钮后无重试通过（35.6 秒，整次 45.3 秒）。本机 Chrome 沿用配置支持入口。
- 最终验证：组合 4 文件 17 项通过（40.91 秒），typecheck、lint、build 通过，最终改动文件 ESLint、文档格式与 diff 空白检查通过。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1；完整 CI 待完成。下一刀接 8 号 Fungal Overgrowth 真菌摧毁全房间增益，再接 9 号 Ours!／Clearing；Boss 跨任务自然胜利与整体战役缺口继续保留。无新增裁定，旧未跟踪交接文件保留、不提交。

### Fungal Overgrowth／Abyssal Puff 新版本与摧毁触发（2026-11-15）

- #701 转 ready 后 squash 合入 `a23f241b`，同步 main；合入时 CI 运行中。分支 `codex/weald-abyssal-puff`。按房间审阅表更正 8 号房名为 Fungal Overgrowth，效果为 Abyssal Puff，先前下一刀误写 Resting Grounds 不作为规则来源。
- R-234／R-236、W-04（W3）：startBattle.wealdAbyssalPuff:true 仅普通 8 号、已选 Weald 且启用机制时写入战斗版本；页面开始命令携带版本，严格 schema／读取器保留。旧命令／错房间／错包／Stygian 不类推。
- 对每条命令比较真菌存活→死亡变化，在核心命令结算内、饰品外层提交之前应用；每枚新摧毁真菌分别使所有区域活战斗怪物增益 2t。真菌按 W-04 不算怪物；不向其他真菌、英雄、死者施加。无需记录额外触发游标，后续命令和 JSON 往返不重放旧尸体；两枚同时摧毁的独立原语夹具保留两堆，不合为 4t。
- 机制测试走真正公开英雄 Smite 命令摧毁 C 真菌，并核对异区怪物增益、旧版本与同骰序、拒绝重复攻击；缺受益怪物防御目录时攻击连同真菌死亡／伤口／骰序整条回滚。双摧毁原语夹具显式受控，不称自然战役或正式日志。
- 最终组合 4 文件 15 项通过（32.10 秒）；typecheck、lint、build 通过，最终新增文件 ESLint、文档格式与 diff 空白检查通过。末检发现按钮对象未带新标记，补齐后网页 ESLint／类型检查及 build 再次通过。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1；完整 CI 待完成。下一刀补 Abyssal Puff 完整严格日志／页面验收，再接 9 号两类效果；8 号卡级历史运行元数据保留兼容。本批非阶段末，不新增按钮或浏览器冒烟；无新增裁定，Boss 跨任务自然胜利与整体战役缺口继续保留，旧未跟踪交接文件保留、不提交。

### Abyssal Puff 完整日志与页面摧毁验收（2026-11-15）

- #702 转 ready 后 squash 合入 `1bc9ddaa`，同步 main；合入时 CI 运行中。分支 `codex/weald-puff-acceptance`。
- R-234／R-236、W-04：复用既有 seed1 Fungal Research、naturalParty、survival／公开补员、destroy-all 与 restThreshold:0 玩家偏好，侦察深度 4；只执行公开命令，不注入站位、伤口、牌序或 RNG。记录普通 8 号首次真菌被摧毁前后与战斗开始前检查点，不称任务或战役通关。
- 完整初始命令前缀对摧毁前后 JSON 严格恢复同状态；删除最后开始命令的 wealdAbyssalPuff 标记则拒绝。驱动首次摧毁以 playHeroSkill 指定单个目标，页面对该可多选技能使用 playHeroSkillTargets 并只勾同一真菌；另验两命令产生相同状态，页面实际命令前缀同样严格恢复。
- 新增 1 条页面冒烟：开始前点击开始确认版本；从真实攻击前检查点选实际手牌技能、区域与真菌复选框、点击使用技能，确认一次 Abyssal Puff、实体／先攻／RNG 等于自然结果。首轮错误使用单目标下拉框而页面实际为多选，等待超时；修正真实页面交互及命令等价验证后无重试通过（43.2 秒，整次 52.5 秒）。浏览器沿用本机 Chrome，未改 CI 配置。
- 验证：组合 4 文件 9 项通过（89.13 秒，含既有 Fungal Research 及 Precious 存档）；补页面命令等价与严格回放后本文件 1 项通过（27.10 秒）；typecheck、lint、build 首轮通过。最终类型复核发现 let attack 在 find 回调内失去收窄，已先保存 skillId 修正，最终引擎类型、改动文件 ESLint、格式与 diff 检查通过，build 再次通过。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1；完整 CI 待完成。
- 下一刀：9 号 Ours!／Clearing 两类独立效果。8 号为全房间触发，不造区域 runtimeReady 字段；卡级历史元数据继续保留存档兼容，不凭该字段否认运行时。Boss 跨任务自然胜利、其他机制 UI 与完整战役缺口继续保留；无新增裁定，旧未跟踪交接文件保留、不提交。

### Ours! 战斗版本与拾箱奖励结算接线（2026-11-15）

- #703 转 ready 后 squash 合入 `080a7162`，同步 main；合入时 CI 运行中。分支 `codex/weald-clearing`，本批主题为 9 号 Ours!，Clearing 独立结束回合效果留随后批次。
- R-234／R-238：startBattle.wealdOurs:true 仅普通 9 号、已选 Weald 且启用机制时写入版本；页面开始按钮携带标记，严格 schema／读取器保留，旧开始命令不启用。英雄在任何区域成功拾取宝箱，都使房内活战斗怪物分别获得减益 1t 与增益 2t；不缩为 B 区，不给英雄或真菌授予怪物触发器。
- 接既有 finishLoot 共用奖励成功结算入口：直接金币与奖励待选完成共用，一次拾取只施加一次，且在最后行动的 finishTurn 前施加。翻箱后的奖励待选尚未完成时不先提交拾取状态；错误选择／失败／补给满拒绝沿用原行为。缺受益怪物防御目录时公开命令整体回滚奖励、宝箱、行动与骰序。
- 机制夹具使用 A 区宝箱验证全房间范围，两个状态各自保留；核对与旧版本相同的奖励骰序／金币，选择补给时 JSON 往返续接、重复选择拒绝，以及最后行动先状态后结束回合。该受控夹具不是自然战役或完整严格日志。
- 组合 4 文件 12 项通过（41.52 秒）；夹具类型修正后 Ours／Loot 组合 2 文件 10 项通过（10.75 秒）。首轮类型检查指出 BattleSetup 不接受已部署 loot，改为受控 BattleState 夹具，未放宽业务校验；最终 typecheck 通过。lint、build、最终新增文件 ESLint／格式与 diff 检查通过。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1，完整 CI 待完成。下一批补 Ours! 完整严格日志与页面验收，再接 Clearing 独立触发，核对随机移除宝箱的有限池处置；不因本批推定该处置。9 号卡级历史运行元数据保留兼容。本批非阶段末，未新增按钮或浏览器冒烟，无新增裁定；Boss 自然胜利及完整战役缺口保留，旧未跟踪交接文件保留、不提交。

### Ours! 完整拾箱日志与页面奖励续接（2026-11-15）

- #704 转 ready 后 squash 合入 `b3ad4919`，同步 main；合入时 CI 运行中。分支 `codex/weald-ours-acceptance`。
- R-234／R-238：固定此前已观察到 9 号房的 seed21 Patrol，沿用 naturalParty、survival／公开补员及侦察深度 2；明确玩家偏好只在 9 号房优先合法移动至 B 并拾箱，无可用移动／拾取时交回原驱动。mustMove 交回原逻辑，不注入站位、伤口、牌序或 RNG；没有继续搜索种子，不称任务或自然战役通关。
- 自然驱动新增显式 wealdOurs 开始命令选项，缺省旧命令不变。共用夹具记录战斗开始前、首次拾箱前、奖励待选前与 Ours 触发后。实际拾箱命令序列断言为 interactLoot → resolveChoice，从 JSON 拾箱前状态续接到相同结果。
- 完整初始命令日志分别严格恢复拾箱前、奖励待选状态和触发后状态；删除最近开始命令 wealdOurs 则拒绝。不存在奖励／金币／已拾取计数或状态注入。
- 页面同一检查点先验证开始按钮写版本；从真实拾箱前点击“战利品 → 拾取同区宝箱”，再选实际奖励选项，确认单次 Ours、实体／先攻／RNG、宝箱及补给等于公开路径结果。新增 1 条冒烟首轮无重试通过（28.0 秒，整次 33.9 秒），浏览器沿用本机 Chrome，未改 CI 配置。
- 验证：组合 4 文件 12 项通过（41.98 秒），补明确奖励待选序列断言后本文件 1 项通过（32.39 秒）；typecheck、lint、build 与最终改动文件 ESLint／格式／diff 检查通过。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1，完整 CI 待完成。下一刀：Clearing 独立结束回合效果，核对随机移除宝箱有限池处置；卡级历史元数据保留兼容。Boss 自然胜利、其他机制 UI 及完整战役缺口继续保留；无新增裁定，旧未跟踪交接文件保留、不提交。

### Clearing 结束回合与有限宝箱池裁定（2026-11-15）

- #705 转 ready 后 squash 合入 `e6bc7831`，同步 main；合入时 CI 运行中。分支 `codex/weald-clearing-end-turn`。
- R-234／R-238：startBattle.wealdClearingHeroes:true 仅实际普通 9 号、已选 Weald 且机制启用时，将 B 区投影为英雄结束回合恢复 1 压力；复用既有 endTurnStress 原语，保持抗性／压力下限与低光语义。页面负压力区域提示改为读取实际效果名，避免误显示 Beacon of Light；无名称的旧 Beacon 保留原标签。
- 核对官方核心 R18 页面图像及核心／Weald 规则文字后，现有 R-047／R-059 仍未覆盖本效果移箱去向。先独立实现英雄部分并询问 Kyries；本次收到限定裁定，记为 R-260：未拾取箱归还本次地牢可用随机池，不计已拾取，不改变 R-047 或 R-059 范围。未使用 FAQ，PDF／图像只在私有缓存，不提交。
- startBattle.wealdClearingMonsters:true 独立启用怪物部分；在共用 finishTurn 中仅 B 区活战斗怪物触发。非空 placed 从实际未拾取箱均匀选择 1 枚，使用共享可设种子 RNG 并前进 1 游标；空场不掷。移除的代币仅去掉板上／翻面属性后归还 available，不发金币补给、不追加 claimedIds、不触发拾箱奖励。先校验十枚有限池身份／种类／唯一性／守恒，非法池使公开技能整条回滚。
- 新页面开始命令携带两段版本，严格 schema／读取器分别保留；旧开始命令不启用，Stygian 与错房间不类推。受控机制验证公共换姿态最后行动恢复压力、0 下限、非 B、低光／RNG、JSON 续接；公开怪物技能收尾验证随机选择、R-260 回池、无奖励、空场、旧版及非法池回滚。原“怪物版本尚未开放”的临时测试在收到 R-260 后改为错误值拒绝，未更改业务准入。
- 验证：组合 4 文件 12 项通过（36.85 秒）；typecheck、lint、build 与 diff 空白检查通过。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1，完整 CI 待完成。下一刀补 Clearing 完整严格日志／页面验收及有限池跨房间恢复，然后复核 I 级收尾，不提前结案步骤 3／5。本批非阶段末，未新增按钮或浏览器冒烟；Boss 自然胜利、其他机制 UI 及完整战役缺口保留，旧未跟踪交接文件保留、不提交。

### Clearing 完整日志与页面结束回合验收（2026-11-15）

- #706 已按指令转 ready 并 squash 合入 main（20b480c2）；分支 codex/weald-clearing-acceptance，合入时 CI 仍运行中。
- R-234／R-238／R-260：固定已有 seed21 Patrol，naturalParty、survival／公开补员及侦察深度 2；显式玩家偏好仅在 9 号房合法移动趋向 B，空闲换姿态，mustMove 交回原驱动。不注入站位、压力、牌序或 RNG，不搜索新种子，不称任务通关。
- 分别停在首次英雄 Clearing 压力结算与怪物 Clearing 移箱前后，完整初始命令日志 JSON 严格恢复同状态；分别删除对应开始版本则拒绝。移箱验证 placed 减一、available 加一、claimedIds 不变。
- 页面共用相同检查点，验证开始按钮启用英雄区域和怪物版本，并通过实际待选／怪物技能或换姿态按钮结束回合，核对实体、宝箱池、先攻、RNG 与单次触发。
- 待确认项无新增；下一步补有限池跨房间恢复、其他机制 UI 与 I 级阶段收尾。Boss 跨任务自然胜利及完整战役缺口仍保留，步骤 3／5 不结案。旧未跟踪交接文件保留、不提交。

- 验证：Clearing／Ours 组合 3 文件 7 项通过；新增英雄严格日志后本文件 2 项通过。两条页面冒烟最终无重试通过（23.9／22.1 秒，整次 49.9 秒）；首次英雄用例漏实际移动命令，补命令后又漏移动分页，已修正交互并重跑。typecheck、lint、build、最终网页类型／ESLint／格式及 diff 空白检查通过。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1；完整 CI 待完成。

### Clearing 有限池跨房间恢复（2026-11-15）

- #707 已按指令转 ready 并 squash 合入 main（b30cb788），合入时 CI 运行中；分支 codex/weald-clearing-room-pool。
- R-234／R-238／R-260：沿用固定 seed21 Patrol 及此前趋向 B 的公开玩家策略，在首次移箱后恢复 survival 驱动；侦察深度明确改为 4，以进入下一战斗。不注入任何业务状态或 RNG，不搜索种子。
- 记录移箱前后、战后交接前后和下一房开始。核对同一枚 id／kind 归还可用池、未计 claimedIds，finishDungeonBattle 后 available／claimedIds 原样写回；下一房十枚守恒且无重复。从战后完整严格日志 JSON 恢复，再逐命令续接至下一房同状态。
- 固定路径的下一房未抽中该枚，它仍留在 available；曾尝试断言再次上板，失败后按真实观察改为验证可用池，不将其描述为再次部署。跨房间完整日志验证不要求随机抽中同一枚。
- 无新增待裁定项。本批不是阶段末，不增加浏览器冒烟。下一刀补战斗内零容量通行／结束回合限制的页面验收，随后复核其他机制 UI 和 I 级收尾；Boss 自然胜利、完整战役与步骤 3／5 的阶段结案仍保留。旧未跟踪交接文件保留、不提交。

- 验证：Clearing 组合 3 文件 8 项通过（30.38 秒）；补固定下一房可用池断言后本文件 1 项通过（18.00 秒）。typecheck、lint、build、改动文件 ESLint／格式与 diff 空白检查通过。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1；完整 CI 待完成。

### 零容量通行与回合结束限制页面验收（2026-11-15）

- #708 已按指令转 ready 并 squash 合入 main（1ca1bed3）；合入时 CI 运行中。分支 codex/weald-zero-capacity-acceptance。
- W-03（Weald W3 Note）：Heroes／Monsters 可穿过 capacity 0 区域，不能在那里结束回合。既有引擎机制测试保留；本批补英雄正式页面操作，不将其外推为怪物移动 UI 的全覆盖。
- 固定已有 seed2 Disinfection／naturalParty。原默认策略虽到普通 5 号 Infected Oak，但没有所需检查点；明确玩家偏好为可移动英雄沿核准邻接接近零容量区，暂不攻击时用合法换姿态等待，mustMove 交回原驱动。无更换种子、注入站位／行动／伤口／牌序或 RNG，不称自然通关。
- 仅选择公开命令预演合法的三条路径：一行动穿过零容量区、第一行动暂留并留下必须移出限制、第二行动合法移出。三条移动命令显式携带页面 allTrinkets:true 版本；原默认驱动／历史前缀不变。四个检查点（操作前、暂留、穿过、移出）完整初始命令日志 JSON 严格恢复同状态；在暂留状态最后行动原地移动被原子拒绝。
- 页面共用上述检查点，点击真实移动分页／路径／确认按钮，验证暂留后原地移动及两方向换姿态均禁用，且未提交额外命令；再移出，并独立从操作前执行穿过。最终整份 GameState 对齐引擎结果。
- 无新增待裁定项。下一刀补战斗内真菌存活禁疗页面，再复核普通房间与 I 级阶段收尾；Boss 自然胜利、完整战役及步骤 3／5 结案缺口继续保留。旧未跟踪交接文件保留、不提交。

- 验证：组合 3 文件 18 项通过（25.33 秒）；补页面命令版本后本文件 1 项通过（21.18 秒）。页面最终无重试通过（54.8 秒，整次约 1 分钟）；首轮整份状态对比发现 allTrinkets 导致空 usedTrinketIds 差异，已显式对齐命令版本并复验严格日志。typecheck、lint、build、改动文件 ESLint／格式与 diff 空白检查通过。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1；完整 CI 待完成。

### PR #709 合入前 CI 修复（2026-11-15）

- 完整 CI 实际失败于 Pounder combat-plans／projection 两个文件的模块初始化；页面 CI 两次均成功。主检查其余 561 文件、4155 项通过、1 项跳过；不能记全绿。
- 本机复现 content → Weald geometry → battle／encounter → Pounder runtime 的循环导入：注册脚本过早读取未初始化 content；修复后又暴露 turn 顶层调用 projection 的循环。
- 将核准 JSON／schema 解析拆为不依赖战斗运行时的 pounder-i-data 叶模块，注册脚本直接依赖；回合投影延后至实际 Pounder 路径调用，保持卡面、规则、命令与 RNG 不变。原两失败文件及 turn 合计 17 项已通过；后续验证记录随合入更新。

### 真菌存活禁疗页面验收（2026-11-15）

- #709 连同初始化修复已 squash 合入 c186efb3；Pounder／Hag 目录扩大回归 27 文件 225 项通过（208.28 秒），typecheck、lint、build 通过。旧失败 CI 不记通过，修复后完整 CI 运行中。
- W-04（Weald W3）：固定已有 seed1 Fungal Research、naturalParty、survival／公开补员与 retain-one 真菌策略，侦察深度 4。仅采集真实 Vestal 回合、已装备 Divine Grace、实际目标选择因 W-04 被拒绝的检查点，不注入真菌、站位、伤口、行动、牌序或 RNG，不称任务／战役通关。
- 完整初始命令前缀 JSON 严格恢复同状态；恢复后用页面 allTrinkets:true 版本治疗，断言 W-04 原子拒绝和完整状态不变。失败命令不写成功日志。
- 页面共用真实检查点，实际选择 Divine Grace 与目标并点击使用，显示 Necrotic Fungus 禁疗提示；整份 GameState 与操作前一致，命令日志为空。覆盖治疗技能的拒绝交互，不声称穷举所有治疗来源。
- 无新增待裁定项。下一步复核普通房间／I 级阶段收尾及仍未覆盖的实际路径；Boss 跨任务自然胜利、怪物零容量移动 UI 与完整战役仍保留，步骤 3／5 不提前结案。旧未跟踪交接文件保留、不提交。

- 本批验证：禁疗严格日志与既有 Weald 机制组合 2 文件 9 项通过（11.64 秒）；页面首轮无重试通过（用例约 1 分钟、整次 1.3 分钟）。typecheck、lint、build、最终引擎／网页类型、改动文件 ESLint／格式及 diff 空白检查通过。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1；完整 CI 待完成。

### I 级复核与 Poisonous Roots 页面补验收（2026-11-15）

- 在 #710 禁疗验收基础上继续核对：消毒页面已有 Potion／计数／保存恢复，未直接断言回合结束树根腐蚀。本批追加同一阶段机制页面验收，PR 统一为 Weald 禁疗与树根腐蚀页面。
- R-234／R-245：固定既有 seed2 Disinfection／naturalParty，仅让位于真实 Poisonous Roots 星区的当前英雄公开换姿态结束回合，命令显式 allTrinkets:true。不注入站位、状态、牌序或 RNG。记录首次真实 poisonousRoots 前后，完整日志严格恢复同状态；验证实际 statusStacks 为 blight amount 2／remaining 2。首轮错将兼容 blight 字符串列表当状态堆，已按实际 statusStacks 校验修正。
- 页面从同一检查点点击换姿态，核对单次 poisonousRoots 事件、整份 GameState 和命令相同。首轮无重试通过（26.4 秒，整次 36.9 秒）；禁疗／树根／既有橡树机制组合 3 文件 6 项通过（17.44 秒）。
- 复核五任务 helper 未开启新增的六类房间命令版本；既有自然任务日志继续验证旧路径，不能据此宣称当前页面组合版本任务验收完成。下一刀固定原种子、队伍、策略，在显式当前版本下逐任务重验，失败保留真实停点，不覆盖旧日志黄金结果。
- 普通房间效果逐项已有日志／页面检查点；怪物零容量移动 UI、同一战役连续任务、Boss 真实养成与自然胜利仍未验收，不关闭步骤 3／5／6，不越过 Pounder 实现 Shrieker。无新增待裁定规则，旧未跟踪交接文件保留、不提交。

- 最终验证：追加树根路径后 typecheck、lint、build 和改动文件 ESLint／格式、diff 空白检查通过。复查 #709 修复后 CI：两个主检查均成功；页面一次成功、另一次失败，失败详情正在核对，不记全绿。本批 #710 完整 CI 待完成。

- #709 失败页面日志已通过连接诊断取回：darkest-setup 在篡改导入后等待“回放不一致”提示 5 秒超时，两次均失败；Hamlet 游商显示文字含异步“无本地卡图”占位差异，重试通过。另一轮全页面 CI 成功。本批未修改这两条既有路径，不将其认定为已修复，也不因此把 CI 记全绿；后续需单独复现核对。

### 当前页面房间版本下的 I 级五任务复验（2026-11-15）

- #710 已按指令转 ready 并 squash 合入 main（4d434b4a），合入时 CI 运行中；分支 codex/weald-current-room-quests。
- 原 helper 缺省及旧日志测试不变。新增显式 currentRooms 选项：所有 startBattle 带 Unprepared／Precious／Abyssal Puff／Ours／Clearing 双标记，怪物攻击带 Toxic Mushrooms；命令带页面 store 的 allTrinkets，resolveChoice 带 bossEdgeRooms。测试逐条核对实际命令版本，不能只检查选项配置。
- 固定原种子、naturalParty、survival／公开补员、restThreshold:0 和原任务玩家偏好；不改 RNG、站位、状态、路线或伤口，不换种子。Fungal Research retain-one／三目标，Circle 三 Crone，Disinfection 三消毒，Purge 三巢穴，Patrol 六房均沿原驱动。

| 任务              | 原种子 | 当前版本实际结果                                                    | 本批验证                                                      |
| ----------------- | ------ | ------------------------------------------------------------------- | ------------------------------------------------------------- |
| Fungal Research   | 1      | 清理 2 房后 heroesDefeated，phase=inBattle／turn=halted，无任务摘要 | 完整初始日志严格恢复真实败局，不称三目标通关                  |
| Circle of Witches | 2      | 3 Crone，清理 4 房，正常退出                                        | 3 XP／驿站 XP 3、回村后四英雄 XP 均 3，退出与回村完整日志恢复 |
| Disinfection      | 2      | 消毒 3 棵，清理 4 房，正常退出                                      | 同上；原策略允许同一目标房重复消毒，不冒称三间目标房          |
| Purge the Woods   | 4      | 清理 3 房，正常退出                                                 | 3 XP／驿站 XP 3、回村后四英雄 XP 均 3，退出与回村完整日志恢复 |
| Patrol the Woods  | 3      | 清理 6 房，正常退出                                                 | 同上                                                          |

- 新文件固定五项结果摘要快照，并对四条成功路径断言 stopReason=null、XP 与回村；Fungal Research 显式断言真实全灭与无摘要。快照为普通 Vitest 结果，不建立 evidence／proof JSON 链；未改任何旧黄金结果。
- 无新增待裁定项。本批非阶段末，不新增页面冒烟；单项机制已有前批页面路径。下一刀对照 seed1 新旧日志分析死亡与房间效果变化，保持策略不变、不搜索胜利；当前版本五任务尚未全通，步骤 3／5 不结案。Boss 跨任务自然胜利、怪物零容量移动 UI 与完整战役缺口继续保留，旧未跟踪交接文件保留、不提交。

- 验证：当前版本五任务 1 文件 5 项通过（42.59 秒，含四任务 XP 回村与严格日志）；原五任务默认路径 5 文件 7 项全部通过（191.90 秒）。typecheck、lint、build 与最终引擎类型／改动文件 ESLint／格式／diff 空白检查通过。新摘要快照 5 项已核对，未更新旧快照。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1；完整 CI 待完成。测试通过只代表上述实际结果可重现，不代表 Fungal Research 已通关。

### Fungal Research seed1 新旧分歧与死亡路径（2026-11-15）

- #711 已按指令 squash 合入 main（aa68e0b8），合入时 CI 运行中；分支 codex/weald-fungal-seed1-analysis。本批不改业务运行时、种子、队伍或玩家策略。
- 从同一初始入口分别运行旧版与当前版，逐命令重放并核对最终状态；对比区域、姿态、伤口、压力、死亡、状态堆、先攻回合与 RNG，忽略单纯版本字段。命令号以下均从 1 起算。
- 首个实际分歧是第 184 条：A 房普通 8 号 Fungal Overgrowth，hero-0 用 hero_skill:p004 命中并摧毁 E 区真菌。新版按 R-234／R-236 触发 Abyssal Puff，H 区 p046、D 区 p037／p018、C 区 p034 四只活怪物各增益 2t；旧版没有。此步骰序均为 251，前 184 条去掉版本字段后的公开命令一致。
- 控制重放仅从当前命令前缀删除 startBattle.wealdAbyssalPuff，不注入任何状态，也不继续求胜。到第 184 条时控制组所有实体等于旧版，验证此处局部增益差异来自该版本；当前触发前／触发后及控制组前缀均通过完整严格日志 JSON 恢复。
- 首次 RNG 差异在第 210 条 resolveChoice(turn-start:85, continue)，双方均为回合开始状态伤口／死门结算。第 218 条首次不同的公开命令是后续探索待选已分叉：旧版 dungeon-die:89 选 hero-2:1，当前 dungeon-hazard:89:hero-1:1 选 suffer。不能把待选身份变化直接称为主动换策略。
- 旧路径无英雄死亡并完成三目标；当前路径四名英雄全在后续 B 房普通 6 号死亡：hero-1 第 240 条 resolveChoice（第 1 轮），hero-0 第 254 条怪物技能（第 1 轮），hero-3 第 284 条 resolveChoice（第 3 轮），hero-2 第 311 条 resolveChoice（第 4 轮）。全灭不是发生在首个 Puff 当下。
- 上述结果验证局部分歧和真实后续路径，不证明单次 Puff 是整场全灭的唯一充分原因；未反事实重跑整场求胜，不删除效果、降低数值或覆盖原旧版成功／当前版败局。无新增规则待裁定项。
- 下一刀明确独立的新玩家策略后复验当前版 Fungal Research（例如如何依据公开真菌与怪物状态安排技能），保留本批原策略与败局。任务／战役自然胜利仍未全部验收，步骤 3／5 不结案；Boss 与怪物零容量移动 UI 等原缺口继续保留。旧未跟踪交接文件保留、不提交。

- 验证：最终分析文件 1 项通过（24.24 秒），含新旧完整重放、三组严格前缀恢复与局部控制断言；摘要快照已核对，不改旧快照。typecheck、lint、build、最终引擎类型／改动文件 ESLint／格式及 diff 空白检查通过。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1；完整 CI 待完成。

### Fungal Research 当前版独立保全策略（2026-11-15）

- #712 已按指令 squash 合入 main（ae119f18），合入时 CI 运行中；分支 codex/weald-fungal-preserve-all。
- 新测试玩家策略具名 retain-all：不将活真菌作为单目标技能目标，也不选择包含活真菌的群体目标；另拒绝会摧毁真菌的预演结果。仅查询公开目标身份与技能效果，不根据命中／未命中去赌攻击真菌。其余 survival／公开补员、休息阈值 0、三目标退出和当前页面版本全部沿用原流程。
- 固定原 seed1、naturalParty，不换种子、不改规则／数据／RNG／站位或伤口；retain-one 与 destroy-all 缺省及原日志不变。最初仅按预演摧毁差值过滤，随后加强为按公开目标身份直接排除并重验，防止把会落空的攻击真菌算成保全策略。
- 三个目标房 G／A／B 全部赢下并清理，分别留下 2／3／2 个活真菌，没有摧毁，也没有 Abyssal Puff 事件；三目标正常退出。R-246／R-252 明确 objective 与 brought back XP 分开：本次 broughtBackCount=0、objectiveMet=true，英雄与驿站 XP 均为 0，不称 3 XP 成功或高收益策略。
- 对完整命令逐步重放，验证技能目标均不含当时活真菌且无命令拒绝／Puff；退出状态严格日志 JSON 恢复，公开回村完成后四英雄 XP=[0,0,0,0]、驿站 XP=0，完整回村日志恢复同状态。
- 当前页面版五任务已有各自独立退出与回村路径：四任务原策略获 3 XP，Fungal Research 新策略 0 XP。保留原策略当前版败局；不能据此称同一战役连续任务完成、所有房间与所有策略可赢，步骤 3／5 暂不结案。
- 无新增待裁定项。本批仅测试玩家策略，不改产品运行时，非阶段末，不新增页面冒烟。下一刀补怪物零容量移动／结束回合限制的页面验收，再复核阶段收尾；Boss 实际养成与自然胜利、完整战役缺口保留，旧未跟踪交接文件保留、不提交。

- 验证：加强公开目标排除并补回村后本文件 1 项通过（12.58 秒）；组合新策略／当前五任务／新旧分析 3 文件 7 项通过（45.14 秒），原策略结果和旧快照未变。typecheck、lint、build、改动文件 ESLint／格式及 diff 空白检查通过。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1；完整 CI 待完成。

### 怪物零容量通行与结束回合守卫页面验收（2026-11-15）

- #713 已按指令 squash 合入 main（4eb0a392），合入时 CI 运行中；分支 codex/weald-monster-zero-capacity。
- W-03（Weald W3 Note）：怪物可穿过零容量区域，不能在其中结束回合。本批不改规则或业务实现。
- 先固定已有 seed2 Disinfection 原路径，仅见 G→A 移动，不能证明经过零容量；公开英雄趋向 B／D 的两种偏好仍未取得必经通路，实际停 awaitingReplacement，未扩大搜索。随后使用既有 Patrol seed3 原 survival／公开补员、休息阈值 0、侦察六房与当前页面版本，找到真实 monster-deck:p022 从 B→E、2 步、未跳过技能的公开 moveMonsterToRange。
- 观测器只接受终点非零，且移除核准零容量区域后最短距离变长或断开的实际移动，避免把同房移动误称穿行。不注入自然路径的站位／牌序／骰序。移动前、移动后、接着公开怪物技能结算后，完整初始命令日志均严格 JSON 恢复同状态。
- 非法结束回合单列为显式机制夹具：从真实定位后的状态，仅将同一怪物置于实际获批零容量区域，选择真实技能可抵达 W-03 守卫的位置；不把该状态记入自然日志。公开技能在结束回合处拒绝并整条回滚，原伤口、状态、先攻与 RNG 不变。
- 页面共用真实移动检查点，点击怪物移动到射程，再结算技能，整份 GameState 和命令对齐引擎。独立安装非法机制夹具，点击结算技能，验证 W-03 可见提示、完整状态不变、没有追加成功命令。不称自然非法站立或自然战役通关。
- 无新增待裁定项。下一刀按步骤 3／5 完成标准复核 I 级收尾，保留独立任务与连续战役的区别；原策略败局、新保全策略 0 XP、Boss 实际养成与自然胜利和完整战役缺口继续保留。旧未跟踪交接文件保留、不提交。

- 验证：组合 3 文件 10 项通过（27.83 秒）；补 damageStoneWindow:true 页面技能版本后本文件 1 项通过（20.59 秒）。页面最终无重试通过（47.6 秒，整次 51.7 秒）；首轮仅命令比对缺该版本，状态已一致。最终类型复核修正回调中 after 的收窄丢失（保存 positioned 局部引用），引擎／网页类型、改动文件 ESLint、格式与 diff 检查通过；此前完整 typecheck、lint、build 通过。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1；完整 CI 待完成。

### I 级普通内容阶段收尾（2026-11-15）

- #714 已按指令 squash 合入 main（bcd59bca）；分支 codex/weald-level1-closeout。CLI 首次网络超时，连接诊断读取成功；GitHub 连接器转 ready 权限不足，随后使用本机已授权 CLI 完成，未增加审批流程。
- 按本计划表中原完成标准复核，纠正后续记录将“同一战役连续通关”加到步骤 5 的范围漂移。步骤 5 只要求各任务从村庄选取到探索、战斗、结算回村及可恢复；连续战役、跨幕和完整升级属于步骤 8，不因这些尚缺而无限延后独立任务验收。
- 步骤 3：R-239 九房几何与部署已经核准；R-234–R-238 六类效果均有显式版本、完整严格日志和页面检查点，Poisonous Roots／Clearing 后续验收已补齐。I 级普通范围验收，不涵盖 Boss、II／III 级或 Stygian 替换。
- 步骤 4：W-03 英雄通行／暂留后必须移出、怪物必经零容量的真实通路及非法结束回合回滚，W-04 真菌放置／禁疗／技能摧毁均已有验证。非法怪物站位为明确机制夹具，不作自然场景。
- 步骤 5：五个村庄／沙盒入口、当前房间版本任务目标与 XP、公开回村和严格恢复均有场景。Circle／Disinfection／Purge／Patrol 原固定策略各 3 XP，Fungal Research seed1 独立保全策略完成三目标但 brought back=0，按 R-246／R-252 合法 0 XP；不要求改策略求满 XP。旧版成功与当前版原策略败局不变。
- 本批新增两条阶段页面冒烟：当前版本 Fungal Research 目标已取得／0 XP、Patrol 六房／3 XP，读取真实完整日志后保存、刷新、恢复整份 GameState 与命令相同；复跑既有 Weald 首趟抽二选一／包选择／刷新恢复，共三条。保留既有旧版页面用例，不替换历史结果，不新增规则或 evidence／proof 链。
- 剩余项限定为：步骤 1／2 的高等级内容；步骤 6 的 Hag 真实跨任务养成抵达／回村、Pounder 实际养成及自然胜利、Shrieker 尚未实现；步骤 7／8 的高等级、Stygian 与连续完整战役。按既定 Boss 顺序等待真实玩家输入，不搜种子制造胜利。
- 待裁定规则无新增。下一刀回到步骤 6 核对真实玩家验收输入与现有文件交接入口；不把缺输入改写成规则缺失，也不越过 Pounder 实现 Shrieker。旧未跟踪交接文件保留、不提交。

- 本批验证：阶段回归 11 文件 68 项通过（77.80 秒）。三条阶段页面冒烟首轮均无重试通过（18.8／51.3／42.0 秒，整次 2.1 分钟）；补强“开战命令数量大于 0”断言后新增两条再次无重试通过（42.5／40.4 秒，整次 1.5 分钟）。typecheck、lint、build、新增文件 ESLint／格式、文档格式与 diff 空白检查通过。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1；本批完整 CI 待完成。

### Hag 玩家文件交接验收（2026-11-15）

- #715 已 squash 合入 main（53069efc）；GitHub CLI 初次 TLS 超时、转 ready 未完成则未合入，重试成功后才同步。分支 codex/weald-hag-player-log-handoff，合入时 CI 运行中。
- Kyries 本次明确回复“尚未实测，先补交接验收”。R-190 下不搜索新种子或改策略制造 Boss 胜利，不把测试检查点当真实玩家实测。
- 核对已有 Pounder seed17 完整日志文件入口；Hag 原页面仅以内存状态检查点测试部署／释放。本批给 Hag 既有 seed6 单任务公开命令夹具增加可选真实来源与完整释放待选前缀保存，不注入快照、站位、伤口或 RNG，不改变原策略。
- 新文件冒烟从完整日志导入 Hag 释放待选，导出文件并验证 deployHagI 与 hagRelease；篡改快照 RNG 后严格拒绝，保留当前进度与本机存档槽；刷新后重导导出文件，整份状态／命令相同，再点击实际释放选项续接，不重复消耗 RNG。
- 增加独立交接说明，写明页面按钮、文件路径交接、同局完整前缀与单任务检查点的区别、失败也可验收，以及 Hag／Pounder 原自然养成缺口。不存在玩家实测文件则明确保留，不新增审批或规则裁定。
- 下一步等待实际玩家日志路径后做严格回放与对应 Boss 验收；交接测试不证明跨任务自然胜利，不推进 Shrieker。I 级普通内容结论保留，旧未跟踪交接文件不提交。

- 验证：Hag 释放／自然严格日志 2 文件 17 项通过（84.22 秒），原 Hag 部署／释放页面通过（36.8 秒）；Hag／Pounder 文件交接最终组合无重试通过（1.7 分钟／52.9 秒，整次 2.7 分钟）。补完整状态保留断言后 Hag 再次无重试通过（1.3 分钟，整次 1.4 分钟）。首轮文件测试残留从 Pounder 复制的“Hag 行动”断言，已改为实际释放按钮。typecheck、lint、build、最终网页类型／改动文件 ESLint／格式／文档格式及 diff 空白检查通过。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1；完整 CI 待完成。

### 共用存档页面 CI 异步断言修正（2026-11-15）

- #716 已按指令 squash 合入 main（d7a0f4fe），合入时 CI 运行中；分支 codex/save-smoke-stability。玩家此前已确认尚未实测，交接验收现已齐备，不再重复要求确认，不越过 Boss 实测缺口推进 Shrieker。
- 接续此前已取回的 #709 CI 失败：darkest-setup 篡改文件导入后等待拒绝提示在 5 秒处超时，不能仅凭该日志认定规则校验错误；Hamlet 游商恢复比较包含异步“无本地卡图”的整段文字，图片状态变化被误判成商品变化。
- 最暗文件用例沿用已验证的 Boss 文件交接预算：仅将“回放不一致”拒绝提示断言设为 60 秒，用例整体预算与文件交接一致为 180 秒。保留篡改金币拒绝、原探索页可用、本机存档槽不变及合法文件刷新恢复检查，不改导入协议、游戏状态或规则。
- 游商比较改为页面真实陈列 figcaption 对应卡牌 testid 和文字标签（名称／等级／价格），首次陈列明确要求 3 张。刷新恢复及出售后依旧核对有序完整列表；购买、出售、装备、金币和持牌断言不变。图片可用与否不再进入陈列相等判断，没有移除商品身份或价格验证。
- 本批仅修两条已有页面用例，不新增流程或回归墙；不更改任何自然战斗策略、任务黄金结果或数值。下一步仍按 Boss 日志交接说明接收实际文件并严格核对跨任务养成与自然胜利，未提供实测日志前保留步骤 6／7／8 缺口。

- 验证：存档存储单元 1 文件 3 项通过；最暗文件／村庄自然交易两条目标页面用例均无重试通过（33.9 秒／2.3 分钟，含共享夹具整次 4.6 分钟）。typecheck、lint、build、改动文件 ESLint／格式、文档格式与 diff 空白检查通过。未改业务代码，不新增镜像单元测试。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1；本批远端全量 CI 待完成，不以局部结果记全绿。

### #717 合入后进度核对（2026-11-15）

- #717 已按指令转 ready、squash 合入 cb77a9c3，本机 main 与 origin/main 同步；旧未跟踪交接文件保留。
- 连接诊断确认 #715 两轮完整主检查及页面均成功；#716 一轮页面成功，其余仍运行；#717 各检查仍运行。未发现新的失败项，不为等待结果额外改断言或重复跑无关回归。
- 当前没有实际玩家 Boss 日志。Hag／Pounder 文件交接和此前已知存档页面断言均已补齐，不重复开发入口，不新增策略、采样或提前实现 Shrieker。下一项仍是接收玩家导出 JSON 的本机路径，按 R-190 严格恢复并核对真实跨任务养成／胜利；失败日志同样可验。
- 本次仅更新本地交接进度，无新代码改动或开发 PR；文档格式及 diff 空白检查通过，不重跑引擎／页面测试。该进度可随下次有实际输入的改动一并提交，避免为同一等待状态重复开 PR。

### 实机后置与 Shrieker I 内容核实（2026-11-15）

- 用户明确要求先跳过实机、优先完善 Weald；本批按该指令调整当前入口，不继续等待日志或重复交接／CI 维护。原人工验收缺口仍属未完成，不把它记成已通过。
- 已使用 PDF 技能查看私有 Shrieker I／Nest I 卡图、能力正反、房间与规则 W3，并重新渲染 11 号实际板块。核对 raw ID、数值、技能、两段威胁及十区几何；形成独立审阅稿，图片与 PDF 保留私有缓存，不提交。
- 横向并列技能的文字提取交错；Call the Murder 经卡图与四枚实际目标图标位置核对为 4 目标，未沿初次误读的 3 目标落库。Nest 的空白属性、飞行／治疗时点与具体几何仍待本批核准，未自动从其它 Boss 推算。
- 来源遵循 R-001／R-048，官方 W3 的初始姿态、3／4 先攻和移除 Nest 可沿用；未改描述抽选、注册或 combatReady，不擅自登记新裁定。当前待确认集中在 Q-186 本表四组条目。
- 下一步核准本表后开始独立 schema／normalized 和部署，再补专属技能与威胁。高等级不从 I 级推算；人工实机后置不豁免自动验证。旧未跟踪交接文件保留、不提交。

- Kyries 对本批问题选择“我先查看审阅稿，再逐项确认”；本次没有收到数值／几何／Nest 行为的核准，保持 Q-186 待确认，不提前实现这些提案。文档格式、相对链接、原始来源与图像存在性、diff 空白检查通过；本批无业务代码改动，不重跑引擎／页面测试。板块与卡图仅本地缓存，未入库。

### Shrieker I 核准数据与板块目录（2026-11-15）

- Kyries 已直接修改审阅稿并明确未改部分均核准，登记 R-261。采用更正后的眩晕／流血／位移抗性，Nest 五类免疫及 Speed／Dodge=0；不沿初稿的减益／Pull 误读。
- 新增独立 shrieker_i.json 与严格 schema，包含身份来源、两实体、三技能、行动／威胁印刷字段、十区几何、14 共边、部署及宝箱。只投影获批几何；数据模块为无战斗导入的叶模块，避免重现 Pounder 初始化循环。
- 未注册 Boss，不改变原七张描述池、未实现停点、普通九房／怪物目录、存档协议或全局图标词典。combatReady／usable 继续 false；数据核准不冒充运行时已完成。原稿未给出具体答案的三组规则细节显式保留，不自动补默认行为。
- 接下来按显式部署 → Nest 禁入／清场 → 三技能 → 两段威胁 → 日志／页面推进。实机按用户指令后置，自动验证照常；II／III 不从 I 级推算。旧未跟踪交接文件保留、不提交。

- 验证：最终组合 4 文件 31 项通过（8.98 秒）；负例夹具类型修正后本文件 13 项再过（12.72 秒），最终引擎类型通过。首轮共享基类 R-261 类型准入缺失已补，普通九房 schema 仍拒绝 Boss；effect 负例最初漏写实际变更，补齐后验证时长漂移拒绝。typecheck、lint、build、改动文件 ESLint／格式与 diff 空白检查通过。本批仅独立数据，非阶段末，无新增页面冒烟；Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1，完整 CI 待完成。

### Shrieker I 独立部署与 Nest 判定（2026-11-16）

- #718 已按指令转 ready、squash 合入 main（`a2ef903c`），本机已同步；合入前两轮完整 CI 及页面检查通过。连接器转 ready 权限不足后使用本机已授权 CLI 完成。
- W3／R-261：新增独立部署计划，Shrieker／Nest 分别为 aggressive／ranged、各占两姿态并落 E，保留实际 Life／Dodge 与位移免疫；英雄 J／C、宝箱 A／E／I、先攻 4／3 来自核准数据。每次返回独立容器，不污染 normalized。
- Nest 额外禁入按活 Nest 的实际所在区域判定，仅怪物 Shrieker 可进入；不误作不能离开，不固定写死 E。死亡判定仅在本次击败 Shrieker 时返回活 Nest 的移除 ID；Nest 先死不会反向移除本体。纯函数不直接改实体或姿态。
- 本批是独立模块，尚未接公开部署命令、startBattle、全局移动或死亡钩子；不称正式部署／禁入／清场已经可玩。combatReady／usable、原七张描述池和旧日志不变。下一刀接命令和调用方的实际上下文校验，随后实现技能／威胁／页面。
- Q-186 三组细节未获新增裁定：治疗归属与时点、飞行限制、多枚补给／满池顺序仍保留，不推定飞行可跨墙或无视容量。人工实机继续后置。旧未跟踪交接文件保留、不提交。

- 验证：部署／内容 2 文件 16 项最终通过（4.70 秒）；完整 typecheck、lint、build 通过。测试初版错误使用只读 bleed 的 push 与 null 卡号，已修正并复跑类型和定向测试。全量 pnpm test 仍运行，不记作通过；本批未接页面且非阶段末，不新增页面冒烟。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1。

### Shrieker I 公开部署命令与开战停点（2026-11-16）

- #719 按指令转 ready、squash 合入 main（`54cc167b`），本机已同步；合入前两轮完整 CI 与页面冒烟通过。
- 新增公开 deployShriekerI 命令并纳入严格命令 schema；prepareDungeonBattle 在实际 I 级 Shrieker 威胁下绑定 11 号专属房，不抽普通房间、不消费 RNG。核对包属、等级、模式、实际描述卡、出征计划各字段、目标房与当地怪物／奇物来源；不借本批注册尚未完成的脚本。
- 部署使用上批独立计划及共用英雄交接，保留伤口／技能、状态／条件／饰品／金币／补给与随机游标；不占用普通怪物副本。战斗保留 shriekerISetupHold 显式停点，所有后续命令原子拒绝，不能通过 startBattle 或直接沙盒命令绕过未完成技能／威胁／Nest 运行时。怪物卡目录只提供部署属性，仍标 unverified，不能当完整战斗卡使用。
- 场景明确为受控目标房与既有 Weald 普通来源，并非自然出征／完整初始日志。首轮夹具误沿未接 Shrieker 的 Boss 来源入口，实际取得核心来源，被地点校验正确拒绝；现改为显式受控 Weald 来源，不放宽生产校验或伪造自然验收。验证 JSON 序列化前后命令结果一致，但不称完整战役存档已验收。
- 下一刀接 Nest 移动与死亡钩子、实际三技能与选招，随后按 Q-186 未决细节补威胁及自然出征／日志／页面，完成前不解除开战停点。两段威胁、正式描述抽选与 combatReady／usable 保持原状；人工实机继续后置，旧未跟踪交接文件保留。

- 验证：Shrieker 部署／计划／内容及既有 Hag／Pounder 部署共 5 文件 35 项通过（22.61 秒）；完整 typecheck、lint、build、改动文件 ESLint 与 diff 空白检查通过。非阶段末且未接页面，不新增页面冒烟；本批全量单元／场景及页面检查交 CI，未提前记全绿。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1。

### Nest 移动与共用死亡钩子（2026-11-16）

- #720 按指令转 ready、squash 合入 main（`49003d96`），本机已同步；合入时两轮主检查和页面 CI 尚在运行，不记作全绿。
- R-261：Nest 策略拆为仅依赖核准内容与类型的叶模块，原部署模块保留重导出。英雄逐步移动检查每个经过区；怪物寻路去掉禁入区与相关边，候选、靠近评分及事件步数均用可通行图；攻击射程仍按原几何计算，不把禁入扩展成墙或视线阻挡。
- Push／Pull 逐步候选、怪物挤出和英雄结束回合的 Small 挤出候选均排除活 Nest 区。按实际所在区与 I 级卡身份判定，Shrieker 例外，Nest 死亡后解除；不改通用容量与姿态位移规则，不推定 Call the Murder 的飞行细则。
- W3：在实际 I 级 Shrieker 威胁、描述卡、包属和 11 号板块上下文内，本次击败本体使活 Nest 进入共用 removeCasualties 流程，统一事件与姿态补位。重复空清理无新增事件，英雄和 RNG 保持不变。
- 新场景均明确为受控机制夹具；没有自然出征或战役存档验收。保持 shriekerISetupHold，未开放战斗／页面。下一刀补三技能、选招与开战准入；Q-186 的治疗时点／归属、飞行限制及多枚／满池补给顺序仍未裁定。人工实机后置，旧未跟踪交接文件保留、不提交。

- 验证：移动／位移／挤出／遭遇与 Shrieker／Hag／Pounder 部署共 10 文件 109 项通过（26.18 秒）；补强死亡上下文负例后部署文件 3 项再过（10.19 秒）。完整 typecheck、lint、build 与 diff 空白检查通过；首轮死亡夹具误加 EncounterState 不存在的 discard 字段，已移除并重跑类型。最后测试改动另做引擎类型和 ESLint 复核。非阶段末且开战尚 hold，不新增页面冒烟；本批完整 CI 待完成，不记全绿。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1。

### Shrieker I 三技能投影与选招（2026-11-16）

- #721 按指令转 ready、squash 合入 main（`fe752c73`），本机已同步；合入时两轮主检查与页面 CI 仍运行，不记全绿。
- R-261：独立投影两实体属性／抗性／免疫与 Shrieker 三技能的命中、暴击、伤害、射程、目标数、Self Pull／Push、流血、压力、减益和疾病，使用既有 MonsterEffectPlan 和共用技能解析器。所有合法两格姿态逐一核对十面选招，Nest 不造技能／选招。
- Nest 在场的 Call the Murder 由专属标记在攻击读取处明确拒绝，保留 Q-186 的飞行限制、治疗时点与归属停点；不能误走印刷 Self Push 2。Nest 不在场的独立投影验证原印刷 Self Push 2＋压力。尚未接活战斗中的目录切换、多目标完整结算或每轮三行动，不把纯解析器测试称为完整技能运行时。
- deployShriekerI 新增显式 shriekerSkills:true 版本；省略时保持原有仅属性部署目录，旧命令不升级输出。严格 schema 拒绝 false；两版实体、地牢和 RNG 一致，JSON 序列化后新命令结果一致。shriekerISetupHold 保留，正式抽选／脚本注册、combatReady／usable 均不开放。
- 测试实际检查普通命中、暴击、落空与自身位移／目标状态／疾病输出。首轮把共用 miss 的 damageDealt 误断言为 0，修正为原协议 null；又补正共用暴击带来的额外压力预期，不改规则或数值求通过。
- 下一刀核对 Q-186 具体细则并完成活 Nest 能力和三行动，随后两段威胁、正式出征／完整日志／页面；未裁定的多枚／满池补给顺序继续保留。人工实机继续后置。旧未跟踪交接文件保留、不提交。

- 验证：最终相关 5 文件 26 项通过（11.95 秒）；完整 typecheck、lint、最终构建、改动文件 ESLint 与格式／diff 检查通过。新增命令标记首次遗漏 Zod optional 推断的 undefined 类型，已与既有严格可选属性约定对齐并重跑完整类型。本批非阶段末且开战尚 hold，不新增页面冒烟，完整 CI 待完成。补查 #720 两轮页面成功，主检查仍运行；#721 各检查仍运行。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1。

### Shrieker 连续收尾：战斗原语（2026-11-16）

- #722 已按指令合入 f020ce27，合入时 CI 仍运行。用户要求一口气完成 Shrieker、拆 PR，原实机后置约定保留。
- Q-186 三处已由 Kyries 明确确认，登记 R-262。飞行／治疗按 R20 在 Acc 后先于伤害，未命中／已在 Nest 区也执行；直达实际 Nest 区不改姿态。补给逐枚加入／玩家弃置，满池先沿用已有处理。
- 本 PR 接三行动与先攻配额、Nest 不行动，以及获批飞行／治疗自身效果原语。受控配额和多目标技能测试连同原解析器／遭遇共 3 文件 25 项通过；正式出征与威胁版本在后续 PR 连续接入，当前开战停点保留。未宣称自然战役已完成。

### Shrieker 连续收尾：威胁与显式完整版本（2026-11-16）

- 第一批 #723：R-262 飞行治疗及三行动。当前第二批用 establishImminentThreat.shriekerBossBattles:true 显式注册 Shrieker I，旧无标记命令即使注册表已有脚本也保留原未实现停点；地点来源、出征计划、部署均跟随同一版本，跨任务保留。
- 地牢按 R-262 对每枚新获得的普通补给依次生成玩家弃置；后项暂存队列，不能提前弃后获得者。保存／恢复原地牢或战斗待选，未知／过期选项原子拒绝。保留引擎已有满池处理；没有成功获得时不新增弃置，任务强制道具不作为可丢弃项。
- 村庄全部补给骰及 Wild 面确定后，只从 reserve 弃一枚，随后继续尚未完成的准备／游商等流程；不按每英雄触发。战斗能力翻面后威胁停止生效。页面共用战斗待选增加盗取阶段文案。
- 已验：盗取队列／恢复／越界三项，实际 seed0 初始威胁与 reserve 待选的完整严格日志及旧版本停点；固定首趟自然策略包含三次盗取，整份日志严格恢复。正式胜负交接与页面作为下一批继续，不把首趟日志视为跨任务 Boss 胜利。

### Shrieker 连续收尾：胜负交接与完整受控战斗（2026-11-16）

- 第二批 #724 接显式版本与双威胁。本第三批接正式 finishDungeonBattle，胜利清目标房／威胁并记录 shrieker 击败身份；伤口／压力／状态／饰品／条件／金币／补给与 RNG 交回地牢，普通牌池保持不变。英雄全灭保留失败，不清房发奖。
- Nest 先被摧毁后，完整版本自动切回印刷 Self Push 2；不再错误携带飞行能力。Boss 本体死亡仍沿共用流程清 Nest。胜利后公开离开、任务摘要、回村只发一次 3 XP 已验。
- 受控“已到 Boss 房”检查点使用真实四英雄及原有战斗策略，完整公开命令走到胜利并等待补员；从同一 JSON 检查点重放所有命令，整份 GameState 一致。不是自然抵达，不是从初始种子起的完整战役日志，不掩盖死亡。
- 本批交接与受控战斗 3 项通过（11.42 秒，含公开回村 XP）；部署／内容／技能／威胁／日志组合 6 文件 33 项通过（18.84 秒）。收尾页面与最终全量质量检查随下一批汇总。

### Shrieker 连续收尾：页面、严格日志与内容就绪（2026-11-16）

- 按用户“一口气做完、分 PR”完成步骤 6 的 Shrieker I 工程范围，依赖顺序为 #723（R-262／战斗原语）→ #724（双威胁／显式完整版本）→ #725（Nest 切换／胜负与回村交接）→ 本批（页面／日志／就绪与验证）。不将工程完成写成三个 Boss 自然养成或完整 Weald 战役验收完成。
- 新 Core＋Weald、非 Stygian 页面显式启用完整 Shrieker 版本；11 号 Boss 房提供部署与开战，3 张怪物先攻只供本体。开战按显式版本补齐脚本注册并停止威胁，不依赖此前全局注册表是否碰巧已加载。新版本提示等待开战，旧无标记输出仍保留。
- 独立内容升级 schema v2，加入 R-262、combatReady=true、pendingRuleDetails=[]。普通九房目录保持隔离；共享板块 `usable=false` 是既有普通目录字段，不能据此覆盖专属部署的正式版本校验。II／III 与 Stygian 仍不从 I 级推算。
- 战斗盗取使用 battle.choiceCursor，地牢盗取／reserve 使用 dungeon.decision；不重复编号或提前回写，最终由既有战后流程交回游标。专项回归覆盖此边界，原待选和队列严格续接。
- 完整初始日志：seed0 原首趟策略包含实际三次盗取，reserve 待选及最终状态均严格恢复。另只检查固定 0–31 的 p019 描述身份，选定首个 Shrieker seed19 后才执行原战斗／探索策略，未筛选胜负；实际在抵达 Boss 前以 noWaitingHeroes 结束，原样保留。此结果不记为自然 Boss 胜利。
- 受控抵达 Boss 房的完整战斗使用原策略，公开命令胜利后等待补员，同一 JSON 检查点逐命令重放相等；单独机制终局验证公开回村一次 3 XP。不是从初始种子的自然抵达或完整战役存档，不以夹具补掉实机后置缺口。
- 页面冒烟：Shrieker 部署／开战、真实 reserve 完整日志文件导入／刷新恢复／选择续接无重试通过（最终补开战停威胁断言后 46.7 秒，整次 52.8 秒）；既有 Hag／Pounder 两条也无重试通过（32.3／35.8 秒，整次 1.3 分钟）。本机沿用已安装 Chromium；首次缺当前浏览器版本、模块初始化循环、重复同面补给按钮的测试定位问题均已处理，不改规则或玩家策略。
- 本地完整 typecheck、lint、build 通过；最终六文件 35 项通过（40.97 秒），补强落空／满血与出征 32 项、游标／严格日志 7 项均通过。全量覆盖 576 文件：4219 项通过、1 项跳过、战斗盗取游标断言 1 项失败；该断言对应逻辑已修复，并在最新实现的六文件 35 项中复跑通过。最终远端检查以 PR checks 为准，不把首次全量记录改写成一次全绿。#722、#723、#724 两轮主检查／页面已全绿，其余 CI 继续执行；未把尚运行的检查记作通过。
- I 级本批无剩余规则待裁定；R-262 三项均已落实。下一步按计划核实高等级与 Stygian，原人工实机后置、Hag／Pounder／Shrieker 的真实跨任务验收缺口保留。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1；旧未跟踪交接文件保持原样、不提交。卡图／PDF 仅在私有缓存，未提交。

### 步骤 7 首批：高等级普通怪物卡面审阅（2026-11-16）

- #723–#726 原依赖 PR 已合入；检查发现后三级仍在依赖分支，按原顺序整合为 #727 并合入 main（4af954f2）。整合分支与原 #726 分支树比较无差异，未改变已实现行为。
- 整理 II Crone／Unclean Giant、III Hateful Virago 的实体页、参考卡边界、属性、防御、选招与技能候选。Crone 复用 R-253；Giant 的解析抗性图标与卡图差异显式列出。未核准候选不进入 normalized 或运行时。
- 待确认：Q-186 的 Giant／Virago 属性与五项技能候选；medium p16／p19 副本图仍须逐页补查。下一步核准后接高等级独立目录／地点池，随后任务、Boss、Stygian；人工实机继续后置。
- 验证：整合后的 Shrieker 内容／初始严格日志／胜负交接／双威胁 4 文件 23 项通过（20.51 秒）；文档格式和 diff 空白检查通过。本批仅新增审阅文档，不新增页面冒烟。#726 一轮页面已通过，其余主检查／页面及 #727 CI 仍运行，不记全绿。旧未跟踪交接文件保留、不提交。

### 步骤 7：R-263 高等级怪物独立目录与组池（2026-11-16）

- Kyries 已修改审阅表并核准未改项；Virago III 采用 Dodge 4／Speed 3，登记 R-263。Giant II 的抗性采用眩晕／腐蚀／位移，不按原始聚类跨卡猜名。Crone 复用 R-253。
- 从原 PDF 补看 medium FRONT p16／p19，与首份战斗字段一致。新增独立 normalized／Zod 数据、真实技能投影与同等级组池：II 为 2 Crone＋1 Giant，III 为 2 Virago，另加同等级通用实体，不重复大型战斗板。I 级目录和任务例外未改。
- 该目录与组池已导出，但尚不接正式高等级任务／地点创建／存档版本，不宣称高等级任务可玩。下一刀核实高等级任务并完成正式入口，随后高等级 Boss 与 Stygian。人工实机继续后置；本批核准字段无剩余待裁定项。
- 验证：专项 2 文件 7 项通过，补充状态面值／持续时间／目标 Push 后新增文件 5 项通过；完整 typecheck、lint、build 通过，最终引擎类型／改动 ESLint 及暂存 diff 空白检查通过。完整 pnpm test 正在运行，尚不记作通过。本批无 UI 改动且非阶段末，不加页面冒烟。Node 24.20.0 低于约定 24.21.0，pnpm 12.9.1。旧未跟踪交接文件保持原样，不提交。

### 步骤 7：高等级任务十卡审阅（2026-11-16）

- #728 已按指令合入 `489ed3d0`，本机同步并新建高等级任务审阅分支。合入时两轮主检查与一轮页面仍运行，一轮页面成功，不记全绿。
- 使用原单包 PDF 重新渲染 FRONT p6–15，逐图核对；BACK p6–15 提取等级为 II 五张、III 五张，本批不冒称背面逐图检查。p11／p14 另放大核图。全部图像仅在私有忽略缓存。
- 当前 PDF p009 是 Hounds of the Woods、p010 是 Lost Supplies，与旧 raw 的名称和背景文案不同；列入后续重提检查。p014 两处同为绿色液滴，单列 Q-186 印刷重复问题，不凭 hash 差异改成其它状态。
- 十卡的休息点、分布、XP 和 SPECIAL 候选已列审阅表。正式高等级任务入口仍关闭；本批不写新裁定、normalized 或运行逻辑，不扩大 R-263 核准范围。
- 验证：本批文档格式与 diff 空白检查通过，非阶段末、不新增页面冒烟。上批完整 typecheck／lint／build 已通过；其本地全量测试仍运行，已出现 quest-save 自然任务回放的 20 秒超时，单项复跑同为超时（实际 28.07 秒），尚未得到状态断言失败，不修改规则、种子、策略或延长测试预算来抹去此记录。其余结果待最终完成后补记。
- 下一步：等待本稿字段与专属歧义的 Q-186 确认后接数据及正式地点来源／版本日志；高等级 Boss、Stygian 随后。原未跟踪交接文件保持原样。

### 步骤 7：高等级任务核准数据批（2026-11-16）

- Kyries 修改后明确未改部分全部核准，登记 R-264；p008 改正为巢穴 3＋随机 5（其它类型可为 0）；p010 明确只取消出征通常补给骰，只替代箱子代币本身奖励；p014 合并一份腐蚀 4／2t。p011 经补问确认等待下一轮末、不因提前全灭结束，点火当轮末无条件补怪，烧毁只清目标、按实际战斗终局交接。
- 重新对照官方 W3 页面图像及现有来源实现，确认 Weald 加入通用怪物和通用奇物。p008 的巢穴当地限定不扩大到所有 Weald 场合。当前 raw 的 Hounds of the Woods／Lost Supplies 与 PDF 一致，修正上批错误描述；未重写 raw。
- 新建独立 higher_quests normalized、Zod 校验与可重建生成器，核对单包来源、页码、等级、标题／Rest、SPECIAL／XP 分界和十卡身份。保留 SPECIAL 原文与批准的语义覆盖；所有 runtimeReady=false，不提前加入 basicQuests／正式抽选。
- 生成校验纳入 normalize 启动器；I 级数据及命令版本未改。正式来源、特殊战斗机制、存档与页面作为后续小 PR，不把本批数据交付称为十任务可玩。
- 验证：新任务生成／拒绝漂移与既有 I 级任务共 2 文件 9 项通过（1.82 秒）；完整 lint／build 通过。首轮 typecheck 遇 reduce 的 0／5 字面量累加推断，已显式指定 number 并复核；最终完整 typecheck 复核通过；最终改动 ESLint、格式与暂存 diff 空白检查通过。非阶段末且无 UI，不新增页面冒烟。
- 上批全量最终 577 文件：4224 项通过、1 项跳过、1 项 quest-save 回放的 20 秒超时（1773.48 秒），保留原记录；#728 两轮 CI 主检查和页面现均通过。旧交接文件不提交；卡图仅在私有缓存。

### 步骤 7：高等级地点来源与牌池显式版本（2026-11-16）

- #729 已合入 `c93a0988` 并同步主线；合入时两轮主检查／页面仍运行，未记为通过。
- `rebuildLocationQuestDecks` 仅显式 `weald-higher-v1` 可重建 II／III 级来源；旧 I 级调用和输出不增加字段，旧高等级调用仍拒绝。高等级状态携带 `wealdSourceVersion:higher-v1` 与 `wealdMonsterLevel`，包属、等级与核准实体清单必须一致。
- 按 W3／R-263／R-264 组合当地＋同级通用怪物和当地＋8 通用奇物，共用抽牌／副本身份映射及地点校验读取新版本；跨地点、删标记、改等级、丢实体和伪造战斗卡引用被拒绝。遗迹不允许携带扩展实例或版本标记。
- 验证新来源及牌池 JSON 序列化后输出一致、II／III 所有实体均有唯一战斗来源，I 级原来源／跨地点严格日志回归保持通过。此检查不是从初始种子的高等级任务日志，不冒称正式任务或存档入口已开放。
- 高等级任务 runtimeReady=false 及现有公开命令准入保持原状态；下一批接任务专属限制／机制和显式任务版本，完成后再接正式抽选与严格初始日志。未新增规则或扩大已批准怪物／任务范围。
- 验证：新来源／牌池与旧状态／地点校验／跨地点日志共 4 文件 18 项通过（34.18 秒）；完整 lint、build 通过。首次类型检查发现测试夹具受遗迹／Weald 返回联合影响，改为明确的可变测试夹具类型，不改生产准入；最终完整 typecheck、改动 ESLint 与 diff 空白检查通过。非阶段末且无页面，不新增 Playwright；旧未跟踪交接文件保留、不提交。

### 步骤 7：Whispering Woods 显式轮开始压力（2026-11-16）

- #730 已合入 `2032a8c2`，本机同步；合入时两轮远端主检查与页面仍运行，不记全绿。
- R-264／任务 FRONT p15：新增 startBattle.wealdWhisperingWoods:true 严格可选标记，只有 Core＋Weald、非 Stygian、实际 p015、III 级 higher-v1 来源与 Weald 战斗机制的上下文可启用。旧无标记命令不升级，缺上下文或来源标记原子拒绝。
- 每个 roundStarted 结算一次存活英雄压力 +1，首轮包含；battle.whisperingWoodsRound 保留已结算轮，抽先攻不重复触发。复用 triggerBattlePassive、resolveBattlePressure、removeCasualties 与既有死亡遗产交接，不手写另一套压力／心脏病规则。
- 使用受控已部署检查点，公开 startBattle／drawInitiative 验首轮与受控下一轮，JSON 检查点恢复后命令结果一致；实际意志检定取得真实唯一持牌／余牌后验证心脏病全灭。不是自然抵达或初始种子的完整任务日志，任务数据 runtimeReady 与正式抽选保持关闭。
- 测试夹具首次错误填未关联属性的 Life、复制怪物压力、跳过地牢开局／阶段以及伪造重复意志持牌，均被原有校验拒绝；已改用真实开局补给流程、明确已部署阶段和真实检定输出，不放宽生产验证或改规则数值。
- 验证：机制／遭遇／压力／高等级来源共 4 文件 24 项通过（6.74 秒）；完整 typecheck、lint、build 通过，最终格式／改动 ESLint 与 diff 空白检查通过；补查 #730 两轮主检查／页面已全绿。非阶段末且未接 UI，不新增页面冒烟。旧交接文件保留、不提交。
- 下一步完成 p015 的任务状态／正式入口和严格日志，随后其余高等级任务机制及 Boss／Stygian；不把本批独立战斗能力当作十任务或完整战役验收。

### 步骤 7：p015 显式单任务入口与完整初始日志（2026-11-16）

- #731 已合入 `1fb80e45` 并同步；补查一轮主检查与两轮页面成功，另一轮主检查仍运行，未记全绿。
- R-264：登记 p015 静态任务／分布／巢穴 XP，保留现有任务顺序；只有 createCoreDungeonQuest 的显式 whisperingWoodsQuest:true 可进入单任务，要求 Weald 包、非 Stygian、无 I 级首趟抽法。原无标记调用和现有页面／村庄任务池不自动加入 p015。
- 起点与地牢状态保存同名显式标记，重建 III 级 higher-v1 地点来源，dungeonLevel／campaignLevel=3；初始英雄沿用原有单任务正式 I 级英雄入口，不伪造跨任务升级。startBattle 在该显式任务内自动启用已核准轮压力；旧单独命令版本仍可使用。
- 真实当地 Virago 仅在已核准 p015／来源版本／等级和实体匹配，且战斗卡与可信 R-263 目录相同时放行；不放宽核心高等级怪物批准校验。首轮尝试被核心专用准入挡住，现补独立本卡批准，不改数值求通过。
- 修复严格回放 startBattle 的参数重建遗漏 wealdWhisperingWoods 标记；起点也保留显式入口参数。初始版本缺失、false、未选包、Stygian 或快照版本篡改均拒绝。
- 固定 seed0，不筛胜负，沿原自然玩家策略执行初始补给、探索、真实房间／怪物部署与轮压力。实际战斗后进入 awaitingReplacement，整份初始命令日志严格恢复。保留死亡，不称自然胜利／跨任务养成；另补显式开战标记日志保留回归。
- 验证：入口／机制／高等级任务生成／跨地点日志 4 文件 12 项通过（34.25 秒）；旧任务／地图配对／原核心入口另 4 文件 27 项通过（10.93 秒）；完整 typecheck、lint、build 与 diff 空白检查通过。最终补开战标记保留后入口／日志 2 项复跑通过（14.17 秒），改动 ESLint 通过。非阶段末且无页面变化，不新增 Playwright。
- 下一步接村庄跨任务版本与页面，再验已实现任务的公开路径；其余九张高等级任务、Boss、Stygian 仍未开放。旧交接文件保留、不提交。

### 步骤 7：p015 村庄抽选、跨任务版本与页面（2026-11-16）

- #732 已合入 `b3682373`；补查一轮主检查及两轮页面成功，另一轮主检查仍运行，未记全绿。
- 新页面 Core＋Weald 非 Stygian 战役显式保存 wealdHigherQuestOffers:true，起点 schema／引擎回放保留该版本。旧无标记起点与 RNG／目录输出保持原样；删去新版本而保留快照会被严格回放拒绝。
- III 级 Weald 堆仅新版本加入 p015；当前与弃置卡排除。当地只有一张，不能选 Weald 抽两张；有遗迹剩余时允许两地各一，全部仅剩一张时沿用单张确认。I 级抽法与旧高等级池不升级。
- 选 p015 后从真实内容重建 higher-v1／III 级怪物池、当地＋通用奇物，保留英雄／金币／战役版本并开启该任务轮压力；换任务重新构造状态，不继承 p015 专属标记到遗迹。准备村庄检查点的公开 offerNextQuest／resolveChoice 日志可从同一 JSON 检查点逐条重放一致。
- 此村庄夹具从真实回村前缀建立受控 III 级准备状态，饰品沿既有 I→II→III 切换并使用完整38张来源；不是自然跨幕养成或初始种子的 III 级村庄日志。原 p015 seed0 初始日志验收继续保留。
- 页面冒烟核对新战役实际版本、受控 III 级两地各一抽选／出征，以及真实新起点文件导入／刷新再导入的完整状态相等，无重试通过（45.1 秒，整次49.4秒）。首次导入提示断言在刷新后的页面切换时消失，改验真实恢复状态，不改变产品流程。
- p015 独立任务 runtimeReady=true，与生成器／Zod／测试同步；其余九张保持 false。就绪仅表示本任务工程链已接，不结案自然养成／人工实机，也不扩大高等级 Boss 或 Stygian。
- 验证：新战役版本／村庄／旧抽选／p015初始日志3文件13项通过（37.65秒）；任务生成4项通过（1.53秒）；完整 typecheck、lint、build 与 diff 空白检查通过。阶段新增1条 Playwright，未扩大页面回归墙。旧未跟踪交接文件保留、不提交。

### 剩余高等级任务连续批次：版本与 Lost Treasures（2026-11-16）

- 按 Kyries 新指令合入 #733（355e3884），剩余任务连续完成并拆 PR。R-265 四组细节已明确，p014 两个独立2／2t取代原合并4／2t；后续统一按最新裁定。
- 首批新增 tasks-v1 显式版本，保留旧 true 版本仅p015的池。Lost Treasures接同级II来源、宝藏清理XP、单任务与村庄入口，固定seed0原策略完整初始日志严格恢复；未换种子求胜。新增宝藏XP类型及对应页面文案。后续PR继续指定怪、生成／死亡效果、补给与烧树，不在本批结束整个连续任务。
- 已核对核心200x300 BACK V2 p3实体代币，p008需要的五类各3枚；图片仅本地缓存。规则与其余验证在最终收尾批汇总。

### 连续任务批次：生成与死亡腐蚀

- R-265 接入 Final Swipe 按只生成的腐蚀，包含首轮初始部署和后续新生成；The Infected 在共用死亡清理前施加两份独立2／2t，最后一击不跳过，同一命令不重复施加。
- 固定 seed0 两任务沿原策略完整初始日志严格恢复；机制夹具覆盖初始／后续生成、双堆面值和末只死亡先于清场，共2文件6项通过。R-264 旧合并覆盖已改成 R-265 两堆；不扩大其它卡图标或全局规则。
- 继续下一批指定怪、随机房、Lost Supplies 和 No Other Way，最终统一质量闸门与页面收尾。

### 连续任务收尾：十卡机制、日志与验证（2026-11-16）

- 已拆 #734 tasks-v1／Lost Treasures；#735 生成与死亡腐蚀；#736 指定怪组件与 Elder Giant；#737 Searching in the Dark；#738 Lost Supplies（Q-188 草稿）；#739 No Other Way。各主题保留独立 PR，格式与 I 级生成器按实际等级筛选的修复已逐层回补，未自动合入新 PR。
- R-265：p006 先放 Virago 后补普通怪，R-029 若挤掉指定怪则按已批准满栏随机替换、继续剩余真实牌序；p009 只三只 I Gnasher且三目标板不重复；p012 指定II Giant，额外先攻和每轮两行动。三间目标房组件战后复用，普通同级池守恒。固定真实大怪优先牌序与三房公开部署检查通过，不筛胜负。
- p008 建局固定巢穴3，从 Empty／Dark／Curio／Treasure／Trap 各3枚实体池无放回抽5枚，合并洗混后入槽；进房只揭面。巢穴仅当地怪，普通混池不丢卡。p013 每生成一只当地怪各触发1／2t，初始／后续都含；p014 每击杀一只在清场前结算两个独立2／2t，末只包含。
- p010 只取消常规出征骰，技能等额外骰照常；箱子自身奖励替换为两颗随机补给，Wild保存已掷结果，完成只扣一次行动。所有九张已核准 Weald 普通板块均有放箱位，抽板仍显式验证该条件。每两颗带回补给1XP，上限3，普通未用补给1金和一次发放沿原回村流程。14／16颗边界、五种箱子、真实回村金币／XP与重复发放拒绝已覆盖；15颗边界待 Q-188，不按建议猜定。
- p011 红星点火消耗1行动＋Torch，第4轮拒绝；点火当轮末无条件从剩余真实池补空位，复用 R-029 大型替换与 R-034 挤占；补怪队列待选可JSON恢复。点燃后全灭不提前结束，下一轮末烧毁并独立登记目标；烧毁后有怪则继续、无怪则胜利、第4轮仍有怪则逃跑。只在真实终局移回英雄／回收牌堆，逃跑不清房，但烧毁目标保留XP；摘要页面按实际击杀／带回／烧毁进度显示。
- 固定seed0 p006／8／9／10／11／12／13／14 沿原策略完整初始日志严格恢复，8项通过（21.49秒）；p007与p015既有固定初始日志保留。实际死亡与 awaitingReplacement 停点原样保存，不称自然胜利或跨幕养成。受控双次提前全灭、烧毁后仍有怪、第4轮逃跑和挤占恢复另有机制测试，未冒充自然日志。
- 页面新增1条，无重试通过（1.5分钟，整次1.6分钟）：真实页面战利品页签点火／等待提示、受控下一轮末烧毁、双补给箱Wild选择与只扣1行动。首次未切战利品页签导致定位超时，修正测试操作后通过；未改规则、玩家策略或测试预算求通过。既有 p015 村庄／初始文件导入冒烟仍保留。
- 最终10文件50项专项通过（42.56秒），含全部新任务初始日志、机制／版本边界与I／高等级生成器。完整lint、build通过；最终类型复核发现版本拒绝测试的模板字符串被推断为string，已改成实际十卡字面量清单，最终完整typecheck复核通过，不改生产准入。
- 本地全量589文件：4268项通过、1项跳过、4项失败（1653.80秒）。三项分别为修复前Virago被挤掉后的部署停点、错误假定九板里必有无箱板、p007测试仍只期待一张II任务；均已修复，最终50项专项覆盖并通过。另1项为此前已有的quest-save自然任务20秒超时，不延长预算、改种子或删断言掩盖。不将本轮写成全绿；#740远端全量／页面检查仍排队，未当作通过。
- 本批收尾为#740草稿，唯一规则待定为Q-188；其余九卡工程链就绪，高等级Boss／Stygian和真实跨幕养成仍后续。Node24.20.0／pnpm12.9.1，未跟踪旧交接文件保持原样，卡图／PDF未提交。

### R-266 背包通用溢出与十任务就绪（2026-11-16）

- Kyries 回答 Q-188：仍完整投足次数、全部取得，之后丢弃超出容量的部分，适用于所有背包拾取／获得；登记 R-266，取代 R-041／R-059／R-138 的限容截断／拒领部分。任务道具保护和饰品装备槽等其它规则保持原约束；饰品 incoming 既有流程已可弃新／旧。
- #741 新增共享超额补给待选。p010 满15／16均完整两骰，普通宝箱满池仍能选择补给；额外开局／技能与队伍奖励不因满池停掷，奇物、挖掘点、露营饰品也完整获得。Wild先选齐面，再从新旧普通补给中选弃至16，容量待选阻断其它行动；最后一行动的拾取先弃超额后结束回合，保留饰品续接。
- 页面所有新命令显式 inventoryOverflow:true；旧无标记命令保留历史行为，旧战役在首个成功新命令起切换。饰品待选中启用也更新其原始重试状态；JSON容量待选与p010完整初始日志严格恢复，不追改历史骰子。
- 4文件97项专项通过（40.17秒），包含22颗开局全部奖励、15／16颗双补给箱、新奖励可弃、挖掘四骰、满池奇物、Camper’s Helmet两骰与待选中启用。初次类型复核的只读内容包数组已改为可变字面量数组；最终完整typecheck、lint、build均通过，不改生产规则。后续8项容量／页面同标记路径／独立战斗沙盒复核通过，另补齐后置校验拒绝的原子回滚。
- p010 与生成器／Zod／normalized 同步 runtimeReady=true，十张高等级普通任务均工程就绪；Q-188 不再是停点。阶段页面在原1条冒烟中补15／16颗箱子的完整领取、Wild和弃新旧补给，无重试通过（39.4秒，整次45.8秒）。首轮全状态读取在并发检查时触发5秒断言超时，页面实际已显示Wild；测试改为只读被断言字段后通过，不延长预算或改变规则。三条旧页面回归因期望缺少新版本字段而在远端失败，已让其E2E夹具以与页面相同的标记重算期望，保留原种子、动作、完整状态及命令日志比较；三条均无重试通过（3.0分钟），修复已回补#741。
- 本地全量591文件：4292项通过、1项跳过、2项失败（1756.64秒）。其中全量执行期间补强的容量原子性用例暴露后置校验拒绝未回滚，已修复并在最新8项容量及综合专项中复核通过；另1项为既有quest-save自然任务20秒超时。保留原始全量记录，不延长预算、删断言或改种子掩盖，不改写为一次全绿。
- #734–#740远端主检查／页面均已通过，原#734／#735／#738／#740已转可审阅；#742一轮已推送版本的远端主检查已通过，最终补强后的head仍以新一轮checks为准。最后完整typecheck／lint／build均通过；5文件104项综合专项通过（28.09秒），包含最新8项容量、原子回滚、独立战斗沙盒及页面同标记路径复核。最终head远端检查仍待新一轮结果，不提前记为通过。所有新PR保持待审，未自动合入；旧未跟踪交接文件保持原样。

### 中文提交、任务批次合入与高等级 Hag 核实（2026-11-16）

- 按 Kyries 指令重写本批 34 个提交的英文信息（包含合并提交），九个分支逐一核对 tree 完全相等，保留本地备份引用，以带精确旧 SHA 的 lease 原子推送。已有中文信息保留。
- #734–#742 按依赖顺序逐个转 main 并合入，合并信息也使用中文；最终 main 为 `82e2a08c`，与任务最终分支无文件差异，本地 main 已同步。旧未跟踪交接文件保持原样。
- 开始下一步 Hag II／III：逐面查看十二张卡图（large 正面四张、背面两张，能力正面四张、威胁背面两张），整理属性／技能／锅生命周期／威胁审阅稿；待 Q-186 核准，未开放新 Boss。
- 验证：改写前后九个分支 tree 一致；最终 main 与改写后任务最终 head 的 diff 为空。主线新一轮远端质量检查已排队，未记全绿；本批新增内容仅文档，不重跑引擎或新增页面测试。
- 下一刀：核准 Hag II／III 字段后接独立目录与现有运行时；Stygian、跨幕养成及人工实机继续保留。

### R-267：Hag II／III 审阅核准与独立目录（2026-11-16）

- Kyries 审核修改审阅稿：Meat Tenderizer 最多4目标，Painfully Soothing II=药水／食物、III再加绷带；锅内英雄不是可互动单位，Boil不能选中。能力四条核准，R-255／R-256 生命周期扩至本批两等级，登记R-267。
- 按更正表逐面数值建立 hag_higher.json；对应Zod校验固定两组等级、真实rawId＋face、能力卡等级、威胁补给范围及选招。满锅无印刷选招表，不复制I级运行表示；未授予combatReady，也未修改I级身份守卫或普通池。
- 卡面与schema专项2文件8项通过；旧Hag引擎身份／投影／战斗／入锅4文件32项通过。build、完整lint通过；首轮typecheck发现safeExtend不允许替换I级字面量，改用独立高等级extend后，完整typecheck复核通过。不改变I级schema的实际接受范围；最终8项数据专项复跑、改动ESLint与格式检查通过，diff空白检查通过。
- 主线82e2a08c远端全量质量闸门已成功；本批检查另外记录，不混用。下一刀为已核准两等级锅生命周期与威胁运行时，再接正式入口／日志；房间复用与Stygian仍待各自核实。本批无页面变化，非阶段末不新增Playwright。旧未跟踪交接文件保留。

### Hag II／III：入锅状态原语与指定补给威胁（2026-11-17）

- 按 Kyries 指令合入#743并同步main（cedfd570）；合入时该head远端主检查仍运行、两条页面已通过，未将主检查记为成功。本批在新分支继续。
- R-267：复用投影与入锅／释放状态算法，I级包装保持原身份判定；II／III以本等级active脚本、campaignLevel、描述卡及Weald包显式匹配。满锅Life14／19、空锅100／136、翻面清伤与防护、英雄离板／姿态和先攻移除、邻区PendingChoice均按本等级数据处理。死亡清理原语接收已经由生命／压力入口判死的英雄，恢复空锅，死亡实体仅留作现有模型的死亡记录，不生成活英雄落区。
- Painfully Soothing II仅药水／食物、III再加绷带；探索、危险抵消、奇物保护与战斗补给入口传入实际face。无新补给范围的旧脚本保持既有行为，避免追改旧日志。Sanitarium按II／III减6／9并封底0，威胁停止后不再施加。
- 保留现有高等级Face the Threat仅遗迹的正式准入，不因独立原语夹具放宽。高等级Boss描述抽选表、正式房间入口与日志仍未开放；没有复用I级Boil内部锅内目标路径，II／III拒绝该目标。强制选招、完整先攻及技能／回合自动释放续接是下一刀，不将本批原语称为完整Boss可玩。
- 初次新夹具缺英雄属性引用且给怪物附压力，已改成真实同级Crusader属性与合法怪物实体；不放宽生产校验。新增导入顺序回归暴露注册时提前投影的循环初始化，改成注册时只读取印刷身份、需要状态原语时才投影，原有I级投影测试复核通过。
- 验证：10文件82项专项通过（26.78秒），含新两等级10项、I级入锅／释放／投影、补给、威胁、选包与牌池；最终类型修正后完整typecheck复核通过，最新82项专项复跑通过（24.71秒）。完整lint与build通过；最终head的远端全量检查另行确认。本批无页面改动，非阶段末不增加Playwright；旧未跟踪交接文件保留。

### Hag II／III：独立回合、先攻与释放续接（2026-11-17）

- 按 Kyries 指令合入#744（9431d384），中文合并信息保留R-267及#744；合入时远端主检查与页面仍运行，不记全绿。旧未跟踪交接文件保留。
- R-267：高等级独立战斗按同级脚本／描述／Weald包和完整核准三面目录匹配；继承三张怪物先攻、Hag两次回合、空锅无行动及每次空锅回合先入锅再普通一招。强制入锅无选招骰，攻击骰仍走既有RNG；命中才捕获，落空仍接第二招。I级保持原身份判定，旧变身与开局召锅辅助仍限I级。
- 入锅技能按本等级核准签名编译Self Pull；拒绝未准备技能、错误等级和篡改目录。Full固定唯一Boil、不掷选招骰，目标仅取板块上的英雄，锅内英雄不可互动；不接I级内部锅内攻击路径。
- Full被打翻、英雄到死门或Hag死亡沿现有PendingChoice与resume续接；公开resolveChoice可恢复受控JSON待选，不重放攻击或消耗额外RNG。Hag死亡后移走空锅，按现有死亡收尾处理。
- 本批夹具复用I级已核准几何作为受控战斗条件，不授予II／III正式房间复用资格；未放宽Face the Threat高等级仅遗迹的任务映射，也未开放正式出征或声称自然战役验收。下一刀核实高等级房间，再接正式来源／版本日志。
- 验证：新增两等级12项通过（6.14秒），含命中／落空后两次行动、独立开战三张先攻、Full普通目标、JSON释放恢复及目录篡改拒绝；完整Hag（含原有自然日志）与任务映射17文件144项通过（133.18秒）；最后补Full公开攻击目标断言后12项复跑通过（9.97秒）。完整typecheck、lint、build及diff空白检查通过；初次lint的无用旧常量已清理。本批为#745，远端全量仍待最新head结果。本批无页面变化，非阶段末不加Playwright。

### 三 Boss 连续批次：高等级来源版本（2026-11-17）

- Kyries 要求合入#745并连续完成Weald三个Boss相关内容、拆PR；#745已合入45fee066，合入时远端检查仍运行。按Hag→Pounder→Shrieker推进，人工实机继续依原指令后置，不用单批替代自然养成验收。
- #746整理官方W3／W4和无等级Boss房卡的共用依据，以及Pounder／Matchman、Shrieker／Nest两等级实际卡面与威胁差异；沿Q-186请求必要细节核准。源码未按未知数值实现，不将I级增援规则直接扩范围。
- 本批新增establishImminentThreat.wealdHigherBosses:true，要求完整地点／I级Boss版本且非Stygian，保存到战役并跨任务保留；旧无标记来源／RNG及高等级停点不变。W3高等级始终四遗迹＋三当地描述，按已击败身份跨等级排除，不把未实现Boss从概率池删掉。升幕抽牌合计两地已击败Boss，未实现脚本保留hold。
- 新标记的初始完整命令日志严格恢复，删版本保留快照拒绝；高等级抽牌为受控准备状态的公开命令回归，不冒充自然升幕。完整typecheck、lint、build通过；新3项复核通过（17.32秒），原来源／初始日志另8项通过；最终3文件11项组合复核通过（30.20秒）。无页面变更且非阶段末，不新增Playwright。
- 下一刀接Hag已核准正式入口／结算和日志；Pounder／Shrieker未知细节等待#746审核时继续独立工作。旧未跟踪交接文件保留。
