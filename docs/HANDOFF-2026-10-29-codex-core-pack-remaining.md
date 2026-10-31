# DDBG「核心包余下全部工作」交接清单（给 Codex）

> **日期**：2026-10-29（Asia/Shanghai）  
> **接手方**：Codex（一条一事、一任务一 PR）  
> **发出方**：Grok Bot（Kyries 当面：把核心包余下工作列全，给 Codex 逐条做）  
> **仓**：https://github.com/Alpaca-go/ddbg-web · 本机 `D:\ddbg-web`  
> **tip（交接时）**：`4b01696`（`feat(engine): Fanatic I 先攻 4 洗入与 Pit Toss 最小战斗运行时 (#364)`）  
> **核对**：本机 `git rev-parse HEAD` → `4b01696c02c80d7723c10080a69dc7447ee10e5f`；`main...origin/main` 同步

## 2026-10-31 最新交接：A/B 分类与工作量（优先于下文历史状态）

Kyries 本聊天要求把剩余工作分两类、记录估算并合入，然后开始 A-1。此授权包括更新本交接文档入库；下文“勿开 PR 入库本文”属历史指示。分类范围仅核心盒（Ruins + Darkest Dungeon），扩展不计入。A 指已有依据但尚未接入的数据/运行时；B 指尚待人工审核或确认的卡面、几何与语义。同一大项的已核实接线和未审核字段须拆开，不能混算。批准开工/排期与人工数据审核是两件事。

最新执行优先级：Kyries 再次明确“小问题先别管，优先接入核心包的数据”。#403 已合入 main `03e93d7`。A-1 保留进展，当前先推进核心数据：最暗普通怪物独立牌池 9 种/26 张已随 #404 合入 main `144f7ed`，接入规范化管线，见 `phase5-darkest-monster-pool-data-2026-10-31.md`；未审 Speed/选招和正式遭遇继续 hold，数据已合入不代表可战斗。

本轮 A-3 状态：已实现16房建局、R-121 三 Boss 位、最暗牌池切换、挖掘点四颗奖励骰+免费8点休息、网页入口与严格存档续接，见 `phase5-a3-darkest-setup-2026-10-31.md`（已随 #405 合入 main `e7a80c7`）。R-138 已由 Kyries 确认满池弃已有补给腾位。A-3 不含 A-2 正式升幕和 A-4/B 类未审战斗；后续依最新指示按依赖/收益推进。

最新排序指示：Kyries 允许按建议的依赖和收益推进，不必严格按 A 编号。A-3 建局/探索已随 #405 合入 main `e7a80c7`；当前先接最暗 Boss/最终战内容目录、胜利边界与形态计划，见 `phase5-darkest-boss-content-2026-10-31.md`（本分支，待合入）。这不表示最暗战斗或最终村庄执行器已完成。

### A 类：尚未接入的数据／运行时

估算单位为有效开发工作日，每天约 6 小时，含实现、测试与正常修错；前提是依赖的 B 审核完成，不含等待审核。初估未逐卡拆分。

| 编号 | 项目               | 工作量   | 剩余范围／依赖                                                                           |
| ---- | ------------------ | -------- | ---------------------------------------------------------------------------------------- |
| A-1  | Boss 正式战斗交接  | 3–6 天   | 专属房间 → 真实部署 → Boss 开战/召唤/收尾；依赖 B-1/B-2。当前开始，不表示已获批几何      |
| A-2  | 正式升幕           | 3–5 天   | 胜利后升等级、更新任务/怪物/饰品牌池、抽新威胁与跨幕存档；现有升幕仍为沙盒预览           |
| A-3  | 最暗地牢布置       | 3–5 天   | 建局/探索已随 #405 合入：16房、三Boss位、挖掘点与牌池切换；正式升幕归A-2，战斗/几何归A-4/B |
| A-4  | 最暗 Boss／最终战  | 10–18 天 | Shuffling Horror、Templars、Mammoth Cyst、最终各形态与跳过/状态保存；不确定性最高        |
| A-5  | 高等级普通怪物     | 3–6 天   | 已核实 II/III 卡牌效果、正式遭遇和战役牌池贯通；未核实字段另列 B-7                       |
| A-6  | 英雄 II/III 全技能 | 6–12 天  | 已有转录/通用效果的技能接入、升级差异与个案；新语义另列 B-7，需逐卡盘点                  |
| A-7  | 任务 SPECIAL       | 2–4 天   | Rising Threat 等特殊规则和摘要/续接；缺裁定部分须先确认，估算可信度偏低                  |
| A-8  | 完整难度模式       | 3–5 天   | Radiant/Stygian 金币、补给、探索骰、房间替换与 Boss Crit 差异                            |
| A-9  | 完整战役验收       | 5–8 天   | 自然任务→Boss→回村→升幕→跨幕存档及失败/补员；持续验证，末尾贯通修错                      |

合计 38–69 天（约 230–410 小时）；另留 20% 余量按 46–83 天规划。建议顺序 A-1 → A-2 → A-5/A-6 → A-3 → A-4 → A-7/A-8 → A-9。A-1+A-2 约 6–11 天；未获批字段不能靠估算或开工授权自动解锁。

A-1 开工进展：首切片按 R30 接入 Boss 开战停止威胁面，保留身份作击败判定；十二组合逻辑夹具与旧日志兼容测试见 `phase5-a1-boss-combat-threat-phase-2026-10-31.md`。该切片不表示 B-1/B-2 已审核或正式部署已完成。

### B 类：尚未人工审核／确认

