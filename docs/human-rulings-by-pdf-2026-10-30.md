# 人工裁定清单（按印刷品来源分组）

> **日期**：2026-10-30（UTC）  
> **仓库 tip**：`391c411`（分支自 `main`）  
> **性质**：盘点文档，**不**接线运行时；与 [`HANDOFF-2026-10-29-codex-core-pack-remaining.md`](./HANDOFF-2026-10-29-codex-core-pack-remaining.md)、[`phase5-remaining-hold-inventory-2026-10-29.md`](./phase5-remaining-hold-inventory-2026-10-29.md) 互补。

## 范围

收录当前开发内容里**仍依赖人工裁定、规则冲突说明、待确认或 hold 中的规则性问题**，须有仓库内证据（`docs/rulings.md`、`docs/*hold*`、`docs/HANDOFF*`、`docs/plan.md`、规格书、引擎/数据旁注释、`Q-xx` / `R-xxx` / `C-xxx` 等）。

## 明确排除

- 图标人工审核、卡面图核对、印刷图标未批、桌面 map 缺图、verification 纯资源核对（含 **R-048** 中纯图标/几何未核实类）。
- 纯工程债 / CI / UI 观感（除非直接导致规则执行不明）。

## 扫描依据

- [`docs/rulings.md`](./rulings.md) 全文及「待确认（未裁定）」节  
- [`docs/rulings-notes.md`](./rulings-notes.md)（暂定理由与复核优先级）  
- [`docs/spec/core-rules-spec-v0.2.md`](./spec/core-rules-spec-v0.2.md) §22 与文首状态  
- [`docs/phase5-remaining-hold-inventory-2026-10-29.md`](./phase5-remaining-hold-inventory-2026-10-29.md)  
- [`docs/HANDOFF-2026-10-29-codex-core-pack-remaining.md`](./HANDOFF-2026-10-29-codex-core-pack-remaining.md)  
- [`docs/r048-curio-remaining-2026-10-28.md`](./r048-curio-remaining-2026-10-28.md) §4（规则停点，非图标 map）  
- [`docs/phase3-approved-data-2026-10-13.md`](./phase3-approved-data-2026-10-13.md)（特殊房运行时边界）  
- [`packages/engine/src/dungeon-quest.ts`](../../packages/engine/src/dungeon-quest.ts)、[`dungeon.ts`](../../packages/engine/src/dungeon.ts) 内 hold 注释  

---

## 1. 规则书 / `docs/rulings.md` / 核心规则说明书

### 1.1 说明书检查点 ① 待复核

| 短标题 | 冲突 / 不明点 | 证据 | 状态 | 已采纳摘要（若有） |
| --- | --- | --- | --- | --- |
| 核心规则说明书 v0.2 全局复核 | 全文已按 R-002~R-052 暂定裁定更新，Kyries 尚未完成检查点 ① 逐条签核；推翻前实现仍按暂定执行。 | [`docs/spec/core-rules-spec-v0.2.md`](./spec/core-rules-spec-v0.2.md) 文首；[`docs/spec/README.md`](./spec/README.md) | 待 Kyries 复核 | — |

### 1.2 暂定裁定（规则书未写明）— 仍待 Kyries 推翻或正式签核

依据 [`docs/rulings-notes.md`](./rulings-notes.md) §4，下列 **16** 项阻塞或影响面最大，状态均为 **暂定（规则书未写明）**；完整正文见 `rulings.md` 对应 R 条目。

