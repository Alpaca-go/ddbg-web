# 对照《十八英雄技能逐卡审校》的技能审计（2026-11-08）

## 0. 结论摘要

配套逐卡工作簿：[hero-skill-review-2026-11-08.xlsx](hero-skill-review-2026-11-08.xlsx)（18 张英雄表 + “优先审核”表；每行含文档效果、数据 stats、引擎探测、风险标记和“你的确认/修正”列）。

- 文档 18 张表、381 行（378 张正式技能 + 3 行 Transform to Human），字段来自仓库 `01425ba3` 的转写，不是重新读图。因此它能核对“文档描述 vs 引擎实际解析”，但不能单独证明卡面正确。
- 发现 **核心盒 L1 的 Jester / Arbalest / Abomination 明显缺注解**：同一技能的 L2/L3 有 `verified_*`，L1 没有；L1 的效果行被 `skipped`、部分技能直接拒绝。
- 已确认 **11 张 L1 卡**存在效果丢失或无法施放（§2），另有 **5 张 L1 卡**缺区间射程（§3）。
- 文档自身还有 **27 行 “待确认”**（几乎都是伤害/治疗组合标记）、**3 行效果文字畸形**、**1 处拼写错误**（§4）。
- 另有 **24 个技能、26 处跨等级效果类型/目标不一致**（§5），其中一部分很可能是转写/注解错误，需要对照卡图确认。

## 1. 方法

1. 用 python-docx 解析文档 18 张表，按英雄/技能/等级映射到 `normalized/corebox/hero_skill.json` 的 378 张卡。
2. 对每张卡调用 `resolveHeroSkillEffects`（roll 1 与 roll 10，按 Self / 队友 / 敌人的最小合法上下文），记录 `status`、`skipped`、`targetStatusEffects`、`actorStatusEffects`、`actorStress`、`damageDealt`。
3. 对照 `hero_skill.json` 的 `verified_status_effects` / `verified_range` / `verified_damage_bonus` / `verified_target_header` / `verified_self_range` 字段，确认“L2/L3 有、L1 没有”的注解缺口。
4. 文档里的“待确认”“无”“2t 但没有状态名”等文本单独汇总。

## 2. 高置信：核心 L1 效果丢失 / 无法施放

L2/L3 同一技能可正常结算，L1 失败。

| 卡                          | 文档效果                                   | L1 实测                                                      | L2 对照                                        |
| --------------------------- | ------------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------- |
| JESTER Harvest p109         | 2 流血 2t                                  | `skipped:effect_lines`，无目标状态                           | p110 正常给 Bleed 2 3t                         |
| JESTER Slice Off p124       | 3 流血 1t                                  | `skipped:effect_lines`，无目标状态                           | p125 正常给 Bleed 3 2t                         |
| JESTER Solo p115            | 自身 Buff2t + Pull2；目标 Stun1t           | 拒绝：`stats_line 没有已命名的 damage 或 heal`               | p116 有 `status_effects`，可结算               |
| JESTER Battle Ballad p118   | 自身 Buff2t；目标 Buff2t ×2                | 拒绝：`stats 行没有已命名的目标图标`                         | p119 有 `target_header/status_effects`，可结算 |
| JESTER Dirk Stab p106       | 自身 Pull1 + Ignores Guard                 | `skipped:effect_lines`；Guard 忽略有单独路径，Pull 需核实    | L2/L3 同样无注解                               |
| ABOMINATION Manacles p211   | 目标 Stun1t                                | `skipped:effect_lines`，无目标状态                           | p212 正常给 Stun 1t                            |
| ABOMINATION Rake p223       | 自身 Buff2t + 压力+1                       | `skipped:effect_lines`，无状态/压力变化                      | p224 正常给 Buff 2t                            |
| ABOMINATION Rage p226       | 自身 压力+1                                | `skipped:effect_lines`，压力不变                             | p227 无 `skipped`                              |
| ABOMINATION Slam p229       | 自身 Pull1 + 压力+1；目标 Push2 + Debuff1t | `skipped:effect_lines`，无 Debuff/位移；带目标位移时整次拒绝 | p230 正常给 Debuff 2t + Push/Pull              |
| ABOMINATION Absolution p217 | 自身 压力-1                                | 拒绝：`卡面没有恰好一个射程整数…Self…`                       | p218/p219 可结算                               |
| ARBALEST Sniper Shot p148   | +3 vs 标记                                 | L1 无 `verified_damage_bonus`，效果行被跳过                  | p149/p150 有 `damage_bonus`                    |

> 说明：`skipped:effect_lines` 在 `battle.ts` 里只在“已有 verified 状态/目标位移”时整次拒绝；没有注解的 L1 卡因此可能**静默丢掉效果**（Harvest/Slice Off/Manacles/Rake/Rage），带目标位移的 Slam 则会**整次拒绝**。

## 3. 高置信：L1 区间射程缺失

`readPrintedRange` 返回 `null_numeric`，且没有 `verified_range`；只要目标距离被传入，就会拒绝：

| 卡                                | 文档射程 | 数据                              |
| --------------------------------- | -------- | --------------------------------- |
| ARBALEST Suppressive Fire p151    | 1-2      | `verified_range` 缺失（L2/L3 有） |
| ARBALEST Sniper’s Mark p154       | 1-2      | 同上                              |
| ARBALEST Blindfire p160           | 1-2      | 同上                              |
| ARBALEST Battlefield Bandage p163 | 0-1      | 同上                              |
| ABOMINATION Beast’s Bile p214     | 1-2      | 同上                              |

这 5 张在战斗中按距离施放会被拒绝；L2/L3 有 `verified_range`，不受影响。

## 4. 文档自身标出的问题