| 编号 | 条目                 | 需要审核                                                                              |
| ---- | -------------------- | ------------------------------------------------------------------------------------- |
| B-1  | 四个 Ruins Boss 房间 | Necromancer/Prophet/Collector/Fanatic 区域、容量、高低地、连通边、印刷部署            |
| B-2  | Boss 专属区域绑定    | 先知八组 d10 木长椅区域；收藏家三宝箱与召唤落区；狂信者本体/Pyre 部署                 |
| B-3  | 其余遗迹 Room Tile   | p006–p012 正反面未获批几何；与 B-1 重叠部分不可重复计数                               |
| B-4  | 最暗 Room Tile       | 区域、部署、特殊区域与对应底图映射                                                    |
| B-5  | 走廊实体板块         | 实体板块几何/展示映射；QuestMap 14 页布局已确认，勿重复送审                           |
| B-6  | 补给骰美术           | D6 展开图格到骰面、裁切及桌面显示映射                                                 |
| B-7  | 高等级卡牌未确认字段 | 尚未逐卡获批的怪物 Speed/选招/效果与英雄技能新图标/特殊语义，不笼统判全部 II/III 未审 |
| B-8  | 剩余未确认图标       | needs_review/unsure/unreviewed 的相关词典条目；装饰图标不自动算玩法阻塞               |

### 已完成／不再列作缺口

- Ruins 四 Boss I–III 内容、38 张饰品双面入口、14 张 QuestMap 布局、R30 边缘房布置与四 Boss 专属房间牌绑定均已完成；#399/#400/#401 已合入，main 到 #401 为 03600a0。
- #402 已实现 p019 实际战役等级摘要与回村校验，57 条相关测试通过；本轮按用户指示合入，不能再称尚未实现。
- 最暗 R-121 三格和 Ruins 边缘房是不同规则。专属房间牌已绑定不等于几何已审核，也不等于正式 Boss 战已可玩。
- 是否展出疾病/怪癖/意志卡图、Phase 6 开工排期属于产品/执行决定，不混入 B 类数据审核。旧 Q 条若已 confirmed，按现行 R 条处理，不能据旧清单重复报未审。
- 全库既有 lint、规范化快照、provision-use、长场景与浏览器失败仍有欠账；专项通过不等于全库全绿。

## 2026-10-31 更新（优先于下文历史切片状态）

- #397 已合入 main `2dbc4ee`：核心饰品 38/38 张双面入口已接。下文 C-005 的 24/38 属旧进度。
- 当前 `codex/ruins-boss-higher` 分支按 Kyries“把 Ruins Boss II／III 一起做了”补齐七个身份，连同既有死灵法师 II 共八个等级脚本；独立卡面、威胁、召唤物、同级出征匹配及幕末 offer 见 `phase5-ruins-boss-ii-iii-2026-10-31.md`。未称已合入 main。
- C-023 的 II／III 脚本与内容切片已实现；C-022 的同级强制 offer 已扩展。正式 Boss 房间几何、R-121、边缘房与完整自然升幕／战役验收仍未完成。
- 高等级普通怪物、英雄全技能、最暗线和既有小问题保持原范围；下文历史“其它 II／III 未注册”不再代表当前分支。

## 边界（硬）

| 项                          | 口径                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **核心盒**                  | 遗迹 **Ruins** + **最暗地牢 Darkest Dungeon**（`docs/plan.md` 策略）                                                           |
| **本清单可做**              | 核心非 Boss 缺口 + **Ruins 四 Boss**（Necromancer / Prophet / Collector / Fanatic）I→II/III + 最暗线（须批）                   |
| **扩展·勿抢**               | Weald / Warrens / Cove / Crimson Court / CoM 等；**Hag / Swine Prince / Flesh / Siren** 及扩展 Boss **不列入待办**（见分组 E） |
| **R-001**                   | 只认规则书 + `docs/rulings.md`；不编造规则/数值                                                                                |
| **R-048**                   | 不自发明印刷几何 / 未核实图标；拿不准标「待确认」                                                                              |
| **任务卡 hold**             | R-121、边缘房、Rising Threat SPECIAL、八槽/特殊槽其它裁定等 → **DDBG·任务卡** 或 **须 Kyries 批** 后才动                       |
| **Phase 6**                 | Stygian、英雄 II/III 全战斗等 → **须 Kyries 明示** 才开（可列、标须批准）                                                      |
| **勿开 GitHub PR 入库本文** | Kyries 只要清单；入库另说                                                                                                      |

## 工作方式（每条 PR）

**2026-10-30 Kyries 补充执行优先级**：反复阻塞的地方先保留，优先完成核心包内容，小问题随后逐条补。C-010 的旧回归、种子搜索、既有 lint / 浏览器失败不再作为当前主线；优先推进已有规则与数据依据的核心内容。缺几何或裁定的项目继续 hold，不用猜测解锁。

1. 一任务一 PR；中文 commit
2. 模型：**Composer 2.5** 或等价（勿 fast）；接线/数据刀优先 Composer 2.5
3. 合入后本机：`git pull --ff-only`（vite **8080** 只留本地勿提交）
4. 触及任务卡 hold / Phase 6 / 存档·核心交互：先问 Kyries，勿擅自全面收
5. 对照证据路径写验收；不编造进度（本文 tip 后若有合入，以代码为准重清点）

---

## 已接摘要（便于 Codex 不重复做）

### 非 Boss / 战役基建（相对 2026-10-28 开工交接已前进）

| 项                                  | 现状（证据）                                                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QuestMap 布局读数                   | **14/14** `review: confirmed`（R-065 / R-118 / R-119 / R-123）；八槽 I 级出征在 confirmed 池择图（R-116）。**不是**旧交接「仅 p001/p011/p012」          |
| 任务卡 19 张                        | enabled；I 级战役池 5 张自然路径已有（`full-flow-l1-breakpoints-2026-10-27.md`）；细节 hold 仍归任务卡                                                  |
| 村庄事件                            | 16/16 已接                                                                                                                                              |
| Curio I 级主路径                    | R-064 全池可完成获得选择；§3 三项停点已接（#318）；见 `docs/r048-curio-remaining-2026-10-28.md`                                                         |
| Trinket verification                | **38/38** `unverified=false`（`docs/trinket-verification-2026-10-28.md`）；#390–#394 已接十二张的持有者技能能力，Fortunate Armlet 见 C-005 本刀待合入项 |
| Provision 辅助卡 map                | `player_aid:p001` / `p005` 双面桌面 reference 已接；**D6 dice_net raster 未批**                                                                         |
| Room Tile 遗迹                      | **9** 面 geometryVerified+usable + print map（p001 + p002–p005 正反）；p006–p012 / 最暗无几何批                                                         |
| Disease / Quirk / Virtue·Affliction | 引擎有接线；**桌面卡图刻意未展**                                                                                                                        |

