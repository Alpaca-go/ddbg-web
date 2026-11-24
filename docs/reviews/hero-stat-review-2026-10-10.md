# 四名核心英雄属性核对准备（2026-10-10）

状态：**Kyries 于 2026-10-10 确认 §3 全部 12 行，仅批准 Life / Dodge / Speed；本块单独入库，不实现死门、英雄移动或 UI。**

## 1. 核对时基线与范围

远端 `main` 为 `faabf55`（已合并 #54）。[PR #55](https://github.com/Alpaca-go/ddbg-web/pull/55) 为开放、非草稿、未合并，保留在原分支 `codex/phase2-monster-movement-edges`；本块从 `origin/main` 单独建立 `codex/phase2-hero-stat-review`，不混入 #55。

交接指定的 Phase 2 块 A/B/C、位移、普通怪选招与 Speed 定位已落地。英雄属性尚只有 `extract/corebox/raw/hero_stat.json`，没有 parsed / normalized 属性卡；引擎当前明确拒绝英雄 Life，不能将已有技能沙盒当成生命规则已完成。

本表只覆盖 Crusader、Hellion、Highwayman、Vestal 的 I/II/III 级，共 **8 个 raw id、12 个属性面**。它们只是本次小批次，不代表限定初始队伍，也不代表其余七名核心英雄完成核对。

## 2. 来源与命名依据

按 R-001 只使用官方规则书与本项目裁定；印刷卡面只提供数字和文字。已对照以下完整页面图像：

- 官方核心规则书 R10：`Anatomy of the Hero Boards` 明确标出 Dodge、Hero Life、Hero Movement 的位置。
- R19：攻击命中使用目标 Dodge；数值不是英雄的伤口或生命。
- R29：伤口等于 Life 时进入死门，伤口不能超过 Life；升级属性卡与升级技能独立。
- R-006：Dodge 为叠在图标上的数字，Life 为心形内数字，Speed 为靴子个数。
- R-007：I 级正面与 II 级背面共用一张物理卡；III 级另卡正面，背面为卡背。
- R-048：本表不赋予其他未确认图标语义，不给词典的 null value 或状态 duration 填值。

本机只读来源：

```text
C:\Users\kyrie\Desktop\DDBG\DD_EN_COREBOX_RULES.pdf
C:\Users\kyrie\Desktop\新建文件夹\DARKEST DUNGEON EN_FILES\DARKEST_DUNGEON_PRINT_EN_WAVE 1\MG_DD_01_EN_COREBOX_Print\02_DD_CARDS_COREBOX\DD_EN_COREBOX_CARDS_100x180_Hero_STAT_FRONT.pdf
C:\Users\kyrie\Desktop\新建文件夹\DARKEST DUNGEON EN_FILES\DARKEST_DUNGEON_PRINT_EN_WAVE 1\MG_DD_01_EN_COREBOX_Print\02_DD_CARDS_COREBOX\DD_EN_COREBOX_CARDS_100x180_Hero_STAT_BACK.pdf
```

没有使用 PvP、The Darkest Heroes 重印、Old_Version、模组 / 设计师 FAQ 或旧仓库。渲染对照图仅留在被 Git 忽略的 `node_modules/.cache/hero-stat-review/`；PDF、卡图、切图均不提交。

## 3. 逐面获批表

以下数字均已于 2026-10-10 获 Kyries 批准，作为本块入库依据。FRONT / BACK 页码为上述两个当前版印刷文件的 1 基页码，不是等级，也不是规则书页码。raw id 不能单独作为等级主键，必须同时保存 face。

