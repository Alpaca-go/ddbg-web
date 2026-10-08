# 图标词典 v1.6 更新记录（2026-10-07）

Kyries 于 2026-10-07 批准 batch-06（34 条）。只改这 34 条，其余与 v1.5 相同。只含含义，不含图片。

合并、标成装饰，以及留下的行，`source` 为 `kyries_approved_proposal_2026-10-07`。这是 schema 里已有的枚举，本版没有新增 source。

## 1 条并入已确认图标

合并行复制目标的 status、含义、kind、key、value、`value_in_glyph`、`rulebook_refs`。备注写 `merged_into=<iconId>`。`previous_status` 为 `unreviewed`，`previous_meaning_en` 为空。group 保持提取时的分组，不改成目标的 group。

| rank | 并入 | key |
| --- | --- | --- |
| 833 | r240 | food |

r833 印出来是旋转 180° 的食物图标。旋转后与 r240 相同，并入 `food`，与 r397→r4 的旋转合并相同。没有另写含义。提取时的 group 已是 `food`，本版没有改写。

## 20 条标成装饰

rank 534、755、764、765、778、779、780、788、815、822、823、836、840、866、867、877、888、898、900、903。key 为 `decor`。

r836 原先是 batch-02 留下的 `needs_review`（灰色碎块）。本批改成装饰。`previous_status` 为 `needs_review`，`previous_meaning_en` 保留原先的外观句。其余 19 条原先是 `unreviewed`。

r534 是中型怪站位栏交界处的贴片，标成装饰。

## 13 条留下，仍是 needs_review

key 为 `pending_<iconId>`，kind 为空，含义只描述外观（取自批准稿里的外观句）。没有新造机制名（R-048）。

- rank 687：红色右箭头（d10 结果表）。不并入 r108。
- rank 726、746、775、800、831、855、868：橙色斜笔画（比较符一笔）。没有写成比较符 key。
- rank 731：两枚黑心红光方块。
- rank 793：黑底红边心形。
- rank 799：灰底「-2」数值徽章。
- rank 809：红色锅或水洼。不猜名。
- rank 845：灰底「+2」数值徽章。

## 计数

| 范围 | confirmed | confirmed_rulebook | needs_review | decor | unsure | unreviewed |
| --- | --- | --- | --- | --- | --- | --- |
| 前 525 | 417 | 44 | 10 | 54 | 0 | 0 |
| 全部 906 | 490 | 44 | 65 | 112 | 0 | 195 |

confirmed + confirmed_rulebook + decor 的卡面出现次数：13,948 / 14,517（96.08%）。

v1.5 的变更说明仍在 `icon-dictionary-v1.5-CHANGELOG.md`。v1.4 的说明仍在 `icon-dictionary-v1.4-CHANGELOG.md`。v1.3 的说明仍在 `icon-dictionary-v1.3-CHANGELOG.md`。v1.2 的说明仍在 `icon-dictionary-v1.2-CHANGELOG.md`。v1.1 的说明仍在 `icon-dictionary-v1.1-CHANGELOG.md`。
