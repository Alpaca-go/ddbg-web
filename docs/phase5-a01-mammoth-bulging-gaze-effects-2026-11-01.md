# A-01 · Mammoth Cyst Bulging Gaze 效果线最小结算

**日期**：2026-11-01  
**基线**：`c9e11cf9`（#466 Mammoth Digestion 已合）  
**切片**：P0 A-01 · 单卡单招（`monster_large:p016` slot 1）

## 候选与取舍

| 卡 | 招 | 效果线 | 本刀 |
| --- | --- | --- | --- |
| `p016` Mammoth | Bulging Gaze | `{target_effects}{debuff}1t,{stress}+1`（debuff 变体图标 id `91ca3fa960`，key 仍为 confirmed `debuff`） | **接** |
| `p016` Mammoth | Digestion | 3 blight 2t | #466 已合 |
| `p016` Mammoth | Revivify | Self、非 Acc | A-06 / 另刀 |
| `p014`–`p015` | Torment / Stinger / Body Slam 等 | 多效果 / Pit Toss | hold |
| `p017`–`p020` | 各 Acc 壳三招 | 组合效果 | hold |

依据：`monster_large` FRONT **p016**、[phase5-a01-mammoth-digestion-effects-2026-11-01.md](phase5-a01-mammoth-digestion-effects-2026-11-01.md) 同模式；对齐 Ghoul slot 1 debuff+stress 写法；规则 R-001 / R-048。

## 本刀接通

- `verified-monster-effects.ts` 增 **`monster_large:p016` slot 1** 计划：debuff 1t + stress +1（scope target），签名 `{target_effects}{debuff}1t,{stress}+1`。
- 规范化层经 `writeNormalizedCorebox` 写入 `monster_large.json` 的 `verified_monster_effects`。
- `monster-skill.ts` 对 `p016` slot 1 已有计划时**不再** Acc-only 剥离；经 `applyMammothCystBulgingGaze` → `playMonsterSkill` 结算命中后 debuff 与压力。
- `darkest-mid-boss-skill-acc-core.ts`：#464–#466 已通用区分「含 verified 效果线」与「效果线 hold」，本刀无需改 core。

- `monster-effect-plan.test.ts`：回归计数 +1（Mammoth Bulging Gaze）。
- `darkest-mammoth-cyst-skills-acc.test.ts`：Bulging Gaze 命中 debuff+stress / 落空 / applyCommand。

## 仍 hold

- Revivify；Templar 余招；最终战 p018–p020 效果线。
- `combatReady` 仍 **false**；Pit Toss / Room Tile / Phase 6 / 完整 Boss AI。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/data/src/normalize/normalize.test.ts \
  packages/engine/src/monster-effect-plan.test.ts \
  packages/engine/src/boss/darkest-mammoth-cyst-skills-acc.test.ts
```
