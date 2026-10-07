# 核心盒图标词典 v1.3

本目录是含义词典，没有图片。`iconId` 与 `packages/data/extract/corebox/raw/` 里的图标聚类 id 相同。

- `icon-dictionary-v1.3.json`：906 条。文件开头的 `schema` 写了字段、6 种 status 和 key 命名约定；`inconsistencies` 是已知不一致清单。
- `icon-dictionary-v1.3.csv`：同一份表。
- `icon-dictionary-v1.3-CHANGELOG.md`：v1.3 的 40 条决定（batch-01）。v1.2 的说明在 `icon-dictionary-v1.2-CHANGELOG.md`，v1.1 的说明在 `icon-dictionary-v1.1-CHANGELOG.md`。
- `start_locations_by_placement.csv`：房间卡起始位置的逐处归类。rank 127、132、258、259 在词典里是 `start_*_any`，具体站位以这个文件为准。rank 379 在 v1.2 留下，key 为 `pending_<iconId>`。

这些文件不参与 Prettier。Zod schema 在 `packages/data/src/dictionary/`。

`confirmed` 与 `confirmed_rulebook` 可以用来命名。`needs_review`（key 为 `pending_<iconId>`）、`unsure`、`unreviewed` 仍按 R-048 保留占位。规范化层在 `packages/data/normalized/`。Musketeer 不在这批数据里（R-008）。
