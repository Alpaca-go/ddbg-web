# Phase 4：死亡补人前置——赏金猎人属性与防御入库

状态：**Kyries 已回复“批准三行属性与限定防御”，记 R-088/Q-90 confirmed。三面属性与防御按本轮日期单独入库；仍不是完整可用英雄或死亡补人运行时。**

独立草稿 [PR #213](https://github.com/Alpaca-go/ddbg-web/pull/213)，数据/测试提交 `5121a27`，尚未合并。早先 `a319aca` 为本轮批准前的待审资料提交，不代表当前仍需重复确认。

本轮已审查合并 [#212](https://github.com/Alpaca-go/ddbg-web/pull/212)，head `3ba3123` 与上一轮已验证版本相同，仅末尾补了 PR 记录；main 同步至 `e300c47`。保留本地 8080 配置与未跟踪资料。从该 main 建立 `codex/phase4-replacement-hero-review`，先补死亡替换所需的第五名英雄资料，不跳入 Phase 5。

## 1. 来源与本次审批范围

规则来源仅官方核心规则书和 `docs/rulings.md`：已对照完整 R10（Life/Dodge/Movement 栏）、R21（抗性/免疫及状态图例）、R29（升级属性）、R31（Hero Death）页面图像；R33 驿站代币沿已核对的完整页面。关联规格书 §2.4、§4.6、§6.5、§7、§9.4，R-001/R-006/R-007/R-039/R-048/R-051。未使用 FAQ、旧版本印刷件、PvP 或旧仓库。

当前版印刷来源：

- `02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_100x180_Hero_STAT_FRONT.pdf` p5/p6。
- 同目录 `DD_EN_COREBOX_CARDS_100x180_Hero_STAT_BACK.pdf` p5。
- raw：`packages/data/extract/corebox/raw/hero_stat.json` 的 `hero_stat:p005`、`hero_stat:p006`。

本机只读 PDF 位于 `C:\Users\kyrie\Desktop\新建文件夹\DARKEST DUNGEON EN_FILES\DARKEST_DUNGEON_PRINT_EN_WAVE 1\MG_DD_01_EN_COREBOX_Print\02_DD_CARDS_COREBOX\`；规则书为 `C:\Users\kyrie\Desktop\DDBG\DD_EN_COREBOX_RULES.pdf`。三张完整卡面与 R31 已重新渲染并目视检查；图片仅留本机 `node_modules/.cache/replacement-hero-review/`，不提交。

本轮批准仅覆盖三个属性面各自的 Life/Dodge/Speed 和完整抗性/免疫栏。III 级图标的解释只针对本表 id + face + 左栏；不是全局词典批准，不覆盖其他英雄、技能、村庄能力或新英雄入队流程。

## 2. 三行获批表（R-088 / Q-90）

| 规范化 id              | 英雄/等级         | 来源     | Life | Dodge | Speed | 抗性（左栏）                                            | 免疫（右栏） |
| ---------------------- | ----------------- | -------- | ---- | ----- | ----- | ------------------------------------------------------- | ------------ |
| `hero_stat:p005:front` | BOUNTY HUNTER I   | FRONT p5 | 14   | 1     | 2     | Stun                                                    | 空           |
| `hero_stat:p005:back`  | BOUNTY HUNTER II  | BACK p5  | 18   | 2     | 2     | Stun、Debuff                                            | 空           |
| `hero_stat:p006:front` | BOUNTY HUNTER III | FRONT p6 | 23   | 3     | 2     | Stun、**Debuff（`c07ea0c507`，仅本卡限定获批）**、Bleed | 空           |

三个完整属性面分别读取数字并数移动栏两枚靴子，没有按等级套递增公式。BACK p6 为卡背，不生成属性面、不补零。III 级左侧职业徽记 `61fd969d50` 位于属性卡外框，右侧红骷髅为死门骰槽，均不算抗性/免疫。

## 3. 图标与位置核对

Life `9534ad5184`、Dodge `7a472f5d6f`、Speed `4648c9e5ec` 已由词典 v1.8 确认。三张卡的 Life 框均为 `[39.70,108.01,55.00,123.31]`，Dodge 框均为 `[20.54,107.94,35.98,123.38]`；两枚 Speed 框为 `[59.00,110.66,69.04,120.71]`、`[71.60,110.66,81.64,120.71]`。单位为 TrimBox 毫米，原点左上。

| 属性面 | 左栏图标（按横向顺序）                   | 词典现状                      |
| ------ | ---------------------------------------- | ----------------------------- |
| I      | `8db71542d2`                             | Stun，confirmed               |
| II     | `8db71542d2`、`de6f50b39b`               | Stun / Debuff，均 confirmed   |
| III    | `8db71542d2`、`c07ea0c507`、`64702f548e` | Stun / **unreviewed** / Bleed |

III 的 `c07ea0c507` 位于 `[22.93,135.82,29.28,142.88]`，外观为向下的橙色双折箭。与 R21 Debuff 图例及 II 级已确认图标交叉目视后提出限定候选，现经本轮明确批准，按 R-088 只在本卡左栏读取 Debuff 抗性。词典仍 unreviewed，卡面原图标与整卡未验证原因保留。三张卡的完整右栏均为空，不从同名或低等级卡外推；原四英雄 R-081 的名单和日期不变。

## 4. 后续实现入口与真实缺口

1. 表 §2 已获确认，本分支扩展属性/防御人工映射、身份与来源守门和生成路径；新增三面，原十二面内容和旧批准日期不变，实际批准日期为 2026-10-16。所有原始图标、文字与整卡未验证原因保留。
2. Bounty Hunter 七张 I 级技能已在完整规范化文件中，`verification.unverified=false`；这是图标转录状态，不是“所有效果已接通”。下表仅列开发入口，不申请技能效果批准。

| I 级技能 id       | 名称           | 后续必须核对/接线的关键内容                                                |
| ----------------- | -------------- | -------------------------------------------------------------------------- |
| `hero_skill:p043` | Collect Bounty | 对 Humans / Mark 条件伤害；不能套现有只接受独立 marked/unholy 行的伤害注解 |
| `hero_skill:p046` | Mark for Death | `0-2` 射程、目标 Mark/Buff 与自身 Buff 的完整效果行和持续时间              |
| `hero_skill:p049` | Come Hither    | 同行 Mark 与 Pull 的完整续接                                               |
| `hero_skill:p052` | Uppercut       | 同行 Stun 与 Push 的完整续接                                               |
| `hero_skill:p055` | Flashbang      | `1-2` 射程、Stun 及 Push/Pull 玩家选择                                     |
| `hero_skill:p058` | Finish Him     | `0-1` 射程、对 Stun 条件伤害                                               |
| `hero_skill:p061` | Caltrops       | 同行 Bleed 与 Buff 的完整持续时间                                          |

3. 村庄能力 Scout Ahead 的原文和压力图标已保留，但本表不批准或实现“下次地牢揭房间”的选房/续接流程。
4. 再独立实现 R31/R33/R-039：战役死亡名单、死者饰品让渡/弃置、排除在队及本战役死亡英雄、扣等待代币、继承驿站 XP 且不扣驿站余额、最多两项免费升级、初始技能选择、战斗结束后入队及探索/回村续接。代币不足判失败；不能用“目前没有第五名已核实英雄”冒充规则上的代币耗尽。

目前 `awaitingReplacement` 停点不变。不得先用数值夹具或复活原四英雄伪装补人完成。仍需后续扩充其余英雄；本次只把赏金猎人作为第一个备用候选，并非缩小正式核心盒英雄范围。

## 5. 变更与验收边界

经本轮批准后，本主题由待审资料扩展为获批数据入库。仅规范化 `hero_stat.json` 新增三面；沿现有生成入口，其他规范化文件无差异。属性 schema 校验限定 id/face/等级/数字及批准日期，完整防御继续锁住左右栏和图标序列。新增五项测试覆盖黄金值、全局词典与原始数据不变、左右栏/身份/数值/日期漂移、局部批准不清整卡未验证，以及生成一致。

原始 raw/parsed、词典、引擎和存档协议不改。网页构建目录显式保留原四英雄（原本只是“取全部 I 级”），避免属性前置获批就把技能未完整接通的赏金猎人加入试玩。无 UI 布局变化，不增加 Playwright 条数；不宣称已完成死亡补人、正式高等级存档、Boss 升幕或人工试玩。

资料准备阶段 typecheck、ESLint、两文件/13 项现有属性与防御测试及 build 通过；批准后重新执行完整闸门，结果见提交前补记。Node 24.20.0、pnpm 12.9.1；本地端口、未跟踪资料及全部卡图/PDF/缓存不提交。

最终验证：typecheck、ESLint、本次修改文件的 Prettier、141 文件/1206 项 Vitest（`--maxWorkers=1 --isolate=false`，277.73 秒）、build 与 `git diff --check` 全部通过。现有战斗 Playwright 三条通过（1.7 分钟），未新增条数。与 main 逐项比较，原十二个属性面完全相等，只有三个新面被追加；其他规范化文件、raw/parsed 与词典无差异。根原样格式扫描仍可能命中原有未跟踪交接/临时文件，未改它们，不声称原样 `pnpm lint` 通过。

首次完整测试暴露了旧场景以“全部 I 级属性”自动组成四人队的夹具假设；新增第五名属性后产生多余队员和无姿态实体。八处夹具改为明确选择原四英雄，保留所有原断言和引擎人数/区域/姿态校验，完整复跑通过；不把新英雄未接完整效果的技能计入“四核心技能”验收。
