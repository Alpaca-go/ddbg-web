# 18 名英雄统一为核心内容：扩展英雄 II/III 级技能核实（Leper 试点）

日期：2026-11-08
状态：**待 Kyries 逐条确认读数**（R-048：卡面图标顺序有歧义时不能猜）。

## 背景与范围

- Kyries 决定：18 名正式英雄都按核心内容对待；Musketeer 纳入，覆盖 R-008 的「首版不纳入」。
- 现状：18 名英雄、378 张技能卡都在数据里（每名 7 技能 × 3 级；Abomination 6+1 变身/级）。
- 核心盒 11 名的 231 张全部有逐卡注解（范围/目标/状态），`core-higher-skills` 对 154 张 II/III 逐 d10 面审计通过。
- 扩展 7 名的 147 张里，只有 L1 的 49 张有线（引擎/测试）；II/III 的 98 张**没有任何逐卡注解**（`verified_range/target_header/target_support/status_effects` 均为 0），所以试切目录后审计 90/98 失败。

## 审计失败分类（98 张）

| 失败原因                                           | 张数 |
| -------------------------------------------------- | ---- |
| `effect_lines` 有未消费效果行                      | 26   |
| 纯辅助/自身技能，stats 行没有 damage/heal 目标注解 | 16   |
| Musketeer 被 R-008 挡住                            | 14   |
| Self / All Allies 缺射程注解                       | 13   |
| 区间射程 `numeric = null`，缺 `verified_range`     | 10   |
| 缺目标图标注解                                     | 10   |
| stats 行同时有英雄和怪物目标图标                   | 1    |

## Leper 试点（14 张）

已能直接结算（4 张，无需新注解）：`p275/p276 Chop II/III`、`p278/p279 Hew II/III`（射程 1、单/双目标、纯伤害）。

待确认（10 张，2026-11-08 Kyries 已给读数）：

| 卡                  | Kyries 读数                                                                                                                         | 备注                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| p281 Purge II       | 攻击目标；自身 Buff 2t；目标 Push 2                                                                                                 | 与数据一致                              |
| p282 Purge III      | **19/12 是伤害**（不是治疗）                                                                                                        | 数据里 `20ffe98e2d` 被记成 heal，需修正 |
| p284 Revenge II     | **没有 heal**；Mark 和 Debuff 给**目标**                                                                                            | 数据里行首 `{heal}` 是误读              |
| p285 Revenge III    | 同 II，3t                                                                                                                           | 同上                                    |
| p287 Withstand II   | Mark 给**自身**                                                                                                                     | 与建议一致                              |
| p288 Withstand III  | 同 II，3t                                                                                                                           | 同上                                    |
| p290 Solemnity II   | **没有 Buff**；只有给自己 heal 9 和**压力 -1**                                                                                      | 数据里 `{shuffle}-1` 实为 stress −1     |
| p291 Solemnity III  | 同上，heal 12、压力 -1                                                                                                              | 同上                                    |
| p293 Intimidate II  | `Ignores` = 无视 **Protection**（受伤减半向上取整，规则书 p21）和 **Guard**（规则书 p21）；**另有单独的 Debuff 2t**，不属于 Ignores | 数据行结构需重读                        |
| p294 Intimidate III | 同 II，Debuff 3t                                                                                                                    | 同上                                    |

**关键规则（Kyries 2026-11-08）**：

- 直角箭头**指向左 = 作用给自己**，**指向右 = 作用给选中目标**（规则书 p20）。
- **弧形箭头 + 数字 = 射程**：1 = 相邻地块，2 = 隔一个地块，无数字 = 0（只能当前地块）；后面再跟 `Self` 表示只作用于自己。
- **红色爪痕上的数字 = 伤害**（不是治疗）。
- Protection（受伤减半向上取整）/ Guard（必须锁定守卫敌人）见规则书 p21。

## 图标数据问题（2026-11-08 已澄清一部分）

| iconId       | 字典当前含义                   | 结论                                                                                                                              |
| ------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `20ffe98e2d` | heal（治疗）                   | Battle Heal 确实用它表示治疗；Purge III / Revenge 的同一 hash 是**逐卡提取错配**，按卡面应读成伤害/非治疗。不改全局字典，逐卡覆盖 |
| `f18923574c` | shuffle（位移）                | Solemnity 的 `-1` 按卡面是**压力 -1**；同为逐卡错配                                                                               |
| `d4329c2a97` | buff（增益）                   | 实际是**弧形箭头（攻击范围）**，无数字 = 射程 0；字典待改                                                                         |
| `1ff34c908b` | buff（增益）                   | 在 `{range} {icon} Self` 行里，疑为 Self 侧标记；待确认                                                                           |
| `8fc8635162` | self_effects（自身效果标记）   | 疑为**指向左的直角箭头**                                                                                                          |
| `b6afaa4d7b` | target_effects（目标效果标记） | 疑为**指向右的直角箭头**                                                                                                          |

