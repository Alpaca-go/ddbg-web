# I 级怪物剩余九种战斗字段核对（待 Kyries 确认）

依据：官方核心规则书 R24 的 Speed 栏与选招流程、R-015、R-048。资料为本地当前版 `DD_EN_COREBOX_CARDS_70_120_monsters_medium_FRONT.pdf`（M）及 `DD_EN_COREBOX_CARDS_140x140_monster_large_FRONT.pdf`（L）。完整卡面已渲染查看；图片仅留在忽略的私有缓存，不提交。以下是待审人工读数，不是获批映射，不改变既有六种获批怪物。

姿态依次为 A=进攻、D=防御、R=远程、S=支援；数字为技能编号，括号为 d10 区间。

| id                  | 卡名                | 印刷页             | Speed | 选招组                                                 |
| ------------------- | ------------------- | ------------------ | ----- | ------------------------------------------------------ |
| monster_medium:p018 | Cultist Brawler     | M18–20             | 2     | A/D/R：1；S：2                                         |
| monster_medium:p024 | Brigand Cutthroat   | M24–26             | 2     | A/D：2(1–4)、1(5–10)；R：1；S：3                       |
| monster_medium:p027 | Brigand Fusilier    | M27–29             | 2     | A/D：2；R/S：1                                         |
| monster_large:p002  | Brigand Bloodletter | L2（M30 为参考卡） | 1     | A：1(1–4)、2(5–8)、3(9–10)；D：1(1–5)、2(6–10)；R/S：2 |
| monster_medium:p031 | Maggot              | M31–33             | 1     | A/D/R/S：1                                             |
| monster_medium:p034 | Webber              | M34–36             | 2     | A/D：1；R/S：1(1–5)、2(6–10)                           |
| monster_medium:p037 | Spitter             | M37–39             | 2     | A/D：2；R/S：1                                         |
| monster_medium:p043 | Madman              | M43–45             | 3     | A/D/R/S：1(1–5)、2(6–10)                               |
| monster_medium:p046 | Pliskin             | M46–48             | 2     | A/D：2；R/S：1                                         |

## 完整效果与接入限制

- Madman M43：Doomsay 为目标压力 +1，Accusation 为目标 Debuff 2t、压力 +2。不能将两个技能的效果行混接。
- Bloodletter L2：Rain of Whips 为 Bleed 1 / 3t、压力 +1；Punishment 为 Bleed 2 / 2t、压力 +1；Point Blank Shot 为自身 Debuff 2t、目标 Push 1。
- Maggot Grave Nibble 含疾病抽牌；只有完整疾病牌堆与其效果接入后才能宣称该技能完整可用。
- Small 移动与大型占两姿态须按 R24、R-029、R-060 处理，不能把全部怪物当普通单格怪物。
- 批准本表仅批准这些 id 的 Speed 与选招组，不意味着疾病、所有条件效果或其他等级已实现。

审批要求来源：`docs/monster-speed-review-2026-10-09.md` 明确规定未来卡片必须“完成核图审批”；`AGENTS.md` 要求未裁定内容不按猜测实现。未收到确认前，生产数据继续保留缺字段，真实抽到这些卡时保持原部署并提示待审，不过滤或重抽。
