# 核心盒规范化数据

`ddbg-normalized-v0`。由 `packages/data/src/normalize/` 从 parsed（英雄技能、怪物、饰品）和 raw（怪癖、美德 / 苦难）生成，图标含义来自词典 v1.2。

重新生成：

```bash
pnpm --filter @ddbg/pipeline normalize
```

印刷 PDF 和图标切图不在这里。Musketeer 不在这批数据里（R-008）。

## 和 parsed 的差别

- 图标解析成 `naming`。只有 `confirmed` 和 `confirmed_rulebook` 可以当名字用。`needs_review`（`pending_` key）、`unsure`、`unreviewed`，以及词典没有的 iconId，都是 `unverified`。卡上有这种图标时，`verification.unverified` 为 true（R-048）。提取器标成 `decor` 的放置（面板、细条、文字底板）不是游戏图标，不放进这层，也不因此把卡标成未验证。
- 印在 Crit / Acc 标签里的数字留在 `printed_labels`。标签旁边、以及没有标签的数字在 `unlabeled_numbers`，不使用 `crit_value` / `acc_value`。
- 怪物心形里的数字叫 `life`（规则书第 24 页）。parsed 里的字段名是 `hp`。
- Abomination 变身卡用 `back_face_skill`。背面名字可以和正面不同。
- 怪癖的正负都来自 `Quirks_FRONT.pdf`，对照规则书 R26–R27。美德和苦难都来自 `virtue_afflictions_FRONT.pdf`。两个 BACK 文件只有卡背，没有文字或图标。卡面没有印美德还是苦难，`role` 留空并标未验证。不使用卡背箭头来分组（rank 108、138、327 仍未决）。

疾病、房间、Curio、任务等还没有规范化。parsed 里大型怪物参考卡没有 `life`，数值在 `monster_large`。
