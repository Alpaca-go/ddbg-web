# Phase 5：Boss 威胁被动写入战役 / 村庄 / 怪物池（2026-10-28）

> 在 #331 Necromancer I helper 之上，把迫近威胁被动接到最小可测运行时路径。  
> 规则：spec §2.3 R11（`boss_ability:p004`）；R-001 / R-048。

## 状态字段

| 字段                                                  | 位置           | 含义                                                                                                                                                                                  |
| ----------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dungeon.activeBossThreatScriptId`                    | `DungeonState` | 当前激活迫近威胁（Boss 脚本 id）。**正式**：`establishImminentThreat` / `drawImminentThreatAfterActAdvance`；**沙盒**：`setActiveBossThreat`（同 `applyActiveBossThreatToDungeon`）。 |
| `dungeon.imminentThreatDescriptionCardId`             | `DungeonState` | 最近一次 Imminent Threat 抽到的 Boss Description 卡 id                                                                                                                                |
| `dungeon.defeatedRuinsBossIdentities`                 | `DungeonState` | 已击败 Ruins Boss，升幕抽牌时排除（§2.2）                                                                                                                                             |
| `dungeon.monsterPool.permanentlyRemovedCombatCardIds` | 怪物池         | Unsettling Silhouettes 等威胁永久移出的**战斗怪物卡 id**；`cards` 仍保留完整 24 张 catalog。                                                                                          |

## 已接线路径

| 被动                                    | 入口                                                                                 | 模块                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 村庄 **Graveyard is blocked**           | `rollHamletCaretaker` 合并封锁；`setActiveBossThreat` 同步 `hamlet.blockedBuildings` | `hamlet-event.ts`、`boss/threat-campaign.ts`                                       |
| 村庄 **Survivalist / Abbey blocked**    | 同上（Swine Prince / Siren I）                                                       | `threat-campaign.ts`（`KNOWN_BOSS_THREAT_BLOCKED_BUILDINGS`）                      |
| **Prophet I** 进地牢 +2 压力 / 酒馆 −1  | 开局补给 → `ready`；`visitHamletBuilding` 酒馆减压                                   | `threat-passive-runtime.ts`、`dungeon-starting-provisions.ts`、`hamlet-actions.ts` |
| **Hag I** 疗养院 Life −3 / 补给 +1 压力 | 疗养院 heal；探索与战斗消耗补给                                                      | `threat-passive-runtime.ts`、`hamlet-actions.ts`、`dungeon-provision-use.ts` 等    |
| **Beast / Eldritch** 怪物伤害 +2        | 怪物技能结算                                                                         | `monster-skill.ts`（`threatFlatDamageBonus`）、`battle-monster*.ts`                |
| 地牢 **After Battles 移除非 Unholy**    | `finishDungeonBattle` → `applyBossThreatAfterBattleToPool`                           | `dungeon-battle.ts`                                                                |
| 牌堆过滤                                | `prepareDungeonMonsters` / 战后守恒                                                  | `dungeon-monsters.ts`、`monster-pool-runtime.ts`（`dungeonMonsterPoolThrough`）    |
| 击败 Boss 清除威胁                      | `finishDungeonBattle` + `clearedBossThreatScriptIdAfterVictory`                      | spec §2.3「Boss 被击败前持续生效」                                                 |

详见 [`docs/phase5-threat-passive-runtime-2026-10-28.md`](phase5-threat-passive-runtime-2026-10-28.md)。

## 命令

- `{ type: "establishImminentThreat" }` — spec §2.4 战役开局定威胁（见 `docs/phase5-imminent-threat-establishment-2026-10-28.md`）
- `{ type: "drawImminentThreatAfterActAdvance" }` — spec §2.2 升幕抽下一张威胁
- `{ type: "setActiveBossThreat", scriptId }` — **沙盒已接**（测试 / 调试：写脚本 id + 村庄封锁；不洗描述卡、不耗 RNG；见 `set-active-boss-threat.test.ts`）

## 待确认 / hold

| 项                                  | 说明                                                                                    |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| `faceTheThreatEmbark`               | #343 钩子 ok；#349/#350 已接 `chooseNextQuest` / 幕末 p019 offer（R-121 边缘房仍 hold） |
| 升幕 §2.2 步骤 2–5                  | 与 `advanceCampaignLevel` 沙盒预览未合并                                                |
| 永久移出的怪物                      | **不**在清除威胁时恢复（规则为永久移出游戏）                                            |
| R-121 / R-122 / encounter Boss 轮数 | 仍 hold                                                                                 |

总表：[phase5-remaining-hold-inventory-2026-10-29.md](./phase5-remaining-hold-inventory-2026-10-29.md)（tip `3b50f2e`）。

```bash
pnpm exec vitest run packages/engine/src/boss/threat-campaign.test.ts packages/engine/src/boss/necromancer-i.test.ts packages/engine/src/boss/threat-establishment.test.ts packages/engine/src/boss/threat-passive-runtime.test.ts packages/engine/src/boss/set-active-boss-threat.test.ts
```
