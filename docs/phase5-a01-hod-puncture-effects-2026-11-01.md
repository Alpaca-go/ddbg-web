# A-01 · Heart of Darkness Puncture 效果线最小结算

**日期**：2026-11-01  
**基线**：`397cccfb`（#470 HoD Know This 已合）  
**切片**：P0 A-01 · 单卡单招（`monster_large:p020` slot 2）

## 候选与取舍

| 卡                                    | 招                                | 效果线                                                            | 本刀   |
| ------------------------------------- | --------------------------------- | ----------------------------------------------------------------- | ------ |
| `p020` Heart of Darkness              | Puncture                          | `{target_effects} 3 {bleed} 3t , {stress} +1`（图标均 confirmed） | **接** |
| `p020` Heart of Darkness              | Dissolution                       | 伤害为主                                                          | hold   |
| `p018` Ancestor 2                     | Refashion Them / Embrace Futility | 多效果                                                            | hold   |
| Gestating Heart / Pit Toss / Revivify | —                                 | —                                                                 | hold   |

依据：`monster_large` FRONT **p020**、`docs/phase5-final-heart-skills-acc-2026-11-01.md`；规则 R-001 / R-048。

## 本刀接通

- `verified-monster-effects.ts` 增 **`monster_large:p020` slot 2** 计划：`3 bleed 3t` + `{stress}+1`（scope target），签名 `{target_effects}3{bleed}3t,{stress}+1`（对齐 Ancestor2 Unmake Them All / Brigand Bloodletter bleed+stress 写法）。
- 规范化层经 `writeNormalizedCorebox` 写入 `monster_large.json` 的 `verified_monster_effects`（`verified_range` 0–10 已由 #470 持久，本刀不改 ranges 文件）。
- `monster-skill.ts` 对 `p020` slot 2 已有计划时**不再** Acc-only 剥离；经 `applyHeartOfDarknessPuncture` → `playMonsterSkill` → Closest 单目标命中后流血与压力。
- `heart-of-darkness-skills-acc.ts`：`dungeonUpdated` 对 slot 2 区分「含 verified 效果线」（slot 3 Dissolution 仍 hold）。

- `monster-effect-plan.test.ts`：回归计数 +1。
- `heart-of-darkness-skills-acc.test.ts`：Puncture Closest 命中/落空与计划断言。

## 仍 hold

- 同卡 Dissolution；Ancestor2 余招；Gestating Heart / Pit Toss / Revivify。
- `combatReady` 仍 **false**；Room Tile / Phase 6 / 完整 Boss AI。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/data/src/normalize/normalize.test.ts \
  packages/engine/src/monster-effect-plan.test.ts \
  packages/engine/src/boss/heart-of-darkness-skills-acc.test.ts
```

## 建议下一刀

- **Dissolution**（`p020` slot 3）效果线，或 **Ancestor2 Refashion Them**（`p018` slot 1）。
