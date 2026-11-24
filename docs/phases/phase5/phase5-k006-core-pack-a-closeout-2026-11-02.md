# K-006 · 饰品旧缺口复核与可开 A 收口

日期：2026-11-02；基线：`b89c1b7`。依据 R26 / 规格书 §11.2、R-127–R-130、R-001 / R-048。K-006 的旧 A-5 清单与当前代码交叉核对后，13 张卡均已有至少一项能力，不重复实现。

| 卡牌                       | 已有能力入口                                                | 现有回归                                              |
| -------------------------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| p003 Bleed Charm           | trinket-reactions.ts：命中追加 bleed，反面减少持续时间      | battle-attack-trinkets.test.ts、core-trinkets.test.ts |
| p004 Blight Charm          | 同上，追加 blight                                           | battle-attack-trinkets.test.ts                        |
| p008 Debuff Charm          | 同上，追加 debuff                                           | battle-attack-trinkets.test.ts                        |
| p011 Stun Charm            | 同上，追加 stun                                             | battle-attack-trinkets.test.ts                        |
| p010 Speed Stone           | battle-hero-movement / trinket-reactions：速度与 Dodge 选择 | core-trinkets.test.ts                                 |
| p012 Survival Guide        | trinket-exploration-reactions：忽略 Hunger、空白转 Trap     | core-trinkets.test.ts                                 |
| p016 Book of Constitution  | 疾病反应选择、负速度                                        | core-trinkets.test.ts                                 |
| p019 Camouflage Cloak      | trinket-reactions：命中反应及属性选择                       | battle-attack-trinkets.test.ts、core-trinkets.test.ts |
| p020 Chirurgeon’s Charm    | healingTrinketReaction：治疗与受到治疗修正                  | core-trinkets.test.ts                                 |
| p021 Dark Bracer           | battle-attack-trinkets：光照条件攻击修正                    | battle-attack-trinkets.test.ts                        |
| p022 Protective Padlock    | trinket-reactions：伤害减半、反面负速度                     | core-trinkets.test.ts                                 |
| p023 Bloodcourse Medallion | healingTrinketReaction：受到治疗修正；受击追加 bleed        | core-trinkets.test.ts                                 |
| p024 Camper’s Helmet       | trinket-exploration-reactions：柴火补给骰；侦察压力         | core-trinkets.test.ts                                 |

上述测试与 Necromancer 既有测试联合 140 测通过。这里只按交接验收“至少一项能力”核对；不宣称所有饰品正反面在所有窗口都已统一。Dark Crown / Solar Crown / Cleansing Crystal 的半开 UI / 意志窗归 K-011 / K-012，不变更。

## 可立刻开 A 当前状态

- K-001：两招已合 #486–487，Teleport hold。
- K-002：四招效果线已合 #488–491。
- K-003：DL2 已批子集两招缺失 Push1 已合 #492，admission 回归通过。
- K-004：9 种普通怪物的 21 招全部已合 #493–512、#514（Fate’s Pull 按 R-140）；已确认攻击招走最小纯结算，友方招返回治疗/增益/自身位移意图，不开放可战与 AI。
- K-005：自动选招与 Six Feet Under 早已实现，notes 已合 #513。
- K-006：旧缺口 13 张均有既有能力与测试，本次只盘点。

## Q-128 已裁定（R-140）

Kyries 查看原卡截图后明确按“目标 Pull 2、压力 +1”实现。#514 已合，仅对 p066 slot 3 的完整签名进行上下文映射，保留原始词典图标含义。K-001～K-006 的可开 A 现已完成或核对收口；任务卡 / 生产几何 / Speed / combatReady / Phase 6 的既有 hold 不变。

## 最终验证

- 普通池目录核对：9 种、21/21 招有 verified 效果计划。完整攻击计划回归 90 招；友方三招及 Self 编译另测。
- 最后全量测试（R-140 前启动）：2837 通过、40 失败；本轮新增专项通过。R-140 追加规范化 8 测、结算及边界 12 测通过。
- 对 5 个涉及通用结算的失败文件，在本轮基线 5bda4fe0 独立 checkout 复核：21 通过、8 失败，8 个失败名称与当前全量结果一致。其它全量失败未逐项隔离，不标记全量通过。
- 构建通过；本轮修改 TypeScript 文件 ESLint / Prettier 通过。完整 typecheck 仍有此前5处未改文件错误，完整 lint 仍有旧源码与本地 .cache 脚本错误。
- 不提交测试 JSON 证据链或私有卡图；检查日志只在本地 .cache。
