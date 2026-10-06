# DDBG 核心盒（MG_DD_01 COREBOX）原始数据提取报告 — Phase 1 Step 1

生成日期：2026-10-06（Asia/Shanghai）· 提取器版本 `1.0.4` · 入口命令：`python3 scripts/run_all.py`

> 打印 PDF 仅作为**数据来源**；没有任何卡面美术被导出为游戏资产。`icons/` 下的图标裁切图只用于人工标注，
> 只保存在本机 `/workspace/ddbg-extract/icons/`，不得提交。卡面上未标注的数字和图标一律保留为原始占位
> （`{icon:<id>}`、`unlabeled_numbers` 带坐标），没有任何凭猜测的命名。规则依据仅限官方规则书。
> 核心盒卡牌中没有 Musketeer（全文检索 0 处）。

## 1. 产出物

| 路径 | 内容 |
|---|---|
| `scripts/run_all.py`、`scripts/ddbg_extract/*.py` | 提取器（单一入口，逐文件缓存，可用 `--force` 全量重跑） |
| `README.md` | 英文说明：流程、单位、schema、图标 id 语义、decor 规则 |
| `raw/corebox/<category>.json` ×23 | 逐卡原始 JSON（schema `ddbg-raw-v1`）：源文件、页码、正/背面、去重后的文本 span（mm 坐标、字体、字号、颜色）、图标放置 `{iconId,bbox}`、`lines` 视图、牌组副本去重与 `copies` |
| `parsed/corebox/{hero_skill,monster_medium,monster_large,trinket}.json` | 首轮解析（schema `ddbg-parsed-v0`），只命名有明确印刷标签的字段 |
| `reports/reconciliation.md` / `.json` | 与规则书部件清单的核对表 |
| `reports/summary.json` | 清单：所有源 PDF（含字节数）、无文本文件、每个输出的 sha1/字节、各类计数、解析成功率、图标统计 |
| `icons/index.html` | 图标联系表（裁切图、id、次数、类别/文件、2–3 条示例行） |
| `icons/crops/*.png`（1186 张）、`icons/decor/*.png`（527 张） | 每个聚类一张裁切图（仅本机） |
| `icons/icon-dictionary-template.csv` | 待标注图标字典模板（906 行，含义列为空，按出现次数降序） |
| `icons/icon-dictionary-components.csv` / `likely-art.csv` / `decor-list.csv` | 仅出现在板件/版图上的图标、疑似美术碎片、装饰元素清单（附原因） |
| `icons/catalog.json` | 全部 1713 个聚类的状态、次数、类别、文件、尺寸、示例、样本位置 |

坐标：单位 mm，原点为 TrimBox 左上角，y 向下；字号单位 pt。

**可复现性**：同一输入下输出逐字节一致——`--force` 全量重跑（约 130 秒，4 进程）后 27 个 JSON、`catalog.json`、
字典模板 CSV 与上一轮完全相同；有缓存时约 45 秒。

## 2. 覆盖范围与计数

核心盒文件夹共 64 个 PDF：48 个被提取，16 个为无文本文件（列入人工录入清单，见 2.2）；共处理 1353 页。

### 2.1 各类别（raw）

| 类别 | 类型 | 页数 | 不重复卡 | 说明 |
|---|---|---|---|---|
| hero_skill | 卡 | 231 | 231 | 11 名英雄技能卡 |
| hero_stat | 卡 | 23 | 23 | 英雄卡 |
| hero_pvp | 卡 | 24 | 24 | 基础 22 + ADD_014 2 |
| monster_medium | 卡 | 115 | 54 | 基础 111 页 = 52 张不重复（副本分布见下）+ ADD_014 4 页 = 2 张 |
| monster_large | 卡 | 20 | 20 | |
| boss_ability | 卡 | 37 | 37 | 16 张 Boss 描述 + 21 张 Boss 能力 |
| trinket | 卡 | 38 | 38 | |
| curio | 卡 | 24 | 24 | |
| room | 卡 | 25 | 25 | 17 普通 + 8 BOSS |
| stygian_room | 卡 | 17 | 17 | |
| quest | 卡 | 19 | 19 | |
| hamlet_event | 卡 | 16 | 16 | |
| quirk | 卡 | 35 | 35 | |
| disease | 卡 | 11 | 11 | |
| virtue_affliction | 卡 | 10 | 10 | |
| player_aid | 卡 | 8 | 2 | 2 种设计 × 4 份 |
| save_sheet / letter / hamlet_board | 版面 | 1 / 2 / 1 | 同页数 | |
| punchboard_300x300 / 200x300 / 130x106 | 版面 | 3 / 3 / 1 | 同页数 | 130x106 来自 ADD_014 |
| dungeon_tile | 版面 | 14 | 14 | |

