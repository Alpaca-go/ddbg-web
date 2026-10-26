# 核心盒图标词典 v1.8

本目录是含义词典，没有图片。`iconId` 与 `packages/data/extract/corebox/raw/` 里的图标聚类 id 相同。

- `icon-dictionary-v1.8.json`：983 条（R-064 / Q-60 补充 7 条，旧 rank 不变）。文件开头的 `schema` 写了字段、6 种 status 和 key 命名约定；`inconsistencies` 是已知不一致清单。历史 `all976` stats 字段名保留，其数值覆盖当前全部条目。
- `icon-dictionary-v1.8.csv`：同一份表。
- `icon-dictionary-v1.8-CHANGELOG.md`：v1.8 的 79 条归类（batch-08）。v1.7 的说明在 `icon-dictionary-v1.7-CHANGELOG.md`，v1.6 的说明在 `icon-dictionary-v1.6-CHANGELOG.md`，v1.5 的说明在 `icon-dictionary-v1.5-CHANGELOG.md`，v1.4 的说明在 `icon-dictionary-v1.4-CHANGELOG.md`，v1.3 的说明在 `icon-dictionary-v1.3-CHANGELOG.md`，v1.2 的说明在 `icon-dictionary-v1.2-CHANGELOG.md`，v1.1 的说明在 `icon-dictionary-v1.1-CHANGELOG.md`。
- `start_locations_by_placement.csv`：房间卡起始位置的逐处归类。rank 127、132、258、259、379 在词典里是 `start_*_any`，具体站位以这个文件为准。

这些文件不参与 Prettier。Zod schema 在 `packages/data/src/dictionary/`。

`confirmed` 与 `confirmed_rulebook` 可以用来命名。`needs_review`（key 为 `pending_<iconId>`）、`unsure`、`unreviewed` 仍按 R-048 保留占位。截至 2026-10-26 Q-47 第二刀，全表仅 rank 335（`9b1134d0b0`）仍为 `needs_review`。规范化层在 `packages/data/normalized/`。Musketeer 不在这批数据里（R-008）。
