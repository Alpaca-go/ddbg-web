# A-01 · Heart of Darkness Dissolution 效果线最小结算

**日期**：2026-11-01  
**基线**：`d3bac862`（#471 HoD Puncture 已合）  
**切片**：P0 A-01 · 单卡单招（`monster_large:p020` slot 3）

## 候选与取舍

| 卡                                    | 招                                | 效果线                                                                         | 本刀   |
| ------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------ | ------ |
| `p020` Heart of Darkness              | Dissolution                       | `{target_effects} {stun} 1t , 3 {blight} 3t , {stress} +1`（图标均 confirmed） | **接** |
| `p018` Ancestor 2                     | Refashion Them / Embrace Futility | 多效果                                                                         | hold   |
| Gestating Heart / Pit Toss / Revivify | —                                 | —                                                                              | hold   |

依据：`monster_large` FRONT **p020**、`docs/phase5-final-heart-skills-acc-2026-11-01.md`；规则 R-001 / R-048。

## 本刀接通

- `verified-monster-effects.ts` 增 **`monster_large:p020` slot 3** 计划：`Stun 1t` + `3 Blight 3t` + `{stress}+1`（scope target），签名 `{target_effects}{stun}1t,3{blight}3t,{stress}+1`（对齐 Maggot stun+stress / Prophet blight 等先例）。
- 规范化层经 `writeNormalizedCorebox` 写入 `monster_large.json` 的 `verified_monster_effects`（`verified_range` 0–10 已由 #470 持久，本刀不改 ranges 文件）。
- `monster-skill.ts` 对 `p020` slot 3 已有计划时**不再** Acc-only 剥离；经 `applyHeartOfDarknessDissolution` → `playMonsterSkill` → Furthest 单目标命中后眩晕、枯萎与压力。
- `heart-of-darkness-skills-acc.ts`：三招均走同一 Acc 路径；`dungeonUpdated` 对 slot 3 标注「含 verified 效果线」（p020 三招效果线齐）。

- `monster-effect-plan.test.ts`：回归计数 +1。
- `heart-of-darkness-skills-acc.test.ts`：Dissolution Furthest 命中/落空与计划断言。

## 仍 hold

- Ancestor2 余招；Gestating Heart / Pit Toss / Revivify。
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

- **Ancestor2 Refashion Them**（`p018` slot 1），或盘点剩余 A-01 候选（见 `docs/phase5-a5-remaining-a-candidates-2026-11-01.md`）。