monster_medium 全部 115 页的副本分布：28 张 ×3、5 张 ×2、21 张 ×1（含 ADD_014）。牌组副本之间只差一个小图标（怪物标记颜色，
规则书 p.17 "note the color of the Monster Token displayed on each Monster Card"），合并后写入 `copy_variants`。

### 2.2 无文本类别（需人工录入）

| 标签 | 文件 | 页数 | 说明 |
|---|---|---|---|
| initiative | DD_EN_COREBOX_CARDS_44x68_Initiative_FRONT/BACK.pdf | 8+8 | 先攻卡 8 张，无文本 |
| quest_map | DD_COREBOX_CARDS_193x203_QuestMap_FRONT/BACK.pdf | 14+14 | 任务地图卡 14 张，无文本 |
| dice_net | DD_COREBOX_DICE_D10_Death_Door / D10_Number / D6_Exploration / D6_Provision.pdf | 各 2 | 骰面展开图，纯矢量 |
| stance_board | DD_COREBOX_BOARD_Monster_Stance_FRONT/BACK.pdf | 1+1 | 怪物站位板，单张位图 |
| hero_dashboard | DD_COREBOX_DASHBOARD_Hero_FRONT_V2 / BACK.pdf | 4+4 | 英雄面板，单张位图 |
| punchboard_130x60 | DD_COREBOX_PUNCHBOARD_130x60_FRONT/BACK.pdf | 1+1 | 标记板，无文本 |
| paper_insert | DD_COREBOX_Paper_Insert_01/02.pdf | 1+1 | 盒内衬美术，非游戏数据 |

## 3. 部件核对（对照核心规则书部件清单）

全部 15 项一致。房间 25 = 17 + 8 已由卡面文字确认（印有 "BOSS" 的 8 张：第 10–13、22–25 页）。

