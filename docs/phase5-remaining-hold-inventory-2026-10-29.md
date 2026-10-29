# Phase 5：Boss / 迫近威胁剩余 hold 清点（2026-10-29 · tip `3b50f2e`）

> **基线**：`main` @ `d74a46c`（#359 Wilbur Mark）。  
> **范围**：对照引擎与单测**重新清点**已接 vs 仍 hold；**不**接线新运行时。  
> **规则**：R-001；卡面 id R-048；R-121 / R-122 / Rising Threat 等只标归口。  
> **旧文**：[`phase5-collector-hold-inventory-2026-10-29.md`](./phase5-collector-hold-inventory-2026-10-29.md)（#341）已过时，以本文为准。

## 1. 已注册 I 级脚本（`ensureCoreBossScriptsRegistered`）

| 脚本 id | 区域 | 描述卡（I） | 脚本模块 |
| --- | --- | --- | --- |
| `boss:ruins:necromancer:1` | Ruins | `boss_ability:p001` | `packages/engine/src/boss/necromancer-i.ts` |
| `boss:ruins:prophet:1` | Ruins | `boss_ability:p007` | `prophet-i.ts` |
| `boss:ruins:collector:1` | Ruins | `boss_ability:p013` | `collector-i.ts` |
| `boss:ruins:fanatic:1` | Ruins | `boss_ability:p019` | `fanatic-i.ts` |
| `boss:weald:hag:1` | Weald | `boss_ability:weald:hag:p001` | `hag-i.ts` |
| `boss:warrens:swine_prince:1` | Warrens | `boss_ability:warrens:swine_prince:p001` | `swine-prince-i.ts` |
| `boss:warrens:flesh:1` | Warrens | `boss_ability:warrens:flesh:p001` | `flesh-i.ts` |
| `boss:cove:siren:1` | Cove | `boss_ability:cove:siren:p001` | `siren-i.ts` |

定威胁：`resolveScriptIdForDescriptionCard` → `activeBossThreatScriptId`（`establish-imminent-threat.ts`）；未注册描述卡仍写 `unregisteredImminentThreatHold`（`threat-description-catalog.ts`）。

---

## 2. 已接清单（证据：路径 / 测试）

### 2.1 战役命令与状态

| 项 | 入口 | 证据 |
| --- | --- | --- |
| 开局定威胁 | `{ type: "establishImminentThreat" }` | `establish-imminent-threat.ts`；`threat-establishment.test.ts` |
| 升幕抽下一张 | `{ type: "drawImminentThreatAfterActAdvance" }` | 同上 |
| 沙盒写威胁 | `{ type: "setActiveBossThreat", scriptId \| null }` | `set-active-boss-threat.ts`（挂接同 `applyActiveBossThreatToDungeon`；事件文案仍含「stub」以区别于正式定威胁）；`set-active-boss-threat.test.ts`、`threat-establishment.test.ts` |
| 字段 | `activeBossThreatScriptId`、`imminentThreatDescriptionCardId`、`faceTheThreatEmbarkPlan`、`defeatedRuinsBossIdentities`、`monsterPool.permanentlyRemovedCombatCardIds` | `dungeon.ts` |

### 2.2 Face the Threat（#343 钩子 + #349 / #350 运行时）

| 项 | 入口 | 证据 |
| --- | --- | --- |
| 钩子解析 | `defaultFaceTheThreatEmbarkHook` / `runFaceTheThreatEmbarkForQuest` | `default-boss-hooks.ts`、`face-the-threat-hooks.ts`；`face-the-threat-hooks.test.ts`、各 `*-i.test.ts`「Face the Threat 通用钩子 ok」 |
| 出征 applyCommand | `chooseNextQuest` · quest:p019 → `faceTheThreatEmbarkPlan` | `face-the-threat-embark-runtime.ts`、`hamlet-embark.ts`；`face-the-threat-embark-runtime.test.ts` |
| 幕末强制 offer | I 级 + 本幕 2 普通任务完成 + 有激活威胁 → `offerNextQuest` 仅 `quest:p019` | `shouldForceFaceTheThreatOfferAtNextQuest`；`face-the-threat-embark-runtime.test.ts` |
| 沙盒 p019 | `createCoreDungeonQuest` 写入 plan | `dungeon-quest-entry.ts`；`face-the-threat-embark-runtime.test.ts` |

详见 [`phase5-face-the-threat-hooks-2026-10-29.md`](./phase5-face-the-threat-hooks-2026-10-29.md)、[`phase5-face-the-threat-embark-runtime-2026-10-29.md`](./phase5-face-the-threat-embark-runtime-2026-10-29.md)。

