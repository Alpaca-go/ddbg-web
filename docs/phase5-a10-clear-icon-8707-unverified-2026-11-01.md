# A-10 · 清除 icon `8707d5d8cf` 卡级 unverified

**日期**：2026-11-01  
**基线**：`b6cfce85`（#475 Mammoth Revivify 已合）  
**切片**：P0 A-10 · 仅 data normalize 快照 + 回归测；**不开** Lacerate Acc / `verified_monster_effects`

## 根因

| 层 | 状态 |
| --- | --- |
| 词典 v1.8 | `8707d5d8cf` 已 `confirmed` · `key=summon`（Q-47 batch-2，`icon-dictionary-v1.8`） |
| 规范化 `createIconLookup` | 无硬编码 pending 名单；`noteIcon` 仅对 `naming === "unverified"` 写入 `icon:<id>` |
| 已提交 `monster_large.json` | 在 **#464**（Templar Revelation）随 `writeNormalizedCorebox` 再生：`pending_8707d5d8cf` → `summon`，卡级 `unverified` 已清 |
| 引擎 Acc 调查测 | `gestating-heart-skills-acc` / `shuffling-horror-skills-acc` 仍断言旧 `icon:8707d5d8cf` 原因（与 JSON 不同步） |

本刀在基线 `b6cfce85` 上 **重跑** `pnpm -F @ddbg/pipeline normalize`（`writeNormalizedCorebox`），输出与仓库 **无 diff**；交付为 normalize 回归断言 + 引擎测对齐 + 本文档。

## 变更卡 id（规范化 verification）

| 卡 id | 名称 | 变更 |
| --- | --- | --- |
| `monster_large:p017` | Shuffling Horror | `verification`: `{ unverified: true, reasons: ["icon:8707d5d8cf"] }` → `{ unverified: false, reasons: [] }`；卡面 `8707d5d8cf` → `summon` / `naming: confirmed` |
| `monster_large:p019` | Gestating Heart | 同上 |

`monster_large.json` 文件级统计：`verified` 20 / `unverified` 0（原 18 / 2，已在 #464 写入）。

## 仍 hold（本刀刻意不做）

- **A-11**：`monster_large:p017` slot 1 **Lacerate** 显式 Acc 命令 / `verified_monster_effects`。
- Gestating Heart **Dispersion** 仍无 damage 图标，经 `resolveMonsterSkill` 仍拒绝（非 R-048 未验证门）。
- Shuffling **Undulations / Echoing Disassembly** 战斗仍走 `darkest-shuffling-horror-combat-runtime` 几何；`combatReady` 不变。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/data/src/normalize/normalize.test.ts \
  packages/engine/src/boss/gestating-heart-skills-acc.test.ts \
  packages/engine/src/boss/shuffling-horror-skills-acc.test.ts
```

## 建议下一刀

**A-11 · Shuffling Horror Lacerate Acc**（卡面已 verified，可接最小 Acc 路径）；或暂停接 A-04 等其它 A 候选。
