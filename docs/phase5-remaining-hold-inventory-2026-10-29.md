# Phase 5：Boss / 迫近威胁剩余 hold 清点（2026-10-29 · tip `3b50f2e`）

> **2026-11-01 增量**：可接 **A** 候选（非 hold 接线）见 [phase5-a5-remaining-a-candidates-2026-11-01.md](./phase5-a5-remaining-a-candidates-2026-11-01.md)（基线 tip `93119fd6`）。本文 §2–§3 在 #428–#459 / Ruins II·III 合入后**部分过时**（如「其它 Ruins II/III 未注册」、最暗/最终战 Acc 壳、Pyre `playPyreSkill`）；hold **语义**仍以 §3 为准，已接事实以该 A-5 盘点 §0 为准，勿在两处重复维护长表。

> **基线**：`main` @ `300ba3b`（#362 Prophet 先攻 3）。  
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
| 幕末强制 offer | I 级沿既有入口；R-126：II 级两普通任务完成 + 实际 p002 匹配已注册死灵法师 II → 仅 p019，错配拒绝且不回退抽卡；III 仍 hold | `resolveFaceTheThreatOfferAtNextQuest`；`face-the-threat-embark-runtime.test.ts` |
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
| **Fanatic I** | Pyre 开战 / Sentence / Pit Toss / 先攻 4；C-017 本体三招 d10、Speed、完整效果与目标 AI；技能召唤明确不适用；R39 本体被击败后移除 Pyre，攻击 / 持续伤害 / 反击收尾已接 | `fanatic-i-combat-runtime.ts` / `.test.ts`；`fanatic-i-skill-ai.test.ts`；`phase5-fanatic-i-pyre-defeat-2026-10-29.md` |
| **Flesh I** | One Body 四部位开战 + 共享 Life；回合初 morph | `flesh-i-combat-runtime.ts`、`battle.ts`；`flesh-i-combat-runtime.test.ts` |
| **Collector I** | Collect All / 先攻 4 / 英雄挤占；C-015 显式区域绑定后三箱同区布置、有限池抽空即止；缺绑定明确拒绝 | `collector-i-combat-runtime.ts`、`collector-i-room-runtime.ts` / `.test.ts`；Collector Room 生产几何仍 hold |
| **Prophet I** | Calamitous + Rubble + **第 2 行动默认选招** + **先攻 3 张** + 多行动 `actedIds`；C-013 开战 / 第 1 行动前校验完整八组 d10 绑定，缺表拒绝，UI 显示每区木长椅数 | `prophet-i-room-runtime.ts`、`prophet-i-combat-runtime.ts`、`encounter.ts`；`prophet-i-combat-runtime.test.ts`；正式几何仍 hold |
| **Necromancer I** | C-011/012：死亡清场，三招自动选招 / 目标 / Speed 3 移动 / 技能召唤；Six Feet Under 纯压力，满轨无效、满区待选及当前轮先攻 | `necromancer-i-skill-ai.test.ts`；`phase5-necromancer-i-skill-ai-2026-10-29.md` |
| **Swine Prince I** | Wilbur 开战 + Enraged + Wilbur Mark AI | `swine-prince-i-combat-runtime.ts`；`swine-prince-i-combat-runtime.test.ts` |
| **Hag I** | Cauldron Empty `startBattle`；Into the Pot! / Empty→Full | `hag-i-combat-runtime.ts`；42418 / 先攻 / 英雄入锅 hold |
| **Siren I** | High Tide slot → Pelagic `targetArea` 召唤 | `siren-i-combat-runtime.ts`、`battle-monster.ts`；`siren-i-combat-runtime.test.ts` |

---

## 3. 仍 hold 表

