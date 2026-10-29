# Phase 5：Collector / 定威胁 hold 清点（2026-10-29）

> **范围**：Kyries 批准切片——盘点 Boss 脚本 hold + 落地 **Collector I**（`boss:ruins:collector:1`）；**Fanatic I** 见 [phase5-fanatic-i-script-2026-10-28.md](./phase5-fanatic-i-script-2026-10-28.md)。  
> **不做**：R-121/122 全面收、Phase 6、II/III 全量、扩展包 Boss。  
> **规则来源**：R-001；卡面 id 以 `packages/data/extract/corebox/raw/boss_ability.json` / normalized monster 为准（R-048）。

## 1. 本 PR 交付（Collector I）

| 项 | 值 |
| --- | --- |
| 脚本 id | `boss:ruins:collector:1` |
| Description | `boss_ability:p013`（Boss Abilities FRONT p13） |
| 战斗 + 威胁双面 | `boss_ability:p016`（p16） |
| 战斗怪物 | `monster_medium:p092`（The Collector I） |
| 地牢威胁 | **Taken Away I**：Curio 房间不抽 Curio（`skipCurioDrawInCurioRooms`；**curio-room 运行时未接**） |
| 村庄威胁 | **Missing Artefacts I**：`nomadWagon` 封锁（合并进 `bossThreatHamletBlockedBuildings`） |
| 先攻 / 行动 | 先攻 1、`ACTIONS / Round: 1`（spec §2.3 / R38） |
| 仍 stub | `summon`（Collect All 三 Collected + 区域 / 先攻洗入）；出征 applyCommand 仍 hold |

定威胁：`resolveScriptIdForDescriptionCard("boss_ability:p013")` → 挂 `activeBossThreatScriptId`；不再写 `unregisteredImminentThreatHold`。

## 2. 已注册 I 级脚本（`ensureCoreBossScriptsRegistered`）

| 脚本 id | 区域 | 描述卡 → 脚本 |
| --- | --- | --- |
| `boss:ruins:necromancer:1` | Ruins | `boss_ability:p001` |
| `boss:ruins:prophet:1` | Ruins | `boss_ability:p007` |
| `boss:ruins:collector:1` | Ruins | `boss_ability:p013` **（Collector PR）** |
| `boss:ruins:fanatic:1` | Ruins | `boss_ability:p019` **（Fanatic PR）** |
| `boss:weald:hag:1` | Weald | `boss_ability:weald:hag:p001` |
| `boss:warrens:swine_prince:1` | Warrens | `boss_ability:warrens:swine_prince:p001` |
| `boss:warrens:flesh:1` | Warrens | `boss_ability:warrens:flesh:p001` |
| `boss:cove:siren:1` | Cove | `boss_ability:cove:siren:p001` |

## 3. Ruins 迫近威胁池仍 hold（`unregisteredImminentThreatHold`）

| Boss | CL I/II/III 描述卡 id | 状态 |
| --- | --- | --- |
| Necromancer / Prophet / Collector / Fanatic | `p00x` | **I 已注册**；**II/III 无脚本**（升幕抽牌可抽到 `p002`/`p003` 等，仍 hold） |

文案模板：`threat-description-catalog.unregisteredImminentThreatHold`（按 Ruins / Weald / Warrens / Cove 身份分支）。

## 4. 非 Ruins 描述卡目录（`threat-description-catalog`）

### Weald（`WEALD_BOSS_DESCRIPTION_CARD_ID`）

| 身份 | I | II | III |
| --- | --- | --- | --- |
| hag | 已映射 Hag I | `undefined` | `undefined` |
| brigandPounder | 全 `undefined` | | |
| shrieker | 全 `undefined` | | |

### Warrens（`WARRENS_BOSS_DESCRIPTION_CARD_ID`）

| 身份 | I | II | III |
| --- | --- | --- | --- |
| swinePrince | 已映射 | `undefined` | `undefined` |
| flesh | 已映射 Flesh I | `undefined` | `undefined` |
| brigandVvulf | 全 `undefined` | | |

### Cove（`COVE_BOSS_DESCRIPTION_CARD_ID`）

| 身份 | I | II | III |
| --- | --- | --- | --- |
| siren | 已映射 | `undefined` | `undefined` |
| shambler | 全 `undefined` | | |
| drownedCrew | 全 `undefined` | | |

