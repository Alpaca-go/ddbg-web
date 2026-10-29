# Phase 5 第一刀：Boss 通用框架盘点（2026-10-28）

> **2026-10-29**：#331–#352 已合。**最新 hold 总表**见 [phase5-remaining-hold-inventory-2026-10-29.md](./phase5-remaining-hold-inventory-2026-10-29.md)。下文 §2 为 #330 骨架时代描述，勿与 tip `3b50f2e` 代码混读。

> **范围**：仅骨架与盘点；不实现 Necromancer / Prophet / Collector / Fanatic 完整脚本，不碰 Phase 6。  
> **规则来源**：R-001（规则书 + `docs/rulings.md`）；印刷几何/未核实图标仍 R-048。

## 1. 现有代码与数据（已有什么）

| 领域                 | 现状                                                                         | 位置 / 依据                                                                  |
| -------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Boss 任务卡数据      | p016–p019 已入库：`bossQuest`、`xpKind: flat` / `flatXp: 3`、区域与分布 JSON | `packages/data/src/basic-quests.ts`；R-120、R-122                            |
| Face the Threat 分布 | quest:p019 七类房间代币计数已 extract                                        | `face_the_threat_distribution.json`                                          |
| Rising Threat 分布   | quest:p005 等普通 III 级任务用 rising threat 行（**非** Boss 战专用）        | `rising_threat_distribution.json`；与升幕后「迫近威胁」文案相关，运行时未接  |
| QuestMap Boss 位语义 | p011 A/B/G、p012 A/C/D → `slotKind: boss`                                    | `dungeon_layouts.json`；R-121                                                |
| 沙盒可选 Boss 出征   | `sandboxEmbarkQuests()` 含 p016–p019                                         | `basic-quests.ts`；`dungeon-quest-entry.ts`                                  |
| Boss 房间牌          | 8 张 `boss: true` 房间卡（含四遗迹 Boss 房 + 最暗等）                        | `room.json`                                                                  |
| Boss 怪物卡（数据）  | Necromancer / Prophet / Collector / Fanatic 等已在 normalized monster JSON   | `monster_medium.json` / `monster_large.json`；**未**接完整入场与 Boss 技能表 |
| Boss Abilities 卡    | raw extract 37 页                                                            | `boss_ability.json`；**无** normalized 消费与威胁被动运行时                  |
| Boss XP 摘要 schema  | `bossFlatQuestSummarySchema`（固定 3 XP）                                    | `quest-summary.ts`；R-122                                                    |
| 普通遭遇战           | 先攻、4 轮撤退、单行动怪物、`spawnMonsters`                                  | `encounter.ts`、`spawn.ts`；注释写明不含 Boss                                |
| 战役升 II 预览       | `advanceCampaignLevel` 明示跳过 Boss                                         | `hamlet-campaign.ts`；R-035 hold                                             |
| 全灭 / 战役失败      | 单场 halt；Boss 任务特殊失败 **未**区分                                      | `encounter.ts`；R-044 待 Boss 层                                             |
| 任务卡 hold 文档     | Boss 位布置、边缘房、p019 幕、XP 发放等                                      | `docs/full-flow-l1-breakpoints-2026-10-27.md`                                |

## 2. 缺什么（相对 Phase 5 全量）

| 通用流程钩子                   | 规则书 / 裁定要点                                            | 接口状态（本 PR 后）                                                    |
| ------------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| **威胁被动·地牢侧**            | Boss Abilities 威胁面 Dungeon side 持续生效（§2.3 R11、R35） | **stub**：`BossScriptHooks.threatPassiveDungeon`；无能力卡解析          |
| **威胁被动·村庄侧**            | Village side；升幕后抽 Imminent Threat（§2.2）               | **stub**：`threatPassiveHamlet`；**归任务卡 / 升幕 hold**               |
| **Face the Threat 任务入口**   | 每幕 Boss 任务；p019 分布与幕推进                            | **stub**：`faceTheThreatEmbark`；quest→Boss 脚本映射 **待确认**         |
| **边缘房 / Boss 位布置**       | R36：目标房 + 2 随机非目标洗入 3 Boss 格；最暗不用普通边缘房 | **stub**：`bossSlotPlacement`；**R-121 布置接线 hold（归任务卡）**      |
| **Boss 多次行动**              | 例：Shuffling Horror（G-05）；形态切换无休息（R36）          | **stub**：`monsterTurnActionCount`；encounter 仍单行动                  |
| **召唤**                       | R31、R11：姿态轨、先攻洗入当前牌堆等                         | **stub**：`summon`；无 `spawn` 扩展                                     |
| **不计轮数 / 不可逃跑**        | Boss 战无第 4 轮撤退（R-044、§14）                           | **规则 helper**：`encounterRoundRetreatLimit`；**encounter 主路径未改** |
| **Boss 遭遇闭环**              | 专属板、多形态、胜利升幕                                     | **无**；Phase 5 后续 PR                                                 |
| **Boss XP 回村发放**           | R-122 固定 3                                                 | schema 有；`summarizeDungeonQuest` 仍 refuse flat                       |
| **Rising Threat 任务 SPECIAL** | p005 等                                                      | **hold**（任务卡）                                                      |

## 3. 本 PR 交付的骨架

- 目录：`packages/engine/src/boss/`（类型、注册表、规则 helper、hook stub 执行器、测试用 fixture 脚本）。
- 导出：`@ddbg/engine` 的 `boss/*` 类型与 `getBossScript` / `registerBossScript` / `encounterRoundRetreatLimit` 等。
- 测试：`boss-framework.test.ts`（fixture 注册、hook stub、轮数规则；**不**使用印刷 Boss 数值）。

## 4. 待确认清单（Kyries / 任务卡）

| 编号      | 项                                                                             |
| --------- | ------------------------------------------------------------------------------ |
| Q-45 延续 | Boss 位「目标 + 2 随机」运行时与 QuestMap 选图优先级                           |
| —         | quest:p016–p018 与具体最暗 Boss 脚本 id 对应                                   |
| —         | quest:p019 / 各幕 Face the Threat 与 Necrop/Prophet/Collector/Fanatic 等级映射 |
| —         | Boss 能力卡 normalized 字段与威胁被动触发点（探索 / 战斗后 / 村庄日）          |
| R-122     | Boss 胜利后 `summarizeDungeonQuest` / 回村 XP 分支（**归任务卡 hold**）        |
| R-121     | Boss 位布置命令与 `dungeon` 状态字段（**归任务卡 hold**）                      |
| R-044     | Boss 任务全灭 → 战役失败 vs 驿站补人边界接入 `applyCommand`                    |
| G-05      | 多行动与 `prepareMonsterAction` / `finishMonsterTurn` 循环                     |

## 5. 建议下一步

1. **Necromancer I**：第一条真实 Boss 脚本 + 威胁被动一条（Unsettling Silhouettes 或 Graveyard blocked，需能力卡核实）+ 单形态战斗卡入场。
2. 将 `encounterRoundRetreatLimit` 接入 `encounter.ts` 的 round===4 分支（需 `dungeon.questDistribution` 传入 Boss 规则）。
3. Boss 位布置：任务卡/Kyries 批切片后接 `bossSlotPlacement` 与 R-121 数据。