| 规则书部件 | 规则书数量 | 提取来源 | 页数 | 不重复 | 副本合计 | 一致 | 说明 |
|---|---|---|---|---|---|---|---|
| Hero Skill Cards | 231 | hero_skill | 231 | 231 | 231 | ✅ | all pages unique; per-hero counts from card backs: {'CRUSADER': 21, 'HELLION': 21, 'BOUNTY HUNTER': 21, 'HIGHWAYMAN': 21, 'VESTAL': 21, 'JESTER': 21, 'PLAGUE DOCTOR': 21, 'ARBALEST': 21, 'GRAVE ROBBER': 21, 'OCCULTIST': 21, 'ABOMINATION': 18, None: 3} (None = Abomination double-faced transform cards, hero not printed) |
| Hero Cards | 23 | hero_stat | 23 | 23 | 23 | ✅ | 10 heroes x 2 double-sided cards (front I / back II, front III / blank back) + Abomination 3 cards (I, II, III) = 23 |
| Hero PvP Cards | 22 | hero_pvp (base) | 22 | 22 | 22 | ✅ | 11 heroes x 2 cards (Abomination included); the ADD_014 folder holds 2 extra pages: hero_pvp:ADD_014:p001 has the same front text as hero_pvp:p001 (0 icon placements differ); hero_pvp:ADD_014:p002 has the same front text as hero_pvp:p002 (2 icon placements differ) |
| Monster & Boss Cards | 168 | monster_medium (base) + monster_large + boss_ability | 168 | 109 | 168 | ✅ | medium 111 pages = 52 unique cards (deck copies differ only by the monster-token colour marker; 4 are medium-size reference cards for large monsters; 19 pages carry a level numeral on the back, the rest do not) + large 20 + boss_ability 37 ({'boss_description': 16, 'boss_abilities': 21}). ADD_014 adds 4 medium pages = 2 unique x copies [2, 2] (['Imperfect Reflection', 'Perfect Reflection']; same names already in base file: ['Imperfect Reflection', 'Perfect Reflection']; front text identical to the base cards, only the small token-colour marker icon differs) – not counted in the 168. |
| Trinkets | 38 | trinket | 38 | 38 | 38 | ✅ | back level numerals: {"I": 14, "II": 12, "III": 12} |
| Curio Cards | 24 | curio | 24 | 24 | 24 | ✅ | back designs: [{"back_text": "", "n": 24, "pages": "1-24"}] |
| Hamlet Events | 16 | hamlet_event | 16 | 16 | 16 | ✅ | all pages unique |
| Quest Cards | 19 | quest | 19 | 19 | 19 | ✅ | back labels: {"Quest I": 5, "Quest II": 5, "Quest III": 5, "Quest Darkest Dungeon": 3, "Boss Quest": 1} |
| Diseases | 11 | disease | 11 | 11 | 11 | ✅ | all pages unique |
| Stygian Room Cards | 17 | stygian_room | 17 | 17 | 17 | ✅ | all pages unique |
| Positive + Negative Quirks | 35 | quirk | 35 | 35 | 35 | ✅ | 17 + 18 = 35 matches the page count. 'Positive/Negative' is not printed as text on the cards; back designs: [{"back_text": "", "n": 17, "pages": "1-17"}, {"back_text": "", "n": 18, "pages": "18-35"}] |
| Virtues + Afflictions | 10 | virtue_affliction | 10 | 10 | 10 | ✅ | 5 + 5 = 10. The words 'Virtue'/'Affliction' are only in the back artwork (not text); back designs: [{"back_text": "", "n": 5, "pages": "1-5"}, {"back_text": "", "n": 5, "pages": "6-10"}] |
| Room Cards + Boss Room Cards | 25 | room | 25 | 25 | 25 | ✅ | RESOLVED from text: 17 cards without the printed word 'BOSS' (pages 1-9,14-21) + 8 cards with 'BOSS' (pages 10-13,22-25). Two numbering sequences: ['1—', '2—', '3—', '4—', '5—', '6—', '7—', '8—', '9—', '10—', '11—', '12—', '13—'] and ['1—', '2—', '3—', '4—', '5—', '6—', '7—', '8—', '9—', '10—', '11—', '12—'] |
| Player Aid Cards | 8 | player_aid | 8 | 2 | 8 | ✅ | 8 pages = 2 distinct designs x 4 copies: player_aid:p001 x4, player_aid:p005 x4 |
| Initiative Cards | 8 | initiative (text-free, manual entry) | 8 | – | 8 | ✅ | no text in PDF; page count only |

说明：规则书的 "Monster & Boss Cards 168" = 中型怪物卡基础 111 页 + 大型 20 + Boss 卡 37（按印刷页计）；ADD_014 的 4 页
（Perfect/Imperfect Reflection，各 2 份）与基础文件中同名卡正面文字完全相同，仅标记颜色图标不同，不计入 168。
hero_pvp 的 ADD_014 2 页与基础第 1、2 页文字相同（p002 有 2 处图标不同），同样不计入 22。
Quirk 17+18、Virtue/Affliction 5+5 的拆分来自**背面设计分组**（背面感知哈希），卡面文字中并无 "Positive/Negative/Virtue/Affliction" 字样。

## 4. 首轮解析

