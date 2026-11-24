# A-11 · Shuffling Horror Lacerate Acc 最小命令

**日期**：2026-11-01  
**基线**：`d1446451`（#476 A-10 已合；`monster_large:p017` 卡级 verified）

## 依据

- [phase5-a5-remaining-a-candidates-2026-11-01.md](phase5-a5-remaining-a-candidates-2026-11-01.md) **A-11**
- [phase5-darkest-mid-boss-skills-acc-2026-11-01.md](phase5-darkest-mid-boss-skills-acc-2026-11-01.md) · `boss_ability:p033`
- [phase5-a10-clear-icon-8707-unverified-2026-11-01.md](phase5-a10-clear-icon-8707-unverified-2026-11-01.md) 建议下一刀

## 卡面（`monster_large:p017` slot 1）

| 字段   | 印刷值                                                               |
| ------ | -------------------------------------------------------------------- |
| 名称   | Lacerate                                                             |
| 目标   | Closest                                                              |
| 射程   | 1                                                                    |
| Acc    | 11                                                                   |
| Crit   | 1                                                                    |
| 效果线 | `{target_effects} 3 bleed 3t`（**未**接 `verified_monster_effects`） |

Undulations（slot 2）/ Echoing Disassembly（slot 3）仍走 `applyShufflingHorrorUndulations` / `applyShufflingHorrorEchoingDisassembly`，本刀不重复 Acc 模块。

## 本刀接通

- 新增 `darkest-shuffling-horror-skills-acc.ts` → `runDarkestMidBossSkillAcc`（`darkest-mid-boss-skill-acc-core.ts`）。
- 命令 **`applyShufflingHorrorLacerate`**（`command.ts` 白名单）。
- `monster-skill.ts`：`monster_large:p017` 纳入 mid-boss **Acc-only** 剥离集（无 `verified_monster_effects` 时去掉 effect_lines，只结算 Acc/Crit/伤害）。
- `darkest-mid-boss-runtime.ts`：`quest:p016` wiring hold 文案更新。

## 仍 hold

- Lacerate bleed 3t 效果线（A-01 单招切片候选）。
- `combatReady` 仍 **false**；Room Tile 正式几何 / Pit Toss / Phase 6 / 完整 Boss AI。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/engine/src/boss/shuffling-horror-skills-acc.test.ts \
  packages/engine/src/boss/darkest-mammoth-cyst-skills-acc.test.ts \
  packages/engine/src/boss/darkest-templars-skills-acc.test.ts \
  packages/engine/src/boss/darkest-mid-boss-runtime.test.ts
```

## 建议下一刀

- **A-01**：`monster_large:p017` slot 1 Lacerate `{bleed}3t`（图标已 confirmed，需 `verified_monster_effects` + 单测）。
- **A-04** 或其它 mid-boss 几何 / AI 切片。
- 或停，等 Kyries 裁定队列。