| # | 短标题 | 冲突 / 不明点（一句） | 证据 | 状态 |
| --- | --- | --- | --- | --- |
| 1 | Riposte 反弹性质 | 辅助卡「When attacked」与规则书冲突已按规则书；反弹是否再触发 Riposte、是否算暴击等待定。 | Q-16 → **R-017** | 暂定 |
| 2 | Push / Pull 路径与同区 | 路径谁选、同区 Push/Pull、截断后棋子与区域脱节。 | Q-19 → **R-020** | 暂定 |
| 3 | 区域几何 schema | 相邻、距离、穿人/穿怪、黑墙；阻塞 Phase 1 板块标注与 Phase 2 移动。 | Q-20 → **R-021** | 暂定 |
| 4 | 高地射程 +1 可选 | 「optional +1 range」是额外一格还是整段 +1。 | Q-21 → **R-022** | 暂定 |
| 5 | 选目标平手与 Guard | Crowded 平手、Guard 够不到是否仍必须选他。 | Q-23 → **R-024** | 暂定 |
| 6 | 技能「成功使用」 | 至少命中一人 vs 全部命中 vs 打空区域。 | Q-24 → **R-025** | 暂定 |
| 7 | Damage vs Wound | 攻击伤害与伤口区分、修正顺序、Protection 是否作用于 DoT。 | Q-25 → **R-026** | 暂定 |
| 8 | 战斗中用补给 | 「any time」与不能插在掷骰后结算前之间的边界。 | Q-26 → **R-027** | 暂定 |
| 9 | 饰品「每回合一次」 | 每个角色回合各一次 vs 仅持有者回合。 | Q-27 → **R-028** | 暂定 |
| 10 | 大型怪生成边界 | 场满时弃小型还是弃大型重抽。 | Q-28 → **R-029** | 暂定 |
| 11 | 暴击压力同区 | 一次技能多目标暴击时同区英雄 +1 次数。 | Q-30 → **R-031** | 暂定 |
| 12 | 最终战禁疗范围 | 形态之间 vs 整场不能恢复 Life/压力。 | Q-34 → **R-035** | 暂定 |
| 13 | 换等级任务卡去向 | 已进行任务卡是否洗回；与 R-037 怪物累加并列。 | Q-36 → **R-037** | 暂定 |
| 14 | 奖励补给骰 | 下一任务开局掷 vs 自选面。 | Q-40 → **R-041** | 暂定 |
| 15 | Zealous Speech / 看守人 | 准备天数 −1 与当天结束；看守人移出持续多久。 | Q-41 → **R-042** | 暂定 |
| 16 | 怪物牌堆抽空 | 洗回本次地牢弃牌 vs 留空（与 R25 每场洗回存在张力，见 rulings-notes）。 | Q-51 → **R-052** | 暂定 |

### 1.3 延后 / 部分 hold（规则数据或引擎未闭环）

