# 图标词典 v1.8 更新记录（2026-10-08）

## 2026-10-26 补充：Q-47 needs_review 第二刀（21 确认 + r335 leave）

在首批 7 hash 之后，Kyries 拍板余下 `needs_review` 子集（除 rank 335 暂 leave）。`source` 仍为 `kyries_review_2026-10-26`。比较符半笔 merge 到 `compare_lte`（`c1d74de856`）与 `compare_gte`（`b3f370e3ec`）代表行。

| hash | rank | key | status |
| --- | --- | --- | --- |
| `096ea91bb9` | 232 | `area_d10_marker` | `confirmed_rulebook` |
| `ef839b6878` / `1cdbcf4cc7` | 307 / 315 | `preparation_days` | `confirmed_rulebook` |
| `41dee17ee1` | 323 | `area_d10_marker` | `confirmed_rulebook` |
| `9b1134d0b0` | 335 | `pending_…` | `needs_review`（leave；proposal `area_d10_teleport` 待确认） |
| `003b470410` | 640 | `dodge` | `confirmed` |
| `269d523c85` | 666 | `curio` | `confirmed` |
| `5a4fbf9781` | 687 | `d10_result_guide_arrow` | `confirmed` |
| `8707d5d8cf` | 702 | `summon` | `confirmed` |
| `c1d74de856` | 726 | `compare_lte` | `confirmed` |
| `ed3b7ac902` | 746 | `compare_lte` | `confirmed`（merged_into r726） |
| `206c655597` | 775 | `compare_lte` | `confirmed`（merged_into r726） |
| `52e99dee17` | 799 | `value_badge` | `confirmed`（value −2） |
| `599b5b0881` | 800 | `compare_gte` | `confirmed`（merged_into r855） |
| `66254314c8` | 809 | `hunger` | `confirmed` |
| `8c829e3754` | 831 | `compare_gte` | `confirmed`（merged_into r855） |
| `9ce4169551` | 845 | `value_badge` | `confirmed`（value +2） |
| `b3f370e3ec` | 855 | `compare_gte` | `confirmed` |
| `be2e32545a` | 868 | `compare_gte` | `confirmed`（merged_into r855） |
| `72efe52ca5` / `adcab0541a` | 910 / 911 | `d10` | `confirmed`（value 1 / 10） |
| `c3727c7056` | 912 | `dodge` | `confirmed` |

统计（`status_all976`）：`needs_review` 22→**1**（仅 r335）；`confirmed` 668→685；`confirmed_rulebook` 45→49。

## 2026-10-26 补充：Q-47 needs_review 批（7 hash）

Kyries 经 DDBG·规则书助手拍板本批 7 条 `needs_review`（Q-47 整体仍延后）。只改下列 hash，其余 `needs_review` / `unreviewed` 不动。`source` 为 `kyries_review_2026-10-26`。饰品行按已有 key **归类**为 `trinket_picture`，不 merge 不同 iconId。

| hash | rank | 采用 key | status |
| --- | --- | --- | --- |
| `293f170eab` | 216 | `stance_support_monster_slot` | `confirmed` |
| `73a29c830c` | 379 | `start_monster_any` | `confirmed_rulebook` |
| `3deae1ab2a` | 478 | `quirk` | `confirmed` |
| `c80192cfcc` | 603 | `trinket_picture` | `confirmed` |
| `032fd6cccd` | 642 | `trinket_picture` | `confirmed` |
| `a08da49488` | 714 | `trinket_picture` | `confirmed` |
| `a64616e9c5` | 715 | `bleed` | `confirmed` |

JSON / CSV 与 `meta.stats` 同步（字段名 `status_all976` 保留）：全部 983 条中 `confirmed` 668、`confirmed_rulebook` 45、`needs_review` 22（较本批前约 29 减 7）、`decor` 110、`unsure` 0、`unreviewed` 138；前 525 条 `needs_review` 8→5。

## 2026-10-13 / R-067补充

Kyries逐项批准`8c4c3c2ec2`=Shuffle、`ce2f57ed90`=Blight、`5c9604da90`=Wound。三条由unreviewed变confirmed，保留原ID、空value与出现次数；记录真实source日期`kyries_review_2026-10-13`及previous_status，不补图标内数字或复合顺序。JSON/CSV与覆盖率同步：全部983条中confirmed660、confirmed_rulebook44、needs_review31、decor110、unsure0、unreviewed138；前525计数不变。下文原版计数保留为历史记录。

## 2026-10-12 补充：Curio 效果行 17 个 hash（R-064 / Q-60）

Kyries 对照 CURIO_FRONT_V2 与手打 01–24 效果行批准全部 Q-60 hash。现有 10 条更新，新增 7 条作为 rank 977–983，旧 rank 不改。JSON / CSV 同步，status 为 `confirmed`、source 为 `kyries_review_2026-10-12`，保留旧状态与含义；数字仍来自效果行，不填图标 `value`。历史 `all976` stats 字段名保留，统计覆盖当前全部 983 条。

