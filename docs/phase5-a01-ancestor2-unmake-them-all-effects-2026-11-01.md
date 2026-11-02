# A-01 · Ancestor 2 Unmake Them All 效果线最小结算

**日期**：2026-11-01  
**基线**：`3b9d5494`（#468 Warlord Stinger Shot 已合）  
**切片**：P0 A-01 · 单卡单招（`monster_large:p018` slot 2）

## 候选与取舍

| 卡                       | 招               | 效果线                                                            | 本刀       |
| ------------------------ | ---------------- | ----------------------------------------------------------------- | ---------- |
| `p018` Ancestor 2        | Unmake Them All  | `{target_effects} 2 {bleed} 4t , {stress} +1`（图标均 confirmed） | **接**     |
| `p018` Ancestor 2        | Refashion Them   | 流血 + 光照 + debuff 三效果                                       | hold       |
| `p018` Ancestor 2        | Embrace Futility | 含 Push                                                           | hold       |
| `p020` HoD               | Know This        | 等同线 bleed+stress                                               | 建议下一刀 |
| 中途 Boss / 其他最终战招 | —                | —                                                                 | hold       |

依据：`monster_large` FRONT **p018**、`docs/phase5-final-ancestor2-skills-acc-2026-11-01.md`；规则 R-001 / R-048。

## 本刀接通

- `verified-monster-effects.ts` 增 **`monster_large:p018` slot 2** 计划：`2 bleed 4t` + `{stress}+1`（scope target），签名 `{target_effects}2{bleed}4t,{stress}+1`（对齐 Brigand Bloodletter bleed+stress 写法）。
- 规范化层经 `writeNormalizedCorebox` 写入 `monster_large.json` 的 `verified_monster_effects`。
- `monster-skill.ts` 对 `p018` slot 2 已有计划时**不再** Acc-only 剥离；经 `applyAncestor2UnmakeThemAll` → `playMonsterSkill` 结算命中后流血与 +1 压力。
- `ancestor2-skills-acc.ts`：`dungeonUpdated` 对 slot 2 区分「含 verified 效果线」与「效果线 hold」（slot 1/3 仍 hold）。

- `monster-effect-plan.test.ts`：回归计数 +1。
- `ancestor2-skills-acc.test.ts`：Unmake Furthest 命中/落空与计划断言。

## 仍 hold

- 同卡 Refashion Them / Embrace Futility；HoD / Gestating Heart 余招效果线；Pit Toss / Revivify。
- `combatReady` 仍 **false**；Room Tile / Phase 6 / 完整 Boss AI。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/data/src/normalize/normalize.test.ts \
  packages/engine/src/monster-effect-plan.test.ts \
  packages/engine/src/boss/ancestor2-skills-acc.test.ts
```
