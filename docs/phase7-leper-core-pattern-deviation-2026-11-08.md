# Leper II/III 相对核心接线模式（PR #618，Q 已关闭）

## 核心模式（核心 11 名）

- `verified-hero-layout` → `verified-warrens-leper-higher`（逐卡签名闸 + 必要 icon key 覆盖）→ `verified-hero-statuses` 等。
- 不改全局 `icon-dictionary`；**核心 11 名** `verified-hero-*` 条目零改动（仅追加 Leper 条）。
- 引擎无本批专用通用分支。

## 本 PR 逐卡覆盖摘要（R-200，Q-163～Q-166 已关闭）

| 卡 | 覆盖要点 |
|----|----------|
| p281/p282 Purge | Buff 去重；III stats heal→damage |
| p284/p285 Revenge | `20ffe98e2d` heal→`target_effects` |
| p287/p288 Withstand | 去误 `{buff}`；`{range} Self` 头行 + Protection/Mark |
| p290/p291 Solemnity | stats `{range} Self`；Heal+stress 单行；`f18923574c`→stress |
| p293/p294 Intimidate | `d4329c2a97`→mark；Ignores 拆 Protection/Guard；`9ffbd6087a` **不入结算**（非 light）；Debuff 独立行 |

## Crit 无伤害

Revenge / Withstand / Solemnity 等 stats 仅 Crit/Acc、无伤害数字：按规则书 R19–R20 / **R-031**（Acc 命中、Crit 阈值；不造伤害；暴击仍压力 −1）。**不另开 Q**。

## 审计

**14/14 绿**（`leper-higher-skills.test.ts`）。
