# A-5：核心包（Ruins + Darkest）剩余可接 A 盘点

**日期**：2026-11-01  
**代码基线**：`93119fd6`（#459 HoD Impending Doom d10→技能 · **R-139** 已合）  
**范围**：只盘点、不开接线 PR。对照 [Grok 交接](HANDOFF-TO-GROK-2026-10-31.md)、[核心包余下总表](HANDOFF-2026-10-29-codex-core-pack-remaining.md) 与半开项；**不含**扩展地点 Boss、**不**把任务卡 hold 当可接 A。  
**规则**：R-001 / R-048；不发明数值；Phase 6 / Stygian 全模式须 Kyries 明示；Boss 战**生产几何**归 B，不当「立刻可开 A」。

**交叉引用（hold 主表，本文只补增量）**

| 文档                                                                                               | 用途                                                          |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [phase5-remaining-hold-inventory-2026-10-29.md](phase5-remaining-hold-inventory-2026-10-29.md)     | Boss / 迫近威胁 hold（基线 `3b50f2e`，下文 §0 列 tip 后变化） |
| [phase5-collector-hold-inventory-2026-10-29.md](phase5-collector-hold-inventory-2026-10-29.md)     | 已过时，以 remaining-hold 为准                                |
| [HANDOFF-2026-10-29-codex-core-pack-remaining.md](HANDOFF-2026-10-29-codex-core-pack-remaining.md) | C-001–C-023 编号总表（历史 tip `4b01696` 下部勿照抄）         |

---

## 0. 相对 hold inventory 的增量（tip `93119fd6`）

下列在 #451–#459 或同期已合，**不再**列入「可立刻开 A」，但 hold 主表 §2–§3 仍可能写旧状态，审阅时以代码与下列切片为准。

| 合入      | 摘要                                                                                       | 证据                                                                                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #428      | Warm Up p011 开局补给逐英雄可选改 Torch                                                    | [phase5-warm-up-provision-torch-2026-10-31.md](phase5-warm-up-provision-torch-2026-10-31.md)                                                                         |
| #430–#431 | 最终战 `deployFinalBattleForm` + `startBattle`/先攻；Break Them / They Are Back 生成执行器 | [final-battle-deploy](phase5-final-battle-deploy-2026-10-31.md)、[final-battle-initiative](phase5-final-battle-initiative-2026-10-31.md)                             |
| #432–#437 | 最暗普通房 / 中途 Boss 部署、`startBattle`、牌堆回传                                       | `phase5-darkest-*-2026-10-31.md` 系列                                                                                                                                |
| #438–#440 | C-005 重选续接、Fortunate Armlet、Damage Stone 等                                          | `phase5-c005-*-2026-10-30/31.md`                                                                                                                                     |
| #439      | A-8 Standard/Radiant 开局金                                                                | [phase5-a8-starting-gold-2026-10-31.md](phase5-a8-starting-gold-2026-10-31.md)                                                                                       |
| #441–#442 | Shuffling Horror Undulations / Echoing Disassembly                                         | [undulations](phase5-darkest-shuffling-horror-undulations-2026-10-31.md)、[echoing](phase5-darkest-shuffling-horror-echoing-2026-10-31.md)                           |
| #443–#451 | 最暗中途召唤、Ancestor1 能力、Ancestor2 Swift Teleportation、HoD 落骰                      | `phase5-final-*-2026-10-31.md`、`phase5-final-heart-impending-doom-die-2026-11-01.md`                                                                                |
| #452–#456 | Ancestor2 三招 Acc；HoD 三招 Acc                                                           | [ancestor2-skills-acc](phase5-final-ancestor2-skills-acc-2026-11-01.md)、[heart-skills-acc](phase5-final-heart-skills-acc-2026-11-01.md)                             |
| #453–#454 | Absolute Nothingness 数据 + 占位运行时                                                     | [absolute-nothingness-data/runtime](phase5-final-absolute-nothingness-data-2026-11-01.md)                                                                            |
| #455–#458 | 最暗 Templars / Mammoth Acc；Gestating Heart 无 Acc 结论；Ancestor2 Acc                    | [darkest-mid-boss-skills-acc](phase5-darkest-mid-boss-skills-acc-2026-11-01.md)、[gestating-heart-skills-acc](phase5-final-gestating-heart-skills-acc-2026-11-01.md) |
| #459      | HoD Impending Doom d10→Know This / Puncture / Dissolution（**R-139**）                     | [skill-map](phase5-final-heart-impending-doom-skill-map-2026-11-01.md)、`docs/rulings.md` R-139                                                                      |
| `6af6d57` | Ruins 四 Boss **II/III** 八身份脚本 + 威胁/战斗（机制夹具几何）                            | [ruins-boss-ii-iii](phase5-ruins-boss-ii-iii-2026-10-31.md)                                                                                                          |

