# 图标词典 v1.5 更新记录（2026-10-07）

Kyries 于 2026-10-07 批准 batch-05（39 条）。只改这 39 条，其余与 v1.4 相同。只含含义，不含图片。

合并和标成装饰的行，`source` 为 `kyries_approved_proposal_2026-10-07`。这是 schema 里已有的枚举，本版没有新增 source。本批没有留下的行。

## 17 条并入已确认图标

合并行复制目标的 status、含义、kind、key、value、`value_in_glyph`、`rulebook_refs`。备注写 `merged_into=<iconId>`。`previous_status` 为 `unreviewed`，`previous_meaning_en` 为空。group 保持提取时的分组，不改成目标的 group。

| rank | 并入 | key |
| --- | --- | --- |
| 580 | r1 | damage |
| 661 | r352 | trap |
| 667 | r368 | debuff |
| 747 | r179 | d10 |
| 760 | r352 | trap |
| 761 | r412 | debuff_resist |
| 787 | r27 | stance_ranged_lit |
| 812 | r250 | bleed_resist |
| 825 | r36 | stance_support_lit |
| 830 | r26 | stance_defensive_lit |
| 842 | r288 | heal |
| 853 | r415 | buff |
| 863 | r35 | stance_aggressive_lit |
| 871 | r346 | light |
| 872 | r25 | heal |
| 873 | r25 | heal |
| 875 | r15 | stun |

r761、r812 在怪物「Immunities」栏。它们沿用目标的 resist key（`debuff_resist`、`bleed_resist`），与 batch-02 的 r551→r250 相同。

r871 并入 r346，原样继承「可能为光照降低」这句暂定含义，没有改写成确定的光照降低。

r872、r873 并入 r25（治疗，图标内数字）。目标的 `value` 是空的：印在图标里的数字不是字形值。r873 的数字被叠层挡住，本版没有给它补一个治疗数值。

r842 与 r873 的 key 都是 `heal`，`value` 都是空。

## 22 条标成装饰

rank 535、664、688、694、697、703、710、740、763、766、777、794、797、806、816、837、841、843、862、891、899、905。key 为 `decor`。

## 计数

| 范围 | confirmed | confirmed_rulebook | needs_review | decor | unsure | unreviewed |
| --- | --- | --- | --- | --- | --- | --- |
| 前 525 | 417 | 44 | 10 | 54 | 0 | 0 |
| 全部 906 | 489 | 44 | 53 | 92 | 0 | 228 |

confirmed + confirmed_rulebook + decor 的卡面出现次数：13,925 / 14,517（95.92%）。

v1.4 的变更说明仍在 `icon-dictionary-v1.4-CHANGELOG.md`。v1.3 的说明仍在 `icon-dictionary-v1.3-CHANGELOG.md`。v1.2 的说明仍在 `icon-dictionary-v1.2-CHANGELOG.md`。v1.1 的说明仍在 `icon-dictionary-v1.1-CHANGELOG.md`。
