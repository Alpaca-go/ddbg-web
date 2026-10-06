# 核心盒印刷提取结果

本目录是 `tools/pipeline/extract-print/`（提取器 1.0.4）的输出，当作 fixture。印刷 PDF 和图标裁切图都不在仓库里。

- `corebox/raw/`：`ddbg-raw-v1`。16 个卡牌类别，加上版面类。
- `corebox/parsed/`：`ddbg-parsed-v0`，只有 hero_skill、monster_medium、monster_large、trinket。
- `corebox/reports/`：`summary.json`（每个输出的 sha1）、`reconciliation.json`、`reconciliation.md`。

这些文件与提取器输出逐字节一致。raw、sha1 和部件对账在 `fixtures.test.ts`；parsed schema 和交叉校验在 `parsed.test.ts`。

## 版面类为什么也入库

提取报告把存档表、信件、村庄版图、打孔板、地牢板块标成可选，并写明不要提交图标图片。这里把版面 raw 一并放进来：印刷 PDF 不在仓库中，这些 JSON 是目前唯一的文字提取；大约 0.79 MB；schema 与卡牌相同（`kind: "sheet"`）。它们仍是坐标和文字，不是板块标注。

报告第 8 节写「18 个卡牌类文件」，按类别表实际列出 16 个。入库的是类别表里的全部卡牌文件，没有少类。

## 还不命名的东西

图标只保留 `iconId`，正文里仍是 `{icon:<id>}`。卡面上没有标签的数字在 `unlabeled_numbers` 或 `header_unlabeled_numbers`。`crit_value` / `acc_value` 只是印在 Crit / Acc 标签右侧的数字，不表示伤害或其他规则含义（R-048，说明书 §21.2）。

`hero_skill:p044`（Collect Bounty II）的命中标签原文是 `Acc 1O`（字母 O），按原样保留。

饰品只分 upright / inverted 两个半区，不断言哪一半是正面效果。怪癖正负、美德与苦难的分组没有印成文字，schema 不补这个字段。

Musketeer 不在这批数据里（R-008）。
