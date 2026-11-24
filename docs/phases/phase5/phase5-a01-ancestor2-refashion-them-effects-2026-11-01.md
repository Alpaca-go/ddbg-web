# A-01 · Ancestor 2 Refashion Them 效果线最小结算

**日期**：2026-11-01  
**基线**：`1ca1efdf`（#472 HoD Dissolution 已合；p020 三招效果线齐）  
**切片**：P0 A-01 · 单卡单招（`monster_large:p018` slot 1）

## 候选与取舍

| 卡                       | 招               | 效果线                                                                         | 本刀           |
| ------------------------ | ---------------- | ------------------------------------------------------------------------------ | -------------- |
| `p018` Ancestor 2        | Refashion Them   | `{target_effects} 3 {bleed} 3t , {stress} +1 , {light} -1`（图标均 confirmed） | **接**         |
| `p018` Ancestor 2        | Unmake Them All  | bleed + stress                                                                 | 已接（上一刀） |
| `p018` Ancestor 2        | Embrace Futility | 含 Push                                                                        | hold           |
| 中途 Boss / 其他最终战招 | —                | —                                                                              | hold           |

依据：`monster_large` FRONT **p018**、`docs/phase5-a01-ancestor2-unmake-them-all-effects-2026-11-01.md`；规则 R-001 / R-048。卡面无 debuff（旧文档误写已废弃）。

## 本刀接通

- `verified-monster-effects.ts` 增 **`monster_large:p018` slot 1** 计划：`3 bleed 3t` + `{stress}+1` + `{light}-1`（scope target），签名 `{target_effects}3{bleed}3t,{stress}+1,{light}-1`。
- 规范化层经 `writeNormalizedCorebox` 写入 `monster_large.json` 的 `verified_monster_effects`。
- `monster-skill.ts` 对 `p018` slot 1 已有计划时**不再** Acc-only 剥离；经 `applyAncestor2RefashionThem` → `playMonsterSkill`（Crowded 1 单目标）结算命中后流血、压力；光照走 `targetLightDelta` → 全局 `battle.light`（与 HoD Know This 一致）。
- `ancestor2-skills-acc.ts`：`dungeonUpdated` 对 slot 1/2 区分「含 verified 效果线」；slot 3 仍 hold。

- `monster-effect-plan.test.ts`：回归计数 +1。
- `ancestor2-skills-acc.test.ts`：Refashion Crowded 命中/落空与计划断言。

## 仍 hold

- 同卡 Embrace Futility；HoD / Gestating Heart 余招效果线；Pit Toss / Revivify。
- `combatReady` 仍 **false**；Room Tile / Phase 6 / 完整 Boss AI。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/data/src/normalize/normalize.test.ts \
  packages/engine/src/monster-effect-plan.test.ts \
  packages/engine/src/boss/ancestor2-skills-acc.test.ts
```

## 建议下一刀

- `monster_large:p018` slot 3 **Embrace Futility**（含 Push），或盘点 A-01 剩余最终战单招。
