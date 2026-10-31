# Fanatic · Pyre Burn the Heretic 最小结算

基线 `baa9f6dd`（#460）。Kyries 批：与 HoD AI、Ancestor2 AI 分三 PR；本 PR 只做 Pyre Burn。

依据：`monster_large:p011–p013` 卡面（R-001、R-048）、**R-136**（自动命中、99 Damage、无 Acc/Crit/攻击骰）、规格书 R20–21/R29/R39。

## 卡面字段（I–III 共用结构）

| 字段         | 值                                       |
| ------------ | ---------------------------------------- |
| 技能         | slot **1** · Burn the Heretic            |
| 目标         | **Closest**                              |
| 射程         | **0**（`range` 图标旁数字）              |
| 效果         | `{damage}99`（无 Acc 行）                |
| 选招         | 四姿态 `stanceGroups` 均指向 skill **1** |
| Life / Speed | 各等级卡面 footer（如 I：22 / **0**）    |

## 本刀接通

- **结算**：`playPyreSkill`（`packages/engine/src/boss/pyre-skill.ts`）校验已核实卡面签名与同区英雄；99 伤害走 `resolveAttackDamage`、饰品、被动、反击与死门；**不**消费攻击 RNG。
- **怪物回合**：Pyre 先攻轮到后走公开命令链 **`prepareMonsterAction` →（必要时 `moveMonsterToRange`）→ `playMonsterSkill`**；`battle-monster.ts` 对 Pyre 卡 id 转调 `playPyreSkill`。目标 **Closest** 与 Fanatic 本体共用 `selectMonsterTarget`；射程 0 时仅同区可结算。
- **Fanatic I–III**：I 开战 Pyre 仍由 `applyFanaticIPyreBattleStart`；II/III 行为见 [phase5-ruins-boss-ii-iii-2026-10-31.md](phase5-ruins-boss-ii-iii-2026-10-31.md) §Pyre。本刀不新增显式 `applyFanaticPyreBurn` 命令（对标 Collected Vestal / 无 Acc 壳，非 HoD Acc 切片）。
- **`fanatic-i.ts`**：脚本 `notes` 移除 Pyre Burn hold 文案。

## 仍 hold

- 正式 Fanatic Boss **Room 生产几何**、R-121 边缘房选图、自然 II/III 战役验收、Phase 6 / Stygian。
- Pit Toss **d10→Pit Area**（Templar）与 Fanatic Sentence **同区丢 Pyre** 几何边界：本 PR 不改动既有 Pit Toss / Sentence 运行时。
- **`combatReady`** 仍为 false；不宣称整场 Fanatic 闭环。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/engine/src/boss/pyre-skill.test.ts \
  packages/engine/src/boss/fanatic-i-combat-runtime.test.ts \
  packages/engine/src/boss/fanatic-i-skill-ai.test.ts
```

`ruins-higher.test.ts` 中 Pyre I–III 用例仍覆盖同级 Boss 夹具回归。
