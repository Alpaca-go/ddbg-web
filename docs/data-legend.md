# 卡面图标图例

核心盒图标含义在 [`packages/data/dictionary/`](../packages/data/dictionary/)。本仓库不放卡图，本文件也不贴图、不链外部图片。parsed 和规范化数据还没有回填这些含义。

`iconId` 是 10 位 hex，与 `packages/data/extract/corebox/raw/` 里的图标聚类 id 相同。

## 来源

词典版本 v1.1（2026-10-07）。同一份表有 JSON 和 CSV，中文变更说明在 `icon-dictionary-v1.1-CHANGELOG.md`。

- Kyries 2026-10-06 人工审阅。审阅里接受或修改过的条目记为 `confirmed`。2026-10-07 批准的 PvP 站位同样是 `confirmed`。
- 规则书页码在每条的 `rulebook_refs`。`confirmed_rulebook` 是 Kyries 原先标成装饰、2026-10-07 改成规则书含义并批准的条目。页码主要来自核心规则书第 16 页（房间起始位置、战利品）和第 18 页（容纳标记）。
- 规则来源只认官方规则书（R-001）。词典 `rule_sources` 还列了 Old Road（OR24）和 Color of Madness 规则书，只用于图标对照。

裁定见 [docs/rulings.md](rulings.md) 的 R-048 / Q-47。

## status

| status               | 条数（共 906） | 意思                                                                              |
| -------------------- | -------------: | --------------------------------------------------------------------------------- |
| `confirmed`          |            417 | Kyries 已确认。可以用来命名。                                                     |
| `confirmed_rulebook` |             33 | 官方规则书页码给出的含义，Kyries 已批准。可以用来命名。                           |
| `needs_review`       |             28 | 写了提议、confidence 和 evidence，尚未确认。界面上标成未确认，按 R-048 保持占位。 |
| `decor`              |             51 | 不是游戏图标（装饰、边框、画面碎片）。                                            |
| `unsure`             |              0 | 审阅者不能确定。没有含义，key 为 `unknown_<iconId>`。                             |
| `unreviewed`         |            377 | 尚未审阅。没有含义，key 为 `unknown_<iconId>`。                                   |

`needs_review`、`unsure`、`unreviewed` 保留原始图标 ID。含这些图标的卡在进入可用卡池之前标为「未验证」。

## 仍未确认的类别

- 未审的 377 条没有含义。出现较多的印刷类别是 hero_skill、monster_medium、room、stygian_room、trinket，此外还有 hero_stat、monster_large、hero_pvp、disease、quirk、boss_ability、quest 等。地牢板块、村庄版图和打孔板上也有少量。
- `needs_review` 的 28 条不能当作最终命名。key 有：`start_hero_support`、`start_hero_defensive`、`start_monster_aggressive`、`start_monster_defensive`、`start_monster_ranged`、`start_monster_support`、`start_monster_any`、`stance_support`、`target_hero`、`target_monster`、`target_hero_or_monster`、`area_d10_marker`、`occupancy_pips`、`preparation_days`、`roll_for_provisions`、`loot_token_placement`、`dodge`、`disease`、`negative_quirk`、`decor`。
- 继续算作装饰、规则书没有解释的图形：rank 121（火焰加数字）、rank 420（容纳点加灰色双箭头）。
- `kind` 是自由词，用词尚未统一（词典 `inconsistencies` 的 `kind_vocabulary`）。
- 混合起始位置：rank 127、132、258、259、379 的 key 是 `start_*_any`（同一个 iconId 里站位或阵营不一致）。哪一张卡、哪一页、哪一个坐标是哪种站位，以 `start_locations_by_placement.csv` 为准。
- 抗性 / 免疫：`confirmed` 的 `bleed_resist`、`blight_resist`、`debuff_resist`、`shuffle_resist` 可以命名。还没有进入 `confirmed` 或 `confirmed_rulebook` 的抗性、免疫图标仍按 R-048 占位。

已知不一致清单在 JSON 的 `inconsistencies`，入库时原样保留。

Musketeer 不在这批词典里（R-008）。
