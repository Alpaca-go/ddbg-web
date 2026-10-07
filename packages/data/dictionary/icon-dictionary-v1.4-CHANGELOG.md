# 图标词典 v1.4 更新记录（2026-10-07）

Kyries 于 2026-10-07 批准 batch-04（40 条）。只改这 40 条，其余与 v1.3 相同。只含含义，不含图片。

合并、标成装饰，以及留下的行，`source` 为 `kyries_approved_proposal_2026-10-07`。这是 schema 里已有的枚举，本版没有新增 source。

## 8 条并入已确认图标

合并行复制目标的 status、含义、kind、key、value、`value_in_glyph`、`rulebook_refs`。备注写 `merged_into=<iconId>`。`previous_status` 为 `unreviewed`，`previous_meaning_en` 为空。group 保持提取时的分组，不改成目标的 group。

| rank | 并入 | key |
| --- | --- | --- |
| 672 | r355 | trap |
| 696 | r106 | bleed |
| 716 | r89 | debuff |
| 720 | r487 | text_plate |
| 735 | r27 | stance_ranged_lit |
| 748 | r36 | stance_support_lit |
| 749 | r26 | stance_defensive_lit |
| 752 | r35 | stance_aggressive_lit |

## 7 条标成装饰

rank 576、613、635、647、676、686、753。key 为 `decor`。

## 25 条留下，仍是 needs_review

key 为 `pending_<iconId>`，kind 为空，含义只描述外观。没有写成 `skill_art`，也没有并入最近的相似图标（R-048）。

技能卡杂项切图。每条都是单独的 `pending_`：

rank 527、531、544、549、553、561、562、564、569、572、597、598、599、611、619、620、636。

另外留下：

- rank 603：饰品插图，不并入 r468。
- rank 640：金黄锯齿剪影，不并入压力。
- rank 642：合上的封蜡古书，没有同形的已确认目标。
- rank 666：红色圣杯或高脚杯，没有同形的已确认目标。
- rank 668：目视不够清楚，不并入召唤。
- rank 693：黑心加红光锯齿边，不并入压力。
- rank 702：颅骨加红色下箭头，不猜名。
- rank 715：红色心形或盾形碎块，不并入支援未点亮。

## 计数

| 范围 | confirmed | confirmed_rulebook | needs_review | decor | unsure | unreviewed |
| --- | --- | --- | --- | --- | --- | --- |
| 前 525 | 417 | 44 | 10 | 54 | 0 | 0 |
| 全部 906 | 472 | 44 | 53 | 70 | 0 | 267 |

confirmed + confirmed_rulebook + decor 的卡面出现次数：13,872 / 14,517（95.56%）。

v1.3 的变更说明仍在 `icon-dictionary-v1.3-CHANGELOG.md`。v1.2 的说明仍在 `icon-dictionary-v1.2-CHANGELOG.md`。v1.1 的说明仍在 `icon-dictionary-v1.1-CHANGELOG.md`。