| 钩子 / 能力 | 现状（tip 代码） | 归口 |
| --- | --- | --- |
| **`bossSlotPlacement` RNG 写入** | 钩子 `ok` + `wiringHold`；**不**洗 room token 入 dungeon | **R-121** / 任务卡 |
| **Face the Threat 边缘房选图** | 出征仍走普通 R-116 选图 + shuffle；非 p011/p012 边缘语义 | **R-121** / R-046 |
| **II/III 出征匹配** | C-019 / R-124：死灵法师 II 仅凭实际同级 p002 + 已注册脚本匹配，不设 II 缺省；其它 II/III、缺项与错配继续拒绝 | R-124；C-019 已顺序合入 #375–#377 |
| **II/III `offerNextQuest` 强制 p019** | R-126：II 两任务后实际 p002 匹配则仅 p019；错配停点，不回退抽卡。III 未扩展 | C-022 限定切片；正式升幕仍 hold |
| **`summon` · Prophet** | 木长椅 / Rubble 已接；`summon(purpose:skill)` 仍 stub | R38–R39 / Prophet |
| **`summon` · Hag / Siren 完整 AI** | Cauldron Empty 开战 / Into the Pot!+Full morph / High Tide Pelagic 最小已接；42418 / 魅惑 / 先攻洗入 / 锅完整生命周期仍 hold | R38–R39 / 各 Boss 切片 |
| **`summon(purpose:skill)` · Swine / Collector / Flesh** | Swine **Wilbur 开战** + **Enraged** + **Wilbur Mark AI** 已接；Wilbur 非 Mark 召唤仍 stub；Fanatic I 三招无召唤，已改为 `notApplicable`，从此 hold 行移出 | R38–R39 / Swine Prince；C-017 |
| **Prophet I** room 卡→战斗区域几何 | 完整 d10 逻辑区绑定校验已接；缺表明确拒绝。C-014 已接每木长椅独立区域共骰、多目标生命 / 压力 / 死亡收尾，以及先知三张加普通伴战各一张先攻。**Prophet Room 生产几何仍 hold** | R19、R30、R38–R39 / R-048；`phase5-prophet-i-rubble-initiative-2026-10-29.md` |
| **Collector** Room 几何绑定 | 三箱布置与 C-016 挤占选择 / 连续续接已接；召唤使用显式固定姿态区域绑定，怪物满区时玩家选移，不能把召唤物改放别区。**Collector Room 生产几何 / 落区绑定仍 hold**，缺绑定拒绝 | R31、R39 / R-034/047/048/059；`phase5-collector-i-displacement-2026-10-29.md` |
| **Fanatic** Pyre 自身技能 | 本体三招 AI 与效果已接（C-017）；R39 的本体死亡移除 Pyre 已接。**Burn the Heretic**（R-136）经 `playPyreSkill` + 公开 `prepareMonsterAction`/`playMonsterSkill` 已接；不称生产 Room 几何或自然战役闭环 | G-05 / R39 / R-136；[phase5-fanatic-i-pyre-burn-2026-11-01.md](phase5-fanatic-i-pyre-burn-2026-11-01.md) |
| **Flesh** 战斗中途再召 Large | 仅遭遇开局 Guard；无 mid-battle spawn | R31 |
| **Necromancer** 多级召唤 / 正式入场 | C-019 已接 II 级三招、Bone Soldier 召唤、死亡清场与两项威胁；III、Boss 房间及 R-121 生产入场仍未开 | `phase5-c019-necromancer-ii-graveyard-2026-10-29.md`；#375–#377 已合入 |
| **`encounterRoundRetreatLimit` 生产路径** | C-018：已注册 Ruins I 四 Boss 共用的两条轮末路径已回归；未击败前禁止从探索离场。正式 Boss 房间入场和未映射脚本仍 hold | R30、R-044；`phase5-boss-retreat-boundary-2026-10-29.md` |
| **Boss XP / `summarizeDungeonQuest`** | **已接**：`bossFlatQuestSummarySchema` + `bossQuestVictory`（p019 / 映射 Boss 遭遇）；p016–p018 击败判定仍 hold | **R-122**（部分） |
| **Rising Threat SPECIAL** | 未接 | 任务卡 |
| **Ruins II/III 脚本** | C-019：死灵法师 II 战斗、Army / Haunted 与正式注册已实现；其它 II/III 仍未注册，升幕可抽到 hold 文案 | R-124 / R-125；C-019 已合入 |
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
3. **Prophet I 战斗**：第 2 行动、完整 d10 绑定校验 / 缺表拒绝、C-014 同区多目标与普通伴战先攻已接；room 几何 / 生产地牢 Prophet Room 绑定仍 hold。
4. **Swine Prince I**：Wilbur 先攻洗入 / Enraged **skill slot** 与 Warrens 卡面 extract / End These Two / Prince 倒下后 Wilbur Squeal 选招仍 hold（Wilbur 开战 + Enraged + Wilbur Mark 最小 AI 已接 `swine-prince-i-combat-runtime`）。
5. **R-122 Boss XP**：`summarizeDungeonQuest` 摘要已接；最暗 p016–p018 击败判定与 Rising Threat 仍 hold。
6. **II 级幕末 p019 / 升幕 §2.2**：R-126 的 II 死灵法师限定 offer 已接独立切片；`drawImminentThreatAfterActAdvance` 与 `advanceCampaignLevel` 的正式升幕合并策略仍须后续批准。

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
