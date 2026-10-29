# Phase 5：The Flesh I Boss 脚本（2026-10-28）

> 对齐 #331 Necromancer I / #338 Swine Prince I / #339 Siren I，落地 `BossScriptDefinition`：`boss:warrens:flesh:1`。  
> 规则来源：R-001（规则书 + `docs/rulings.md`）；卡面字面经 Warrens `DD_EN_WARRENS_CARDS_70_120_Boss_Abilities` 印刷 PDF 核实（MG_DD_04 Warrens，Boss Abilities 正面 p13 / 威胁背面 p16）；引擎 id 为 Warrens extract **占位**。

## 已核实条文

| 内容 | 依据 |
| --- | --- |
| 地牢侧威胁 **Big Troubles I**：「When a large Monster is spawned in battle, give it Guard 2t.」 | `boss_ability:warrens:flesh:p002` 威胁背面（Boss Abilities BACK p16） |
| 村庄侧威胁 **Creeping Sickness I**：每日末未访建筑放 Wound；访问时转移；Hamlet 阶段结束清建筑上剩余 Wound | 同上卡背面（旋转半区）；**已接**（`hamlet.buildingWounds` + `hamlet-actions`） |
| Boss Abilities 战斗面：ACTIONS / Round **4**；**One Body**（共享 Life、部位 morph） | Boss Abilities FRONT p16 |
| Boss Description I（风味） | `boss_ability:warrens:flesh:p001`（Boss Abilities FRONT p13） |
| 四部位战斗卡（Head / Bone / Heart / Butt） | `monster_medium:warrens:flesh_*:p001`（不进 `combatEntry`） |
| `combatEntry` 代表卡 | `monster_medium:warrens:flesh_head:p001` |
| 先攻 **4** 张 | ACTIONS / Round: 4（§14.3 R38） |

## 引擎交付

- 模块：`packages/engine/src/boss/flesh-i.ts`（`ensureFleshIBossScriptRegistered` / `ensureCoreBossScriptsRegistered`）。
- 地牢威胁 helper：`guardTurnsOnLargeMonsterSpawnFromBossThreat`（`guardOnLargeMonsterSpawn`）。
- `threat-description-catalog`：`boss_ability:warrens:flesh:p001` → `boss:warrens:flesh:1`；`WARRENS_BOSS_DESCRIPTION_CARD_ID.flesh[1]` 已填。
- 类型：`BossThreatPassiveDungeonOk` 扩展 `guardOnLargeMonsterSpawn`。
- One Body 最小运行时：`flesh-i-combat-runtime.ts`（`startBattle` 四部位 + 共享 Life；`battle.ts` 伤口同步）。
- 单测：`flesh-i.test.ts`、`flesh-i-combat-runtime.test.ts`；`threat-establishment.test.ts` 增加 Warrens Flesh 挂接用例。

## 仍待确认 / hold（本 PR 未收）

| 项 | 说明 |
| --- | --- |
| Warrens Boss **extract JSON** 与占位 id 对齐 PDF 页序 | 当前 id 按 `boss_ability:warrens:flesh:p00x` / `monster_*:warrens:flesh_*` 约定 |
| Large 生成 Guard 2t **写入** encounter spawn | **已接** `startDungeonBattle`（Large = `stanceSlots === 2`）。战斗中途召唤 Large 仍无原语，hold |
| Creeping Sickness I 村庄 Wound 转移 | **已接**（`threat-passive-runtime` / `hamlet-actions`） |
| One Body morph / 部位位移、四单位 Boss 战 | `summon` stub |
| Warrens 战役定威胁池 / 多地点 Boss 堆 | Ruins `establishImminentThreat` 不变 |
| quest / Face the Threat → The Flesh | `faceTheThreatEmbark` stub |
| **R-121** Boss 位 | `bossSlotPlacement` stub |
| Flesh II/III、Brigand Vvulf | 未注册 |

## 与 `docs/plan.md` 差异

- 大纲写 Flesh 地牢威胁会改变「首只怪物抽取方式」；**I 级卡面核实为 Big Troubles（Large 生成 Guard 2t）**，非抽牌数变更。II/III（Bigger / Huge Troubles）未在本 PR 注册。

## 印刷 / 数据映射

| 印刷（Warrens MG_DD_04） | 引擎 id（占位） |
| --- | --- |
| Boss Description I · Abilities p13 | `boss_ability:warrens:flesh:p001` |
| Threat + Abilities I · p16 | `boss_ability:warrens:flesh:p002` |
| Flesh Head I · medium | `monster_medium:warrens:flesh_head:p001`（combatEntry 代表） |
| Flesh Bone / Heart / Butt I | `monster_medium:warrens:flesh_bone:p001` 等（未接 combatEntry） |
| Boss 脚本 | `boss:warrens:flesh:1` |

## 测试

```bash
pnpm exec vitest run packages/engine/src/boss/flesh-i.test.ts packages/engine/src/boss/flesh-i-combat-runtime.test.ts packages/engine/src/boss/threat-establishment.test.ts
pnpm typecheck
```
