# Phase 5：Necromancer I 首条 Boss 脚本（2026-10-28）

> 在 #330 Boss 框架骨架上落地 `BossScriptDefinition`：`boss:ruins:necromancer:1`。  
> 规则来源：R-001（规则书 + `docs/rulings.md`）；印刷 id 来自 extract / normalized，不发明几何或图标。

## 已核实条文

| 内容                                                                                                                | 依据                                                                 |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 地牢侧威胁 **Unsettling Silhouettes**：「After Battles, remove any non-unholy Monsters permanently from the game.」 | `boss_ability:p004` 背面 extract（与规格书 §2.3 R11 图例一致）       |
| 村庄侧威胁 **Graveyard is blocked.**                                                                                | 同上卡背面                                                           |
| 战斗卡 **Necromancer I**                                                                                            | `monster_medium:p089`（normalized：`Eldritch` · `Unholy` · `Front`） |
| Boss Description I                                                                                                  | `boss_ability:p001`                                                  |
| Boss Abilities 战斗面：ACTIONS / Round **1**、Summoning 规则、棋子 **Target Area**                                  | `boss_ability:p004` 正面 extract；R31、R-034                         |
| 先攻 **1** 张；Boss 等级 I 召唤 **Bone Rabble**                                                                     | 规格书 §14.5 R38 表 + `monster_medium:p040`                          |
| Boss 战不计轮数 / 不可逃跑（框架默认）                                                                              | §14、R-044；`encounterRoundRetreatLimit` 尚未接入 encounter 主路径   |

## 引擎交付

- 模块：`packages/engine/src/boss/necromancer-i.ts`（`registerBossScript` via `ensureNecromancerIBossScriptRegistered` / `ensureCoreBossScriptsRegistered`）。
- 威胁 helper（纯函数，供后续战斗后 / 村庄日接线）：`cardIdsPermanentlyRemovedAfterBattle`、`hamletBuildingsBlockedByBossThreat`。
- 战斗卡引用：`readBossCombatEntry` → `combatEntry` 字段（**不含** Boss 遭遇生成、先攻洗入、召唤 AI）。
- 单测：`necromancer-i.test.ts`。

## 仍待确认 / hold（本 PR 未收）

| 项                                                        | 说明                                                                 |
| --------------------------------------------------------- | -------------------------------------------------------------------- |
| quest:p019 / 各幕 **Face the Threat** → 具体 Boss 脚本 id | `resolveBossScriptIdForQuest` + `defaultFaceTheThreatEmbarkHook` **ok**；出征见 `face-the-threat-embark-runtime`（R-121 仍 hold） |
| **定威胁** / Imminent Threat / 升幕                       | 战役层未存 active Boss；村庄威胁未自动写入 `hamlet.blockedBuildings` |
| **R-121** Boss 位「目标 + 2 随机」                        | `bossSlotPlacement` stub                                             |
| **R-122** Boss XP 回村                                    | 仍归任务卡 hold                                                      |
| 战斗后永久移出 **写入 monsterPool / 存档 S7**             | helper 仅算 cardId；持久化未接                                       |
| Necromancer 死亡后移除其他怪物、完整召唤流程              | R38 文案在 `notes`；encounter / spawn hold                           |
| `encounterRoundRetreatLimit` 接入 `encounter.ts`          | 留给后续 PR                                                          |

## 任务卡与数据映射（当前）

| 印刷 / 数据               | 引擎 id                                                                     |
| ------------------------- | --------------------------------------------------------------------------- |
| Boss Description I        | `boss_ability:p001`                                                         |
| Boss Abilities + 威胁背面 | `boss_ability:p004`                                                         |
| 战斗怪物卡 I              | `monster_medium:p089`                                                       |
| 召唤物 I（R38）           | `monster_medium:p040` Bone Rabble                                           |
| Boss 脚本                 | `boss:ruins:necromancer:1`                                                  |
| Boss 任务卡 p016–p019     | **未**绑定脚本（最暗 p016–018 / Face p019 与四遗迹 Boss 等级对应待 Kyries） |

## 测试

```bash
pnpm exec vitest run packages/engine/src/boss/necromancer-i.test.ts packages/engine/src/boss/boss-framework.test.ts
```