| 类别 | 卡数 | 成功 | 成功率 | 失败（页码） |
|---|---|---|---|---|
| hero_skill | 231 | 230 | 99.57% | `hero_skill:p044`（第 44 页 Collect Bounty II）：印刷为 `Acc 1O`（字母 O），按原文保留在 `acc_raw`，未自动纠正 |
| monster_medium | 54 | 54 | 100% | – |
| monster_large | 20 | 20 | 100% | – |
| trinket | 38 | 38 | 100% | – |

命名字段仅限：卡名/等级（标题 "Name <罗马数字>"）、英雄（背面）、`Crit N` / `Acc N`（印刷标签）及其右侧数字（`*_value`，含义未命名）、
怪物类型/位置文字、Resistances / Immunities 标签下的图标 id、技能编号+名称、目标（斜体文字）、`hp`（规则书 p.24 "Anatomy of a Monster Card"
标注为 Life 的右侧数字）、饰品上/下半区（规则书 p.26 说每个饰品有正面/负面，但哪一半是哪一面**未断言**）。其余数字全部进入
`unlabeled_numbers`（带 bbox、左侧图标、所在图标）。

交叉校验（均通过）：
- 77 个技能名 × 等级 I/II/III 各一张，无缺漏；10 名英雄各 21 张，Abomination 18 张 + 3 张变身双面卡（背面不印英雄名）= 21。
- 技能卡正面名称/等级与背面名称/等级 231 张全部一致。
- 饰品上下半区名称一致、正面等级与背面等级一致（I 14 / II 12 / III 12）。
- 怪物：所有非参考卡均解析出 hp；4 张中型卡是大型怪物的参考卡（`card_kind = large_monster_reference`，完整数据在 monster_large）。
- 缺少 crit 的技能（hero_skill 48 张、monster 技能 23 个）在原文中确实没有 "Crit" 文字（逐张核对）。

## 5. 图标目录与标注工作量

| 指标 | 数量 |
|---|---|
| 聚类总数 | 1713（共 19477 次放置，按印刷页计，含牌组副本） |
| decor（自动排除） | 449：面板/容器 203、细条（长宽比 >6）152、文字底板 65、清理后空白 25、固定模板元素 4 |
| component_only（只出现在板件/版图/标记板） | 280 |
| likely_art（只出现在一张卡且 ≥12 mm，疑似美术碎片，建议快速过目） | 78 |
| **待标注（annotate）** | **906**（覆盖 14517 次放置） |
| 覆盖待标注放置 80% / 90% / **95%** 所需聚类数 | 156 / 325 / **525** |
| 待标注中出现 ≥3 次 / 仅 1 次 | 639 / 152 |

工作量估计：按每个图标 20–30 秒（查看联系表 + 填含义/kind），标注前 525 个约 3–4.5 小时，全部 906 个约 5–7.5 小时。
很多聚类是同一图标的不同状态/颜色（例如英雄技能卡顶部的位置图标亮/暗两态、各英雄专属肖像），标注时可成批填写。
另一个有规则书依据的捷径：核心规则书正文内嵌了不少图标（Aggressive/Support 站位、Speed、Range、Marked 等，紧挨着文字），
p.24 怪物卡解剖图也标出了 Dodge / Location / Speed / Life 的位置——可以把规则书内嵌图标与本目录做感知哈希比对，生成"建议含义"
供人工确认（尚未实现）。

## 6. JSON 体积（46 MB 上传上限）

| 部分 | 字节 |
|---|---|
| raw/corebox（23 个文件） | 7,032,725（≈6.71 MiB）；其中卡牌类 6,243,055，版面类 789,670 |
| parsed/corebox（4 个文件） | 558,722（≈0.53 MiB） |
| 合计 | **7,591,447（≈7.24 MiB）**，远低于 46 MB |
| （参考）icons/catalog.json + CSV | 约 1.80 MB（仅本机，含 crop 文件名，不建议提交） |

## 7. 未解决问题

