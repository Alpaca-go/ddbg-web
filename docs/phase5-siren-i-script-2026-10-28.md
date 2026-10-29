# Phase 5：Siren I Boss 脚本（2026-10-28）

> 对齐 #331 Necromancer I / #336 Prophet I / #337 Hag I / #338 Swine Prince I，落地 `BossScriptDefinition`：`boss:cove:siren:1`。  
> 规则来源：R-001（规则书 + `docs/rulings.md`）；卡面字面经 `DD_EN_COVE_CARDS_70_120_Boss_Abilities` / `monster_large` 印刷 PDF 核实（MG_DD_05 Cove）；引擎 id 为 Cove extract **占位**（待 `extract/extension/cove` Boss 入库后按页序对齐）。

## 已核实条文

| 内容 | 依据 |
| --- | --- |
| 地牢侧威胁 **Distressing Times I**：「Eldritch deal +2 [damage].」 | `boss_ability:cove:siren:p002` 威胁背面（Boss Abilities BACK p10） |
| 村庄侧威胁 **Captivating Call I**：「The Abbey is blocked.」 | 同上卡背面 |
| Boss Abilities 战斗面：ACTIONS / Round **2**；Song of Desire、High Tide 等 | Boss Abilities FRONT p10 |
| 战斗卡 **Siren I**（Eldritch · Large · Cove） | `monster_large:cove:siren:p001`（large PDF p5） |
| Boss Description I（风味） | `boss_ability:cove:siren:p001`（Boss Abilities FRONT p7） |
| 先攻 **2** 张 | ACTIONS / Round: 2（§14.3 R38） |

## 引擎交付

- 模块：`packages/engine/src/boss/siren-i.ts`（`ensureSirenIBossScriptRegistered` / `ensureCoreBossScriptsRegistered`）。
- 威胁 helper：`eldritchMonsterDamageBonusFromBossThreat`；村庄封锁经 `hamletBuildingsBlockedByBossThreat`（`abbeyBlocked`）。
- `threat-description-catalog`：`boss_ability:cove:siren:p001` → `boss:cove:siren:1`；`COVE_BOSS_DESCRIPTION_CARD_ID` 仅填 Siren I。
- 类型：`BossThreatPassiveDungeonOk` / `BossThreatPassiveHamletOk` 扩展 `eldritchMonsterDamageBonus`、`abbeyBlocked`。
- 单测：`siren-i.test.ts`、`siren-i-combat-runtime.test.ts`；`threat-establishment.test.ts` 增加 Cove 挂接用例。

## 仍待确认 / hold（本 PR 未收）

| 项 | 说明 |
| --- | --- |
| Cove Boss **extract JSON** 与占位 id 对齐 PDF 页序 | 当前 id 按 `boss_ability:cove:siren:p00x` / `monster_large:cove:siren:p001` 约定 |
| Eldritch +2 伤害、修道院封锁 **写入** encounter / hamlet-actions | **已接**（`battle-monster*` / `threat-campaign` KNOWN 含 abbey） |
| Song of Desire 魅惑、High Tide 以外召唤 / 完整 AI | High Tide → Pelagic 最小运行时已接（`siren-i-combat-runtime`）；魅惑 hold |
| Cove 战役定威胁池 / 多地点 Boss 堆 | Ruins `establishImminentThreat` 不变 |
| quest / Face the Threat → Siren | `defaultFaceTheThreatEmbarkHook` **ok** |
| **R-121** Boss 位 | `defaultBossSlotPlacementHook` 校验 **ok**；洗牌写入 hold |
| Siren II/III、Shambler、Drowned Crew | 未注册 |

## 印刷 / 数据映射

| 印刷（Cove MG_DD_05） | 引擎 id（占位） |
| --- | --- |
| Boss Description I · Abilities p7 | `boss_ability:cove:siren:p001` |
| Threat + Abilities I · p10 | `boss_ability:cove:siren:p002` |
| 战斗 Siren I · large p5 | `monster_large:cove:siren:p001` |
| Pelagic I（High Tide） | `monster_medium:cove:pelagic:p001`（占位；extract 入库前） |
| Boss 脚本 | `boss:cove:siren:1` |

## 测试

```bash
pnpm exec vitest run packages/engine/src/boss/siren-i.test.ts packages/engine/src/boss/threat-establishment.test.ts packages/engine/src/boss/swine-prince-i.test.ts packages/engine/src/boss/hag-i.test.ts packages/engine/src/boss/prophet-i.test.ts packages/engine/src/boss/necromancer-i.test.ts
pnpm typecheck
```
