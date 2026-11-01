# A-01 / A-06 · Mammoth Cyst Revivify 效果线最小结算

**日期**：2026-11-01  
**基线**：`7b87e889`（#474 Embrace Futility 已合）  
**切片**：P0 A-06 · 单卡单招（`monster_large:p016` slot 3）

## 候选与取舍

| 卡 | 招 | 效果线 | 本刀 |
| --- | --- | --- | --- |
| `p016` Mammoth | Revivify | `{self_effects}Self{buff}2t,{heal}15`（印刷 `{damage_or_heal_combined_marker}15{heal}`） | **接** |
| `p016` Mammoth | Bulging Gaze / Digestion | Acc + 目标效果 | #464–#466 已合 |
| White Cell / Pit Toss 等 | — | — | hold |

依据：`monster_large` FRONT **p016** slot 3 · target **Self**、无 Acc/Crit 伤害行；对齐 Collector 自疗 + 状态 verified 计划写法；规则 R-001 / R-048。

## 本刀接通

- `verified-monster-effects.ts` 增 **`monster_large:p016` slot 3** 计划：self buff 2t + self heal 15；签名含 `{damage_or_heal_combined_marker}` 与 normalize 对齐。
- `monster-effect-plan.ts`：组合治疗标记签名归一化与 `{heal}` 等价匹配。
- `hero-skill.ts`：`target === "Self"` 与怪物 Self 目标校验；无 Acc 的 Self 技能不强制 Acc/Crit 数字。
- `battle-monster.ts`：`playMonsterSkill` 支持 Self 目标（`targetId === actorId`，无英雄目标）。
- `darkest-mid-boss-skill-self-core.ts` + `applyMammothCystRevivify` → `playMonsterSkill` 结算 buff + 治疗。
- `command.ts` / `boss/index.ts` 白名单。

- `monster-effect-plan.test.ts`：新增 Mammoth Revivify Self compile 用例（攻击循环仍排除 Self 目标，计数保持 63）。
- `darkest-mammoth-cyst-skills-acc.test.ts`：Revivify 命中 / 拒绝 / applyCommand；保留「无 Acc 伤害行」断言。

## 仍 hold

- White Cell Teleport 几何；Pit Toss；Room Tile / Phase 6 / Stygian；`combatReady` 仍 **false**；完整 Boss AI。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/data/src/normalize/normalize.test.ts \
  packages/engine/src/monster-effect-plan.test.ts \
  packages/engine/src/boss/darkest-mammoth-cyst-skills-acc.test.ts
```