1. **图标含义全部未知**：906 个待标注聚类；在字典确认前，parsed 中所有图标与非标签数字都只是占位。
2. **聚类可能过分/不足合并**：阈值为人工调校；已抽查高频与中频聚类，纯度良好，但同一图标在不同底色上的变体（如房间与 Stygian 房间）
   可能合并也可能分开（例如 0591dde355 同时出现在 room 与 stygian_room）；同一图标的亮/暗状态是不同 id（有意为之）。标注时如发现两个 id 是同一含义，可直接在 CSV 中填相同含义。
3. **likely_art 启发式**：78 个"单卡且 ≥12 mm"的聚类可能混入少量较大的状态图标，需要过目。
4. **lines 视图的列合并**：大型怪物卡与 PvP 卡上，相邻列的文字偶尔被拼成一行（如 `... Crowded ... {icon} 3 Rubble of Ruin`）；
   `spans` 与 `icons` 的坐标是准确的，解析器按坐标分块，不依赖 lines。大型怪物 Life 格已从技能块中排除。
5. **饰品倒置半区**：倒印的 "<" 类符号旋转角为 0，会形成单独一行；不影响名称/等级解析。
6. **Quirk 正/负、Virtue/Affliction 的区分只依据背面设计分组**，卡面文字中无此信息；17/18 与 5/5 与规则书一致，但哪组是正面需人工确认背面图。
7. **怪物头部其余数字**（Dodge / Speed / Location / 保护等）仍在 `header_unlabeled_numbers`：规则书 p.24 解剖图有标注，但需要人工确认对应关系后再命名。
8. 印刷错误按原文保留：`hero_skill:p044` 的 `Acc 1O`。
9. 提取器只覆盖英文核心盒；其他扩展未处理。

## 8. 给仓库编码 agent 的下一步建议

**建议提交为 fixtures**（纯数据，不含美术；合计约 7.2 MiB）：
- `raw/corebox/` 中 18 个卡牌类文件（hero_skill、hero_stat、hero_pvp、monster_medium、monster_large、boss_ability、trinket、curio、room、
  stygian_room、quest、hamlet_event、quirk、disease、virtue_affliction、player_aid），约 6.24 MB；
- `parsed/corebox/` 4 个文件（0.56 MB）；
- `reports/summary.json`（sha1 清单）与 `reports/reconciliation.json`；
- 版面类（save_sheet、letter、hamlet_board、punchboard_*、dungeon_tile，0.79 MB）可选；
- 标注完成后的 `icon-dictionary.csv`（只含 iconId 与含义，不含图片）。
- **不要提交** `icons/crops`、`icons/decor`、`icons/index.html`、`work/`。

**建议的 Zod schema 草案**（v0，字段名与 JSON 一致；图标含义确认后再派生强类型字段）：