**仍全局有效**：`darkest_boss_content.json` / 能力目录 **`combatReady: false`**；Ancestor Room **无**获批 `room_tile_geometry`（#430 占位 stance 区）。

---

## 1. 可立刻开 A（建议优先级）

每条均：**核心盒**、有印刷或已入库卡 id / 规则页 / 既有 phase5 文档，且**不依赖** B-1–B-4 生产几何、R-121 洗牌、Rising Threat 或 Phase 6 开工。

### P0 · 同一模式、收益高（最暗 / 最终战 Acc 壳已存在）

| #    | 切片                                                                                                                 | 证据出处                                                                                           | 建议 PR 切片                                                                           | 依赖                                                      |
| ---- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| A-01 | **最暗 / 最终战 · 怪物攻击「效果线」**（Acc 壳 #455–#456、#458 已接；`monster-skill.ts` 剥离 `effect_lines`）        | 各 `monster_large:p014`–`p020` 卡面 `effect_lines`；规格书 §11 怪物效果                            | 按 **单卡单招** 增 `verified_monster_effects` + 最小结算（压力/流血/位移等已命名图标） | 逐 effect 图标 **confirmed**（R-048）；不改 `combatReady` |
| A-02 | **最终战 Heart 怪物回合 · Impending Doom 自动选招**（映射 #459 已有；显式 `applyHeartOfDarknessImpendingDoomSkill`） | R-139；[heart-impending-doom-skill-map](phase5-final-heart-impending-doom-skill-map-2026-11-01.md) | `encounter` / 怪物 AI 在 Heart 回合调用映射 + #456 Acc（仍 Acc-only 直至 A-01）        | #430 `fighting` + `startBattle` 夹具                      |
| A-03 | **最终战 Ancestor2 · Swift Teleportation 与三招 Acc 的回合 AI**（#452 落骰 + #455 显式命令）                         | `boss_ability:p035`；[ancestor2-skills-acc](phase5-final-ancestor2-skills-acc-2026-11-01.md)       | 单形态：行动开始/结束落骰 + 选 slot 1–3（非 Pit Toss）                                 | 占位几何；Absolute Nothingness #454 已占区                |

### P1 · 非 Boss 核心 / 饰品（数据已 verified）

| #    | 切片                                                                                                                | 证据出处                                                                                                                                                                                                   | 建议 PR 切片                                                                                                 | 依赖                                                              |
| ---- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| A-04 | **C-005 · 剩余 12 张饰品至少一项能力**                                                                              | 38/38 verification（[trinket-verification-2026-10-28.md](trinket-verification-2026-10-28.md)）；缺口 id：`p003,p004,p008,p010–p012,p016,p019–p024`（相对 `HERO_SKILL_TRINKET_IDS` + battle-free 已接集合） | 逐卡 1 PR：R26 / §11.2 + 卡面 confirmed 图标                                                                 | 不扩 `trinketWindow` 名单除非该卡切片需要；Dark Crown 意志窗见 §2 |
| A-05 | **Fanatic · Pyre `Burn the Heretic` 怪物回合**（`playPyreSkill` 已在 `battle-monster.ts`；**R-136** II/III 已裁定） | `monster_large:p011–p013`；[ruins-boss-ii-iii](phase5-ruins-boss-ii-iii-2026-10-31.md) Pyre 99 伤害；`pyre-skill.ts`                                                                                       | Pyre 先攻轮到时的 Closest 同区目标 + `playMonsterSkill`/`playPyreSkill`；更新 `fanatic-i.ts` wiringHold 文案 | 非生产 Fanatic Room 几何；I–III 共用卡面                          |
| A-06 | **最暗 Mammoth · Revivify（Self，非 Acc）**                                                                         | `monster_large:p016` slot 3；[mid-boss-skills-acc](phase5-darkest-mid-boss-skills-acc-2026-10-31.md) 明示未接                                                                                              | 单命令 + 卡面 effect（治疗/召唤等以 verified 行为准）                                                        | 卡级 verified；White Cell 线 Teleport 仍 §3                       |

