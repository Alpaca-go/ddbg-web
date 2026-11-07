# 18 名英雄统一为核心内容：扩展英雄 II/III 级技能核实（Leper 试点）

日期：2026-11-08
状态：**待 Kyries 逐条确认读数**（R-048：卡面图标顺序有歧义时不能猜）。

## 背景与范围

- Kyries 决定：18 名正式英雄都按核心内容对待；Musketeer 纳入，覆盖 R-008 的「首版不纳入」。
- 现状：18 名英雄、378 张技能卡都在数据里（每名 7 技能 × 3 级；Abomination 6+1 变身/级）。
- 核心盒 11 名的 231 张全部有逐卡注解（范围/目标/状态），`core-higher-skills` 对 154 张 II/III 逐 d10 面审计通过。
- 扩展 7 名的 147 张里，只有 L1 的 49 张有线（引擎/测试）；II/III 的 98 张**没有任何逐卡注解**（`verified_range/target_header/target_support/status_effects` 均为 0），所以试切目录后审计 90/98 失败。

## 审计失败分类（98 张）

| 失败原因 | 张数 |
| --- | --- |
| `effect_lines` 有未消费效果行 | 26 |
| 纯辅助/自身技能，stats 行没有 damage/heal 目标注解 | 16 |
| Musketeer 被 R-008 挡住 | 14 |
| Self / All Allies 缺射程注解 | 13 |
| 区间射程 `numeric = null`，缺 `verified_range` | 10 |
| 缺目标图标注解 | 10 |
| stats 行同时有英雄和怪物目标图标 | 1 |

## Leper 试点（14 张）

已能直接结算（4 张，无需新注解）：`p275/p276 Chop II/III`、`p278/p279 Hew II/III`（射程 1、单/双目标、纯伤害）。

待确认（10 张）：

| 卡 | 印刷行（关键部分） | 我的建议读数 | 疑问 |
| --- | --- | --- | --- |
| p281 Purge II | `{range}0{target_monster} Crit0{damage}14 Acc10{damage}10`；`{self_effects}Self{buff}2t`；`{target_effects}{shuffle}Push 2` | 攻击目标；自身 Buff 2t；目标 Push 2 | 无（高置信） |
| p282 Purge III | 同上，但 stats 的 19/12 是 **heal** 图标 | ？ | Purge III 是治疗还是伤害？目标行仍是 monster |
| p284 Revenge II | `Crit1 Acc11`；`{range}1{target_monster}`；`{heal}{mark}2t,{debuff}2t` | 自身治疗 + 目标 Mark 2t、Debuff 2t | heal 没有数字：治疗量是多少？Mark/Debuff 作用在谁？ |
| p285 Revenge III | 同 II，2t→3t | 同上 | 同上 |
| p287 Withstand II | `Crit1 Acc14`；`{range}Self`；`{self_effects}Self{protection}2t,{mark}1t` | 自身 Buff、Protection 2t、Mark 1t（嘲讽自己） | Mark 是给自己还是给目标？ |
| p288 Withstand III | 同 II，2t→3t | 同上 | 同上 |
| p290 Solemnity II | `Crit1 Acc14`；`{range}Self`；`{self_effects}Self{buff}{heal}9,{shuffle}-1` | 自身治疗 9、Shuffle 自己 −1 | Buff 没有 duration：持续多久？ |
| p291 Solemnity III | `…{buff}12{heal},{shuffle}-1` | 自身治疗 12、Shuffle −1 | 12 是治疗量还是 Buff 数值？Buff 持续多久？ |
| p293 Intimidate II | `{range}2{target_monster} Crit1{damage}10 Acc10{damage}6`；`{self_effects}Self{buff}2t`；`{light}Ignores{target_effects}{target_effects},{debuff}2t` | 自身 Buff 2t；攻击无视？；目标 Debuff 2t | `Ignores` 后面两个 `target_effects` 是什么？无视 Guard/Protection？Light 效果是什么？ |
| p294 Intimidate III | 同 II，debuff 3t、自身 buff 1t | 同上 | 同上 |

## 确认后怎么接

1. 在 `packages/data/src/normalize/verified-hero-statuses.ts` / `verified-hero-support.ts` / `verified-hero-ranges.ts` 增加 Leper 条目（带签名断言，签名不符即拒绝）。
2. 跑 `core-higher-skills` 审计（扩展为 18 名英雄的 II/III）。
3. 通过后把目录切到「全部 18 名英雄 I–III」、清掉 84 张 art-only 占位、更新建队页文案与裁定（R-008 覆盖 + 新 R 记录）。
4. 其余 6 名（Antiquarian / Flagellant / Man-at-Arms / Houndmaster / Shieldbreaker / Musketeer）按同一流程逐名做，每名一批提交。

## 另需确认

- **Antiquarian III 的 STAT**：印刷 p002 front 存在（III、Life 15、Dodge 3），但免疫栏图标 `8510428636` 未确认（Q-104），所以还没入库。要启用 L3 Antiquarian，需要确认这个图标是不是 Blight 免疫。
