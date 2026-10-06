# 图标词典 v1.2 更新记录（2026-10-07）

Kyries 于 2026-10-07 批准 `followup-31-proposal.csv` 的 31 条决定。只改这 31 条，其余与 v1.1 相同。只含含义，不含图片。

合并与标成装饰的行，`source` 为 `kyries_approved_proposal_2026-10-07`。留下的 10 条 `source` 仍是 `followup_proposal_2026-10-07`：留下这个决定已批准，提议的含义没有批准。

## 18 条并入已确认图标

合并行复制目标的 status、含义、kind、key、value、`rulebook_refs`。备注写 `merged_into=<iconId>`。

| rank | 并入 | key |
| --- | --- | --- |
| 182 | r3 | target_hero |
| 241 | r105 | start_monster_ranged |
| 283 | r364 | start_monster_support |
| 320 | r5 | target_monster |
| 350 | r124 | occupancy_pips |
| 359 | r142 | start_monster_defensive |
| 376 | r105 | start_monster_ranged |
| 391 | r340 | start_monster_support |
| 394 | r152 | occupancy_pips |
| 397 | r4 | speed |
| 398 | r22 | dodge |
| 423 | r306 | start_hero_support |
| 424 | r65 | loot_token_placement |
| 453 | r215 | start_monster_aggressive |
| 466 | r401 | disease |
| 474 | r221 | start_hero_defensive |
| 477 | r340 | start_monster_support |
| 504 | r364 | start_monster_support |

r397 是 r4 速度图形旋转 180°。饰品句子用「速度」读起来别扭，Kyries 仍批准合并。见 `inconsistencies.rotated_glyph_merge`。

## 3 条标成装饰

rank 239、338、351。key 为 `decor`。

## 10 条留下，仍是 needs_review

key 为 `pending_<iconId>`，kind 为空，含义只描述外观。v1.1 的提议挪到 `proposal`，不作为正式命名（R-048）。

rank：195、216、232、296、307、315、323、335、379、478。

rank 379 不再使用 `start_*_any`。127、132、258、259 仍用 `any`。

## 计数

| 范围 | confirmed | confirmed_rulebook | needs_review | decor | unsure | unreviewed |
| --- | --- | --- | --- | --- | --- | --- |
| 前 525 | 417 | 44 | 10 | 54 | 0 | 0 |
| 全部 906 | 424 | 44 | 10 | 54 | 0 | 374 |

confirmed + confirmed_rulebook + decor 的卡面出现次数：13,747 / 14,517（94.7%）。

v1.1 的变更说明仍在 `icon-dictionary-v1.1-CHANGELOG.md`。