### P2 · 任务 / 战役（无 hold 语义）

| #    | 切片                                                        | 证据出处                                                                                                            | 建议 PR 切片                                                                 | 依赖                                                 |
| ---- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------- |
| A-07 | **A-7 · 已入库 SPECIAL 的下一项**（Rising Threat **除外**） | [quest-card-catalog](phase5-quest-card-catalog-2026-10-31.md) 各 `quest:p*` SPECIAL 原文；Disruption / Warm Up 已接 | 单任务 1 PR + 单测；无裁定则 PR 内 `Q-xx`                                    | 不扩大 `createCoreDungeonQuest` 白名单除非 Kyries 批 |
| A-08 | **Warm Up / 其它 A-7 自然 III 回放**（机制 #427–#428 已接） | [warm-up-provision-torch](phase5-warm-up-provision-torch-2026-10-31.md) §未接                                       | 固定种子命令日志 + 可选 1 条 Playwright                                      | Q-WARM-01–05 表内默认实现，变更须 Kyries             |
| A-09 | **C-008 · II/III 普通遭遇在已核实怪物子集内放宽**           | 升幕池 #412；`HANDOFF` C-008                                                                                        | 按战役等级开放 encounter admission + 回归 `dungeon-battle-l1-admission` 类测 | **不**硬开 B-7 未审 Speed/选招                       |

### P3 · 数据刀解锁后续（仍属 A，但宜在 P0 前或并行小 PR）

| #    | 切片                                                     | 证据出处                                                                                                                        | 建议 PR 切片                                        | 依赖                                                          |
| ---- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------- |
| A-10 | **规范化 batch：清除 `icon:8707d5d8cf` 卡级 unverified** | [gestating-heart-skills-acc](phase5-final-gestating-heart-skills-acc-2026-11-01.md) §3；影响 `monster_large:p017`（Lacerate）等 | 仅 data normalize + 快照测试；**不**顺手开 Acc      | 词典 v1.8 `summon` confirmed；Gestating Heart 仍无 Acc 攻击线 |
| A-11 | **Shuffling Horror · Lacerate Acc 最小命令**             | 同上 + [mid-boss-skills-acc](phase5-darkest-mid-boss-skills-acc-2026-11-01.md)                                                  | A-10 合入后再开 `darkest-shuffling-horror-*-acc.ts` | Undulations/Echoing 仍专用命令                                |

---

## 2. 半开 / 需拍板（不可默认当 P0）