处理方式：先按 Kyries 读数做**逐卡覆盖**（不动全局字典，先修 p282/p284/p285/p290/p291），再重跑审计；确认无回归后再决定是否更新字典与核心卡。

## 已实现（2026-11-08）

- **Leper II/III 首批 14 张**（PR #618）：Q-163～Q-166 已关闭；`verified-warrens-leper-higher` + `verified-hero-statuses` 接线；**d10 审计 14/14 绿**。
- **Antiquarian II/III 14 张**（PR #619）：Q-167～Q-171 已关闭；`verified-warrens-antiquarian-higher` + 引擎 `shufflePushDistance`（Q-168）；**d10 审计 14/14 绿**。
- **Flagellant II/III 14 张 + 同族 L1 洗净 7 张**（PR #620）：Q-172～Q-175 **Kyries 真确认**；`verified_actor_damage_bonus` / `verified_bleed_blight_transfer` / Endure stats（队友射程+Acc/Crit）；**d10 审计 21/21 绿**。
- **Shieldbreaker II/III 14 张 + 同族 L1 洗净 7 张**：`verified-weald-shieldbreaker-higher`；Q-181～Q-184 **待 Kyries 确认**；**d10 审计 14/14 绿**（见 `docs/phase7-shieldbreaker-higher-2026-11-08.md`）。
- **Man-at-Arms II/III 14 张**（PR #621）：`verified-cove-man-at-arms-higher`；Q-176/Q-177 已关闭（Retribution **Mark+Riposte**、Defender **Guard+Protection**）；**d10 审计 14/14 绿**。
- **Houndmaster II/III 14 张 + L1 七族洗净**（PR #622）：`verified-weald-houndmaster-higher`；**d10 审计 14/14 绿**；**Q-178～Q-180** Kyries 真确认。
- **Musketeer II/III 14 张 + L1 七族洗净**（PR #624）：`verified-musketeer-higher` + **Q-185 已确认**（与 Arbalest 完全一致）；`musketeer-arbalest-parity.test.ts`；d10 审计 14/14 绿（II/III）。
- **Antiquarian III STAT**：Life 15 / Dodge 3 / Speed 0；左栏 Blight 抗性；免疫 = 位移 + 疾病。`8510428636` 只在 `verified_higher_condition_defence` 注解，不写全局词典（Q-104 关闭，R-200）。
- `warrens-hero-stat.ts` 增加该面并调用 `buildHigherHeroDefence`；`hero-higher-defence.ts` 增加批准行与 `kyries_review_2026-11-08`；normalized 已重生成；`battle-data-plugin` 属性计数 53→54。
- 数据测试、`packages/data` 全量、engine `dungeon-battle`、`pnpm typecheck`、web build 均通过。

## 确认后怎么接

1. 在 `packages/data/src/normalize/verified-hero-statuses.ts` / `verified-hero-support.ts` / `verified-hero-ranges.ts` 增加 Leper 条目（带签名断言，签名不符即拒绝）。
2. 对 p282/p284/p285/p290/p291 的 stats/效果行做逐卡修正（`verified_stat_line` 或等价覆盖），避免改动全局图标字典。
3. 跑 `core-higher-skills` 审计（扩展为 18 名英雄的 II/III）。
4. 通过后把目录切到「全部 18 名英雄 I–III」、清掉 84 张 art-only 占位、更新建队页文案。
5. 其余 6 名（Antiquarian / Flagellant / Man-at-Arms / Houndmaster / Shieldbreaker / Musketeer）按同一流程逐名做，每名一批提交。

## Antiquarian III 的免疫图标位置

- 印刷 PDF：`DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_10_EN_The Darkest Heroes/DD_EN_THE_DARKEST_HEROES_CARDS_100x180_Hero_STAT_FRONT.pdf` **第 31 页**。
- 卡：`hero_stat:warrens:antiquarian:p002` 的正面（raw：`packages/data/extract/extension/warrens/raw/hero_stat.json`）。
- 位置：卡面 `Resistances / Immunities` 行的 **Immunities 列**，bbox `[46.92, 136.88, 53.62, 143.23]`（mm，卡面 100×180），紧挨着右边的 Disease 免疫图标（`28b10f3fb7`，bbox `[54.92, 136.0, 61.77, 144.0]`）。
- 字典：`packages/data/dictionary/icon-dictionary-v1.8.json` 里的 `8510428636`，`status=unreviewed`、`group=blight`、只出现 1 次。
- 尚未进入 normalized：`packages/data/normalized/corebox/hero_stat.json` 只收了 p001 front/back（L1/L2），p002 front（L3）因为该图标未确认而没有入库。