| 含义 | hash |
| --- | --- |
| Roll for Provisions | `ae45f5bcb3` |
| Bleed（并 `be17b4ee09`） | `9b6a2b779d`、`12b6af97f2`（新增） |
| Disease（并 `b4627031be`，非 Blight） | `e546d025cd` |
| 抽负面怪癖（不再为 decor） | `449d2d43ed`（新增）、`382acc9dc4`、`3fe634e723`、`7b1a554877` |
| 抽正面怪癖 | `3a7dfcb577`、`3ae4312868`、`3e2792bc5b`（新增）、`8b7f872f77`（新增） |
| 抽饰品卡（覆盖 curio_picture） | `85e094f269`、`1d9ad90d4a`（新增） |
| Debuff（效果行 2t） | `40c4cc438c` |
| Buff（效果行 2t） | `73ea0990dd`（新增）、`3cd8b97ff0`（新增，并 `73ea0990dd`） |

01 的最早口头“美德 / 折磨”已作废，以“抽负面怪癖”为准。只更新这 17 个 hash，不扩大同组其他图标的批准范围。24 张 Curio 所有效果行已规范化；运行时可结算范围见 [Q-60 交付](../../../docs/phase3-q60-curio-icons-2026-10-12.md)。

## 2026-10-11 补充：Wound 同义图标合并（R-061）

Kyries 明确确认黑心红光 = Wound / 创伤。本次对照完整印刷后，将 rank 544 / 668 / 693 / 731 / 793（`8466c441ea` / `2c1824ea21` / `6888d0cf12` / `d42d7955d3` / `48ca9f366e`）从 needs_review 并入已有 `wound`，kind 为 `damage_type`，value 为空。最后一个为旋转图标。保留原始 iconId 与旧状态说明，JSON / CSV 同步；source 为新增枚举 `kyries_review_2026-10-11`。

基准为原有 `163b31751a`（player aid / Core p.27）与 `ccade5e7ad`。总条数 976 不变；confirmed 636 → 641、needs_review 37 → 32，其余计数不变。下文是 2026-10-08 的历史审批记录，其中 rank 544 已被本次批准解除。

规范化层批量清理由这些 hash 单独造成的 unverified；Bad Gambler 另有 `adcab0541a`，仍单独保留该原因。详见 [四核心整批接线清单](../../../docs/phase2-four-core-skills-2026-10-11.md)。

Kyries 批准 batch-08 里 `proposed_action` 为 categorize 的 79 条。这些 rank 本来就在词典里。本版只改这 79 条，总条数仍是 976。只含含义，不含图片。

`source` 为 `kyries_approved_proposal_2026-10-07`。这是 schema 里已有的枚举，本版没有新增 source。

核对时这 79 条并不全是 `needs_review`：31 条是 `needs_review`，48 条仍是 `unreviewed`（key 为 `unknown_<iconId>`，没有含义）。两条都按同一条归类规则改，没有先改状态再归类。

## 79 条归入技能插画

归入已有 key `skill_art`。不是新造 `skill_picture`，也不是 `merge_into`。

每条的字段：kind 为 `other`，status 为 `confirmed`，含义是通用句「技能插画 / Skill picture」，value 为空，`value_in_glyph` 为 false。不照抄词典里已有 `skill_art` 行上更长的正面或背面说明（例如 r274、r431）。group 保持提取时的 `skill_art`。`previous_status` 与 `previous_meaning_en` 记下 v1.7 的值。

正背面、不同英雄各自保留 iconId，不合并。r539（HIGHWAYMAN Wicked Slice 背面）不并入 r490（JESTER 背面）。

## 3 条留下，仍是 needs_review

批准稿里 `proposed_action` 为 keep 的三条没有改。

- rank 195：效果行上的小标记，红块与金块被斜线分开。挡着 ARBALEST「Rallying Flare」。
- rank 544：效果区的黑心红光小图标。挡着 HELLION「Bleed Out」。
- rank 569：效果区的蓝色盾形小图标。挡着 JESTER「Dirk Stab」。

## 计数

| 范围 | confirmed | confirmed_rulebook | needs_review | decor | unsure | unreviewed |
| --- | --- | --- | --- | --- | --- | --- |
| 前 525 | 417 | 44 | 10 | 54 | 0 | 0 |
| 全部 976 | 636 | 44 | 37 | 112 | 0 | 147 |

前 525 条与 v1.7 相同。confirmed + confirmed_rulebook + decor 的卡面出现次数：14,253 / 14,588（97.70%）。v1.7 是 14,016 / 14,588（96.08%）。

v1.7 的变更说明仍在 `icon-dictionary-v1.7-CHANGELOG.md`。v1.6 的说明仍在 `icon-dictionary-v1.6-CHANGELOG.md`。v1.5 的说明仍在 `icon-dictionary-v1.5-CHANGELOG.md`。v1.4 的说明仍在 `icon-dictionary-v1.4-CHANGELOG.md`。v1.3 的说明仍在 `icon-dictionary-v1.3-CHANGELOG.md`。v1.2 的说明仍在 `icon-dictionary-v1.2-CHANGELOG.md`。v1.1 的说明仍在 `icon-dictionary-v1.1-CHANGELOG.md`。
