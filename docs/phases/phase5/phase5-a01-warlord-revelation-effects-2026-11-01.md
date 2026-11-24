# A-01 · Templar Warlord Revelation 效果线最小结算

**日期**：2026-11-01  
**基线**：`0fc7e772`（#463 已合）  
**切片**：P0 A-01 · 单卡单招（`monster_large:p014` slot 3）

## 候选与取舍

| 卡               | 招                | 效果线                                           | 本刀        |
| ---------------- | ----------------- | ------------------------------------------------ | ----------- |
| `p014` Warlord   | Revelation        | `{target_effects}{stress}+2`（图标均 confirmed） | **接**      |
| `p014` Warlord   | Torment / Stinger | 无 / 多效果未入库                                | hold        |
| `p015` Impaler   | Body Slam         | 含 **Pit Toss** 文字与眩晕                       | B 几何 hold |
| `p015` Impaler   | Revelation        | 同 Warlord +2 压力                               | 留待下一刀  |
| `p016`–`p020`    | 各 Acc 壳三招     | 压力/光照/流血/位移等                            | hold        |
| `p017` Shuffling | Lacerate          | 卡级 unverified                                  | A-10 / A-11 |

依据：`monster_large` FRONT **p014**、`docs/phase5-a5-remaining-a-candidates-2026-11-01.md` §1 A-01；规则 R-001 / R-048。

## 本刀接通

- `verified-monster-effects.ts` 增 **`monster_large:p014` slot 3** 计划：`stress +2`（scope target）。
- 规范化层经 `writeNormalizedCorebox` 写入 `monster_large.json` 的 `verified_monster_effects`。
- `monster-skill.ts` 对 `p014` slot 3 已有计划时**不再** Acc-only 剥离；经 `applyTemplarWarlordRevelation` → `playMonsterSkill` 结算命中后压力。
- `darkest-mid-boss-skill-acc-core.ts`：`dungeonUpdated` 区分「含 verified 效果线」与「效果线 hold」。

- `monster-effect-plan.test.ts`：排除 Collected Vestal 纯治疗计划；回归计数含本招。

## 仍 hold

- 同卡 Torment / Stinger Shot 效果线；Impaler 全招；Mammoth / 最终战 p018–p020 效果线。
- `combatReady` 仍 **false**；Pit Toss / Room Tile / Phase 6 / 完整 Boss AI。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/data/src/normalize/normalize.test.ts \
  packages/engine/src/monster-effect-plan.test.ts \
  packages/engine/src/boss/darkest-templars-skills-acc.test.ts
```
