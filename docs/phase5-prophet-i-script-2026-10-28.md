# Phase 5：Prophet I Boss 脚本（2026-10-28）

> 对齐 #331 Necromancer I 模式，落地 `BossScriptDefinition`：`boss:ruins:prophet:1`。  
> 规则来源：R-001（规则书 + `docs/rulings.md`）；印刷 id 来自 extract / normalized。

## 已核实条文

| 内容                                                                                                     | 依据                                                             |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 地牢侧威胁 **Visions of a Torturous End**：「When entering the Dungeon, each Hero suffers +2 [Stress].」 | `boss_ability:p010` 背面 extract（规格书 §2.3 R11 威胁面）       |
| 村庄侧威胁 **Visions of Past Deeds**：「The Tavern recovers −1 [Stress].」                               | 同上卡背面                                                       |
| 战斗卡 **Prophet I**                                                                                     | `monster_large:p005`（normalized：`Unholy` · `Front` · `Large`） |
| Boss Description I                                                                                       | `boss_ability:p007`                                              |
| Boss Abilities 战斗面：ACTIONS / Round **3**、Calamitous Prognostication、Rubble of Ruin                 | `boss_ability:p010` 正面 extract                                 |
| 先攻 **3** 张                                                                                            | 规格书 §14.5 R38 表                                              |

## 引擎交付

- 模块：`packages/engine/src/boss/prophet-i.ts`（经 `ensureProphetIBossScriptRegistered` / `ensureCoreBossScriptsRegistered` 注册）。
- 威胁 helper（纯函数，供后续进地牢 / 酒馆接线）：`stressOnDungeonEntryPerHeroFromBossThreat`、`tavernStressRecoveryDeltaFromBossThreat`。
- `threat-description-catalog.resolveScriptIdForDescriptionCard`：`boss_ability:p007` → `boss:ruins:prophet:1`。
- 类型：`BossThreatPassiveDungeonOk` / `BossThreatPassiveHamletOk` 扩展为判别联合（Necromancer 与 Prophet 各一种 `effect`）。
- 单测：`prophet-i.test.ts`；`threat-establishment.test.ts` 中 Prophet 抽牌用例改为已注册。

## 仍待确认 / hold（本 PR 未收）

| 项                                                                 | 说明                                                         |
| ------------------------------------------------------------------ | ------------------------------------------------------------ |
| 进地牢 +2 压力、酒馆 −1 恢复 **写入** `dungeon` / `hamlet-actions` | **已接**（见 `phase5-threat-passive-runtime-2026-10-28.md`） |
| Wooden Pew、Calamitous Prognostication、Rubble of Ruin 完整 AI     | `summon` stub；encounter hold                                |
| quest:p019 / Face the Threat → 脚本 id                             | `faceTheThreatEmbark` stub                                   |
| **R-121** Boss 位                                                  | `bossSlotPlacement` stub                                     |
| Prophet II/III、Collector、Fanatic                                 | 未注册                                                       |

## 印刷 / 数据映射

| 印刷 / 数据               | 引擎 id                |
| ------------------------- | ---------------------- |
| Boss Description I        | `boss_ability:p007`    |
| Boss Abilities + 威胁背面 | `boss_ability:p010`    |
| 战斗怪物卡 I              | `monster_large:p005`   |
| Boss 脚本                 | `boss:ruins:prophet:1` |

## 测试

```bash
pnpm exec vitest run packages/engine/src/boss/prophet-i.test.ts packages/engine/src/boss/threat-establishment.test.ts packages/engine/src/boss/necromancer-i.test.ts
```