### Phase 5 · Ruins 最近刀（本会话 #352–#364；扩展 Boss 刀勿续）

| 合入             | 内容                                                                                                                        |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------- |
| #352             | `setActiveBossThreat` 沙盒 → 最小可测运行时                                                                                 |
| #353             | Boss/迫近威胁 hold 重清点文档（`phase5-remaining-hold-inventory-2026-10-29.md`，基线 tip 早于本交接）                       |
| #354–#355 / #362 | Prophet I：Wooden Pew / 区域 d10、Rubble、**第 2 行动**、**先攻 3**                                                         |
| #357             | R-122 `summarizeDungeonQuest` Boss 定额摘要（p016–p018 击败判定仍 hold）                                                    |
| #351 / #363      | Collector I：Collect All、**先攻 4**、英雄最近区域挤占                                                                      |
| #347 / #364      | Fanatic I：Pyre、Sentence、**Pit Toss**、**先攻 4 洗入**                                                                    |
| （更早）         | Necromancer I 脚本 + 威胁被动主路径；Face the Threat 出征 / 幕末强制 p019（I 级）；威胁被动 Fanatic Marked / Black Sheep 等 |

**Kyries 纠正**：后续只切 **Ruins 四 Boss** + 核心包非 Boss 缺口；Hag/Swine/Siren/Flesh 为**扩展**，本清单 **E 组勿抢**。

### 仍 hold 的横切（多条共用）

- **R-121**：`bossSlotPlacement` 探针 ok，**RNG 写入 / room token 洗入 dungeon** 未接；Face the Threat **边缘房选图**仍走普通 R-116
- **II/III**：死灵法师 II 已按 R-124 / R-125 接入实际威胁匹配与两项被动；不设置 II 默认 Boss。其它 Ruins II/III 描述卡仍可能抽到 `unregisteredImminentThreatHold`。
- **最暗** p016–p018 / Stygian / 英雄 II·III：Phase 5 尾或 Phase 6，须批

---

## 待办总表

编号从 **C-001** 起。勾选框供 Codex 进度用。

### A · 非 Boss 核心半开 / 内容缺口

#### C-001 · 走廊板块几何接线（Dungeon / Corridor tile）

- [ ]
- **现状**：raw `dungeon_tile.json` **14** 页（`n_pages=14`）；旧总表「Corridor segment tiles not wired」仍成立——探索用的是 QuestMap 图，**走廊实体板块几何未接到桌面/引擎布局**（对照 `HANDOFF-2026-10-28-core-pack.md` 未开项 2；`docs/plan.md` Phase 3）
- **验收**：有印刷/几何批后，走廊段可解析并接到探索 UI 或明确的 pending map；单测不发明未批坐标；R-048
- **依赖/阻塞**：Kyries 几何/印刷批；勿与 QuestMap 布局混淆
- **归口**：核心包
- **建议优先级**：P1

#### C-002 · Room Tile 遗迹 p006–p012 几何 + print map

- [ ]
- **现状**：仅 9 面 usable + map（`docs/phase4-print-room-tile-art-map-2026-10-28.md`）；p006–p012 无获批几何
- **验收**：逐面 Kyries 批几何 → `room_tile_geometry` + `room-tile-print-art-map` + UI 可解析；无批不接
- **依赖/阻塞**：印刷几何批（R-048）
- **归口**：核心包（须 Kyries 批几何）
- **建议优先级**：P2（有批再开）

#### C-003 · Room Tile 战斗面 / 最暗地牢 tile map

- [ ]
- **现状**：战斗 UI 用已 map 遗迹底图；最暗 / 其它地点「核心盒 extract 有 raw、无几何批」不接 map（同上 doc）
- **验收**：最暗等获批后 map + `BattleRoomTileBoard` 可绑；否则保持明确 hold
- **依赖/阻塞**：几何批；与 Phase 5 最暗任务可并行但勿抢扩展地点 tile
- **归口**：核心包（须批）
- **建议优先级**：P3

#### C-004 · Curio R-048 剩余停点（有裁定才接）

- [ ]
- **现状**：`docs/r048-curio-remaining-2026-10-28.md` §4：无 Torch 疾病复合（待确认）、缺怪癖/疾病/美德堆停点、缺抗性/免疫目录、补给池满 16、卡面 icon 语义等
- **验收**：仅接线有 R-069/Q 批或新裁定的行；其余保持 `blockedReason`；不发明图标
- **依赖/阻塞**：Kyries / 规则书裁定
- **归口**：核心包（须确认切片）
- **建议优先级**：P2

#### C-005 · Trinket 主动能力 / 战斗·探索效果运行时

