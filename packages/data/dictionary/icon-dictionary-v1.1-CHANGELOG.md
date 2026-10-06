# 图标词典 v1.1 更新记录（2026-10-07）

基于 v1（`icon-dictionary-v1.json`，来源：Kyries 审核导出 2026-10-06）。只含含义，不含图片；图片引用只用 iconId，不含任何裁切图路径。

## 1. PvP 站位图标 → 已确认（source = `kyries_approved_proposal_2026-10-07`）
| 排名 | key | 含义 |
|---|---|---|
| 36 | stance_support_lit | 支援（点亮） |
| 32 | stance_support_unlit | 支援（未点亮）；也用于大型怪物行 |
| 27 | stance_ranged_lit | 远程（点亮） |
| 76 | stance_ranged_unlit | 远程（未点亮） |
| 26 | stance_defensive_lit | 防御（点亮） |
| 83 | stance_defensive_unlit | 防御（未点亮），原为"状态待确认" |
| 35 | stance_aggressive_lit | 进攻（点亮） |
| 77 | stance_aggressive_unlit | 进攻（未点亮） |
| 61 | stance_aggressive_unlit | 进攻（未点亮）；与 r77 同一图形，提取尺寸不同；也用于大型怪物行 |

英文标签已修正，旧的 "glyph/state to confirm" 文本已删除。

## 2. 房间卡上原标为装饰、但规则书给出含义的图标 → `confirmed_rulebook`（33 个）
- **24 个起始位置框**（金框 = 英雄，红/橙框 = 怪物，图形 = 站位）。依据：Core 第 16 页。key 为 `start_<hero|monster|any>_<站位|any>`。
  - 其中 127、132、258、259 这几个 iconId 混合了不同站位或阵营，key 中用 `any`。逐个摆放位置的分类见 `work/sugg/start_locations_by_placement.csv`（仅在 box 上）。
- **r46、r79**：区域容纳标记（3点），value = 3。依据：Core 第 18 页。
- **183、205、236、392（红色）和 363、384（绿色）**：容纳标记 + 区域标记。依据：Core 第 18 页（容纳点）、第 16 页（带字母的区域标记，对应房间卡文字）、第 5 页（红色标记位于命名效果前）。
  - 规则书没有解释红色和绿色的区别。
  - r183 的点数不一，value 为空。
- **r65 宝箱框**：战利品标记放置。依据：Core 第 16 页第 7 步、第 18 页。

**仍保留为装饰：**
- **r121**（火焰 + 数字）：规则书没有任何一页解释这个火焰图形。它很可能是房间/板块编号，但未确认。
- **r420**（容纳点 + 灰色双箭头）：双箭头含义无规则书依据。

## 3. 28 个后续图标 → `needs_review`
- 写入了含义，保留 confidence 和 evidence，并标注"未经 Kyries 确认"。
- 无依据的 3 个（239、338、397）仍为 unreviewed / unknown。

## 计数
| 范围 | confirmed | confirmed_rulebook | needs_review | decor | unsure | unreviewed |
|---|---|---|---|---|---|---|
| 前 525 | 410 | 33 | 28 | 51 | 0 | 3 |
| 全部 906 | 417 | 33 | 28 | 51 | 0 | 377 |

confirmed + confirmed_rulebook + decor 的覆盖率：
- 全部卡面摆放：13,648 / 14,517（94.01%），与 v1 相同，因为只是在这三个状态之间调整。
- 前 525：98.83%。

## 其他
- Kyries 已确认的其他条目保持不变。
- JSON 顶部新增 `schema` 字段说明，包括字段、状态值和 key 规则，可用于编写 Zod schema。
- 仍未解决的问题见 JSON 中的 `inconsistencies`：
  - 措辞含"待确认"的已确认含义；
  - r341 的 key 为 `damage`；
  - r324/r353 的点数；
  - kind 用词不统一；
  - 被当作图标的边框/底板；
  - 卡背箭头；
  - r151；
  - 混合 iconId；
  - 留作装饰的条目；
  - 双箭头系列。
