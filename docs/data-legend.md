# 卡面图标图例

核心盒图标含义在 [`packages/data/dictionary/`](../packages/data/dictionary/)。本仓库不放卡图，本文件也不贴图、不链外部图片。规范化数据在 [`packages/data/normalized/`](../packages/data/normalized/)，按词典回填含义；未确认的图标标成未验证（R-048）。

`iconId` 是 10 位 hex，与 `packages/data/extract/corebox/raw/` 里的图标聚类 id 相同。

## 来源

词典版本 v1.3（2026-10-07）。同一份表有 JSON 和 CSV，中文变更说明在 `icon-dictionary-v1.3-CHANGELOG.md`。v1.2 与 v1.1 的说明仍留在目录里。

- Kyries 2026-10-06 人工审阅。审阅里接受或修改过的条目记为 `confirmed`。2026-10-07 批准的 PvP 站位同样是 `confirmed`。
- 规则书页码在每条的 `rulebook_refs`。`confirmed_rulebook` 是 Kyries 原先标成装饰、2026-10-07 改成规则书含义并批准的条目。页码主要来自核心规则书第 16 页（房间起始位置、战利品）和第 18 页（容纳标记）。
- 规则来源只认官方规则书（R-001）。词典 `rule_sources` 还列了 Old Road（OR24）和 Color of Madness 规则书，只用于图标对照。

裁定见 [docs/rulings.md](rulings.md) 的 R-048 / Q-47。

## status

| status               | 条数（共 906） | 意思                                                                                         |
| -------------------- | -------------: | -------------------------------------------------------------------------------------------- |
| `confirmed`          |            455 | Kyries 已确认。可以用来命名。                                                                |
| `confirmed_rulebook` |             44 | 官方规则书页码给出的含义，Kyries 已批准。可以用来命名。                                      |
| `needs_review`       |             11 | Kyries 批准先留下。key 为 `pending_<iconId>`，kind 为空，含义只描述外观。按 R-048 保持占位。 |
| `decor`              |             60 | 不是游戏图标（装饰、边框、画面碎片）。                                                       |
| `unsure`             |              0 | 审阅者不能确定。没有含义，key 为 `unknown_<iconId>`。                                        |
| `unreviewed`         |            336 | 尚未审阅。没有含义，key 为 `unknown_<iconId>`。                                              |

`needs_review`、`unsure`、`unreviewed`，以及词典未收的 iconId，在规范化层标成未验证。含这些图标的卡在进入可用卡池之前保持未验证。

## 仍未确认的类别

- 未审的 336 条没有含义。出现较多的印刷类别是 hero_skill、monster_medium、room、stygian_room、trinket，此外还有 hero_stat、monster_large、hero_pvp、disease、quirk、boss_ability、quest 等。地牢板块、村庄版图和打孔板上也有少量。
- `needs_review` 的 11 条不能当作最终命名。rank：195、216、232、296、307、315、323、335、379、478、539。key 都是 `pending_<iconId>`。v1.2 留下的 10 条，提议仍在 `proposal` 里。r539 是 batch-01 留下的，只有外观描述，没有提议 key。
- 规范化层里还有约 70 个词典未收的 iconId（多为饰品，没有切图）。v1.3 没有为它们命名。对照印刷 PDF 重切之后再审。
- 继续算作装饰、规则书没有解释的图形：rank 121（火焰加数字）、rank 420（容纳点加灰色双箭头）。rank 239 在 v1.2 也标成装饰，和 125、420 同属双箭头。
- `kind` 是自由词，用词尚未统一（词典 `inconsistencies` 的 `kind_vocabulary`）。
- 混合起始位置：rank 127、132、258、259 的 key 是 `start_*_any`（同一个 iconId 里站位或阵营不一致）。哪一张卡、哪一页、哪一个坐标是哪种站位，以 `start_locations_by_placement.csv` 为准。rank 379 在 v1.2 留下为 `pending_`，没有写成 `start_*_any`。
- 抗性 / 免疫：`confirmed` 的 `bleed_resist`、`blight_resist`、`debuff_resist`、`shuffle_resist` 可以命名。还没有进入 `confirmed` 或 `confirmed_rulebook` 的抗性、免疫图标仍按 R-048 占位。

已知不一致清单在 JSON 的 `inconsistencies`，入库时原样保留。

Musketeer 不在这批词典里（R-008）。