- [ ] C-005 总项未完成；按规则书 R26 及已核实卡面逐张接能力。
  - [x] `trinket:p006`：单 / 多目标技能掷骰后选择使用，正面 Crit+2 / 反面 Acc−2、交替翻面、每角色回合限一次、自身位移续接与网页待选已接；新命令标记兼容旧日志。见 `phase5-c005-critical-stone-2026-10-30.md`；#390 已合入 main `f3efdf7`。
  - [x] Accuracy Stone / Archer’s Ring / Sage’s Book / Warrior’s Cap（`p001/p002/p009/p014`）正反面命中修正与姿态条件；同次技能可逐件选择，每件独立限次，共用原骰；命令记录能力名单以固定旧回放。见 `phase5-c005-accuracy-trinkets-2026-10-30.md`；#391 已合入 main `1803a8b`。
  - [x] Sniper’s Ring / Warrior’s Ring / Defender’s Ring / Scholar’s Ring（`p031–p034`）正面对应姿态 Crit+4、反面非对应姿态 Acc−2；沿已有技能窗口逐件选择、翻面与限次；旧五张能力名单和 `true` 标记不扩充选项。见 `phase5-c005-stance-crit-rings-2026-10-30.md`；#392 已合入 main `b4d7e22`。
  - [x] Dark Bracer / Solar Bracer（`p021/p026`）按光照条件提供正面 Crit+2、反面命中零伤害；保留状态 / 位移，多饰品随已选修正更新适用选项，旧九张名单保持原行为。见 `phase5-c005-light-bracers-2026-10-30.md`；#393 已合入 main `6e62bb5`。
  - [x] Warrior’s Bracer（`p013`）正面进攻姿态 Acc+2、反面 Acc−1；完整卡面与已确认 `fe18ec5b80` 绑定，明确校验 raw 行误归后仍存在的 `front_icons`；旧十一张名单保持原行为。见 `phase5-c005-warriors-bracer-2026-10-30.md`；#394 已合入 main `be80848`。
  - [x] 本刀待合入：Fortunate Armlet（`p025`）正面技能 Acc+1 / Crit+1；反面在角色回合完整效果间隙免费压力+1，复用被动 / 意志 / 死亡收尾及每角色回合限次。旧十二张名单不扩充，网页补给分页提供反面按钮。见 `phase5-c005-fortunate-armlet-2026-10-30.md`。
- **现状**：verification 38/38 已收；#396 合入后为23/38 张能力切片。本刀待合入 Damage Stone 正面伤害+3及战斗技能/反击受伤反面，合入后为 **24/38 张至少接通一个能力切片**。范围见 `phase5-c005-free-trinkets-2026-10-30.md` 和 `phase5-c005-damage-stone-2026-10-30.md`；部分仅正面，不代表完整双面 / 战斗 / 探索验收，C-005 总项继续未完成。
- **验收**：按卡面/词典 confirmed 逐效果接线 + 单测；正反面语义未裁定处标待确认
- **依赖/阻塞**：能力阶段设计与个案裁定
- **归口**：核心包
- **建议优先级**：P2

#### C-006 · Provision D6 dice_net 桌面 raster / 面序 map

- [ ]
- **现状**：引擎面 key 已接；展开图→桌面骰面 **未批**（`phase4-print-provision-player-aid-2026-10-28.md`、`phase4-print-provision-dice-net-2026-10-28.md`）
- **验收**：Kyries 批面序后接 map；不猜 raster
- **依赖/阻塞**：印刷批
- **归口**：核心包（须批）
- **建议优先级**：P3

#### C-007 · Disease / Quirk / Virtue·Affliction 桌面卡图展出（若产品要）

- [ ]
- **现状**：有接线；桌面卡图**刻意未展**（2026-10-28 半开 8）
- **验收**：产品确认要展 → print map + tabletop 组件；否则保持不展并文档标明
- **依赖/阻塞**：产品意向；R-048 map
- **归口**：核心包 / 桌游 UI（须确认）
- **建议优先级**：P4

#### C-008 · Encounter / 怪物池 II·III 边界放宽（非 Boss）

- [ ]
- **现状**：I 级 Common+Ruins 可战；II/III 边界仍受限（旧半开 4）；与升幕/战役池相关
- **验收**：在已核实怪物卡范围内按战役等级开放遭遇；无核实效果不硬开；回归 `dungeon-battle-l1-admission` 类测不回退
- **依赖/阻塞**：数据核实与 Phase 4/5 升幕策略
- **归口**：核心包
- **建议优先级**：P2

#### C-009 · QuestMap 边缘语义 / Q-59·Q-63 等残留裁定落地

- [ ]
- **现状**：14 页布局 confirmed；**Q-59 起点侦察、Q-63 等** rulings 标明不借 VQ-07 扩散；边缘房 / Boss 位数据与引擎写入仍 hold（rulings R-046/R-121 进展）
- **验收**：仅落地已批裁定；与 C-020 R-121 区分——本条偏探索图语义，不擅自洗 Boss token
- **依赖/阻塞**：任务卡 / Kyries
- **归口**：任务卡 hold / 须 Kyries（触及则 FYI）
- **建议优先级**：P3（FYI；勿与八槽 confirmed 重做）

#### C-010 · I 级全流程残留内容缺口（文案 / UX / E2E）

