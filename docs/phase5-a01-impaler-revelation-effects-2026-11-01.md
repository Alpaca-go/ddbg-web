# A-01 · Templar Impaler Revelation 效果线最小结算

**日期**：2026-11-01  
**基线**：`92cc1927`（#464 Warlord Revelation 已合）  
**切片**：P0 A-01 · 单卡单招（`monster_large:p015` slot 3）

## 候选与取舍

| 卡 | 招 | 效果线 | 本刀 |
| --- | --- | --- | --- |
| `p015` Impaler | Revelation | `{target_effects}{stress}+2`（图标均 confirmed） | **接** |
| `p015` Impaler | Torment / Body Slam | 多效果 / **Pit Toss** 文字 | hold（B 几何 / 未入库） |
| `p014` Warlord | Torment / Stinger | 无 / 多效果未入库 | #464 已接 Revelation；余招 hold |
| `p016`–`p020` | 各 Acc 壳三招 | 压力/光照/流血/位移等 | hold |
| `p017` Shuffling | Lacerate | 卡级 unverified | A-10 / A-11 |

依据：`monster_large` FRONT **p015**、[phase5-a01-warlord-revelation-effects-2026-11-01.md](phase5-a01-warlord-revelation-effects-2026-11-01.md) 同签名模式、`docs/phase5-a5-remaining-a-candidates-2026-11-01.md` §1 A-01；规则 R-001 / R-048。

## 本刀接通

- `verified-monster-effects.ts` 增 **`monster_large:p015` slot 3** 计划：`stress +2`（scope target），签名与 Warlord Revelation 一致。
- 规范化层经 `writeNormalizedCorebox` 写入 `monster_large.json` 的 `verified_monster_effects`。
- `monster-skill.ts` 对 `p015` slot 3 已有计划时**不再** Acc-only 剥离（与 #464 `p014` 同逻辑）；经 `applyTemplarImpalerRevelation` → `playMonsterSkill` 结算命中后压力。
- `darkest-mid-boss-skill-acc-core.ts`：#464 已通用区分「含 verified 效果线」与「效果线 hold」，本刀无需改 core。

- `monster-effect-plan.test.ts`：回归计数 +1（Impaler Revelation）。
- `darkest-templars-skills-acc.test.ts`：Impaler Revelation 命中/落空/applyCommand。

## 仍 hold

- Impaler Torment / Body Slam（含 Pit Toss）；Warlord Torment / Stinger；Mammoth / 最终战 p018–p020 效果线。
- `combatReady` 仍 **false**；Pit Toss / Room Tile / Phase 6 / 完整 Boss AI。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/data/src/normalize/normalize.test.ts \
  packages/engine/src/monster-effect-plan.test.ts \
  packages/engine/src/boss/darkest-templars-skills-acc.test.ts
```
