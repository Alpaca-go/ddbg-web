# Phase 5：Hag I Boss 脚本（2026-10-28）

> 对齐 #331 Necromancer I / #336 Prophet I，落地 `BossScriptDefinition`：`boss:weald:hag:1`。  
> 规则来源：R-001（规则书 + `docs/rulings.md`）；卡面字面经 TTS crop 目视核对（CE 42412 / 42415 / 54209）；引擎印刷 id 为 Weald extract **占位**（待 `DD_EN_WEALD_CARDS_70_120_Boss_Abilities` 入库后按页序对齐）。

## 已核实条文

| 内容                                                                                                         | 依据                                                             |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| 地牢侧威胁 **Painfully Soothing I**：「Whenever a Hero uses a [provision potion], they suffer +1 [Stress].」 | `boss_ability:weald:hag:p002` 背面（Threat 卡 42415 back crop）  |
| 村庄侧威胁 **No Rest for the Wicked I**：「The Sanitarium heals 3 less Life.」                               | 同上卡背面                                                       |
| Boss Abilities 战斗面：ACTIONS / Round **2**；Into the Pot!（锅空时先 Into the Pot! 再另一技能）             | 42415 front crop                                                 |
| 战斗卡 **Hag I**（Human · Large · 60 Life · Weald）                                                          | `monster_large:weald:hag:p001`（Weald large PDF p10；TTS 54209） |
| Boss Description I（风味）                                                                                   | `boss_ability:weald:hag:p001`（TTS 42412）                       |
| 先攻 **2** 张                                                                                                | ACTIONS / Round: 2（§14.3 R30）                                  |

## 引擎交付

- 模块：`packages/engine/src/boss/hag-i.ts`（`ensureHagIBossScriptRegistered` / `ensureCoreBossScriptsRegistered`）。
- 威胁 helper：`stressOnHeroProvisionUseFromBossThreat`、`sanitariumHealLifeDeltaFromBossThreat`。
- `threat-description-catalog.resolveScriptIdForDescriptionCard`：`boss_ability:weald:hag:p001` → `boss:weald:hag:1`；`WEALD_BOSS_DESCRIPTION_CARD_ID` 仅填 Hag I，其余 Boss 留 `undefined`。
- 类型：`BossThreatPassiveDungeonOk` / `BossThreatPassiveHamletOk` 扩展 Hag 两种 `effect`。
- 单测：`hag-i.test.ts`、`hag-i-combat-runtime.test.ts`。

## 仍待确认 / hold（本 PR 未收）

| 项                                                  | 说明                                                                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Weald Boss **extract JSON** 与占位 id 对齐 PDF 页序 | 当前 id 按 `boss_ability:weald:hag:p00x` / `monster_large:weald:hag:p001` 约定                                     |
| **Cauldron** 能力卡（42418）与锅完整生命周期        | Empty 开战 + Into the Pot! / Empty→Full 最小运行时已接（`hag-i-combat-runtime`）；42418 / 先攻洗入 / 英雄入锅 hold | R38–R39 |
| 进地牢被动、疗养院 −3 Life **写入** runtime         | **已接**（`threat-passive-runtime` / `hamlet-actions` / 补给消耗）                                                 |
| Weald 战役定威胁池 / 多地点 Boss 堆                 | Ruins `establishImminentThreat` 不变                                                                               |
| quest / Face the Threat → Hag                       | `defaultFaceTheThreatEmbarkHook` **ok**（出征 plan 见 `face-the-threat-embark-runtime`）                           |
| **R-121** Boss 位                                   | `defaultBossSlotPlacementHook` 校验 **ok**；洗牌写入 hold                                                          |
| Hag II/III、Brigand Pounder、Shrieker               | 未注册                                                                                                             |

## 印刷 / 数据映射

| TTS / 目视卡                          | 引擎 id（占位）                                                             |
| ------------------------------------- | --------------------------------------------------------------------------- |
| Boss Description I · 42412            | `boss_ability:weald:hag:p001`                                               |
| Threat + Abilities I · 42415          | `boss_ability:weald:hag:p002`                                               |
| Cauldron Empty I · 54212              | `monster_large:weald:cauldron_empty:p001`（开战 summon）                    |
| Cauldron Full I · 54213（待页序核实） | `monster_large:weald:cauldron_full:p001`（Into the Pot! morph；42418 hold） |
| 战斗 Hag I · 54209                    | `monster_large:weald:hag:p001`                                              |
| Boss 脚本                             | `boss:weald:hag:1`                                                          |

## 测试

```bash
pnpm exec vitest run packages/engine/src/boss/hag-i.test.ts packages/engine/src/boss/threat-establishment.test.ts packages/engine/src/boss/necromancer-i.test.ts packages/engine/src/boss/prophet-i.test.ts
pnpm typecheck
```