- [ ] C-010 总项未完成；实际地图路线已随 #379 合入 main `6f2163e`；自然村庄场景前置已随 #380 合入 main `e2e804f`。
  - [x] `naturalQuest` 按实际连接探索 / 返回；12 张 confirmed 八槽图路由回归、五张 I 级任务摘要与完整命令回放已接，见 `phase5-c010-natural-map-route-2026-10-29.md`。
  - [x] 修道院 / 墓地独立固定种子、公开姿态恢复与真实怪癖替换前置已接，见 `phase5-c010-natural-hamlet-fixtures-2026-10-30.md`；不代表所有旧村庄场景已恢复。
  - [x] 游商首次来访 / 再次出售独立自然前置、分级升级和正式网页目录回放已随 #381 合入 main `37a632d`，见 `phase5-c010-natural-nomad-fixtures-2026-10-30.md`。
  - [x] Town Fair / Caregivers 独立自然种子、付费升级资金前置与网页目录回放已随 #382 合入 main `b4440c6`，见 `phase5-c010-natural-event-fixtures-2026-10-30.md`。
  - [x] 自然四房间 2XP 公会前置固定 seed11、公开恢复姿态与网页目录访问 / 付款 / 离开回放已随 #383 合入 main `c4734d3`，见 `phase5-c010-natural-guild-fixture-2026-10-30.md`。
  - [x] 村庄三条完整冒烟已随 #384 合入 main `c051ada`，本机 / 远端均通过，见 `phase5-c010-natural-hamlet-smoke-2026-10-30.md`；不代表 C-010 总项或连续战役已完成。
  - [x] II 级双任务抽选测试已随 #385 合入 main `cd8cc29`，独立固定 seed6 并保留完整池与未抽到目标时的拒绝，见 `phase5-c010-ii-offer-fixture-2026-10-30.md`。
  - [x] II 级自然战斗回放已随 #386 合入 main `bb13bfd`，含两任务混合遭遇胜利、Rattler 自身效果撤退与 Ghoul 回村死亡停点，见 `phase5-c010-ii-replay-fixtures-2026-10-30.md`；仍含准备结束夹具及沙盒升幕，不代表正式 II 战役验收。
  - [x] 瘟疫医生自然补员旅程已随 #387 合入 main `9e35a68`，完整池的三个固定种子分别保留清剿腐蚀、捐款腐蚀与治疗、目标未达成提前退出，并验证真实支付后 11 金的捐献待选与正式存档续跑，见 `phase5-c010-replacement-journey-fixtures-2026-10-30.md`；不代表 C-010 总项完成。
  - [x] 旧目录补员存档迁移已随 #388 合入 main `a8a9c86`，按八个自然停点拆分回归，保留严格迁移和伪造拒绝，并逐停点加载后续跑至完整入队，见 `phase5-c010-catalog-migration-checkpoints-2026-10-30.md`；不代表 C-010 总项完成。
  - [x] 首页冒烟已随 #389 合入 main `6e4cfdb`，对齐主动打开英雄详情和任务卡只读名称，双尺寸布局、关闭 / 焦点返回及补给待选均保留，本机完整用例通过，见 `phase5-c010-home-smoke-2026-10-30.md`；其它浏览器失败与 C-010 总项仍保留，按最新指示暂缓零碎修补。
- **现状**：`docs/full-flow-l1-breakpoints-2026-10-27.md` B03/B06–B08/B12 等：回村壳 UX、摘要文案与真实 XP、死亡补位 UI、再出征 E2E
- **验收**：逐断点 PR；不夹带 Boss hold
- **依赖/阻塞**：无硬规则批（纯对齐）
- **归口**：核心包 / 全流程（勿抢前端大改若有专责）
- **建议优先级**：P3

---

### B · Phase 5 · Ruins Boss 剩余（核心）

#### C-011 · Necromancer I：死亡清场 + 完整召唤 / encounter AI

- [x] I 级死亡清场、三招召唤及自动 AI 已接；正式 Boss 房间入场仍待几何 / R-121。
  - [x] R38 死亡清场接入统一死亡收尾，攻击 / Blight 均清除伴战怪物并结束战斗。
  - [x] 前两招通过 `playMonsterSkill` → 自身 Push 续接 → `summon(purpose:skill)`：Target Area、首个空姿态、满轨无效、满区待选挤占、当前堆先攻与当轮行动。
  - [x] C-012 补齐 Speed 3、四姿态 d10 选招与 Six Feet Under；三招均有选招→目标→移动→结算→召唤公开命令回归。见 `phase5-necromancer-i-skill-ai-2026-10-29.md`。
- **现状**：I 级三招战斗逻辑可测；不声明从正式出征走完 Boss，几何 / R-121 保持原 hold。
- **验收**：按卡面/R38 死亡清场写入战斗状态；召唤进生产 encounter 路径；单测覆盖
- **依赖/阻塞**：encounter 主路径钩子
- **归口**：核心包
- **建议优先级**：P0

#### C-012 · Necromancer I：卡面技能 AI / `summon(purpose:skill)` 补全

- [x] I 级三招最小 AI 与技能召唤已接。
- **现状**：印刷 p089 的 Speed 3、四姿态完整 d10 表已接数据生成；Six Feet Under 保留 Acc 10、无 Crit / 无伤害，使用已有自身 Push / 目标压力原语，命中后在目标区域召唤一次。缺字段和未确认效果仍拒绝，II/III 不从 I 推断。见 `phase5-necromancer-i-skill-ai-2026-10-29.md`。
- **验收**：印刷技能表最小可测运行时 + 测试；不发明未核实数值
- **依赖/阻塞**：C-011 或可并行若切口干净
- **归口**：核心包
- **建议优先级**：P1

#### C-013 · Prophet I：Room 卡 → 战斗板几何 / d10 区域表生产绑定

- [ ] Prophet Room 的正式几何绑定仍未获批，本刀不勾总项。
  - [x] 开战与 Calamitous 前校验完整八组印刷标记及已存在的逻辑区域；缺组、重复、未知区域或当前房间身份冲突原子拒绝。
  - [x] 第 1 行动必走 Calamitous，缺表明确拒绝，不退回普通选招；完整夹具绑定可重放 4d10 布置，UI 显示每区木长椅数量。
  - [ ] 获批 Prophet Room 几何 → 生产绑定 `prophetRoomD10AreaTable`，再验收正式入场。抽象测试区不代表几何审批；见 `phase5-prophet-i-room-binding-2026-10-29.md`。
- **现状**：d10 绑定校验与布置最小运行时可测；正式 room→board 几何仍 hold。C-014 进展见下项。
- **验收**：Prophet Room 绑定获批几何后 d10→区域可结算；R-048
- **依赖/阻塞**：Room/几何批（或既有 Prophet Room 数据核实）
- **归口**：核心包
- **建议优先级**：P0

#### C-014 · Prophet I：Rubble 同区多目标 + 多怪伴战先攻

