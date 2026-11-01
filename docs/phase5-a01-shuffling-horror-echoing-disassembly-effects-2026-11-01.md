# A-01 · Shuffling Horror Echoing Disassembly 效果线最小结算

**日期**：2026-11-01  
**基线**：`959f8b3b`（#479 Impaler Body Slam stun 已合）  
**切片**：P0 A-01 · 单卡单招（`monster_large:p017` slot 3）

## 候选与取舍

| 卡 | 招 | 效果线 | 本刀 |
| --- | --- | --- | --- |
| `p017` Shuffling Horror | Echoing Disassembly | `{target_effects}{stress}+2,{light}-1,{summon}`（图标 confirmed） | **接 stress + light** |
| `p017` Shuffling Horror | Undulations | 姿态洗混 | 既有几何命令，本刀不重复 |
| `p017` Shuffling Horror | Lacerate | `{target_effects}3{bleed}3t` | #478 已合 |
| summon 名单 / 姿态占位 | Cultist Priest + Malignant Growth | boss_ability:p033 | **保留**既有 `applyShufflingHorrorEchoingDisassembly` 召唤逻辑 |

依据：`monster_large` FRONT **p017**、[phase5-a11-shuffling-horror-lacerate-acc-2026-11-01.md](phase5-a11-shuffling-horror-lacerate-acc-2026-11-01.md)、[phase5-a01-hod-know-this-effects-2026-11-01.md](phase5-a01-hod-know-this-effects-2026-11-01.md)（Crowded 压力 + 全局 Torch）；规则 R-001 / R-048。

## 本刀接通

- `verified-monster-effects.ts` 增 **`monster_large:p017` slot 3** 计划：`stress +2` + `light -1`（scope target）；签名 `{target_effects}{stress}+2,{light}-1,{summon}`（**summon 仅防漂移，不生成效果原语**）。
- 规范化层经 `writeNormalizedCorebox` 写入 `monster_large.json` 的 `verified_monster_effects`。
- `monster-effect-plan.ts`：`{summon}` 在 compile 时剥离（不生成原语；召唤仍走专用几何命令）。
- `darkest-shuffling-horror-combat-runtime.ts`：在既有召唤之外，Crowded 选区后对该区英雄 +2 压力（对齐 Know This / `playMonsterSkillTargets` 排序与人数上限），全局 `battle.light` −1 钳制 0–5（对齐 Perfect Replication / HoD Know This）。
- `monster-effect-plan.test.ts`：回归计数 +1。
- `darkest-shuffling-horror-combat-runtime.test.ts`：压力/光照与召唤并存；卡目录改读规范化 `monster_large:p017`。

## 仍 hold

- Undulations 效果线；Echoing **Acc/伤害** 壳（本刀不改 Acc 模块）；Room Tile 正式几何；Pit Toss / White Cell。
- `combatReady` 仍 **false**；Phase 6 / Stygian / 完整 Boss AI。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/data/src/normalize/normalize.test.ts \
  packages/engine/src/monster-effect-plan.test.ts \
  packages/engine/src/boss/darkest-shuffling-horror-combat-runtime.test.ts
```

## 建议下一刀

- **C-008 II/III admission** 或 **A-7 收尾** 或停。
