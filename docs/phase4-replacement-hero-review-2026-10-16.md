# Phase 4：死亡补人前置——赏金猎人属性与防御待审

状态：**Q-90 pending，表中三行均为候选；尚未写入获批映射、规范化数据或可用英雄池。**

本轮已审查合并 [#212](https://github.com/Alpaca-go/ddbg-web/pull/212)，head `3ba3123` 与上一轮已验证版本相同，仅末尾补了 PR 记录；main 同步至 `e300c47`。保留本地 8080 配置与未跟踪资料。从该 main 建立 `codex/phase4-replacement-hero-review`，先补死亡替换所需的第五名英雄资料，不跳入 Phase 5。

## 1. 来源与本次审批范围

规则来源仅官方核心规则书和 `docs/rulings.md`：已对照完整 R10（Life/Dodge/Movement 栏）、R21（抗性/免疫及状态图例）、R29（升级属性）、R31（Hero Death）页面图像；R33 驿站代币沿已核对的完整页面。关联规格书 §2.4、§4.6、§6.5、§7、§9.4，R-001/R-006/R-007/R-039/R-048/R-051。未使用 FAQ、旧版本印刷件、PvP 或旧仓库。

当前版印刷来源：

- `02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_100x180_Hero_STAT_FRONT.pdf` p5/p6。
- 同目录 `DD_EN_COREBOX_CARDS_100x180_Hero_STAT_BACK.pdf` p5。
- raw：`packages/data/extract/corebox/raw/hero_stat.json` 的 `hero_stat:p005`、`hero_stat:p006`。

本机只读 PDF 位于 `C:\Users\kyrie\Desktop\新建文件夹\DARKEST DUNGEON EN_FILES\DARKEST_DUNGEON_PRINT_EN_WAVE 1\MG_DD_01_EN_COREBOX_Print\02_DD_CARDS_COREBOX\`；规则书为 `C:\Users\kyrie\Desktop\DDBG\DD_EN_COREBOX_RULES.pdf`。三张完整卡面与 R31 已重新渲染并目视检查；图片仅留本机 `node_modules/.cache/replacement-hero-review/`，不提交。

本表只请确认三个属性面各自的 Life/Dodge/Speed 和完整抗性/免疫栏。III 级未确认图标的候选解释只针对本表 id + face + 左栏；不是全局词典批准，不覆盖其他英雄、技能、村庄能力或新英雄入队流程。

## 2. 三行候选表（Q-90）

| 规范化候选 id          | 英雄/等级         | 来源     | Life | Dodge | Speed | 抗性（左栏，候选）                                  | 免疫（右栏） |
| ---------------------- | ----------------- | -------- | ---- | ----- | ----- | --------------------------------------------------- | ------------ |
| `hero_stat:p005:front` | BOUNTY HUNTER I   | FRONT p5 | 14   | 1     | 2     | Stun                                                | 空           |
| `hero_stat:p005:back`  | BOUNTY HUNTER II  | BACK p5  | 18   | 2     | 2     | Stun、Debuff                                        | 空           |
| `hero_stat:p006:front` | BOUNTY HUNTER III | FRONT p6 | 23   | 3     | 2     | Stun、**Debuff（`c07ea0c507`，待限定确认）**、Bleed | 空           |

三个完整属性面分别读取数字并数移动栏两枚靴子，没有按等级套递增公式。BACK p6 为卡背，不生成属性面、不补零。III 级左侧职业徽记 `61fd969d50` 位于属性卡外框，右侧红骷髅为死门骰槽，均不算抗性/免疫。

## 3. 图标与位置核对

Life `9534ad5184`、Dodge `7a472f5d6f`、Speed `4648c9e5ec` 已由词典 v1.8 确认。三张卡的 Life 框均为 `[39.70,108.01,55.00,123.31]`，Dodge 框均为 `[20.54,107.94,35.98,123.38]`；两枚 Speed 框为 `[59.00,110.66,69.04,120.71]`、`[71.60,110.66,81.64,120.71]`。单位为 TrimBox 毫米，原点左上。

| 属性面 | 左栏图标（按横向顺序）                   | 词典现状                      |
| ------ | ---------------------------------------- | ----------------------------- |
| I      | `8db71542d2`                             | Stun，confirmed               |
| II     | `8db71542d2`、`de6f50b39b`               | Stun / Debuff，均 confirmed   |
| III    | `8db71542d2`、`c07ea0c507`、`64702f548e` | Stun / **unreviewed** / Bleed |

III 的 `c07ea0c507` 位于 `[22.93,135.82,29.28,142.88]`，外观为向下的橙色双折箭。与 R21 Debuff 图例及 II 级已确认图标交叉目视后，提出“Debuff 抗性”的限定候选；R-048 下仍未赋予生产语义。三张卡的完整右栏均为空，不从同名或低等级卡外推。现有 R-081 仅覆盖原四英雄八张高等级卡，不能扩大其审批名单。

## 4. 后续实现入口与真实缺口

1. 表 §2 经明确确认后，单独扩展属性/防御人工映射、身份与来源守门和生成路径；保留未确认图标原 ID，不伪造旧批准日期或清除其他未验证原因。
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

仅新增待审资料与 Q-90、更新当前交接。raw/parsed/normalized、词典、schema、引擎、UI、存档协议均未修改。未新增测试或 Playwright 条数；不宣称已完成死亡补人、正式高等级存档、Boss 升幕或人工试玩。

本轮 typecheck、ESLint、两文件/13 项现有英雄属性及高等级防御测试、build、新增/修改文档的 Prettier 与 `git diff --check` 通过。完整 140 文件/1201 项 Vitest 和村庄 Playwright 沿用 #212 同一代码版本已通过的结果，本资料主题未重复运行全套或浏览器。Node 24.20.0、pnpm 12.9.1；本地端口、未跟踪资料及全部卡图/PDF/缓存不提交。