| 英雄       | 等级 | raw id           | 面 / 页   | Life | Dodge | Speed | 状态   |
| ---------- | ---- | ---------------- | --------- | ---- | ----- | ----- | ------ |
| CRUSADER   | I    | `hero_stat:p001` | FRONT p1  | 17   | 0     | 1     | 已确认 |
| CRUSADER   | II   | `hero_stat:p001` | BACK p1   | 24   | 1     | 1     | 已确认 |
| CRUSADER   | III  | `hero_stat:p002` | FRONT p2  | 32   | 2     | 1     | 已确认 |
| HELLION    | I    | `hero_stat:p003` | FRONT p3  | 14   | 1     | 2     | 已确认 |
| HELLION    | II   | `hero_stat:p003` | BACK p3   | 18   | 2     | 2     | 已确认 |
| HELLION    | III  | `hero_stat:p004` | FRONT p4  | 24   | 3     | 2     | 已确认 |
| HIGHWAYMAN | I    | `hero_stat:p007` | FRONT p7  | 12   | 1     | 2     | 已确认 |
| HIGHWAYMAN | II   | `hero_stat:p007` | BACK p7   | 17   | 2     | 2     | 已确认 |
| HIGHWAYMAN | III  | `hero_stat:p008` | FRONT p8  | 22   | 3     | 3     | 已确认 |
| VESTAL     | I    | `hero_stat:p009` | FRONT p9  | 12   | 0     | 1     | 已确认 |
| VESTAL     | II   | `hero_stat:p009` | BACK p9   | 17   | 1     | 1     | 已确认 |
| VESTAL     | III  | `hero_stat:p010` | FRONT p10 | 22   | 2     | 2     | 已确认 |

逐面查看等级徽记、英雄名、心形数字、Dodge 数字及右侧靴子后，与 raw span / icon placement 交叉核对；没有从等级推导递增公式。Highwayman III 有三枚靴子，Vestal III 有两枚，不能沿用其 I/II 级 Speed。

## 4. raw 与词典定位

词典 v1.8 已确认以下图标；图标的 `value` 仍为 null，本表不修改词典。数字来自卡面 text span，Speed来自已标注移动栏里的图标数量。

| 字段     | iconId / 词典 rank | key / status          | 本表读取方式                  |
| -------- | ------------------ | --------------------- | ----------------------------- |
| Life     | `9534ad5184` / r34 | `life` / `confirmed`  | 心形内的独立数字 span         |
| Dodge    | `7a472f5d6f` / r33 | `dodge` / `confirmed` | 该图标上方叠印的独立数字 span |
| Speed    | `4648c9e5ec` / r4  | `speed` / `confirmed` | 移动栏中该图标的逐面出现次数  |
| 数字底框 | `ea576f3383` / r80 | `decor` / `decor`     | 不赋予规则含义、不计入 Speed  |

raw 坐标为卡面 TrimBox 内毫米，原点左上，Y 向下。下表列出图标 bbox，供复核定位；不能把这些坐标变成适用于所有英雄的自动解析规则。

| 属性面                          | Life 图标 bbox                | Dodge 图标 bbox               | Speed 图标 bbox                                                                             |
| ------------------------------- | ----------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------- |
| Crusader 三等级、Vestal I/II    | `[45.20,108.01,60.50,123.31]` | `[25.04,107.94,40.48,123.38]` | `[68.92,111.16,78.96,121.21]`                                                               |
| Hellion 三等级、Highwayman I/II | `[39.70,108.01,55.00,123.31]` | `[20.54,107.94,35.98,123.38]` | `[59.00,110.66,69.04,120.71]`、`[71.60,110.66,81.64,120.71]`                                |
| Highwayman III                  | `[34.48,108.01,49.78,123.31]` | `[15.32,107.94,30.76,123.38]` | `[53.78,110.66,63.82,120.71]`、`[66.38,110.66,76.42,120.71]`、`[79.23,110.66,89.27,120.71]` |
| Vestal III                      | `[41.53,108.01,56.83,123.31]` | `[21.37,107.94,36.81,123.38]` | `[60.93,111.16,70.97,121.21]`、`[74.33,111.16,84.37,121.21]`                                |

III 级所在物理卡 BACK p2 / p4 / p8 / p10 都为卡背，不产生第四等级。不得把背面缺少数值补成 0，也不得把 FRONT 的数值复制给背面。

## 5. 批准记录与入库边界

