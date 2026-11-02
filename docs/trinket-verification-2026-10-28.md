# 核心盒饰品 verification 收口（2026-10-28）

## 背景

开发 5 总表口径：38 张饰品获得/UI 已接，但 `packages/data/normalized/corebox/trinket.json` 中仍有 13 张 `verification.unverified=true`。本 PR 只收口数据层 verification，不实现饰品主动能力、不改动获得/UI 流程。

## 缺口调查

| 状态（收口前） | 数量 | 卡页                                                                         |
| -------------- | ---: | ---------------------------------------------------------------------------- |
| 已 verified    |   25 | 除下表外                                                                     |
| 未 verified    |   13 | p009、p010、p012、p014、p015、p016、p018、p019、p021、p023、p026、p028、p035 |

每张未 verified 卡的 `verification.reasons` 均为 `icon:<hash>`，无其它原因（无未命名数字、无缺页等）。对应 iconId 在词典 v1.8 中仍为 `needs_review` / `pending_*`，而 **Kyries Q-47 批（2026-10-26）** 已在 `icon-dictionary-v1.8-CHANGELOG.md` 与 `dictionary.test.ts` 中批准为 `confirmed`——规范化 JSON 未随词典重跑，造成 drift。

## 规则与证据

- **R-001**：只认官方规则书 + `docs/rulings.md`；本刀不新增裁定。
- **R-048**：图标须词典 `confirmed` / `confirmed_rulebook` 才可消 `unverified`；不发明比较符或 stat glyph 含义。
- **词典**：`packages/data/dictionary/icon-dictionary-v1.8.json` + CHANGELOG batch / batch-2（`kyries_review_2026-10-26`）。
- **数量**：extract 对账 38 张、I/II/III = 14/12/12（`extract/corebox/reports/reconciliation.md`）。
- **印刷来源**：各 icon notes 指向 `DD_EN_COREBOX_CARDS_44x68_TRINKETS_FRONT.pdf` 对应页（见 CHANGELOG 行）。

### 本批消 verification 的 icon 摘要

| iconId                                                    | 批准 key                     | 主要卡面                                |
| --------------------------------------------------------- | ---------------------------- | --------------------------------------- |
| `c80192cfcc` / `032fd6cccd`                               | `trinket_picture`            | Sage's Book 等                          |
| `003b470410`                                              | `dodge`                      | Speed Stone、Book of Relaxation         |
| `a08da49488` / `66254314c8`                               | `trinket_picture` / `hunger` | Survival Guide、Warrior's Cap           |
| `a64616e9c5`                                              | `bleed`                      | Bloodthirst Ring、Bloodcourse Medallion |
| `c1d74de856` / `ed3b7ac902` / `206c655597`                | `compare_lte`                | 光照 `< 3` 条件笔画                     |
| `b3f370e3ec` / `8c829e3754` / `599b5b0881` / `be2e32545a` | `compare_gte`                | 光照 `> 3` 条件笔画                     |

词典仍 **唯一** `needs_review`：`9b1134d0b0`（rank 335，area d10 teleport），不在任何饰品卡面。

## 改动

1. 重跑 `pnpm --filter @ddbg/pipeline normalize`，**仅提交** `trinket.json`（其它类别规范化文件虽也会变，留待各自主题 PR，避免夹带）。
2. `normalize.test.ts` 增加 38/38 verified 断言。
3. 引擎 R-048 行为测试改为夹具标记 `unverified`，不依赖生产数据保持未核实。

## 收口后状态

- `stats`: `{ cards: 38, verified: 38, unverified: 0 }`
- 每张卡 `verification: { unverified: false, reasons: [] }`

## 仍不在本 PR

- 饰品 **战斗/探索主动效果** 与「每回合一次」运行时（规格书 §11、大纲 Phase 4+；G-10 仍属能力阶段）。
- 正/反面哪一侧为「正面效果」：parsed `field_notes` 仍不断言，获得时只记录 `face: upright | inverted`。
- 其它规范化类别若与词典 v1.8 不同步，需单独 normalize PR。

## 验证

本机：`pnpm typecheck`、`pnpm test`（含 `normalize.test.ts`、`trinket-acquisition.test.ts`、`battle-trinket.test.ts`、`dungeon-curio.test.ts` 相关项）、`pnpm build`。
