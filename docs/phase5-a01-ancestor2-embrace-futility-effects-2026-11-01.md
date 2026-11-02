# A-01 · Ancestor 2 Embrace Futility 效果线最小结算

**日期**：2026-11-01  
**基线**：`dc4e9de4`（#473 Refashion Them 已合）  
**切片**：P0 A-01 · 单卡单招（`monster_large:p018` slot 3）

## 候选与取舍

| 卡                                              | 招                               | 效果线                                                                     | 本刀           |
| ----------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------- | -------------- |
| `p018` Ancestor 2                               | Embrace Futility                 | `{target_effects}{debuff}2t,{stress}+2,{shuffle}Push2`（图标均 confirmed） | **接**         |
| `p018` Ancestor 2                               | Refashion Them / Unmake Them All | 多效果                                                                     | 已接（前两刀） |
| `p020` HoD 余招 / Gestating Heart / Pit Toss 等 | —                                | —                                                                          | hold           |

依据：`monster_large` FRONT **p018**、`docs/phase5-a01-ancestor2-refashion-them-effects-2026-11-01.md`；规则 R-001 / R-048。

## 本刀接通

- `verified-monster-effects.ts` 增 **`monster_large:p018` slot 3** 计划：`debuff 2t` + `{stress}+2` + `{shuffle}Push2`（scope target），签名 `{target_effects}{debuff}2t,{stress}+2,{shuffle}Push2`（对齐 Fanatic II Push2 + stress 等先例）。
- 规范化层经 `writeNormalizedCorebox` 写入 `monster_large.json` 的 `verified_monster_effects`。
- `monster-skill.ts` 对 `p018` slot 3 已有计划时**不再** Acc-only 剥离；经 `applyAncestor2EmbraceFutility` → `playMonsterSkill`（Closest 0 单目标）结算命中后 debuff、+2 压力与 Push 2（`shuffleIntents` + 既有怪物位移路径）。
- `ancestor2-skills-acc.ts` 注释：slot 1/2/3 均含 verified 效果线。

- `monster-effect-plan.test.ts`：回归计数 +1。
- `ancestor2-skills-acc.test.ts`：Closest 命中/落空、计划断言与 Push。

## 仍 hold

- HoD / Gestating Heart 余招效果线；Pit Toss / Revivify；Room Tile / Phase 6。
- `combatReady` 仍 **false**；完整 Boss AI 与 Stygian。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/data/src/normalize/normalize.test.ts \
  packages/engine/src/monster-effect-plan.test.ts \
  packages/engine/src/boss/ancestor2-skills-acc.test.ts
```

## 建议下一刀

- 盘点 A-01 剩余最终战单招（见 `docs/phase5-a5-remaining-a-candidates-2026-11-01.md`）；`p018` 三招效果线已全部接通，可转其他 Boss 卡或停。