Kyries 在本对话明确批准：“四名英雄 12 面 Life / Dodge / Speed 核对表通过，按 §3 入库。”并要求身份使用 raw id + face，保留未确认图标，不因三项获批清整卡未验证，数据单独 PR，死门 / 英雄移动另开。批准只覆盖所列 12 面的三个字段，不覆盖其他英雄、抗性、免疫、村庄技能或整卡可用性。

本次单独推进数据入库：以 raw id + face 为来源身份，保存英雄名、等级、文件 / 页码与三个获批数值；建立 Zod schema 和明确的人工映射，接现有生成路径。缺失映射不补值，身份漂移 / 卡背 / 冲突应拒绝。未确认图标继续保留 ID / 未验证状态，不能因为三个属性获批而清除整卡未验证标记。

数据入库与引擎生命规则拆开审阅。之后另做 Life 上限、死门与种子骰序列，不能只放开 `createBattleState` 的英雄 Life 检查而让已有伤害无限累积；英雄移动同样另做行动计数、满员区域回合边界与容量检查。仍限于 Phase 2。

## 6. 本块验证与边界

已核 12 个属性面与 R10 / R19 / R29 完整页面图像，复核 raw 的等级 / 英雄名 / 数字 / 图标位置和词典状态。本块只有文档，没有修改 raw、parsed、normalized、词典、schema、引擎或 UI，没有新增规则裁定。

当前规范化六类卡共 388 张、45 张未验证，与旧交接的数量相符；其中 hero_skill 9、monster_medium 9、monster_large 2、trinket 14、quirk 9、virtue_affliction 2。这个统计不包括尚未规范化的英雄属性卡，也不意味着整个核心盒数据已齐备。

从已合并 `main` 建立的本核对分支，typecheck、lint、258 项 Vitest（20 文件）、build 与 `git diff --check` 全部通过；#55 分支另已复核 267 项通过。测试数量的差异来自 #55 的九条边角场景尚未进入 main，不是删除测试。本块未改 UI、不是阶段结束，不新增 Playwright 冒烟；没有据此宣称战斗 UI 已验收。

## 7. 获批入库实现（2026-10-10）

PR #55 已单独审查，确认两项 CI 全绿后采用 GitHub merge 合并，main 同步至 `93368a3`。本数据分支基于该 main，PR diff 不包含 Q-22 引擎改动。上文 §1 和 §6 的未合并 / 待入库描述保留为核对准备时的历史状态，以本节为准。

数据块已提交为 `9976c13`，单独 [PR #56](https://github.com/Alpaca-go/ddbg-web/pull/56) 已创建，待 Kyries 审阅合并；不与死门 / 英雄移动混合。

新增独立 `hero-stat.ts`：12 行人工映射、Zod schema 和纯构建函数，接现有规范化生成入口，输出 `hero_stat.json`。每面 id 为 `rawId:face`，同时保存 rawId、face、英雄 / 等级及文件 / 页码。源身份、卡背、重复面、数字或 Speed 数量冲突、脏值、属性图标退回未确认均拒绝；没有映射的其他面不输出，不补默认值。

三个字段用 `attributesVerified=true` 标明本次审批，整卡 verification 仍按其他图标 / 原始行里的未确认 ID 计算。12 面中 9 面保持未验证，未确认图标及 null 保留；decor 继续沿用提取器 / 词典的既有装饰标记。其他文字只保留原始行，没有把村庄效果、抗性、免疫或 duration 转成规则。原七份规范化文件、raw / parsed、词典、引擎和 UI 均不变。

验证：typecheck、lint、274 项 Vitest（21 文件）、build、`git diff --check` 全部通过。新增七项数据测试覆盖 12 面独立预期、未映射面 / 卡背拒绝、未知图标与整卡未验证保留、身份 / 文件 / 页码漂移、重复面、数值 / Speed 冲突、词典退回未确认、重复生成与输入不变。没有 UI 改动、不是阶段结束，不新增 Playwright；独立 PR 仍运行现有质量检查和首页 smoke 两项 CI。