- [x] 显式逻辑区夹具下的 Rubble 同区多目标与普通伴战先攻已接；不代表正式 Boss 房间入场。
- **现状**：每张木长椅独立掷骰，同区存活英雄共骰、逐名闪避；空区仍掷骰，无英雄受击。生命 / 压力 / 死亡逐次收尾；先知三张先攻加普通伴战各一张，抽牌时依当前姿态和剩余行动调度，下一轮重置。见 `phase5-prophet-i-rubble-initiative-2026-10-29.md`。正式几何继续归 C-013。
- **验收**：卡面多目标与伴战先攻规则可测；单测
- **依赖/阻塞**：C-013 几何有助于同区判定
- **归口**：核心包
- **建议优先级**：P1

#### C-015 · Collector I：宝箱房布置

- [ ] Collector Room 的正式几何绑定仍未获批，本刀不勾总项。
  - [x] `startBattle` 按显式区域绑定放置同区三枚有限宝箱；池不足按 R-047 抽空即止，逐枚拾取 / 回池沿用 R-059，UI 显示同区数量。
  - [x] 缺绑定、未知区域、房间 / 标记冲突及重复布置原子拒绝；单测用抽象逻辑区，不代表几何审批。
  - [ ] 获批 Collector Room 几何 → 生产绑定 `collectorRoomLootAreaId`，再验收正式入场。见 `phase5-collector-i-room-loot-2026-10-29.md`。
- **现状**：三箱布置最小运行时已接；正式区域绑定仍 hold。Collect All / 先攻 / C-016 沿用原范围。
- **验收**：按 R-034/卡面布置宝箱房 token/区域；单测
- **依赖/阻塞**：R-048 几何/布置裁定
- **归口**：核心包
- **建议优先级**：P0

#### C-016 · Collector I：怪物挤占时玩家选移

- [x] 显式逻辑区绑定下的挤占选择与公开命令续接已接；正式 Collector Room 几何仍归 C-015。
- **现状**：怪物满区时玩家选移到最近可用区域；英雄有多个合法去处时同样待选。连续选择只暂存计划，完整成功后一次写入位移、三卡召唤和先攻；无去处拒绝，不把召唤物改放到别区。新增固定姿态区域绑定，缺绑定明确拒绝，不从英雄当前位置反推几何。见 `phase5-collector-i-displacement-2026-10-29.md`。
- **验收**：PendingChoice 或等价公开命令完成选移；拒绝路径明确
- **依赖/阻塞**：无
- **归口**：核心包
- **建议优先级**：P1

#### C-017 · Fanatic I：卡面技能 AI / `summon(purpose:skill)`

- [x] Fanatic 本体三招最小 AI 与技能召唤口径已收；不代表整场 Boss 闭环。
- **现状**：p008 已接 Speed 2、四姿态共用 d10（1–2 / 3–6 / 7–10）、三招完整效果；公开命令覆盖选招、目标、移动、攻击和状态。卡面无召唤，`purpose:skill` 明确 `notApplicable`，Pyre 仍只在开战布置。原 Sentence / Pit Toss / 先攻 4 沿用；R39 的 Fanatic 死后移除 Pyre 已接共用死亡收尾，覆盖攻击 / 持续伤害 / 反击并立即结束先攻。Pyre 自身无 Acc 的 99 伤害技能仍 hold。见 `phase5-fanatic-i-skill-ai-2026-10-29.md`、`phase5-fanatic-i-pyre-defeat-2026-10-29.md`。
- **验收**：剩余印刷技能最小 AI + 测试；不重做 Pit Toss/先攻
- **依赖/阻塞**：无
- **归口**：核心包
- **建议优先级**：P0

#### C-018 · Ruins 四 Boss：`encounterRoundRetreatLimit` 生产路径

- [x] 已注册 Ruins I 四 Boss 的两条轮末路径均经公开命令回归；未击败 Boss 时禁止任务撤离。
- **现状**：共用轮末入口原已调用 `encounterForcesRetreatAfterRound`；本刀补四脚本回归并修复普通探索离场入口可绕过 Boss 限制的问题。击败标记后仍允许正常离场；Boss 任务内普通遭遇、未映射 II/III 维持原四轮边界。详见 `phase5-boss-retreat-boundary-2026-10-29.md`，不代表 R-121 / 正式 Boss 房间入场已完成。
- **验收**：Boss 战不计轮数/不可逃按 §14 / R-044 挂 encounter 主路径；四 Boss 回归绿
- **依赖/阻塞**：可与任一 Boss 战斗 PR 合并但建议独立以免夹带
- **归口**：核心包
- **建议优先级**：P1

#### C-019 · Ruins Boss II 首切片（建议 Necromancer II `p002`）

- [x] C-019 已顺序合入 #375 → #376 → #377，main `01e5683`；不代表 R-121 或自然 II 级 Boss 入场闭环。
  - [x] 死灵法师 II 的 p090 数据、三招、Bone Soldier 召唤与死亡清场已接显式战斗场景；I / II 公开命令回归，见 `phase5-c019-necromancer-ii-combat-2026-10-29.md`。
  - [x] Army of the Dead：地牢首场从真实牌池先生成唯一 Bone Captain，再填满四姿态；成功入场才消费标记，新任务重置，见 `phase5-c019-necromancer-ii-army-2026-10-29.md`。
  - [x] R-125 / Q-114 confirmed：首日掷骰、并列最低选一人、守卫行动与合法墓地服务已接；封锁 / 当日已访问仍可只守卫，存档命令支持守卫服务。见 `phase5-c019-necromancer-ii-graveyard-2026-10-29.md`。
  - [x] R-124：II 仅按实际同级迫近威胁匹配；缺威胁 / 描述卡不一致 / 其它未实现 Boss 继续停点。死灵法师 II 已正式注册，公开升幕抽到 p002 可激活脚本。
