# 核心盒图标词典 v1.1

本目录是含义词典，没有图片。`iconId` 与 `packages/data/extract/corebox/raw/` 里的图标聚类 id 相同。

- `icon-dictionary-v1.1.json`：906 条。文件开头的 `schema` 写了字段、6 种 status 和 key 命名约定；末尾 `inconsistencies` 是已知不一致清单，原样保留。
- `icon-dictionary-v1.1.csv`：同一份表。
- `icon-dictionary-v1.1-CHANGELOG.md`：v1.1 的中文变更说明。
- `start_locations_by_placement.csv`：房间卡起始位置的逐处归类。rank 127、132、258、259、379 在词典里是 `start_*_any`，具体站位以这个文件为准。

这些文件与审阅导出逐字节一致，不参与 Prettier。Zod schema 在 `packages/data/src/dictionary/`。

`confirmed` 与 `confirmed_rulebook` 可以用来命名。`needs_review`、`unsure`、`unreviewed` 仍按 R-048 保留原始图标 ID。本目录的含义还没有回填到 raw / parsed。Musketeer 不在这批数据里（R-008）。
