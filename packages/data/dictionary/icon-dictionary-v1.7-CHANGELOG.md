# 图标词典 v1.7 更新记录（2026-10-08）

Kyries 批准 batch-07（70 条）。这 70 个 iconId 不在 v1.6 里，提取时被放进装饰切图。本版按批准稿新增 rank 907–976，其余 906 条与 v1.6 相同。只含含义，不含图片。

`source` 为 `kyries_approved_proposal_2026-10-07`。这是 schema 里已有的枚举，本版没有新增 source。

## 3 条并入已确认图标

合并行复制目标的 status、含义、kind、key、value、`value_in_glyph`、`rulebook_refs`。备注写 `merged_into=<iconId>`。这些行原先不在词典里，`previous_status` 与 `previous_meaning_en` 为空。group 用自动簇名 `g_<iconId 前 8 位>`，不改成目标的 group。

| rank | iconId | 并入 | key |
| --- | --- | --- | --- |
| 907 | 799fbb848f | r21 | life |
| 908 | b2ac0f25e8 | r255 | shuffle_resist |
| 909 | d9c36480ed | r211 | bleed |

r907 是橙底红心，心内印着 26。并入 r21「生命值（图标内数字）」。r21 的 value 是空：生命值家族不把图标内数字写入 value（r21 样例心内是 7）。本版沿用空 value，不把 26 写成 value。

r908 是蓝色双箭头，与 r255 同形，继承「位移（大型怪抗性）」。r909 印面是「1 + 血滴 + 3t」，与 r211 同形，继承「流血（奇物）」；value 沿用 r211，为空。

## 64 条归入饰品插图

rank 913–976。这是归类，不是 `merge_into` r468。

按 2026-10-08 的规则，物件不同仍共用这一类。字段与已确认的 r468、r517 相同：key 为 `trinket_picture`，kind 为 `other`，status 为 `confirmed`，含义是「饰品插图（疑似插画） / Trinket picture (likely art)」，value 为空，`value_in_glyph` 为 false。不把某一张具体图的物件含义抄过来。

## 3 条留下，仍是 needs_review

key 为 `pending_<iconId>`，kind 为空，含义只描述外观（取自批准稿里的外观句）。没有写成机制名（R-048）。

- rank 910：十面骰显示 10，旁边大号「1」。不并入 r190 的「1-3」范围底板。
- rank 911：十面骰显示 10，旁边大号「10」。同样不并入 r190。
- rank 912：黄色裂缝人形。与闪避 r33、r22 同是黄底人形，但不是同一字形，不写成闪避。

## 计数

| 范围 | confirmed | confirmed_rulebook | needs_review | decor | unsure | unreviewed |
| --- | --- | --- | --- | --- | --- | --- |
| 前 525 | 417 | 44 | 10 | 54 | 0 | 0 |
| 全部 976 | 557 | 44 | 68 | 112 | 0 | 195 |

confirmed + confirmed_rulebook + decor 的卡面出现次数：14,016 / 14,588（96.08%）。

v1.6 的变更说明仍在 `icon-dictionary-v1.6-CHANGELOG.md`。v1.5 的说明仍在 `icon-dictionary-v1.5-CHANGELOG.md`。v1.4 的说明仍在 `icon-dictionary-v1.4-CHANGELOG.md`。v1.3 的说明仍在 `icon-dictionary-v1.3-CHANGELOG.md`。v1.2 的说明仍在 `icon-dictionary-v1.2-CHANGELOG.md`。v1.1 的说明仍在 `icon-dictionary-v1.1-CHANGELOG.md`。
