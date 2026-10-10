# Phase 2 意志、美德 / 苦难与心脏病核对（2026-10-10）

## 来源

官方核心规则书 R18 / R28 / R29、规格书 §8 / §9.3、R-001 / R-048 / R-053。当前版印刷 `02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_44x68_virtue_afflictions_FRONT.pdf` 十个完整页已逐页视觉核对。图片只在本地忽略缓存，不提交。

R28：压力首次到 10，d10 1–2 抽美德、3–10 抽苦难，压力归零并翻红；同任务不再检定，已有美德 / 苦难时再次到 10 直接心脏病死亡，无死门骰。美德 / 苦难触发只在战斗中，先于回合开始状态弹枚（R18）。角色名单按 R-053；不通过卡背箭头来判角色。

## 已核实的八张卡

| 页 / id                      | 名称       | 触发骰面 | 印刷效果                 |
| ---------------------------- | ---------- | -------- | ------------------------ |
| 1 / `virtue_affliction:p001` | Stalwart   | 1–3      | Self Stress −2           |
| 2 / `virtue_affliction:p002` | Courageous | 1–3      | 四名英雄 Stress −1       |
| 3 / `virtue_affliction:p003` | Focused    | 1–5      | Self Buff 2t             |
| 4 / `virtue_affliction:p004` | Powerful   | 1–3      | 四名英雄 Buff 2t         |
| 5 / `virtue_affliction:p005` | Vigorous   | 1–3      | Self Heal 3 × Hero Level |
| 6 / `virtue_affliction:p006` | Fearful    | 1–2      | Self Stress +2           |
| 7 / `virtue_affliction:p007` | Selfish    | 1–4      | Consume one Provision    |
| 9 / `virtue_affliction:p009` | Hopeless   | 1–3      | 四名英雄 Stress +1       |

只附加这八张的明确触发区间 / 效果 / Nt / 数值；生成时匹配 id、名称、页码、R-053 role、整张文本和已确认图标。未知卡不推断，原 lines / 词典不改。

## Q-54：剩余两张需 Kyries 确认

| 页 / id                                  | 尚未确认图标                                       | 完整卡面观察与拟议解释                                                                                                                                                                        |
| ---------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8 / `virtue_affliction:p008` Masochistic | `d42d7955d3` r731、`2c1824ea21` r668，needs_review | d10 1–3 → Self 两枚黑心红光方块 / Hero Level；拟议为自身受到 **2 × Hero Level 点 Wounds**，两个提取图标属于同一组合，不重复算为 4 点                                                          |
| 10 / `virtue_affliction:p010` Irrational | `5a4fbf9781` r687，needs_review                    | 红色右箭头指向印刷句子：1–5 → Move 1 Stance forward；6–10 → Move 1 Stance backward。拟议为 **d10 结果表的指向标记**，执行文字指定的姿态前 / 后移动 1，**不命名成 Push / Pull 或卡背角色标记** |

此前 r668 / r731 / r687 被 Kyries 明确保留为待确认，不能因现在看见完整卡面就自行升级。请确认上述两张效果及这三枚图标的语义；批准范围如需仅限本卡位置，应明确记录，不能静默扩散到同图标的怪癖卡。

批准前两张仍未验证、不进入可用卡池；不从完整五张苦难堆删掉这两张再抽三张，也不把 unknown 当无效果。完整苦难抽牌 / 触发路径因此仍需确认。已明确的意志检定与心脏病规则、八张已核实效果的纯函数和黄金测试可继续开发。

Selfish 的玩家补给选择 / 补给为空，以及 Irrational 被动姿态移动在轨道端点，需按规则书与现有裁定核对，不以耗一个正常行动或移动区域替代。Hero Level 必须来自已核实属性面，缺失不补为 1。
