# Leper II/III 相对核心接线模式偏差清单（PR #618）

## 核心模式（核心 11 名）

- 数据：`verified-hero-layout` → `verified-warrens-leper-higher`（**本批仅 Purge**）→ `verified-hero-statuses` / `support` / `ranges` / `damage`。
- 对**印刷转录已有的 `effect_lines` / `stats_line`** 做 **signature 断言**，用 `verified_*` 注解消费；不改全局 `icon-dictionary`。
- **不**整行重写 `effect_lines`（Adrenaline Rush 等极少数布局校正除外，且有印刷签名闸）。
- 引擎：`hero-skill.ts` / `skill-status.ts` 不因扩展英雄改通用分支。
- **核心 11 名**既有 `verified-hero-*` 条目：**零改动**（本分支只追加 Leper Purge 两条状态条目）。

## #618 历史偏差（已在本 commit 回退或收口）

| 类别 | 原 #618 做法 | 现状 |
|------|----------------|------|
| `verified-warrens-leper-higher.ts` | 整行重写 Revenge / Withstand / Solemnity / Intimidate | **已删除**；仅保留 Purge II/III |
| Purge Buff 行 | 整行改写 | **保留最小增量**：印刷双 `{buff}` 去重为单一 Buff 2t（签名校验），Push 行不动 |
| Purge III stats | `heal`→`damage` 键覆盖 | **保留**（Kyries 已确认 19/12 为伤害） |
| `verified-hero-statuses` | 8 卡状态注解 | **仅 p281/p282**；其余等 Q |
| `schema` `verified_self_*` | 为 Solemnity 增字段 | **已移除** |
| `hero-skill.ts` | `verified_self_heal` 捷径 | **已回退** |
| `skill-status.ts` | `{range}Self` 头行可无 status 组消费 | **已回退** |
| `leper-higher-skills` 测试 | 14/14 强制全绿 | **6 绿 + 8 待 Q 允许红** |

## 仍待 Q（审计 **红**，不猜）

| 卡 | Q | 阻塞原因 |
|----|---|----------|
| p284/p285 Revenge | Q-163 | 目标 Mark/Debuff 读数已定，但伤害与其它 Buff 未确认；印刷行首误 `heal` 未做核心式逐段覆盖 |
| p287/p288 Withstand | Q-165 | Protection 时长与多余 `{buff}` 未确认；无 `{range}Self` 头行 |
| p290/p291 Solemnity | Q-166 | 读数已定，待正式收口；`f18923574c` 误 shuffle、双 Buff 需 Kyries 签字覆盖策略 |
| p293/p294 Intimidate | Q-164 | `{light}` / 自身 Buff / `target_effects` 误识别；Ignores 行未按 Protection+Guard 核心句式注解 |

## 当前审计预期

- **绿（6）**：p275/p276/p278/p279、p281/p282  
- **红（8）**：p284、p285、p287、p288、p290、p291、p293、p294  

## Kyries 已确认、本 PR 保留接线

- Purge II/III：自身 Buff 2t；III stats 伤害 19/12（非 heal）
