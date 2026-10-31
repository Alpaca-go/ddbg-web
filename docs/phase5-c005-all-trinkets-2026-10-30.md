# C-005 核心盒饰品双面接线（2026-10-30）

本刀在 #397 上继续补齐剩余14张及原有仅单面能力。38张均有正反面命令或触发入口；这里的38/38指卡牌双面接线，不代表所有战役、Boss组合与时点都已穷举验收。

依据：核心规则书R14–15、R18–21、R26–29、R31；规格书§5.8、§6、§11.2；项目裁定R-026、R-028、R-048及本聊天确认的R-127–R-134。卡面来源为本地私有缓存完整TRINKETS_FRONT对应页；不提交缓存图片。

## 双面入口

| 页／ID       | 卡牌                  | 正反面入口                               |
| ------------ | --------------------- | ---------------------------------------- |
| trinket:p001 | Accuracy Stone        | 攻击窗口                                 |
| trinket:p002 | Archer’s Ring         | 攻击窗口                                 |
| trinket:p003 | Bleed Charm           | 技能命中追加Bleed／造成条件时缩短一项    |
| trinket:p004 | Blight Charm          | 技能命中追加Blight／造成条件时缩短一项   |
| trinket:p005 | Caution Cloak         | 侦察免压力／免费降光                     |
| trinket:p006 | Critical Stone        | 攻击窗口                                 |
| trinket:p007 | Damage Stone          | 攻击伤害／受到正伤害追加同批伤口         |
| trinket:p008 | Debuff Charm          | 技能命中追加Debuff／造成条件时缩短一项   |
| trinket:p009 | Sage’s Book           | 攻击窗口                                 |
| trinket:p010 | Speed Stone           | 移动Speed或受击Dodge二选一               |
| trinket:p011 | Stun Charm            | 技能命中追加Stun／造成条件时缩短一项     |
| trinket:p012 | Survival Guide        | 个人探索骰忽略Trap或Hunger／非Trap改Trap |
| trinket:p013 | Warrior’s Bracer      | 攻击窗口                                 |
| trinket:p014 | Warrior’s Cap         | 攻击窗口                                 |
| trinket:p015 | Bloodthirst Ring      | Food治疗／受击自身Bleed                  |
| trinket:p016 | Book of Constitution  | R27获得疾病后弃新疾病／移动Speed−2       |
| trinket:p017 | Book of Holiness      | 免费减压／对自身命中改暴击               |
| trinket:p018 | Book of Relaxation    | 免费减压／Dodge−2                        |
| trinket:p019 | Camouflage Cloak      | 光照≥3时Dodge+2／受击自身Stun            |
| trinket:p020 | Chirurgeon’s Charm    | 施放治疗+2／受到治疗−4                   |
| trinket:p021 | Dark Bracer           | 攻击窗口                                 |
| trinket:p022 | Protective Padlock    | 受击伤害减半／移动Speed−1                |
| trinket:p023 | Bloodcourse Medallion | 受到治疗+4／受击自身Bleed                |
| trinket:p024 | Camper’s Helmet       | 柴火Resting补给骰／侦察压力+1            |
| trinket:p025 | Fortunate Armlet      | 攻击窗口／免费压力+1                     |
| trinket:p026 | Solar Bracer          | 攻击窗口                                 |
| trinket:p027 | Berserk Charm         | 自己的战斗回合行动+1／免费压力+1         |
| trinket:p028 | Dark Crown            | 低光照免费减压／意志骰确定后阈值−2       |
| trinket:p029 | Fasting Seal          | Dodge+5／消耗Food无效果                  |
| trinket:p030 | Recovery Charm        | 免费治疗／免费压力+2                     |
| trinket:p031 | Sniper’s Ring         | 攻击窗口                                 |
| trinket:p032 | Warrior’s Ring        | 攻击窗口                                 |
| trinket:p033 | Defender’s Ring       | 攻击窗口                                 |
| trinket:p034 | Scholar’s Ring        | 攻击窗口                                 |
| trinket:p035 | Solar Crown           | 高光照免费减压／意志骰确定后阈值−2       |
| trinket:p036 | Book of Sanity        | 免费减压／R-128非攻击伤害6               |
| trinket:p037 | Candle of Life        | 同行区域英雄治疗／免费降光               |
| trinket:p038 | Cleansing Crystal     | 全体清除五种负面条件／实际抽负面怪癖     |

## 行为与回放

- 新网页命令记录allTrinkets:true；旧命令日志缺此标记时不插入新选择。useCoreTrinket为正式免费能力命令。
- 触发窗口通过PendingChoice呈现。声明的原动作、骰面及种子固定；尚未提交生命、行动、翻面或RNG。重新选择只重置饰品方案，不取消已看到骰面的动作。
- 战斗每角色回合限次；战斗外按卡面适用条件翻面。所有选择可经JSON存储并确定性续接。临时Map/Set上下文不进入最终状态或快照。
- 治疗窗口接技能、免费能力、补给、休息、自动被动、区域治疗，以及村庄建筑／Dark Ritual／Experimental Vapours／Town Fair。按原始治疗量加减饰品，再应用既有被动与生命上限。
- 村庄允许适用的免费能力，没有地牢光照和Food消费能力。免费能力不占村庄行动／准备日；压力检定和死亡恢复原流程。替补映射原行动槽，已用行动仍已用（R-133／R-134）。
- R-127只修正明确批准的五张卡元数据；旧快照只接受完整匹配白名单的旧卡面，仍重新回放并核对规则状态，不能借迁移篡改英雄伤口。

## 验证与限制

专项8文件177项通过，包含所有新增触发类别、村庄5项、旧能力回归与R-127数据构建。typecheck、build、修改文件ESLint／Prettier通过。追加非伤害技能命中与先知木长椅特殊攻击接线，另跑相关回归。追加先知／尖刺坑50项、存档3项通过；普通新存档先直接比对回放，只有不匹配才尝试R-127白名单升级。

全仓lint仍包含私有.cache临时脚本及既有Flesh／Swine代码问题；全量测试出现既有6类规范化快照与provision-use失败，另有长场景超时；本轮在约8分钟后停止，未跑完，不以专项通过替代全量通过。浏览器使用本机Chrome：正式探索通过；正式战斗在手牌按钮数量断言失败（期望3，实际0），未声称全仓CI全绿。

怪物已定目标后，免费能力导致该目标死亡且仍有存活队友的重选目标续接已接通（须 `allTrinkets: true`）；见 `phase5-c005-trinket-retarget-2026-10-31.md`。旧命令日志无该标记时仍原子拒绝。