- **现状**：死灵法师 II 战斗、两项威胁与严格出征映射已接；其它 II/III、正式 Boss 房间 / R-121、II/III 幕末强制 offer 仍分属后续，不声明自然战役闭环。
- **验收**：注册 `boss:ruins:necromancer:2` + R-124 已裁定的 II 实际威胁匹配策略（无缺省替换）+ 两项威胁按独立卡面及 R-125 接线。
- **依赖/阻塞**：R-124 / R-125 已批准并合入，正式房间仍归 R-121。
- **归口**：核心包 / 须 Kyries
- **建议优先级**：P1（批后）

#### C-020 · R-121：`bossSlotPlacement` RNG 写入 + room token 洗入

- [ ]
- **现状**：钩子校验 ok + `wiringHold`；**不**洗「目标 + 2 随机非目标」入 dungeon（`default-boss-hooks.ts` `BOSS_SLOT_WIRING_HOLD`）
- **验收**：选图 p011/p012 + 三格 token 写入可测；对照 R-121 §6 / R-046；文档与任务卡对齐
- **依赖/阻塞**：**任务卡 / 须 Kyries 批切片**（勿擅自全面收）
- **归口**：任务卡 hold / 须 Kyries
- **建议优先级**：P0（批后立刻）

#### C-021 · Face the Threat 边缘房选图（非普通 R-116）

- [ ]
- **现状**：出征写 `faceTheThreatEmbarkPlan`；layout 仍 `FACE_EMBARK_LAYOUT_WIRING_HOLD`（边缘语义未接）
- **验收**：p019 出征走 p011/p012 边缘语义选图；与 C-020 衔接
- **依赖/阻塞**：C-020 / R-121 / 任务卡
- **归口**：任务卡 hold / 须 Kyries
- **建议优先级**：P0（批后）

#### C-022 · II/III 幕末强制 p019 + 升幕抽牌与脚本映射

- [ ] C-022 总项未完成：R-126 的 II 级死灵法师幕末 offer 已随 #378 合入 main `d0f5bbc`。
  - [x] II 级完成两次普通任务后，实际 p002 / 已注册死灵法师 II 匹配则仅提供 p019；不洗牌。缺失 / 错配 / 未实现威胁明确拒绝，不回退普通任务；公开抽威胁与待选 JSON 续接回归已接。
  - [ ] III 级强制 offer、其它 II/III 脚本及正式升幕 / 存档闭环仍未批准或实现，不勾总项。
- **现状**：I 级沿既有入口；II 限定切片见 `phase5-c022-necromancer-ii-act-end-2026-10-29.md`。R-121 / 边缘房仍 hold。
- **验收**：II 映射确认后扩展强制 offer + `drawImminentThreatAfterActAdvance` 与 `advanceCampaignLevel` 策略一致
- **依赖/阻塞**：C-019 已合入，R-126 已批准 II 限定切片；其它部分须另批。
- **归口**：须 Kyries / 任务卡
- **建议优先级**：P2（批后）

#### C-023 · Ruins Prophet/Collector/Fanatic II·III 脚本注册（按身份切片）

- [ ]
- **现状**：描述卡 p008–p009 / p014–p015 / p020–p021 无脚本
- **验收**：一身份一等级一 PR；对齐 I 的注册+威胁被动+最小战斗；不接扩展 Boss
- **依赖/阻塞**：C-019 样板；须批节奏
- **归口**：核心包 / 须 Kyries（节奏）
- **建议优先级**：P2

#### C-024 · R-122 余量：最暗 p016–p018 击败判定

- [ ]
- **现状**：`summarizeDungeonQuest` Boss 定额摘要**已接**（#357）；**p016–p018 击败判定仍 hold**（hold inventory）
- **验收**：最暗三任务胜利摘要/XP 按 R-122；单测
- **依赖/阻塞**：最暗 Boss 运行时或明确数据判定规则；任务卡
- **归口**：核心包 / 任务卡（触及 hold 则批）
- **建议优先级**：P2

#### C-025 · 最暗地牢任务线（16 房 / Excavation / Templars 等）最小框架

- [ ]
- **现状**：plan Phase 5 目标含最暗；引擎侧大量 hold；房间与任务 hold（inventory §3「最暗 / Stygian 线 Boss」）
- **验收**：Kyries 批准的最小切片（数据或单 Boss 骨架）可测；不一次吞完
- **依赖/阻塞**：**须 Kyries 明示切片**
- **归口**：须 Kyries / Phase 5
- **建议优先级**：P3（须批）

#### C-026 · 最终战 4 形态及跳过规则

- [ ]
- **现状**：plan Phase 5 任务；无生产闭环
- **验收**：按规则书形态切换 + 跳过条件；一形态一 PR 或书面批准的打包范围
- **依赖/阻塞**：C-025；**须 Kyries**
- **归口**：须 Kyries / Phase 5
- **建议优先级**：P4（须批）

---

### C · 任务卡 hold（FYI / 须批——默认 Codex 不擅自开）

#### C-027 · Rising Threat SPECIAL 细则

- [ ]
- **现状**：quest:p005 自然路径有；**SPECIAL 未接**（hold inventory）；归任务卡
- **验收**：任务卡 / Kyries 批文案后接线
- **依赖/阻塞**：DDBG·任务卡
- **归口**：任务卡 / 须 Kyries
- **建议优先级**：FYI

#### C-028 · p019 幕触发 / 其它特殊槽 / 八槽「名单」类残留

- [ ]
- **现状**：幕末强制 I 级 p019 已有运行时；其它特殊槽与「完整流程后再全面收 hold」令仍在（`HANDOFF-2026-10-28-core-pack.md`）
- **验收**：仅批过的切片；FYI 任务卡
- **依赖/阻塞**：任务卡
- **归口**：任务卡 / 须 Kyries
- **建议优先级**：FYI

#### C-029 · Boss XP 发放运行时与回村展示对齐（R-122 余）

