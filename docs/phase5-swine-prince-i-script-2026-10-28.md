# Phase 5：Swine Prince I Boss 脚本（2026-10-28）

> 对齐 #331 Necromancer I / #336 Prophet I / #337 Hag I，落地 `BossScriptDefinition`：`boss:warrens:swine_prince:1`。  
> 规则来源：R-001（规则书 + `docs/rulings.md`）；卡面字面经 `DD_EN_WARRENS_CARDS_70_120_Boss_Abilities` / `monster_large` 印刷 PDF 核实（MG_DD_04 Warrens）；引擎 id 为 Warrens extract **占位**（待 `extract/extension/warrens` Boss 入库后按页序对齐）。

## 已核实条文

| 内容 | 依据 |
| --- | --- |
| 地牢侧威胁 **Uneasy Times I**：「Beasts deal +2 [damage].」 | `boss_ability:warrens:swine_prince:p002` 威胁背面（Boss Abilities BACK p10） |
| 村庄侧威胁 **Bestial Rage**：「The Survivalist is blocked.」 | 同上卡背面 |
| Boss Abilities 战斗面：ACTIONS / Round **2**；Enraged Destruction（Wilbur 受伤时 Prince 反击） | Boss Abilities FRONT p10 |
| 战斗卡 **Swine Prince I**（Beast · Large · 84 Life） | `monster_large:warrens:swine_prince:p001`（large PDF p5） |
| Boss Description I（风味） | `boss_ability:warrens:swine_prince:p001`（Boss Abilities FRONT p7） |
| 伴战 **Wilbur I**（不进 `combatEntry`） | `monster_medium:warrens:wilbur:p001`（medium PDF p20） |
| 先攻 **2** 张 | ACTIONS / Round: 2（§14.3 R38） |

## 引擎交付

- 模块：`packages/engine/src/boss/swine-prince-i.ts`（`ensureSwinePrinceIBossScriptRegistered` / `ensureCoreBossScriptsRegistered`）。
- 威胁 helper：`beastMonsterDamageBonusFromBossThreat`；村庄封锁经 `hamletBuildingsBlockedByBossThreat`（`survivalistBlocked`）。
- `threat-description-catalog`：`boss_ability:warrens:swine_prince:p001` → `boss:warrens:swine_prince:1`；`WARRENS_BOSS_DESCRIPTION_CARD_ID` 仅填 Swine Prince I。
- 类型：`BossThreatPassiveDungeonOk` / `BossThreatPassiveHamletOk` 扩展 `beastMonsterDamageBonus`、`survivalistBlocked`。
- 单测：`swine-prince-i.test.ts`；`threat-establishment.test.ts` 增加 Warrens 挂接用例。

## 仍待确认 / hold（本 PR 未收）

| 项 | 说明 |
| --- | --- |
| Warrens Boss **extract JSON** 与占位 id 对齐 PDF 页序 | 当前 id 按 `boss_ability:warrens:swine_prince:p00x` / `monster_*:warrens:*` 约定 |
| Beast +2 伤害、生存专家封锁 **写入** encounter / hamlet-actions | helper 仅返回值 |
| Wilbur 布置、Enraged Destruction、Mark 完整 AI | `summon` stub |
| Warrens 战役定威胁池 / 多地点 Boss 堆 | Ruins `establishImminentThreat` 不变 |
| quest / Face the Threat → Swine Prince | `faceTheThreatEmbark` stub |
| **R-121** Boss 位 | `bossSlotPlacement` stub |
| Swine Prince II/III、The Flesh、Brigand Vvulf | 未注册 |

## 印刷 / 数据映射

| 印刷（Warrens MG_DD_04） | 引擎 id（占位） |
| --- | --- |
| Boss Description I · Abilities p7 | `boss_ability:warrens:swine_prince:p001` |
| Threat + Abilities I · p10 | `boss_ability:warrens:swine_prince:p002` |
| 战斗 Swine Prince I · large p5 | `monster_large:warrens:swine_prince:p001` |
| Wilbur I · medium p20 | `monster_medium:warrens:wilbur:p001`（未接 combatEntry） |
| Boss 脚本 | `boss:warrens:swine_prince:1` |

## 测试

```bash
pnpm exec vitest run packages/engine/src/boss/swine-prince-i.test.ts packages/engine/src/boss/threat-establishment.test.ts packages/engine/src/boss/hag-i.test.ts packages/engine/src/boss/prophet-i.test.ts packages/engine/src/boss/necromancer-i.test.ts
pnpm typecheck
```
