# Phase 5：Fanatic I Boss 脚本（2026-10-28）

> **范围**：Kyries 批准切片——落地 **Fanatic I**（`boss:ruins:fanatic:1`），对齐 Collector I 注册模式。  
> **不做**：Fanatic II/III、R-121/122 全面收、Phase 6、其它扩展 Boss。  
> **规则来源**：R-001（核心盒 Ruins 四 Boss 含 Fanatic，spec §2.3 / §14.5）；卡面 id 以 `packages/data/extract/corebox/raw/boss_ability.json` / `monster_large.json` 为准（R-048）。

## 1. 核心盒依据

| 项 | 证据 |
| --- | --- |
| 区域 | Ruins Boss（spec §2.3、§14.5 表；`threat-description-catalog` `fanatic` → `boss_ability:p019–p021`） |
| 印刷集 | `boss_ability:p019` `source_set: "base"`；`monster_large:p008` 在 `normalized/corebox/` |
| 任务 / 房间 | `quest:p019` Face the Threat；`room:p013` Fanatic Room（数据已有，本刀不接进幕） |

## 2. 本 PR 交付

| 项 | 值 |
| --- | --- |
| 脚本 id | `boss:ruins:fanatic:1` |
| Description | `boss_ability:p019`（Boss Abilities FRONT p19） |
| 战斗 + 威胁双面 | `boss_ability:p022`（p22） |
| 战斗怪物 | `monster_large:p008`（Fanatic I · Human · Front · Large） |
| Pyre（战斗布置） | `monster_large:p011`（**已接** `startBattle` → Pyre 远程姿态 + 对应区域） |
| 地牢威胁 | **Marked for Death I**：开战全体 d10、最低者 Mark 2t（确认图标 `192ea1fea9`）→ **已接** `startBattle` |
| 村庄威胁 | **The Black Sheep I**：揭示事件前全体 d10、最低 +4 压力 → **已接**（`drawHamletEvent` / `phase5-threat-passive-runtime-2026-10-28.md`） |
| 先攻 / 行动 | 先攻 4（Fanatic 3 + Pyre 1，spec §14.5）、`ACTIONS / Round: 3`（卡面 extract） |
| Sentence Rendered | **已接** 最小运行时（`boss_ability:p022` / spec §14.5 R39） |
| 仍 stub / hold | Face the Threat 出征 applyCommand；Fanatic 技能 / Pit Toss；先攻 4 张洗入（G-05）；`summon(purpose:skill)` |

定威胁：`resolveScriptIdForDescriptionCard("boss_ability:p019")` → 挂 `activeBossThreatScriptId`；不再写 `unregisteredImminentThreatHold`。

## 3. Ruins I 级四 Boss 脚本（本 PR 后）

| 脚本 id | 描述卡 |
| --- | --- |
| `boss:ruins:necromancer:1` | `boss_ability:p001` |
| `boss:ruins:prophet:1` | `boss_ability:p007` |
| `boss:ruins:collector:1` | `boss_ability:p013` |
| `boss:ruins:fanatic:1` | `boss_ability:p019` **（本 PR）** |

Ruins **II/III** 描述卡（`p002`/`p003` 等）仍无脚本 → 升幕抽牌可 hold。

## 4. 测试

- `packages/engine/src/boss/fanatic-i.test.ts`
- `packages/engine/src/boss/threat-establishment.test.ts`（Fanatic 定威胁不再 hold）
- `pnpm typecheck` + 上述 vitest
