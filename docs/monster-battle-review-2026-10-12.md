# I 级怪物战斗字段核对（九条全部获批）

依据：官方核心规则书 R24 的 Speed 栏与选招流程、R-015、R-048。资料为本地当前版 `DD_EN_COREBOX_CARDS_70_120_monsters_medium_FRONT.pdf`（M）及 `DD_EN_COREBOX_CARDS_140x140_monster_large_FRONT.pdf`（L）。完整卡面已渲染查看；图片仅留在忽略的私有缓存，不提交。Kyries 于 2026-10-12 指出前表四处读错，并明确批准 M27 / L2 / M31 / M43 / M46 的 Speed 与选招。随后 Kyries 明确回复“批准这四条的 Speed / 选招入库”，四条修正版完成再审。两次批准合计覆盖本表九条；不扩展为其他等级或完整效果审批。

姿态依次为 A=进攻、D=防御、R=远程、S=支援；数字为技能编号，括号为 d10 区间。

| id                  | 卡名                | 印刷页             | Speed | 选招组                                                 | 状态          |
| ------------------- | ------------------- | ------------------ | ----- | ------------------------------------------------------ | ------------- |
| monster_medium:p018 | Cultist Brawler     | M18–20             | 2     | A/D：1；R/S：2                                         | Kyries 已批准 |
| monster_medium:p024 | Brigand Cutthroat   | M24–26             | 1     | A/D：2(1–4)、1(5–10)；R：1；S：3                       | Kyries 已批准 |
| monster_medium:p027 | Brigand Fusilier    | M27–29             | 2     | A/D：2；R/S：1                                         | Kyries 已批准 |
| monster_large:p002  | Brigand Bloodletter | L2（M30 为参考卡） | 1     | A：1(1–4)、2(5–8)、3(9–10)；D：1(1–5)、2(6–10)；R/S：2 | Kyries 已批准 |
| monster_medium:p031 | Maggot              | M31–33             | 1     | A/D/R/S：1                                             | Kyries 已批准 |
| monster_medium:p034 | Webber              | M34–36             | 2     | A/D/R/S：1(1–5)、2(6–10)                               | Kyries 已批准 |
| monster_medium:p037 | Spitter             | M37–39             | 1     | A/D：2；R/S：1                                         | Kyries 已批准 |
| monster_medium:p043 | Madman              | M43–45             | 3     | A/D/R/S：1(1–5)、2(6–10)                               | Kyries 已批准 |
| monster_medium:p046 | Pliskin             | M46–48             | 2     | A/D：2；R/S：1                                         | Kyries 已批准 |

## 四处修正及再核图

代理重新查看完整 M18、M24、M34、M37 页面。Cutthroat / Spitter 的头部 Speed 栏各一枚蓝框靴印；Brawler 的两组结束分别在 D / S，技能 1 属 A/D、技能 2 属 R/S；Webber 的四姿态共用技能 1（1–5）/ 技能 2（6–10）骰表。前表错误不入生产映射。依 Kyries 的“改完后把修正表再送审”，只将这四条重新送审，并在收到明确批准后入库。

## 完整效果与接入限制

- Madman M43：Doomsay 为目标压力 +1，Accusation 为目标 Debuff 2t、压力 +2。不能将两个技能的效果行混接。
- Bloodletter L2：Rain of Whips 为 Bleed 1 / 3t、压力 +1；Punishment 为 Bleed 2 / 2t、压力 +1；Point Blank Shot 为自身 Debuff 2t、目标 Push 1。
- Maggot Grave Nibble 含疾病抽牌；只有完整疾病牌堆与其效果接入后才能宣称该技能完整可用。
- Small 移动与大型占两姿态须按 R24、R-029、R-060 处理，不能把全部怪物当普通单格怪物。
- 批准本表仅批准这些 id 的 Speed 与选招组，不意味着疾病、所有条件效果或其他等级已实现。

九条均已装入生产映射：八张中型战斗卡进入 `verified-monster-speeds.ts` / `verified-monster-stances.ts`，Bloodletter 进入独立大型战斗卡映射 `verified-large-monster-fields.ts`。连同原六种，全部十五种 I 级怪物 / 42 张实体牌的 Speed 与选招均完整。M30 参考卡不附加战斗字段；不跨等级、不筛牌，基础字段获批也不绕过正式战斗的完整效果预检。

M43 的提取器误将 `Accusation` 当作 `Acc` 标签过滤，现已修正为匹配独立标签，重新提取并分离两项技能；提取 summary 同步更新。复合技能逐行保留原始内容并附加原语计划，引擎比对整行与原语内容再结算；疾病仍整次拒绝。
