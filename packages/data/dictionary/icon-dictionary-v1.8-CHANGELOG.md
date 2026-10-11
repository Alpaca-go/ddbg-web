# 图标词典 v1.8 更新记录（2026-10-08）

## 2026-10-11 补充：Wound 同义图标合并（R-061）

Kyries 明确确认黑心红光 = Wound / 创伤。本次对照完整印刷后，将 rank 544 / 668 / 693 / 731 / 793（`8466c441ea` / `2c1824ea21` / `6888d0cf12` / `d42d7955d3` / `48ca9f366e`）从 needs_review 并入已有 `wound`，kind 为 `damage_type`，value 为空。最后一个为旋转图标。保留原始 iconId 与旧状态说明，JSON / CSV 同步；source 为新增枚举 `kyries_review_2026-10-11`。

基准为原有 `163b31751a`（player aid / Core p.27）与 `ccade5e7ad`。总条数 976 不变；confirmed 636 → 641、needs_review 37 → 32，其余计数不变。下文是 2026-10-08 的历史审批记录，其中 rank 544 已被本次批准解除。

规范化层批量清理由这些 hash 单独造成的 unverified；Bad Gambler 另有 `adcab0541a`，仍单独保留该原因。详见 [四核心整批接线清单](../../../docs/phase2-four-core-skills-2026-10-11.md)。

Kyries 批准 batch-08 里 `proposed_action` 为 categorize 的 79 条。这些 rank 本来就在词典里。本版只改这 79 条，总条数仍是 976。只含含义，不含图片。

`source` 为 `kyries_approved_proposal_2026-10-07`。这是 schema 里已有的枚举，本版没有新增 source。

核对时这 79 条并不全是 `needs_review`：31 条是 `needs_review`，48 条仍是 `unreviewed`（key 为 `unknown_<iconId>`，没有含义）。两条都按同一条归类规则改，没有先改状态再归类。

## 79 条归入技能插画

归入已有 key `skill_art`。不是新造 `skill_picture`，也不是 `merge_into`。

每条的字段：kind 为 `other`，status 为 `confirmed`，含义是通用句「技能插画 / Skill picture」，value 为空，`value_in_glyph` 为 false。不照抄词典里已有 `skill_art` 行上更长的正面或背面说明（例如 r274、r431）。group 保持提取时的 `skill_art`。`previous_status` 与 `previous_meaning_en` 记下 v1.7 的值。

正背面、不同英雄各自保留 iconId，不合并。r539（HIGHWAYMAN Wicked Slice 背面）不并入 r490（JESTER 背面）。

## 3 条留下，仍是 needs_review

批准稿里 `proposed_action` 为 keep 的三条没有改。

- rank 195：效果行上的小标记，红块与金块被斜线分开。挡着 ARBALEST「Rallying Flare」。
- rank 544：效果区的黑心红光小图标。挡着 HELLION「Bleed Out」。
- rank 569：效果区的蓝色盾形小图标。挡着 JESTER「Dirk Stab」。

## 计数

| 范围 | confirmed | confirmed_rulebook | needs_review | decor | unsure | unreviewed |
| --- | --- | --- | --- | --- | --- | --- |
| 前 525 | 417 | 44 | 10 | 54 | 0 | 0 |
| 全部 976 | 636 | 44 | 37 | 112 | 0 | 147 |

前 525 条与 v1.7 相同。confirmed + confirmed_rulebook + decor 的卡面出现次数：14,253 / 14,588（97.70%）。v1.7 是 14,016 / 14,588（96.08%）。

v1.7 的变更说明仍在 `icon-dictionary-v1.7-CHANGELOG.md`。v1.6 的说明仍在 `icon-dictionary-v1.6-CHANGELOG.md`。v1.5 的说明仍在 `icon-dictionary-v1.5-CHANGELOG.md`。v1.4 的说明仍在 `icon-dictionary-v1.4-CHANGELOG.md`。v1.3 的说明仍在 `icon-dictionary-v1.3-CHANGELOG.md`。v1.2 的说明仍在 `icon-dictionary-v1.2-CHANGELOG.md`。v1.1 的说明仍在 `icon-dictionary-v1.1-CHANGELOG.md`。
