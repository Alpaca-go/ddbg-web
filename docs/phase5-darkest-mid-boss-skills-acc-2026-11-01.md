# 最暗中途 Boss · Acc 攻击技能（2026-11-01）

基线：`78880991`（#457 Gestating Heart 无 Acc 文档）。对标 #455 Ancestor2、#456 HoD 的 Acc-only 最小结算。

## 盘点（`monster_large` + 已接运行时）

| 任务 | 主体卡 | verification | Acc 攻击招 | 本刀 |
|------|--------|--------------|-----------|------|
| quest:p016 | `monster_large:p017` Shuffling Horror | **unverified**（`icon:8707d5d8cf`） | Lacerate / Undulations / Echoing Disassembly 均有 Acc 行 | **不接** Lacerate Acc 命令；Undulations / Echoing 仍用既有几何命令；文档 + `shuffling-horror-skills-acc.test.ts` |
| quest:p017 | `p015` Impaler + `p014` Warlord | verified | 各 3 招 Acc（Impaler Body Slam 等） | `darkest-templars-skills-acc.ts` + 显式命令 |
| quest:p018 | `monster_large:p016` Mammoth Cyst | verified | Bulging Gaze / Digestion（Acc 12）；Revivify Self 无 Acc 伤害 | `darkest-mammoth-cyst-skills-acc.ts`（不含 Revivify） |

`combatReady` 全程 **false**；Pit Toss / White Cell Teleport / Room Tile 几何 **hold**。

## 接线模式

- 共享：`darkest-mid-boss-skill-acc-core.ts` → `selectMonsterTarget` + `playMonsterSkill`。
- `resolveMonsterSkill`：`monster_large:p014`–`p016` 与最终战 p018/p020 相同，无 `verified_monster_effects` 时剥离效果行，只结算 Acc/Crit/伤害。
- 显式命令经 `applyCommand` 白名单（见 `command.ts`）。

### Templars（`boss_ability:p028` / `p026`）

| 实体 | Slot | 技能 | 目标 |
|------|------|------|------|
| Impaler | 1 | Torment | Crowded |
| Impaler | 2 | Body Slam | Closest（Pit Toss 命中后几何 **hold**） |
| Impaler | 3 | Revelation | Closest |
| Warlord | 1 | Torment | Crowded |
| Warlord | 2 | Stinger Shot | Furthest |
| Warlord | 3 | Revelation | Closest |

### Mammoth Cyst（`boss_ability:p029`）

| Slot | 技能 | 目标 | Acc |
|------|------|------|-----|
| 1 | Bulging Gaze | Crowded | 12 |
| 2 | Digestion | Crowded | 12 |
| 3 | Revivify | Self | —（不接 Acc 路径） |

Summon White Cell 仍用 `applyMammothCystSummonWhiteCell`。

### Shuffling Horror（`boss_ability:p033`）

- 卡级 **verified**（A-10 清除 `8707d5d8cf`）。
- slot 2–3 与 boss_ability 一致，继续 **Undulations / Echoing Disassembly** 专用命令，不重复 Acc 模块。
- slot 1 **Lacerate**：`applyShufflingHorrorLacerate`（Acc-only；bleed 效果线 hold → A-01）。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/engine/src/boss/darkest-templars-skills-acc.test.ts \
  packages/engine/src/boss/darkest-mammoth-cyst-skills-acc.test.ts \
  packages/engine/src/boss/shuffling-horror-skills-acc.test.ts
```
