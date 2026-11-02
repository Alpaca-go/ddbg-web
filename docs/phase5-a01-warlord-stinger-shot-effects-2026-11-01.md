# A-01 · Templar Warlord Stinger Shot 效果线最小结算

**日期**：2026-11-01  
**基线**：`f9965351`（#467 Mammoth Bulging Gaze 已合）  
**切片**：P0 A-01 · 单卡单招（`monster_large:p014` slot 2）

## 候选与取舍

| 卡               | 招            | 效果线                                                             | 本刀        |
| ---------------- | ------------- | ------------------------------------------------------------------ | ----------- |
| `p014` Warlord   | Stinger Shot  | `{target_effects} 3 {blight} 3t , {debuff} 2t`（图标均 confirmed） | **接**      |
| `p014` Warlord   | Revelation    | `{stress}+2`                                                       | #464 已合   |
| `p014` Warlord   | Torment       | 效果线空                                                           | hold        |
| `p015` Impaler   | Body Slam     | 含 **Pit Toss** 文字与眩晕                                         | B 几何 hold |
| `p016`–`p020`    | 各 Acc 壳余招 | 组合效果 / Revivify                                                | hold        |
| `p017` Shuffling | Lacerate      | 卡级 unverified                                                    | A-10 / A-11 |

依据：`monster_large` FRONT **p014**、`docs/phase5-a5-remaining-a-candidates-2026-11-01.md` §1 A-01；规则 R-001 / R-048。

## 本刀接通

- `verified-monster-effects.ts` 增 **`monster_large:p014` slot 2** 计划：`3 blight 3t` + `{debuff} 2t`（scope target），签名 `{target_effects}3{blight}3t,{debuff}2t`（对齐 Digestion blight + Ghoul/Gargoyle debuff 写法）。
- 规范化层经 `writeNormalizedCorebox` 写入 `monster_large.json` 的 `verified_monster_effects`。
- `monster-skill.ts` 对 `p014` slot 2 已有计划时**不再** Acc-only 剥离；经 `applyTemplarWarlordStingerShot` → `playMonsterSkill` 结算命中后枯萎与 debuff。
- `darkest-mid-boss-skill-acc-core.ts`：#464–#467 已通用区分「含 verified 效果线」与「效果线 hold」，本刀无需改 core。

- `monster-effect-plan.test.ts`：回归计数 +1（Warlord Stinger Shot）。
- `darkest-templars-skills-acc.test.ts`：Stinger Shot Furthest 命中/落空与计划断言。

## 仍 hold

- 同卡 Torment；Impaler 全招效果线；Mammoth Revivify；最终战 p018–p020 效果线。
- `combatReady` 仍 **false**；Pit Toss / Room Tile / Phase 6 / 完整 Boss AI。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/data/src/normalize/normalize.test.ts \
  packages/engine/src/monster-effect-plan.test.ts \
  packages/engine/src/boss/darkest-templars-skills-acc.test.ts
```
