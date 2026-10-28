# Phase 5：威胁被动运行时接线（2026-10-28）

> 在 `ec8d906`（#343 Face the Threat 钩子）之上，把已注册 I 级 Boss 脚本的威胁 helper 接到真实命令 / 生命周期路径。  
> 规则：spec §2.3 R11 / R32；R-001 / R-048。

## 本刀已接（引擎路径 + 单测）

| Boss / 被动                                            | 入口                                                                                             | 模块                                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| **Prophet I** 进地牢每名英雄 +2 压力                   | 开局补给完成 → `phase: ready`                                                                    | `dungeon-starting-provisions.ts` → `applyBossThreatStressOnDungeonEntry`   |
| **Prophet I** 酒馆减压 −1                              | `visitHamletBuilding` · `effect: stress` · `building: tavern`                                    | `hamlet-actions.ts` → `effectiveHamletStressRecoveryAmount`                |
| **Hag I** 疗养院 heal Life −3                          | `visitHamletBuilding` · `effect: heal` · `building: sanitarium`                                  | `hamlet-actions.ts` → `effectiveHamletSanitariumHealAmount`                |
| **Hag I** 使用补给 +1 压力                             | 探索 `useDungeonProvision`、危险骰抵消、`drawDungeonCurio` 弃 Torch、战斗 `useProvision`         | `threat-passive-runtime.ts` → `applyBossThreatStressOnProvisionUse`        |
| **Siren I** Abbey blocked                              | 既有 `hamletBuildingsBlockedByBossThreat` + **`KNOWN_BOSS_THREAT_BLOCKED_BUILDINGS` 含 `abbey`** | `threat-campaign.ts`                                                       |
| **Siren I** Eldritch 怪物伤害 +2                       | `playMonsterSkill` / 多目标怪物技能                                                              | `battle-monster.ts`、`battle-monster-targets.ts` → `threatFlatDamageBonus` |
| **Swine Prince I** Beast 怪物伤害 +2                   | 同上                                                                                             | 同上                                                                       |
| **Collector I** Curio 房间不抽 Curio                 | 无守卫进 Curio 房、`finishDungeonBattle` 守卫战胜利后                                            | `dungeon-curio-room.ts`、`dungeon-battle.ts`                               |
| **Collector I** nomadWagon 封锁                      | 同 Necromancer graveyard 路径                                                                    | `KNOWN_BOSS_THREAT_BLOCKED_BUILDINGS` 含 `nomadWagon`                      |
| **Necromancer / Swine** 村庄封锁、战后移池、击败清威胁 | #334 既有路径                                                                                    | 未改语义                                                                   |

集中运行时 helper：`packages/engine/src/boss/threat-passive-runtime.ts`。

## 仍 hold / 未接

| 项                                                      | 说明                                                                                     |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Fanatic I** The Black Sheep（事件前 d10）             | 脚本 hamlet 钩子仍为 **stub**（需 hamlet 状态机）                                        |
| **Flesh I** Creeping Sickness I                         | 脚本 hamlet 钩子仍为 **stub**；`guardOnLargeMonsterSpawn` 无 spawn 主路径，**hold**      |
| **Face the Threat** `applyCommand` 出征                 | #343 解析钩子 hold；本刀不接                                                             |
| R-121 / R-122 / Rising Threat / II·III 全量             | 任务卡 hold                                                                              |

## 待确认

| 项                                    | 说明                                                                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 换威胁时 `abbey` / `nomadWagon` strip | 与 `graveyard` 相同：仅 strip `KNOWN_BOSS_THREAT_BLOCKED_BUILDINGS`；看守人 / `weekBlockedBuildings` 保留 |

## 测试

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/engine/src/boss/threat-passive-runtime.test.ts \
  packages/engine/src/boss/threat-campaign.test.ts \
  packages/engine/src/boss/threat-establishment.test.ts
```
