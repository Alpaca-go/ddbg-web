# Phase 3：Q-60 图标批准与 Curio 可结算范围

本地分支 `codex/phase3-q60-curio-icons` 基于 main `5714846`。Kyries 2026-10-12 明确批准全部 17 个 Q-60 hash 与 CURIO_FRONT_V2 / 01–24 手打效果行，记录为 R-064。修改清单见[词典变更记录](../packages/data/dictionary/icon-dictionary-v1.8-CHANGELOG.md)。本主题尚未合并到 main，Phase 3 未验收。

## 数据交付

- JSON / CSV 同步确认 17 个 hash：现有 10 条更新、新收 7 条（rank 977–983）；旧 rank 保持不变。source 使用 `kyries_review_2026-10-12`，保留前一状态 / 含义，词典总数 983。历史 `all976` stats 字段名保留，其统计覆盖全部现有条目。
- 只更新本次列出的 hash，不批准同组其他 ID。面具从 decor 改为正 / 负怪癖；饰品奖励覆盖 curio_picture；01 采用抽负面怪癖，早期“美德 / 折磨”作废；Disease 不改成 Blight。图标 value 不写相邻数字，Bleed / Blight 1 · 3t、Buff / Debuff 2t 来自已核对效果行。
- 24 张 Curio 所有行已规范化：`effect=null` 为零，Q-60 图标阻塞全部解除。保留完整 24 张和原抽牌概率。新增原语 `drawQuirk`（含正 / 负）、`drawTrinket`、`rollProvision`，不是替换为金币或空效果。

## 当前运行时可结算范围

前提：抽卡前用真实 Torch 保护；英雄 / 防御资料齐全。Torch 只忽略负面效果，正面怪癖、Buff、饰品与补给奖励不会被抑制。

| 卡号 | 名称             | Torch 后实际结算                                 |
| ---- | ---------------- | ------------------------------------------------ |
| 01   | Eldritch Altar   | 金币 +10                                         |
| 02   | Eldritch Altar   | Buff 2t，接受真实完整抗性 / 免疫；缺资料整卡停场 |
| 04   | Heirloom Chest   | 金币 +5                                          |
| 09   | Alchemy Table    | 金币 +5                                          |
| 13   | Confession Booth | 金币 +5                                          |
| 14   | Confession Booth | 全为负面效果，Torch 抵消后正常弃牌               |
| 17   | Iron Maiden      | 全为负面效果，Torch 抵消后正常弃牌               |
| 19   | Display Cabinet  | 金币 +10                                         |
| 21   | Sarcophagus      | 金币 +10                                         |
| 23   | Suit of Armor    | 全为负面效果，Torch 抵消后正常弃牌               |

其余 14 张的图标全部已知，但存在尚未接入的正面奖励接口，整卡不支付、不弃牌、不消费额外 RNG：

- 补给骰：03、08、10、15、16、20。
- 正面怪癖：06、07、10、11、16、24。
- 饰品：05、07、12、18、22、24。

上述组有重叠，合计 14 张。未用 Torch 时，负面怪癖、Bleed / Blight / Debuff 同卡续接、Q-62 / Q-68 等既有停点继续保留；本批不声称全部 24 张的所有分支可玩。不猜新获得怪癖在同卡其他效果中的触发时机、不猜死亡后奖励顺序。

## 验证入口

Node 24.21.0 / pnpm 12.9.1：typecheck、lint（包括两份本轮获授权更新并格式化的核对文档）、76 文件 / 741 项测试、build、六条 Playwright 冒烟及 diff 检查通过；已检查 Buff 完成截图。浏览器沿用本地忽略配置 Chromium 1234，正式配置未改。首次冒烟的完成提示断言与既有 UI 文案不一致，改为验证真实“弃牌 1”后全套六条通过，未修改测试超时。原有主包大小 / Vite 配置提示保留。

数据回归逐行比对完整手打 01–24 效果序列、全部状态数值、词典退回时恢复 null、JSON / CSV 一致和全量再生。引擎回归使用合法完整已洗牌池逐张放顶，验证十张完成 / 十四张停点、奖励与骰标记不部分提交，以及 Buff 正确施加 / 缺防御停场。这是明确场景布置，不改真实抽牌。

既有第一条 Phase 3 冒烟新增真实 seed 343：第一颗 Curio，自然抽 p02；抽前 Torch 忽略负面而保留 Buff，结算后弃牌并续接，游标保持 38。未强制骰或删卡，仍为三条 Phase 3 / 六条总冒烟。板块核对与其余运行时仍属于步骤 2 的后续工作，不跳步骤 3 / Phase 4。