| 短标题 | 冲突 / 不明点 | 证据 | 状态 | 已采纳摘要（若有） |
| --- | --- | --- | --- | --- |
| Stygian 房间卡数值 | 危险加强的具体数值以 17 张 Stygian 房间卡转录为准，规则层不另猜。 | Q-10 → **R-011**；ROOMS-S | 延后 | 转录完成前不开放 Stygian 模式 |
| 地牢板块：边缘房与 Boss 位布置 | 灰点/休息/离开等规则层已定；**边缘房选图、Boss 三格 token 洗入 dungeon** 仍 hold。 | Q-45 → **R-046**；**R-121** §6；[`dungeon.ts`](../../packages/engine/src/dungeon.ts) | 延后 + 实现 hold | QuestMap 14 页布局读数已 confirmed（R-065/118/119/123）；Boss 位语义见 R-121 |
| 卷轴槽：Objective vs Boss 位历史冲突 | R-115/R-117 曾批 p011/p012 卷轴槽为 Objective；R-121 推翻并定为 Boss 位，数据已 `slotKind: boss`，布置接线仍 hold。 | **R-121** 修正注；**R-115**/**R-117** | 已裁定；实现 hold | 卷轴槽 = R36 Boss slots；Objective 代币洗入三格之一 |
| 最暗最终战 XP | 规则书未见 Heart of Darkness 单独发 XP 句。 | **R-122** §4 | 待确认（待发印刷反证） | Boss 任务 p016–p019 定额 3 XP 已批 |
| Fundraiser 卡面 vs 规则书 XP | 卡面「any amount」与 R29 封顶表述冲突。 | **R-038** / Q-37；[`rulings-notes.md`](./rulings-notes.md) | 已裁定 | 以规则书为准，任务 XP 封顶 3 |
| Boss 任务失败 vs 说明书旧推荐 | 「Boss 任务中任何战斗全灭」vs 仅 Boss 战全灭。 | **R-044** / Q-43；rulings-notes | 已裁定 | 任何一场战斗全灭即战役失败 |
| 辅助卡 vs 规则书（Debuff / Riposte） | AID-Cond 与 R21 措辞冲突。 | **R-016**、**R-017** | 已裁定 | 以规则书为准 |

---

## 2. 任务卡（`DD_COREBOX_CARDS_*_Quest*.pdf` / QUEST 数据）

| 短标题 | 冲突 / 不明点 | 证据 | 状态 | 已采纳摘要（若有） |
| --- | --- | --- | --- | --- |
| R-121 Boss 位 RNG 写入 | 探针 ok，`bossSlotPlacement` 不洗 room token 入 dungeon；Face the Threat 仍走 R-116 普通选图。 | **R-121** §6；phase5 hold §3；HANDOFF C-020 | 仍 hold | 语义已批，接线待 Kyries 切片 |
| QuestMap 其它页特殊槽 | p011/p012 外特殊图案槽语义仍 pending/hold。 | **R-046** 进展；**R-123** 限定 | 待确认 / hold | 不扩散 R-115/117 以外页面 |
| Rising Threat I SPECIAL | 任务卡 SPECIAL 规则运行时未接。 | quest:p005；phase5 hold；HANDOFF C-027 | 仍 hold | 自然路径有，SPECIAL 无 |
| 最暗 p016–p018 击败判定 | R-122 摘要 schema 已接，**击败 Boss 判定**仍 hold，阻塞定额 XP 摘要生成。 | **R-122** §5；[`dungeon-quest.ts`](../../packages/engine/src/dungeon-quest.ts)；phase5 hold | 仍 hold | flatXp:3 数据已批 |
| Boss 任务卡运行时总线 | p016–p019 enabled；Boss 战/多形态/SPECIAL 仅数据记录。 | **R-120** | 仍 hold | 不做 Ancestor 终局等 |
| II/III 迫近威胁未注册 | 升幕可抽到 II/III 描述卡，无脚本则 `unregisteredImminentThreatHold`。 | phase5 §4；`threat-description-catalog.ts` | 仍 hold | 死灵法师 II 已注册为例外 |
| II/III Face the Threat 匹配 | 除 R-124/R-126 已批切片外，其它 II/III、错配仍拒绝。 | **R-124**、**R-126**；phase5 hold | 部分已裁定；仍 hold | II 两任务后仅 p002 匹配 offer |
| III 幕末强制 p019 | R-126 未扩展 III。 | **R-126** 范围；phase5 hold | 仍 hold | — |
| 升幕与 `drawImminentThreat` 合并策略 | 正式升幕 §2.2 与存档闭环待批。 | phase5 §7.6；HANDOFF | 须 Kyries 批 | — |
| Lost Shipment「Party rolls -2」 | 队伍减 2 颗补给如何分配到英雄/Radiant（**已裁定**，列作任务卡相关索引）。 | Q-88 → **R-087** | 已裁定 | 掷前从常规 8 颗任选 2 颗取消 |

---

## 3. Curio 卡（`DD_COREBOX_CARDS_*_Curio*.pdf`）

| 短标题 | 冲突 / 不明点 | 证据 | 状态 | 已采纳摘要（若有） |
| --- | --- | --- | --- | --- |
| 无 Torch：疾病 + 压力/状态同卡 | R-069 行序已批多种复合；**无 Torch 疾病链**仍标待确认，整卡不结算。 | [`r048-curio-remaining-2026-10-28.md`](./r048-curio-remaining-2026-10-28.md) §4 | 待确认 | 不发明 Torch 前感染顺序 |
| 缺完整怪癖/疾病/美德堆 | 预检停点，非猜测抽牌。 | 同上；R-026、R-048 | 停点（规则执行边界） | — |
| 缺英雄抗性/免疫目录 | Buff/Debuff/Blight 等行依赖 R21 目录。 | 同上 §4 | 停点 | R-033 机制已定，数据未齐 |
| 补给池满 16 与 Curio 奖励 | 与 R-012 上限交互。 | 同上 §4 | 停点 | — |

---

## 4. 补给 / 玩家辅助卡（R12、`AID-Prov` / `AID-Expl`）

| 短标题 | 冲突 / 不明点 | 证据 | 状态 | 已采纳摘要（若有） |
| --- | --- | --- | --- | --- |
| 辅助卡未写规则（Lair、侦察等） | 规则书有、辅助卡无；实现以 R 为准，Lair/侦察/堆叠等仍可能触发待确认停点。 | [`core-rules-spec-v0.2.md`](./spec/core-rules-spec-v0.2.md) §18 对照表 | 依规则书 | R-001 优先级 |

---

## 5. 房间卡 / Room Tile / 走廊板块（`DD_COREBOX_TILES_*`、`ROOMS_*`）

| 短标题 | 冲突 / 不明点 | 证据 | 状态 | 已采纳摘要（若有） |
| --- | --- | --- | --- | --- |
| Torture Unholy Aura 语义 | H 区星形与卡文对照通过，**不**全局继承 Ritual Cornered；禁疗路径未齐则整面不可用。 | VQ-05；[`phase3-approved-data-2026-10-13.md`](./phase3-approved-data-2026-10-13.md) | 候选 / hold | usable=false |
| Old Abbey 复合压力/治疗 | 全 O8 英雄压力+治疗；**压力到 10 等顺序**未明时保留停点。 | VQ-18；approved-data 表 | 待确认 / hold | 几何已批，运行时未齐 |
| Invocation Chamber 行动替换与轮末 | 怪物行动替换 + 轮末压力触发顺序未完整实现前不可用。 | VQ-17；approved-data 表 | hold | — |
| Treasure Chamber 特殊动作 | Hide and Heal 等：**Q-73 已裁定 A**，完整交互与禁疗边界仍 hold。 | Q-73 → **R-073**；VQ-15 | 部分已裁定 | 存活后移除全部 Wounds |
| 走廊板块与探索实体 | 走廊段几何未接到探索布局（与 QuestMap 图分离）。 | HANDOFF C-001；`plan.md` Phase 3 | 须 Kyries 批几何 | 非 Q-45 规则猜测 |

---

## 6. 遭遇 / 怪物 / Boss 卡

### 6.1 横切（Ruins / 最暗）

| 短标题 | 冲突 / 不明点 | 证据 | 状态 |
| --- | --- | --- | --- |
| `encounterRoundRetreatLimit` 正式 Boss 房 | C-018 已回归 Ruins I 四 Boss 轮末路径；**正式 Boss 房间入场**仍 hold。 | phase5 hold；`phase5-boss-retreat-boundary-2026-10-29.md` | 仍 hold |
| p016–p018 区域 Boss 脚本 | 数据有，引擎无对应 I 脚本。 | **R-120**；phase5 hold | 仍 hold |
| 最暗 / Stygian Boss 线 | Phase 6 范围外，房间与任务 hold。 | phase5 §3；HANDOFF Phase 6 | 须 Kyries 明示 |

### 6.2 Necromancer

| 短标题 | 冲突 / 不明点 | 证据 | 状态 |
| --- | --- | --- | --- |
| III 级 / 正式 Boss 房间入场 | II 已 C-019；III、R-121 生产入场未开。 | phase5 hold；`phase5-c019-necromancer-ii-graveyard-2026-10-29.md` | 仍 hold |

### 6.3 Prophet

| 短标题 | 冲突 / 不明点 | 证据 | 状态 |
| --- | --- | --- | --- |
| Prophet Room 生产几何 | d10 逻辑区与 C-014 已接；**room→board 生产绑定**仍 hold。 | phase5 hold；`phase5-prophet-i-rubble-initiative-2026-10-29.md` | 仍 hold |
| `summon(purpose:skill)` | 木长椅/Rubble 已接；技能召唤 stub。 | phase5 hold | 仍 hold |

### 6.4 Collector

| 短标题 | 冲突 / 不明点 | 证据 | 状态 |
| --- | --- | --- | --- |
| Collector Room 生产几何 / 落区 | C-016 挤占已接；**生产几何与落区绑定**仍 hold。 | phase5 hold；`phase5-collector-i-displacement-2026-10-29.md` | 仍 hold |

### 6.5 Fanatic

| 短标题 | 冲突 / 不明点 | 证据 | 状态 |
| --- | --- | --- | --- |
| Pyre「Burn the Heretic」 | 无 Acc、99 伤害技能未接；不宣称 Pyre 整场闭环。 | phase5 hold；G-05 索引 | 仍 hold |

### 6.6 Hag / Swine Prince / Siren / Flesh（扩展包 Boss · 文档 hold 备注）

> **扩展勿抢**：HANDOFF 明确 Hag/Swine/Siren/Flesh 等为扩展 Boss；下列仅记录文档仍记的 hold，**非**核心包待办。

| 短标题 | 冲突 / 不明点 | 证据 | 状态 |
| --- | --- | --- | --- |
| Hag 42418 / 锅完整生命周期 | Cauldron 最小已接；先攻洗入/魅惑等 hold。 | phase5 hold §3 | 扩展 hold |
| Swine Wilbur 非 Mark 召唤等 | Wilbur 最小 AI 已接；Enraged slot 等 hold。 | phase5 §7.4 | 扩展 hold |
| Siren 魅惑 / 先攻洗入 | High Tide 最小已接；完整 AI hold。 | phase5 hold | 扩展 hold |
| Flesh 战中再召 Large | 仅遭遇 Guard；无 mid-battle spawn。 | phase5 hold | 仍 hold（机制） |

### 6.7 其它核心盒 Boss（无 I 脚本）

| 短标题 | 冲突 / 不明点 | 证据 | 状态 |
| --- | --- | --- | --- |
| Weald/Warrens/Cove 非 I 迫近池 | 主路径仍 Ruins 四 Boss 池；Brigand Pounder、Shrieker、Vvulf、Shambler、Drowned Crew 无 I 脚本。 | phase5 §6 | 扩展 / 任务卡 hold |

---

## 7. 村庄 / Disease / Quirk / Virtue·Affliction / 英雄技能（仅规则不明）

| 短标题 | 冲突 / 不明点 | 证据 | 状态 | 备注 |
| --- | --- | --- | --- | --- |
| Warrens 英雄 STAT+技能核实 | Antiquarian/Leper 与 Q-103/Q-104 待 Kyries 确认接线范围。 | **R-104**；Q-103、Q-104 | 待 Kyries 确认 | **扩展勿抢** |
| Cove 英雄 STAT+技能核实 | Man-at-Arms/Flagellant；Q-105。 | **R-105**；Q-105 | 待 Kyries 确认 | **扩展勿抢** |
| Weald 英雄 STAT+技能核实 | Houndmaster/Shieldbreaker；Shieldbreaker Speed 印刷与 CE 不一致见 Q-106。 | **R-106**；Q-106 | 待 Kyries 确认 | **扩展勿抢** |
| Musketeer 包核实 | R-008 首版不纳入；Q-107 仍待确认数据范围。 | **R-107**；Q-107；**R-008** | 待 Kyries 确认 | 扩展/后续 |
| 其余 II 级怪物 Speed/选招 | Q-85 仅批 Bone Spearman II；其它 II 级「继续待核对」。 | Q-85 → **R-082**；rulings 待确认节 | 待核对 | 核心盒 Phase 4 边界 |

---

## 8. 其它 PDF 或无法归类

| 短标题 | 冲突 / 不明点 | 证据 | 状态 |
| --- | --- | --- | --- |
| Phase 6：Stygian 模式与英雄 II/III 全战斗 | 须 Kyries 明示才开；与 Q-10/R-011 叠加。 | HANDOFF；**R-011** | 须 Kyries 明示 |
| Phase 3 三任务人工试玩签收 | 自然路径有回放；Kyries 人工试玩仍待确认（非规则条文本身）。 | [`phase3-acceptance-gap-2026-10-13.md`](./phase3-acceptance-gap-2026-10-13.md) | 待确认（验收） |

---

## 条目统计

| 分组 | 条目数 | 说明 |
| --- | ---: | --- |
| 1. 规则书 / rulings | **23** | 含 16 条暂定裁定子项 + 7 条延后/冲突说明 |
| 2. 任务卡 | **10** | 含 1 条已裁定索引 |
| 3. Curio | **4** | 规则停点，不含 R-048 图标批 |
| 4. 补给 / 辅助卡 | **1** | |
| 5. 房间 / Room / 走廊 | **5** | 不含纯图标未命名 |
| 6. 遭遇 / Boss | **16** | 含 4 条扩展勿抢 + 2 条其它 Boss |
| 7. 村庄 / 英雄 / 怪物 | **5** | 4 条扩展相关 |
| 8. 其它 | **2** | |
| **合计** | **66** | 同一主题在多处出现时按「需人工动作」去重计数 |

---

## 维护说明

- 新增 hold 或 `Q-xx` 时同步更新本表与 [`docs/rulings.md`](./rulings.md)；**不要**在本文件发明规则书数值或原文。  
- 图标/几何 verification 进展见 [`docs/kyries-verify-queue-2026-10-12.md`](./kyries-verify-queue-2026-10-12.md) 与词典 CHANGELOG，**不**重复收录于本清单。