### 4.1 “待确认” 27 行（伤害/治疗组合标记）

分布：Crusader Battle Heal L1/L3、Inspiring Cry L1–3；Vestal Judgement L1–3、Divine Grace L1–3、Divine Comfort L1–3；Arbalest Battlefield Bandage L1–3；Abomination Absolution L2–3；Antiquarian Fortifying Vapours L1–3；Flagellant Reclaim L1/L3；Occultist Wyrd Reconstruction L2；Plague Doctor Battlefield Medicine L2–3。

- 引擎在这些卡上**确实结算治疗**（如 Battle Heal L1 roll1 治疗 4），但 `damage_or_heal_combined_marker` 一律记入 `skipped`、不解释。
- 这不是“治疗失效”，但说明文档无法确认该标记的规则含义；若后续要处理“伤害或治疗”的正式规则，需要单独立项。

### 4.2 效果文字畸形（3 行）

- **ANTIQUARIAN Flashpowder III**：目标效果 `2t, 增益 2t`——第一个 `2t` 没有状态名。
- **ANTIQUARIAN Protect Me III**：目标效果 `光照 3t, 3t, 压力 1t`——中间 `3t` 没有状态名，且 L1/L2 的“标记”消失。
- **ABOMINATION Transform to Beast L1**：目标效果 `增益；2t, 治疗 4…`——“增益”后没有持续时间，格式与其他等级不一致。

### 4.3 文档笔误

- **BOUNTY HUNTER Collect Bounty LII**：命中写成 `Acc 1O`（字母 O），数据为 Acc 10。

## 5. 跨等级不一致（24 个技能、26 处，需对照卡图）

按“同一技能 L1/L2/L3 的效果类型或目标类型发生变化”筛出。**部分是有意的等级成长，部分是可疑转写**：

| 技能                               | 不一致点                                  | 判断              |
| ---------------------------------- | ----------------------------------------- | ----------------- |
| ANTIQUARIAN Festering Vapours      | L1 无 Debuff，L2/L3 有                    | 可疑（L1 可能漏） |
| ANTIQUARIAN Flashpowder            | L1 枯萎、L2 流血、L3 无状态               | 高度可疑          |
| ANTIQUARIAN Protect Me             | L1/L2 有标记，L3 变压力                   | 高度可疑          |
| ANTIQUARIAN Invigorating Vapours   | 目标 1→2→3                                | 可能是有意成长    |
| CRUSADER Battle Heal               | L3 多自身治疗，L1/L2 无                   | 可能是有意        |
| CRUSADER Inspiring Cry             | 目标 1→1→2                                | 可能是有意        |
| FLAGELLANT Reclaim                 | L3 多治疗/位移，L1/L2 只有防护            | 高度可疑          |
| FLAGELLANT Suffer                  | L3 少标记、多位移                         | 可疑              |
| GRAVE ROBBER Flashing Daggers      | L1 无 Debuff，L2/L3 有                    | 可疑              |
| GRAVE ROBBER Toxin Trickery        | L1 自身、L2/L3 队友                       | 高度可疑          |
| HELLION Adrenaline Rush            | L1 自身、L2/L3 队友                       | 高度可疑          |
| HOUNDMASTER Target Whistle         | L1 无治疗，L2/L3 有                       | 可疑              |
| HOUNDMASTER Cry Havoc              | 目标 2→3→3                                | 可能是有意        |
| JESTER Battle Ballad               | 目标 2→3→3                                | 可能是有意        |
| JESTER Inspiring Tune              | L1 无目标，L2/L3 队友×3                   | 高度可疑          |
| LEPER Withstand                    | L1 有增益且无自身目标，L2/L3 无增益有自身 | 高度可疑          |
| LEPER Solemnity                    | L1 有增益且无自身目标，L2/L3 无增益有自身 | 高度可疑          |
| LEPER Intimidate                   | L1 光照/增益，L2/L3 减益/增益             | 高度可疑          |
| MAN-AT-ARMS Command                | 目标 1→2→3                                | 可能是有意        |
| MAN-AT-ARMS Bolster                | L1/L2 无目标，L3 队友×3                   | 高度可疑          |
| OCCULTIST Hands from the Abyss     | 目标 1→2→2                                | 可能是有意        |
| PLAGUE DOCTOR Battlefield Medicine | L1 无自身治疗，L2/L3 有                   | 可疑              |
| SHIELDBREAKER Adder’s Kiss         | L1 减益/增益，L2/L3 增益/眩晕             | 高度可疑          |
| SHIELDBREAKER Serpent Sway         | L1/L2 自身，L3 队友                       | 高度可疑          |

（表中“高度可疑”指同一技能跨等级出现效果类型/目标类型变化，通常不应发生；需要打开卡图或由 Kyries 确认。）

## 6. 建议

1. **先修 L1 注解**：为 §2/§3 的 16 张卡补 `verified_status_effects` / `verified_range` / `verified_damage_bonus` / `verified_target_header` / `verified_self_range`，并加 L1 回归测试；再跑 231 张全量审计。
2. **再核对 §5 的 26 个跨等级条目**：优先“高度可疑”的 11 个；文档本身来自转写，不能替代卡图。
3. **§4 的组合标记**作为已知 hold，不阻塞；若规则上需要解释，另开 Q。
4. 修完后重新跑 `core-higher-skills` 式审计（L1–L3 全部 231 张）+ 全量自然任务回归。

## 7. 边界

- 本报告只做对照，没有改代码或数据。
- 审计使用 `resolveHeroSkillEffects` 的最小上下文；`refused` 类结论已用 L2/L3 同技能对照，避免把上下文错误当成卡牌问题。
- 文档是仓库转写的再整理，不是独立卡面证据；最终结论仍需 Kyries 看卡图确认。