### 2.3 Boss 位钩子（#343，探针 ok，RNG 写入仍 hold）

| 项 | 证据 |
| --- | --- |
| R-121 布局校验 `quest_map:p011` / `p012` | `defaultBossSlotPlacementHook`；`face-the-threat-hooks.test.ts`、各 `*-i.test.ts` |

### 2.4 威胁被动运行时（#334 + #344 + #345 + #346）

| 被动 | Boss | 入口 | 证据 |
| --- | --- | --- | --- |
| Graveyard 封锁 | Necromancer I | `mergeHamletCaretakerBlockedWithBossThreat` / `setActiveBossThreat` | `threat-campaign.ts`、`hamlet-event.ts`；`threat-campaign.test.ts` |
| Nomad Wagon 封锁 | Collector I | 同上 + `KNOWN_BOSS_THREAT_BLOCKED_BUILDINGS` | 同上；`collector-i.test.ts` |
| Survivalist 封锁 | Swine Prince I | 同上 | `swine-prince-i.test.ts` |
| Abbey 封锁 | Siren I | 同上（含 `abbey` strip 列表） | `siren-i.test.ts` |
| 战后永久移除非 Unholy | Necromancer I | `finishDungeonBattle` → `applyBossThreatAfterBattleToPool` | `dungeon-battle.ts`；`threat-campaign.test.ts` |
| 击败 Boss 清威胁 | 全部 I（combatEntry 主卡） | `clearedBossThreatScriptIdAfterVictory` | `dungeon-battle.ts` |
| 进地牢每名英雄 +2 压力 | Prophet I | `dungeon-starting-provisions.ts` | `threat-passive-runtime.test.ts` |
| 酒馆减压 −1 | Prophet I | `hamlet-actions.ts` · tavern | 同上 |
| 疗养院 heal −3 | Hag I | `hamlet-actions.ts` · sanitarium | 同上 |
| 使用补给 +1 压力 | Hag I | 探索 / Curio / 战斗补给 | `provision-use.ts`、`dungeon-exploration.ts` 等 |
| Curio 房不抽 Curio | Collector I | `shouldSkipCurioDrawInCurioRoom` | `dungeon-curio-room.ts`（经 `threat-passive-runtime.ts`） |
| Beast / Eldritch 伤害 +2 | Swine / Siren | `monsterCombatThreatDamageBonus` | `battle-monster.ts` |
| The Black Sheep +4 压力 | Fanatic I | `drawHamletEvent` 前 | `hamlet-event.ts`；`threat-passive-runtime.test.ts` |
| Marked for Death Mark 2t | Fanatic I | `startBattle` 前 d10 | `encounter.ts`；`fanatic-i.test.ts` |
| Creeping Sickness 建筑伤口 | Flesh I | 日末 / 访问建筑 / 准备结束清代币 | `hamlet-actions.ts`；`flesh-i.test.ts` |
| Big Troubles Guard 2t | Flesh I | 遭遇 Large 生成 | `withLargeMonsterSpawnGuard` · `dungeon-battle.ts` |

集中模块：`packages/engine/src/boss/threat-passive-runtime.ts`。详见 [`phase5-threat-passive-runtime-2026-10-28.md`](./phase5-threat-passive-runtime-2026-10-28.md)、[`phase5-boss-threat-wiring-2026-10-28.md`](./phase5-boss-threat-wiring-2026-10-28.md)。

### 2.5 Boss 战斗最小运行时（#347–#351）

| Boss | 已接 | 模块 / 测试 |
| --- | --- | --- |
| **Fanatic I** | Pyre `startBattle` 远程姿态 + 区域；`sentenceRendered` 同区丢 Pyre / 否则移向英雄 | `fanatic-i-combat-runtime.ts`；`fanatic-i-combat-runtime.test.ts` |
| **Flesh I** | One Body 四部位开战 + 共享 Life；回合初 morph | `flesh-i-combat-runtime.ts`、`battle.ts`；`flesh-i-combat-runtime.test.ts` |
| **Collector I** | Collect All 回合开始替换技能；三 Collected + 固定姿态区域 | `collector-i-combat-runtime.ts`、`battle-monster-action.ts`；`collector-i-combat-runtime.test.ts` |
| **Prophet I** | Calamitous 首次行动 4d10 → Wooden Pew；第 3 行动 Rubble（每 pew 攻击） | `prophet-i-combat-runtime.ts`、`battle-monster-action.ts`；`prophet-i-combat-runtime.test.ts` |
| **Necromancer I** | `summon` 声明 Bone Rabble（等级表语义；encounter 完整 AI 仍 hold） | `necromancer-i.ts`；`encounter-rules.test.ts` 等 |
| **Swine Prince I** | Wilbur 开战 + Enraged + Wilbur Mark AI | `swine-prince-i-combat-runtime.ts`；`swine-prince-i-combat-runtime.test.ts` |
| **Hag I** | Cauldron Empty `startBattle` 开战 summon | `hag-i-combat-runtime.ts`；`hag-i-combat-runtime.test.ts` |
| **Siren I** | High Tide slot → Pelagic `targetArea` 召唤 | `siren-i-combat-runtime.ts`、`battle-monster.ts`；`siren-i-combat-runtime.test.ts` |

