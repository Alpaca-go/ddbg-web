# Phase 5：Boss 威胁被动写入战役 / 村庄 / 怪物池（2026-10-28）

> 在 #331 Necromancer I helper 之上，把迫近威胁被动接到最小可测运行时路径。  
> 规则：spec §2.3 R11（`boss_ability:p004`）；R-001 / R-048。

## 状态字段

| 字段 | 位置 | 含义 |
|------|------|------|
| `dungeon.activeBossThreatScriptId` | `DungeonState` | 当前激活的迫近威胁（Boss 脚本 id）。**定威胁 / 升幕抽牌未接**；测试与 stub 用 `setActiveBossThreat`。 |
| `dungeon.monsterPool.permanentlyRemovedCombatCardIds` | 怪物池 | Unsettling Silhouettes 等威胁永久移出的**战斗怪物卡 id**；`cards` 仍保留完整 24 张 catalog。 |

## 已接线路径

| 被动 | 入口 | 模块 |
|------|------|------|
| 村庄 **Graveyard is blocked** | `rollHamletCaretaker` 合并封锁；`setActiveBossThreat` 同步 `hamlet.blockedBuildings` | `hamlet-event.ts`、`boss/threat-campaign.ts` |
| 地牢 **After Battles 移除非 Unholy** | `finishDungeonBattle` → `applyBossThreatAfterBattleToPool` | `dungeon-battle.ts` |
| 牌堆过滤 | `prepareDungeonMonsters` / 战后守恒 | `dungeon-monsters.ts`、`monster-pool-runtime.ts`（`dungeonMonsterPoolThrough`） |
| 击败 Boss 清除威胁 | `finishDungeonBattle` + `clearedBossThreatScriptIdAfterVictory` | spec §2.3「Boss 被击败前持续生效」 |

## 命令 stub

- `{ type: "setActiveBossThreat", scriptId: BossScriptId | null }`  
  - 设置 / 清除 `activeBossThreatScriptId`；在村庄阶段同步 graveyard 封锁。  
  - **不是**规则书「洗描述卡定威胁」或升幕 Imminent Threat 抽牌。

## 待确认 / hold

| 项 | 说明 |
|----|------|
| 定威胁 / 战役开局 | §2.4 洗 4 张 I 级描述卡抽第一张；未自动写入 `activeBossThreatScriptId` |
| `faceTheThreatEmbark` | quest:p019 → Boss 脚本与出征仍 stub |
| 升幕 §2.2 | 击败 Boss 后抽**下一张**威胁、加怪物、换任务堆 — 未接；当前仅在**本场含对应 Boss 战斗卡且胜利**时清除 `activeBossThreatScriptId` |
| 永久移出的怪物 | **不**在清除威胁时恢复（规则为永久移出游戏） |
| R-121 / R-122 / encounter Boss 轮数 | 仍 hold |

## 测试

```bash
pnpm exec vitest run packages/engine/src/boss/threat-campaign.test.ts packages/engine/src/boss/necromancer-i.test.ts
```