```ts
const IconId = z.string().regex(/^[0-9a-f]{10}$/);
const BBox = z.tuple([z.number(), z.number(), z.number(), z.number()]);      // mm, trim 左上原点
const IconRef = z.object({ iconId: IconId, bbox: BBox });
const UnlabeledNumber = z.object({ text: z.string(), bbox: BBox,
  left_icon: IconId.optional(), inside_icon: IconId.optional() });

// raw（所有类别通用）
const Span = z.object({ t: z.string(), bbox: BBox, font: z.string(), size: z.number(),
  color: z.string(), rot: z.number().optional(), dup: z.number().int().optional() });
const Face = z.object({ file: z.string(), page: z.number().int(), trim_mm: z.tuple([z.number(), z.number()]),
  face_phash: z.string(), spans: z.array(Span),
  icons: z.array(IconRef.extend({ bbox_full: BBox.optional(), decor: z.boolean().optional(),
    container: z.boolean().optional(), varies_between_copies: z.boolean().optional() })),
  lines: z.array(z.object({ rot: z.number(), text: z.string(), bbox: BBox })) });
const RawCard = z.object({ id: z.string(), source_set: z.enum(["base", "ADD_014"]),
  copies: z.number().int().min(1), pages: z.array(z.number().int()),
  copy_variants: z.array(z.object({ page: z.number().int(), face: z.string(), iconId: IconId })).optional(),
  faces: z.object({ front: Face, back: Face.optional() }) });
const RawFile = z.object({ schema: z.literal("ddbg-raw-v1"), extractor_version: z.string(),
  category: z.string(), kind: z.enum(["card", "sheet"]), units: z.literal("mm"),
  n_pages: z.number().int(), n_unique: z.number().int(), n_copies_total: z.number().int(),
  cards: z.array(RawCard) });

// parsed: hero_skill
const HeroSkill = z.object({ id: z.string(), pages: z.array(z.number().int()), copies: z.number().int(),
  name: z.string(), level: z.number().int().min(1).max(3), hero: z.string().nullable(),
  back_name: z.string().optional(), back_level: z.number().int().optional(),
  crit: z.number().int().optional(), crit_value: z.number().int().nullable().optional(),
  acc: z.number().int().optional(), acc_value: z.number().int().nullable().optional(),
  acc_raw: z.string().optional(), crit_raw: z.string().optional(),
  top_row_icons: z.array(IconRef).optional(), name_row_icons: z.array(IconRef).optional(),
  stats_line_raw: z.string().nullable().optional(), effect_lines_raw: z.array(z.string()),
  unlabeled_numbers: z.array(UnlabeledNumber),
  card_kind: z.literal("double_faced_skill").optional(), back_face_skill: z.record(z.unknown()).optional(),
  issues: z.array(z.string()) });

// parsed: monster_medium / monster_large
const MonsterSkill = z.object({ slot: z.number().int(), name: z.string(), block_bbox: BBox,
  target: z.string().optional(), crit: z.number().int().optional(), crit_value: z.number().int().nullable().optional(),
  acc: z.number().int().optional(), acc_value: z.number().int().nullable().optional(),
  effect_lines_raw: z.array(z.string()), lines_raw: z.array(z.string()),
  unlabeled_numbers: z.array(UnlabeledNumber) });
const Monster = z.object({ id: z.string(), pages: z.array(z.number().int()), copies: z.number().int(),
  copy_variants: z.array(z.object({ page: z.number().int(), face: z.string(), iconId: IconId })).optional(),
  name: z.string(), type_position_raw: z.string(), type_position_tags: z.array(z.string()),
  level: z.number().int().min(1).max(3),
  card_kind: z.literal("large_monster_reference").optional(),   // 仅 medium：大型怪物参考卡
  hp: z.number().int().optional(), hp_icon: IconId.optional(),
  resistances_icons: z.array(IconId).optional(), immunities_icons: z.array(IconId).optional(),
  skills: z.array(MonsterSkill).optional(), header_unlabeled_numbers: z.array(UnlabeledNumber).optional(),
  footer_lines_raw: z.array(z.string()).optional(), back_texts: z.array(z.string()).optional(),
  lines_raw: z.array(z.string()).optional(), issues: z.array(z.string()) });

// parsed: trinket
const TrinketHalf = z.object({ name: z.string(), level: z.number().int(),
  effect_lines_raw: z.array(z.string()), printed_rotation: z.number() });
const Trinket = z.object({ id: z.string(), pages: z.array(z.number().int()), copies: z.number().int(),
  name: z.string(), level: z.number().int().min(1).max(3), back_level: z.number().int(),
  upright_half: TrinketHalf, inverted_half: TrinketHalf, issues: z.array(z.string()) });
```

其余类别（hero_stat、hero_pvp、boss_ability、curio、room、stygian_room、quest、hamlet_event、quirk、disease、virtue_affliction、player_aid）
目前只有 raw；建议在图标字典确认后，按同样"只命名印刷标签字段"的原则逐类编写解析器，并以本次 raw JSON 作为回归 fixture。

**建议顺序**：① 人工标注 `icon-dictionary-template.csv` 前 525 行（覆盖 95%）并确认 likely_art；② 依据规则书 p.24 解剖图确认怪物头部数字；
③ 仓库中实现上述 Zod schema + fixture 测试（含本报告第 4 节的交叉校验）；④ 再为其余卡类写解析器；⑤ 人工录入无文本类别（先攻卡、任务地图、骰面、站位板）。
