# 图标词典 v1.3 更新记录（2026-10-07）

Kyries 于 2026-10-07 批准 batch-01（40 条）和 batch-02（29 条），同一版 v1.3。只改这 69 条，其余与 v1.2 相同。只含含义，不含图片。

合并与标成装饰的行，以及本版新留下的行，`source` 为 `kyries_approved_proposal_2026-10-07`。r195、r216 的 `source` 仍是 `followup_proposal_2026-10-07`：留下这个决定已批准，v1.2 里未批准的提议含义仍在 `proposal`，没有当成正式命名（R-048）。

## 31 条并入已确认图标

合并行复制目标的 status、含义、kind、key、value、`rulebook_refs`。备注写 `merged_into=<iconId>`。`previous_status` 为 `unreviewed`，`previous_meaning_en` 为空。

| rank | 并入 | key |
| --- | --- | --- |
| 563 | r275 | skill_number |
| 586 | r412 | debuff_resist |
| 606 | r318 | bleed |
| 618 | r360 | bleed_resist |
| 621 | r229 | shuffle |
| 625 | r73 | shuffle_resist |
| 632 | r257 | d10 |
| 634 | r17 | stance_support_lit |
| 665 | r334 | skill_number |
| 684 | r255 | shuffle_resist |
| 695 | r444 | skill_number |
| 698 | r385 | monster_stance_slot_with_skill_numbers |
| 713 | r226 | light |
| 723 | r231 | summon |
| 751 | r255 | shuffle_resist |
| 773 | r173 | buff |
| 786 | r311 | buff |
| 790 | r334 | skill_number |
| 796 | r226 | light |
| 811 | r173 | buff |
| 826 | r56 | skill_number |
| 832 | r493 | skill_number |
| 835 | r333 | skill_number |
| 844 | r148 | skill_number |
| 851 | r197 | skill_number |
| 859 | r234 | blight_resist |
| 860 | r75 | level_badge |
| 879 | r169 | light |
| 883 | r260 | level_badge |
| 884 | r333 | skill_number |
| 897 | r250 | bleed_resist |

r625 并入 r73（位移抗性），不是大型怪变体 r255。r698 并入 r385；栏内编号是印刷文字，含义仍带 “confirm”（见 `hedged_confirmed_meanings`）。

## 6 条标成装饰

rank 546、608、690、709、821、852。key 为 `decor`。

## 3 条留下，仍是 needs_review

key 为 `pending_<iconId>`，kind 为空，含义只描述外观。

- rank 195、216：维持 v1.2 的占位，不并入含义本身仍待确认的条目。
- rank 539：从 `unreviewed` 改为 `needs_review`。技能卡背面英雄名后的插画，不并入 r490。没有新的正式 key。

## batch-02：9 条并入已确认图标

合并行同样复制目标的 status、含义、kind、key、value、`rulebook_refs`。备注写 `merged_into=<iconId>`。

| rank | 并入 | key |
| --- | --- | --- |
| 526 | r89 | debuff |
| 551 | r250 | bleed_resist |
| 588 | r38 | stance_defensive_monster_slot |
| 600 | r106 | bleed |
| 605 | r57 | stance_aggressive_monster_slot |
| 658 | r487 | text_plate |
| 718 | r344 | debuff |
| 808 | r44 | stance_ranged_monster_slot |
| 834 | r254 | blight_resist |

## batch-02：3 条标成装饰

rank 566、807、889。key 为 `decor`。

## batch-02：17 条留下，仍是 needs_review

key 为 `pending_<iconId>`，kind 为空，含义只描述外观。没有写成 `skill_art`。

技能卡正背面插画不跨面合并。每条都是单独的 `pending_`，不并入对面那张插画：

rank 528、533、540、550、555、559、570、571、591、594、609、614、617、626、628。

另外留下：rank 714（饰品插图，不并入 r468）、rank 836（灰色碎块，不并入枯萎）。

## 计数

| 范围 | confirmed | confirmed_rulebook | needs_review | decor | unsure | unreviewed |
| --- | --- | --- | --- | --- | --- | --- |
| 前 525 | 417 | 44 | 10 | 54 | 0 | 0 |
| 全部 906 | 464 | 44 | 28 | 63 | 0 | 307 |

confirmed + confirmed_rulebook + decor 的卡面出现次数：13,839 / 14,517（95.33%）。

v1.2 的变更说明仍在 `icon-dictionary-v1.2-CHANGELOG.md`。v1.1 的说明仍在 `icon-dictionary-v1.1-CHANGELOG.md`。