- [ ]
- **现状**：摘要 schema 部分已接；全面收 hold 与 UI 文案可能仍不一致（对照 full-flow B06）
- **验收**：与任务卡确认后再改发放/文案
- **依赖/阻塞**：任务卡
- **归口**：任务卡 / 须 Kyries
- **建议优先级**：FYI

---

### D · Phase 6（须 Kyries 明示才开）

#### C-030 · Stygian 房间卡（extract 17）接入

- [ ]
- **现状**：未开（旧未开 1）；属 Phase 6
- **验收**：难度模式规则 + 房间卡替换路径可测
- **依赖/阻塞**：**须 Kyries 明示**
- **归口**：Phase 6 / 须 Kyries
- **建议优先级**：须批准

#### C-031 · Radiant / Stygian 难度模式完整规则

- [ ]
- **现状**：plan Phase 6；规则书有开局金/补给/探索骰等差异
- **验收**：两模式可开档并影响补给与 Boss Crit 等已核实条款
- **依赖/阻塞**：C-030；**须明示**
- **归口**：Phase 6 / 须 Kyries
- **建议优先级**：须批准

#### C-032 · 核心英雄 II / III 全战斗技能

- [ ]
- **现状**：STAT+I 已齐；全等级属 Phase 6（旧半开 9）
- **验收**：逐英雄或逐技能批后接线；不发明未核实效果
- **依赖/阻塞**：**须 Kyries 明示**与印刷核实节奏
- **归口**：Phase 6 / 须 Kyries
- **建议优先级**：须批准

#### C-033 · Abomination 形态切换（Phase 6 打磨项）

- [ ]
- **现状**：plan Phase 6 任务列表
- **验收**：形态切换规则可玩可测
- **依赖/阻塞**：须明示
- **归口**：Phase 6 / 须 Kyries
- **建议优先级**：须批准

#### C-034 · Phase 6 UI 打磨 / 性能 / 已知问题清零（核心盒 v1.0）

- [ ]
- **现状**：plan Phase 6 交付「核心盒 v1.0」
- **验收**：按 Kyries 点名的问题列表逐条 PR
- **依赖/阻塞**：须明示范围
- **归口**：Phase 6 / 须 Kyries
- **建议优先级**：须批准

---

### E · 明确不做（扩展·勿抢）

| id        | 项                                                           | 说明                                           |
| --------- | ------------------------------------------------------------ | ---------------------------------------------- |
| **X-001** | Hag I 后续（42418 / 先攻 / 英雄入锅等）                      | Weald **扩展**；#360/#361 已有最小刀也**勿续** |
| **X-002** | Swine Prince I 后续（Wilbur 先攻洗入 / End These Two 等）    | Warrens **扩展**                               |
| **X-003** | Flesh I 中途再召 Large / 完整 AI                             | Warrens **扩展**                               |
| **X-004** | Siren I 召唤完整 AI / 其它 Cove Boss                         | Cove **扩展**                                  |
| **X-005** | Brigand Pounder / Shrieker / Vvulf / Shambler / Drowned Crew | 非 Ruins 核心迫近主路径；inventory §6          |
| **X-006** | Weald/Warrens/Cove 地点混搭牌堆与扩展英雄玩法收口            | plan Phase 7；**不列入**本核心包清单执行       |
| **X-007** | 抢 DDBG·任务卡全面收 hold / 抢全流程前端大收口               | 队友分工见 2026-10-28 交接                     |

---

## 建议开工顺序（给 Codex 默认队列）

在 **未另获 Kyries 批 R-121 / II 映射 / Phase 6** 时，优先做**不踩任务卡 hold** 的 Ruins I 战斗收口与走廊：

|  序 | id        | 标题                                              | 优先级 |
| --: | --------- | ------------------------------------------------- | ------ |
|   1 | **C-011** | Necromancer I：死亡清场 + 完整召唤 / encounter AI | P0     |
|   2 | **C-017** | Fanatic I：卡面技能 AI / `summon(purpose:skill)`  | P0     |
|   3 | **C-015** | Collector I：宝箱房布置                           | P0     |
|   4 | **C-013** | Prophet I：Room→战斗板几何 / d10 绑定             | P0     |
|   5 | **C-001** | 走廊板块几何接线                                  | P1     |

批下 R-121 后插入：**C-020 → C-021**（可压过上表非战斗项）。  
批下 II 映射后插入：**C-019 → C-022 → C-023**。

---

## 证据索引（写 PR 前必读）

| 文档                                                            | 用途                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------ |
| `/workspace/ddbg-handoff/HANDOFF-2026-10-28-core-pack.md`       | 开工边界；半开口径（QuestMap 条已过时，以 R-123 为准） |
| `docs/phase5-remaining-hold-inventory-2026-10-29.md`            | Boss hold 表（tip 可能滞后；以 `4b01696` 代码为准）    |
| `docs/plan.md` Phase 3–6                                        | 核心 vs 扩展；Phase 5/6 目标                           |
| `docs/rulings.md` R-001 / R-048 / R-116 / R-121 / R-122 / R-123 | 硬裁定                                                 |
| `docs/r048-curio-remaining-2026-10-28.md`                       | Curio 停点                                             |
| `docs/trinket-verification-2026-10-28.md`                       | 饰品 verification 已收、能力未接                       |
| `docs/phase4-print-room-tile-art-map-2026-10-28.md`             | Room Tile map 范围                                     |
| `docs/full-flow-l1-breakpoints-2026-10-27.md`                   | I 级流程残留                                           |
| `packages/engine/src/boss/*-i*.ts`                              | Ruins 四 Boss 与 hold 文案                             |

## 同步副本

1. `/workspace/ddbg-handoff/HANDOFF-2026-10-29-codex-core-pack-remaining.md`（本文件）
2. `D:\ddbg-web\docs\HANDOFF-2026-10-29-codex-core-pack-remaining.md`（同步；**勿**借此开 PR，除非 Kyries 另令入库）