---

## 3. 仍 hold 表

| 钩子 / 能力 | 现状（tip 代码） | 归口 |
| --- | --- | --- |
| **`bossSlotPlacement` RNG 写入** | 钩子 `ok` + `wiringHold`；**不**洗 room token 入 dungeon | **R-121** / 任务卡 |
| **Face the Threat 边缘房选图** | 出征仍走普通 R-116 选图 + shuffle；非 p011/p012 边缘语义 | **R-121** / R-046 |
| **`faceTheThreatBossScriptByCampaignLevel` II/III** | CL 2/3 无映射 → 钩子 / `chooseNextQuest` 拒绝 | 待确认 / II 脚本切片 |
| **II/III `offerNextQuest` 强制 p019** | 仅 I 级幕末强制；II/III 仍普通池 | 升幕 / 任务卡 |
| **`summon` · Prophet** | 木长椅 / Rubble 已接；第 2 行动 AI 等仍 hold | R38–R39 / Prophet |
| **`summon` · Hag / Siren 完整 AI** | Cauldron Empty 开战 / High Tide Pelagic 最小已接；Into the Pot! / Full / 魅惑 / 先攻洗入仍 hold | R38–R39 / 各 Boss 切片 |
| **`summon(purpose:skill)` · Swine / Fanatic / Collector / Flesh** | Swine **Wilbur 开战** + **Enraged** + **Wilbur Mark AI** 已接；Wilbur 非 Mark 召唤仍 stub | R38–R39 / Swine Prince |
| **Prophet I** 第 2 行动 AI / room 卡→战斗区域几何 / 先攻 3 洗入 | Calamitous + Rubble 最小运行时后仍 hold（见 `prophet-i.ts` notes） | R38–R39 / R-048 |
| **Collector** 宝箱房 / 先攻 4 洗入 / 最近区域挤占 | Collect All 最小运行时后仍 hold（见 `collector-i.ts` notes） | R-034 / R38–R39 |
| **Fanatic** Pit Toss / 技能 AI / 先攻 4 张洗入 | Pyre + Sentence 已接；其余 stub | G-05 / R39 |
| **Flesh** 战斗中途再召 Large | 仅遭遇开局 Guard；无 mid-battle spawn | R31 |
| **Necromancer** 死亡清场 / 多级 Rabble 完整 encounter | helper + 最小 summon 声明 | encounter |
| **`encounterRoundRetreatLimit` 生产路径** | helper 有；非全 Boss 任务已接 | Phase 5 后续 |
| **Boss XP / `summarizeDungeonQuest`** | **已接**：`bossFlatQuestSummarySchema` + `bossQuestVictory`（p019 / 映射 Boss 遭遇）；p016–p018 击败判定仍 hold | **R-122**（部分） |
| **Rising Threat SPECIAL** | 未接 | 任务卡 |
| **Ruins II/III 脚本** | 描述卡 id 在 catalog；**无** `boss:*:2/3` 注册；升幕可抽到 hold 文案 | 核心包切片 / 待确认 |
| **Weald/Warrens/Cove 非 I 迫近池** | 主路径仍 Ruins 四 Boss 池（`imminentThreatPoolForCampaign`） | 扩展 / 任务卡 |
| **p016–p018 区域 Boss / 八槽 confirmed** | 数据有；引擎无 I 脚本 | **R-120** / 任务卡 |
| **最暗 / Stygian 线 Boss** | 房间与任务 hold | Phase 6 / 范围外 |

---

## 4. II/III 描述卡与未注册威胁池

### 4.1 Ruins（`RUINS_BOSS_DESCRIPTION_CARD_ID`）

