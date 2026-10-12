# 卡面图标图例

核心盒图标含义在 [`packages/data/dictionary/`](../packages/data/dictionary/)。本仓库不放卡图，本文件也不贴图、不链外部图片。规范化数据在 [`packages/data/normalized/`](../packages/data/normalized/)，按词典回填含义；未确认的图标标成未验证（R-048）。

`iconId` 是 10 位 hex，与 `packages/data/extract/corebox/raw/` 里的图标聚类 id 相同。

## 来源

词典版本 v1.8（2026-10-08；2026-10-11 按 R-061 补充五个 Wound 同义图标；2026-10-12 按 R-064 确认 17 个 Curio hash，其中新收 7 条）。同一份表有 JSON 和 CSV，中文变更说明在 `icon-dictionary-v1.8-CHANGELOG.md`。v1.7、v1.6、v1.5、v1.4、v1.3、v1.2 与 v1.1 的说明仍留在目录里。

- Kyries 2026-10-06 人工审阅。审阅里接受或修改过的条目记为 `confirmed`。2026-10-07 批准的 PvP 站位同样是 `confirmed`。
- 规则书页码在每条的 `rulebook_refs`。`confirmed_rulebook` 是 Kyries 原先标成装饰、2026-10-07 改成规则书含义并批准的条目。页码主要来自核心规则书第 16 页（房间起始位置、战利品）和第 18 页（容纳标记）。
- 规则来源只认官方规则书（R-001）。词典 `rule_sources` 还列了 Old Road（OR24）和 Color of Madness 规则书，只用于图标对照。

裁定见 [docs/rulings.md](rulings.md) 的 R-048 / Q-47。

## status

| status               | 条数（共 983） | 意思                                                                                         |
| -------------------- | -------------: | -------------------------------------------------------------------------------------------- |
| `confirmed`          |            657 | Kyries 已确认。可以用来命名。                                                                |
| `confirmed_rulebook` |             44 | 官方规则书页码给出的含义，Kyries 已批准。可以用来命名。                                      |
| `needs_review`       |             31 | Kyries 批准先留下。key 为 `pending_<iconId>`，kind 为空，含义只描述外观。按 R-048 保持占位。 |
| `decor`              |            110 | 不是游戏图标（装饰、边框、画面碎片）。                                                       |
| `unsure`             |              0 | 审阅者不能确定。没有含义，key 为 `unknown_<iconId>`。                                        |
| `unreviewed`         |            141 | 尚未审阅。没有含义，key 为 `unknown_<iconId>`。                                              |

`needs_review`、`unsure`、`unreviewed`，以及词典未收的 iconId，在规范化层标成未验证。含这些图标的卡在进入可用卡池之前保持未验证。

## 仍未确认的类别

- 未审的 141 条没有含义。出现较多的印刷类别是 room、stygian_room、dungeon_tile、hero_stat、hero_pvp，此外还有 disease、curio、quest 等。村庄版图和打孔板上也有少量。
- `needs_review` 的 31 条不能当作最终命名。key 都是 `pending_<iconId>`。v1.2 留下的 10 条，提议仍在 `proposal` 里。batch-01 当时留下 r539，v1.8 把它归入 `skill_art`。batch-02 当时留下 17 条：15 条技能卡正背面插画各自保留，不并入对面插画；另有 r714（饰品插图）和 r836（灰色碎块）。r836 在 batch-06 改成装饰。那 15 条技能插画在 v1.8 归入 `skill_art`。batch-04 当时留下 25 条：17 条技能卡杂项切图各自保留；另外 8 条是饰品插图或没有并入的图形。其中的技能插画在 v1.8 归入 `skill_art`，r544 与 r569 仍留下。batch-05 没有留下条目。batch-06 留下 13 条，含义只写外观：红色右箭头、橙色斜笔画、黑心红光方块、黑底红边心形、灰底数值徽章、红色锅或水洼。没有写成比较符或其他机制名。batch-07 留下 r910、r911、r912，含义只写外观：十面骰显示 10、旁边大号「1」或「10」，以及黄色裂缝人形。没有写成机制名。batch-08 把 79 条技能插画归入已有 `skill_art`（31 条当时是 `needs_review`，48 条当时是 `unreviewed`）。含义是通用句「技能插画 / Skill picture」，不是并入 r274、r431 或 r490，也不照抄正面或背面更长的说明。r195、r544、r569 仍留下：效果行上的小标记，不是技能插画。
- v1.6 规范化层里有 70 个词典未收的 iconId（多为饰品，提取时被放进装饰切图）。v1.7 把它们收成 rank 907–976：3 条并入已确认图标，64 条按 2026-10-08 的规则归入 `trinket_picture`（不是并入 r468），3 条留下。
- 继续算作装饰、规则书没有解释的图形：rank 121（火焰加数字）、rank 420（容纳点加灰色双箭头）。rank 239 在 v1.2 也标成装饰，和 125、420 同属双箭头。
- `kind` 是自由词，用词尚未统一（词典 `inconsistencies` 的 `kind_vocabulary`）。
- 混合起始位置：rank 127、132、258、259 的 key 是 `start_*_any`（同一个 iconId 里站位或阵营不一致）。哪一张卡、哪一页、哪一个坐标是哪种站位，以 `start_locations_by_placement.csv` 为准。rank 379 在 v1.2 留下为 `pending_`，没有写成 `start_*_any`。
- 抗性 / 免疫：`confirmed` 的 `bleed_resist`、`blight_resist`、`debuff_resist`、`shuffle_resist` 可以命名。batch-05 把免疫栏里的 r761、r812 并入已确认的 `debuff_resist`、`bleed_resist`（与 batch-02 的 r551→r250 相同）。还没有进入 `confirmed` 或 `confirmed_rulebook` 的抗性、免疫图标仍按 R-048 占位。

已知不一致清单在 JSON 的 `inconsistencies`，入库时原样保留。

Musketeer 不在这批词典里（R-008）。

2026-10-11：rank 544 / 668 / 693 / 731 / 793 已按 R-061 并入 Wound（`wound`）；上述批次的留下记录为历史状态。当前合并范围、卡片剩余原因见 [四核心整批接线清单](phase2-four-core-skills-2026-10-11.md)。