**说明**：Weald/Warrens/Cove 的迫近威胁池与升幕抽牌仍以 **Ruins 四 Boss** 为主路径（`imminentThreatPoolForCampaign`）；上表身份供描述卡反查与扩展 hold 文案，**不等同于**各区域独立迫近池已接线。

## 5. 全 Boss 通用 hold（已注册脚本亦同）

| 钩子 | 现状 | 归口 |
| --- | --- | --- |
| `faceTheThreatEmbark` | 全部 **stub** | quest:p019 / 各幕 Boss 与 `activeBossThreatScriptId` 映射 **待确认** |
| `bossSlotPlacement` | 全部 **stub** | **R-121** / 任务卡 |
| `summon` | Necromancer I 最小 ok；其余 **stub**（含 Collector Collect All） | R38–R39 / encounter |
| `setActiveBossThreat` | 命令 **stub** | 测试/沙盒 |
| Boss XP / flat 摘要 | schema 有；`summarizeDungeonQuest` 仍 refuse | **R-122** hold |
| Rising Threat SPECIAL | 未接 | 任务卡 |
| `encounterRoundRetreatLimit` | helper 有；主 encounter 路径未改 | Phase 5 后续 |

## 6. 村庄威胁被动：脚本有、运行时部分 hold

| 脚本 | 村庄威胁 | 运行时 |
| --- | --- | --- |
| Necromancer I | Graveyard blocked | 封锁已合并 |
| Prophet I | 酒馆减压 −1 | helper 有；hamlet-actions **未合并** |
| Collector I | Nomad Wagon blocked | 封锁已合并 |
| Fanatic I | The Black Sheep（事件前 d10） | **已接**（`drawHamletEvent`） |
| Hag I | 疗养院 Life −3 | helper 有；**未合并** |
| Swine Prince I | Survivalist blocked | 封锁已合并 |
| Siren I | Abbey blocked | 封锁已合并（`KNOWN_BOSS_THREAT` 未含 abbey，换威胁时 strip 行为待任务卡） |
| Flesh I | Creeping Sickness I | **已接**（日末 / 访问 / 阶段结束） |

地牢威胁（进地牢压力、Beast/Eldritch 加伤、药瓶压力、Large Guard、战后移出非 Unholy、Curio 不抽等）均为 **脚本 + helper**；探索 / 战斗 / curio / spawn **主路径多数未接**（见各 `*-i.test.ts` 与 `threat-passive.ts`）。

## 7. 核心盒其它 Boss（无 I 脚本）

| Boss | 区域 | 数据 | 引擎脚本 |
| --- | --- | --- | --- |
| Brigand Pounder | Weald | 描述卡 id 未填 | **无** |
| Shrieker | Weald | 同上 | **无** |
| Vvulf | Warrens | 同上 | **无** |
| Shambler | Cove | 同上 | **无** |
| Drowned Crew | Cove | 同上 | **无** |
| 最暗 / Stygian 线 | — | 房间与任务 hold | **无**（本切片范围外） |

## 8. 建议下一刀（供 Kyries 拍板）

1. **Ruins II**：单 Boss 切片（如 Necromancer II `p002`）或统一「II 描述卡 hold 策略」裁定。
2. **任务卡 · Face the Threat**：`faceTheThreatEmbark` + quest:p016–p019 与 `activeBossThreatScriptId`（不兼收 R-121 布置）。
3. **Fanatic 战斗**：Pyre 远程 + Sentence Rendered 仍 hold。Marked for Death 开战 d10 已接为 Mark 2t（见威胁被动运行时文档）。
4. **Collector 战斗**：Collect All + 宝箱房 + Collected 三卡 summon（R-034 区域语义已有裁定）。
5. **地牢威胁接线**：优先高触达项——Prophet 进地牢压力、Collector Curio 房间、Flesh Creeping Sickness（需新 hamlet 状态机，不单 stub）。

## 9. 测试

- `packages/engine/src/boss/collector-i.test.ts`
- `packages/engine/src/boss/fanatic-i.test.ts`
- `packages/engine/src/boss/threat-establishment.test.ts`（Collector / Fanatic 定威胁）
- `pnpm typecheck` + 上述 vitest