| 身份 | I | II | III | I 脚本 |
| --- | --- | --- | --- | --- |
| necromancer | p001 | p002 | p003 | 已注册 |
| prophet | p007 | p008 | p009 | 已注册 |
| collector | p013 | p014 | p015 | 已注册 |
| fanatic | p019 | p020 | p021 | 已注册 |

升幕 `drawImminentThreatAfterActAdvance` 可抽到 II/III 描述卡；无对应脚本时仍 `unregisteredImminentThreatHold`（`threat-establishment.test.ts`「升幕抽牌」）。

### 4.2 非 Ruins 目录（`threat-description-catalog.ts`）

| 区域 | I 已映射脚本 | II/III |
| --- | --- | --- |
| Weald（hag / brigandPounder / shrieker） | hag → Hag I | 其余 **undefined** |
| Warrens（swinePrince / flesh / brigandVvulf） | swinePrince、flesh | vvulf **undefined** |
| Cove（siren / shambler / drownedCrew） | siren | 其余 **undefined** |

上表供反查与 hold 文案；**不等于**各区域独立迫近池已接线。

---

## 5. 威胁被动：脚本有 vs 主路径

| 类别 | 脚本 `threatPassive*` | 主路径 |
| --- | --- | --- |
| 村庄建筑封锁（4 项） | ok | **已接**（#334 / #344） |
| 战后移池 / 清威胁 | ok | **已接** |
| Prophet 压力 / 酒馆 | ok | **已接**（#344） |
| Hag 药瓶 / 疗养院 | ok | **已接** |
| Collector Curio | ok | **已接** |
| Beast / Eldritch 加伤 | ok | **已接** |
| Fanatic Black Sheep / Marked | ok（原 stub 已改为 ok + 专用 effect） | **已接**（#345–#346） |
| Flesh Creeping / Guard | ok | **已接**（#345–#346） |
| 各 Boss 战斗面完整 AI | 多数 **stub** `summon` | encounter hold |

Helper 汇总：`threat-passive.ts`（纯查询）；运行时：`threat-passive-runtime.ts`。

---

## 6. 核心盒其它 Boss（无 I 脚本）

| Boss | 区域 | 引擎脚本 |
| --- | --- | --- |
| Brigand Pounder | Weald | **无** |
| Shrieker | Weald | **无** |
| Vvulf | Warrens | **无** |
| Shambler | Cove | **无** |
| Drowned Crew | Cove | **无** |
| 最暗地牢 / Stygian Boss 线 | — | **无**（本阶段范围外） |

---

## 7. 建议下一刀（供 Kyries 拍板）

1. **R-121 最小写入**：`bossSlotPlacement` 探针已有 → 选图 p011/p012 + 目标 + 2 随机非目标 room token 洗入 dungeon（不单改文档）。
2. **Ruins Boss II 单切片**：例如 Necromancer II（`p002`）注册 + `faceTheThreatBossScriptByCampaignLevel[2]` 策略裁定。
3. **Prophet I 战斗**：Calamitous + Rubble 最小运行时已接；第 2 行动 / room 几何 / 先攻仍 hold。
4. **Swine Prince I**：Wilbur 先攻洗入 / Enraged **skill slot** 与 Warrens 卡面 extract / End These Two / Prince 倒下后 Wilbur Squeal 选招仍 hold（Wilbur 开战 + Enraged + Wilbur Mark 最小 AI 已接 `swine-prince-i-combat-runtime`）。
5. **R-122 Boss XP**：`summarizeDungeonQuest` 摘要已接；最暗 p016–p018 击败判定与 Rising Threat 仍 hold。
6. **II 级幕末 p019 / 升幕 §2.2**：在 II 映射确认后扩展 `shouldForceFaceTheThreatOfferAtNextQuest` 与 `drawImminentThreatAfterActAdvance` 与 `advanceCampaignLevel` 合并策略。

---

## 8. 测试（清点用）

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/engine/src/boss/threat-establishment.test.ts \
  packages/engine/src/boss/threat-campaign.test.ts \
  packages/engine/src/boss/threat-passive-runtime.test.ts \
  packages/engine/src/boss/face-the-threat-hooks.test.ts \
  packages/engine/src/boss/face-the-threat-embark-runtime.test.ts \
  packages/engine/src/boss/set-active-boss-threat.test.ts \
  packages/engine/src/boss/fanatic-i-combat-runtime.test.ts \
  packages/engine/src/boss/flesh-i-combat-runtime.test.ts \
  packages/engine/src/boss/collector-i-combat-runtime.test.ts \
  packages/engine/src/boss/prophet-i-combat-runtime.test.ts
```
