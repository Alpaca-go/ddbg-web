# A-01 · Shuffling Horror Lacerate 效果线最小结算

**日期**：2026-11-01  
**基线**：`3e014320`（#477 A-11 Lacerate Acc 已合）  
**切片**：P0 A-01 · 单卡单招（`monster_large:p017` slot 1）

## 卡面身份

| 字段   | 印刷值                                         |
| ------ | ---------------------------------------------- |
| id     | `monster_large:p017`                           |
| name   | Shuffling Horror                               |
| level  | 3                                              |
| pages  | [17]                                           |
| slot 1 | Lacerate · Closest · range 1 · Acc 11 · Crit 1 |

## 效果线（实测 `effect_lines`）

| 签名                         | effects                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------ |
| `{target_effects}3{bleed}3t` | `[{ type: "status", scope: "target", kind: "bleed", amount: 3, duration: 3 }]` |

图标 `target_effects`（a38154c523）、`bleed`（784ec4fe7a）均为 **confirmed**。

依据：`monster_large` FRONT **p017**、[phase5-a11-shuffling-horror-lacerate-acc-2026-11-01.md](phase5-a11-shuffling-horror-lacerate-acc-2026-11-01.md)；对照 Ghoul / Ancestor2 Refashion / HoD Puncture 同型 bleed 条目；规则 R-001 / R-048。

## 本刀接通

- `verified-monster-effects.ts` 增 **`monster_large:p017` slot 1** 计划。
- 规范化层经 `writeNormalizedCorebox` 写入 `monster_large.json` 的 `verified_monster_effects`。
- `monster-skill.ts` 对 p017 slot 1 已有计划时**不再** Acc-only 剥离；经 `applyShufflingHorrorLacerate` → `playMonsterSkill` → Closest 单目标命中后结算 3 流血 3t。
- `shuffling-horror-skills-acc.test.ts`：计划断言 + 命中/落空流血。

Undulations（slot 2）/ Echoing Disassembly（slot 3）仍走专用几何命令，本刀不重复。

## 仍 hold

- `combatReady` 仍 **false**；Room Tile 正式几何 / Phase 6 / 完整 Boss AI。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/data/src/normalize/normalize.test.ts \
  packages/engine/src/monster-effect-plan.test.ts \
  packages/engine/src/boss/shuffling-horror-skills-acc.test.ts
```

## 建议下一刀

- **A-04** 或其它 mid-boss 几何 / AI 切片。
- 或停，等 Kyries 裁定队列。