| 项                                             | 现状                                                                            | 缺口 / 待确认                                           | 归口                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Ruins II/III 脚本**                          | `ruins-higher.ts` 已合（`6af6d57`）；hold 主表 §3「其它 II/III 未注册」**过时** | **生产** Boss 房入场、R-121、自然 II/III 战役验收仍半开 | A-1 + 任务卡                                                                      |
| **summarizeDungeonQuest · p016–p018 击败判定** | R-122 摘要部分已接                                                              | 最暗区域 Boss 胜利谓词 vs 任务 SPECIAL 对齐             | 任务卡 / Kyries                                                                   |
| **Warm Up Q-WARM-01–05**                       | #428 有默认实现                                                                 | 变更顺序/范围须 Kyries 书面批                           | A-7                                                                               |
| **C-005 · Dark Crown / Solar Crown p028/p035** | 意志结果窗有底层钩子                                                            | battle-free 与 `useCoreTrinket` UI 边界未统一验收       | [free-trinket-reverses](phase5-c005-free-trinket-reverses-2026-10-31.md) §仍 hold |
| **C-005 · monsterRetarget 多目标几何**         | #438 已接                                                                       | Q：合法目标枚举是否与 AI 选区完全一致                   | [trinket-retarget](phase5-c005-trinket-retarget-2026-10-31.md)                    |
| **A-6 · p044 / p048 / p063**                   | 151/154 技能已接                                                                | Q-126 / Q-127 图标与 Acc 1O                             | Kyries 核对队列                                                                   |
| **最终战 · 形态间流程**                        | deploy + 显式 startBattle 已接                                                  | 是否自动 startBattle、形态间 RNG/先攻重洗策略           | [final-battle-initiative](phase5-final-battle-initiative-2026-10-31.md) Q         |
| **Reflections / 召唤先攻洗入**                 | Ancestor1 各能力文档写「先攻洗入 hold」                                         | 需对照 R38/R41 与最终战 encounter 规则，非 Room 几何    | Kyries / 规则条目                                                                 |
| **Shuffling Lacerate**                         | 卡级 unverified 阻断 Acc                                                        | 先 A-10 或 Kyries 批「仅 verification 清除」            | R-048                                                                             |

---

## 3. 明确 hold / B 几何（勿标为可接 A）

与 [phase5-remaining-hold-inventory-2026-10-29.md](phase5-remaining-hold-inventory-2026-10-29.md) §3 一致；此处只列**核心盒审阅易混淆**项。

| 类别                     | 项                                                                                                       | 原因 / 归口                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **任务卡 hold**          | R-121 `bossSlotPlacement` RNG 洗 token；Face the Threat **边缘房**选图；Rising Threat SPECIAL            | DDBG·任务卡 / R-046 / R-121                                        |
| **B-1/B-2 几何**         | Ruins 四 Boss Room 生产绑定；Prophet 八组 d10→**印刷**区域；Collector 三宝箱落区；Fanatic 本体/Pyre 部署 | [HANDOFF](HANDOFF-2026-10-29-codex-core-pack-remaining.md) B-1/B-2 |
| **B-3/B-4**              | 遗迹 p006–p012 Room Tile；最暗 Room Tile / Ancestor Room **`room:p025`** 正式 map                        | R-048；#430 占位≠批准                                              |
| **Boss 能力 · 几何依赖** | Templar **Pit Toss**（`boss_ability:p028` d10→Pit Area）；White Cell **Teleport** d10 落点               | 缺 Pit/区域几何不接线                                              |
| **扩展 / Phase 6**       | Stygian 困难模式运行时；Weald/Warrens/Cove 迫近池；英雄 II/III **全战役**战斗验收                        | Phase 6 须 Kyries；`HANDOFF` E 组勿抢                              |
| **产品 / UX**            | C-006 补给 D6 raster；C-007 疾病/怪癖桌面展图；C-010 全流程 UX 大收口                                    | 须产品或专责；非本盘点 A                                           |
| **数据 hold**            | B-7 未逐卡批 Speed/选招/效果；`combatReady: true` 解锁                                                   | 不能因 Acc 壳存在而改 true                                         |

---

## 4. 建议下一刀（给排期，非开工授权）

1. **P0 A-02**（Heart Impending Doom 接 encounter AI）— 依赖最少、R-139 已批、与 #459 直接闭环。
2. **P1 A-04**（C-005 单卡）— 与 Boss 线并行、不碰几何。
3. **P3 A-10 → A-11** — 数据 PR 与 Lacerate Acc 分两刀，避免混算 B-7。

**刻意不做**：R-121 最小写入、Prophet/Collector **生产** room 绑定、Stygian、Rising Threat — 见 §3。

---

## 5. 验证（本文档）

- 无引擎行为改动；审阅时可用：`git rev-parse HEAD` → `93119fd6`；hold 回归测试集见 [remaining-hold-inventory §8](phase5-remaining-hold-inventory-2026-10-29.md#8-测试清点用)。
