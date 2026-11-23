# A2 迁移清单（由 A1 审计生成）— 2026-11-23

> 字段命名先迁移为嵌套
> ules 对象（见 [PLAN-2026-11-23-rules-field-migration.md](PLAN-2026-11-23-rules-field-migration.md)）；本清单里的 erified_* 在 R3 后改名为
> ules.*。

来源：[audit-2026-11-23-icon-semantics.md](audit-2026-11-23-icon-semantics.md) 的 223 行，
其中「规则语义」168 行按目标字段归成以下迁移单元。分类是初分，开工前逐行复核。

> **2026-11-24 进展**：R1（`rules` 双写）已完成；单元 1 的 Inspiring Tune 目标压力补注解并修掉回归；
> 单元 2 已完成——Battlefield Medicine p139–p141、Toxin Trickery p187–p189 写入 `rules.removal`，
> 引擎优先读规则、文本解析保留给未注解的历史测试视图；单元 3 已完成——18 名英雄的 346 张
> 非特殊目标卡写入 `rules.targets`；单元 8 已完成——核心盒 69 张怪物的抗性 / 免疫写入
> `rules.resistances` / `rules.immunities` / `rules.shuffleResist` / `rules.shuffleImmune`。

总体原则：

- 规则只读 `verified_*`；文本规则（Push/Pull、Ignores）保留文本解析，只去掉对「用 `icon.key` 找 self/target 侧」的依赖；
- 每个单元独立 PR，带行为快照与既有测试；
- 不要求 normalized 零 diff（A2 可能改读取路径），但 `verified_*` 数据与引擎行为要可解释。

## 单元 1：hero 自身治疗 / 压力 / 射程 / 形态

行数：6（self_heal）+ 5（self_heal+self_stress）+ 3（self_stress/target）/ 2（scope）

- 2（self_range）+ 3（required_form）+ 1（back_face）。

函数：`readSelfHeal`、`readSelfHealStress`、`readImmediateStress`、`stressLineAudience`、
`readsAsSelfTarget`、`formFromLine`、`formRequirementFromLine`、`selectFace`。

做法：

1. 先给所有需要这些语义的卡补 `verified_self_heal` / `verified_self_stress` /
   `verified_self_range` / `verified_required_form`（A0.5 已确认 432 张，缺的按卡补）；
2. 读取函数优先读字段，文本解析只作为「未注解卡」的 fallback；
3. 全部卡都注解后删除 fallback。

风险：低。字段已存在；有现成数据测试。

## 单元 2：条件移除（Remove Bleed/Blight 等）

**状态：已完成（2026-11-24）**。`rules.removal` 覆盖 Battlefield Medicine p139–p141、
Toxin Trickery p187–p189；Adrenaline Rush 的 Remove 与 Buff 同一行，继续由状态注解消费。

行数：5 + 3 + 2（`readConditionRemoval`、`removeBleedBlightKind`、
`readSelfBleedRemoval`、`selfRemoveBleedLine`）。

现状：没有 `verified_removal` 字段；Suffer 用 `verified_effect_line_receipts` 签收。

建议：新增 `verified_removal`（lineIndex + kinds + scope）或扩展 receipts；
数据从 A0.5 已核的卡补；然后删除文本解析。

风险：中。需要 schema 扩展与逐卡数据。

## 单元 3：目标计数 / 目标头

**状态：已完成（2026-11-24）**。18 名英雄的 346 张非特殊目标卡已写入 `rules.targets`
并由引擎优先读取；目标框 / Rallying Flare / 支援卡仍走各自注解。

行数：11（`countNamedTargets`、`readTargetIconCounts`）。

做法：用 `verified_target_header` + stats 的结构化目标（hero/monster/hero_or_monster 计数）
替代从 `front_icons` / `stats_line` 数图标；数据从 A0.5 已核卡补。

风险：中。多数卡只有 0–2 个目标，可先做核心 11 人。

## 单元 4：`resolveSkill` 的签名与校验（21 行）

现状：大量 `effect_lines.map(... {icon.key})` 用于断言与定位。

做法：签名改为「文本 + 语义族序列」（A1 已定方向）；定位改用注解里的
`lineIndex` / `segmentIndex`，不再按 key 搜索。

风险：中。改动集中在 `resolveSkill`，有 97 项四核心测试兜底。

## 单元 5：文本规则（Push/Pull、Ignores）

行数：7（Push/Pull）+ 5（Ignores）。

做法：保留文本解析；把「从 `self_effects`/`target_effects` 判断作用侧」改为读注解的
`scope`（`verified_status_effects` 已有 scope，其他效果按需补）。

风险：低。行为不变，只是去掉对图标 key 的依赖。

## 单元 6：Abomination 运行时合成

行数：8（`abomination-skills.ts`）。

现状：Absolution/Rake/Rage/Slam 的效果由引擎模块运行时合成 `verified_*`，不在 normalized 数据里。

做法：把合成结果迁回 `hero-annotations/h11-abomination.ts` 的数据表；
`projectAbominationSkill` 只保留签名断言与必要的结构转换。

风险：中高。这是「规则在代码里」的典型，迁移后要保证 97 项 abomination 测试不变。

## 单元 7：怪物效果

行数：6（`monster-effect-plan`）+ 7（`monster-skill`）+ 5（`weald-monster-attack`）

- 1（`darkest-monster-support`）。

做法：怪物效果已有 `verified_monster_effects` 计划字段；把文本解析改为读计划，
文本只用于签名。先做核心盒怪物，再做 Weald/扩展。

风险：中。怪物数据量大，按卡池分批。

## 单元 8：抗性（shuffle_resist 等）

**状态：已完成（2026-11-24）**。核心盒 69 张怪物卡写入
`rules.resistances` / `rules.immunities` / `rules.shuffleResist` / `rules.shuffleImmune`；
`monster-defence.ts` 优先读规则，未注解卡回退到已确认图标。Weald 低等级怪物没有抗性图标，
仍走 fallback。

行数：7 + 1（`battle-skill-status`）。

现状：引擎在 `card.resistances` 里按 `icon.key` 找 `shuffle_resist`。

做法：抗性/免疫改为结构化枚举（`verified_condition_defence` 已有数据），
引擎读枚举，不再读 icon key。

风险：低。数据已存在，只是读取方式。

## 单元 9：饰品条件

行数：8 + 5 + 4（`battle-attack-trinkets`、`battle-free-trinkets`、
`trinket-reactions`、`battle-fortunate-armlet`）。

现状：用技能文本/图标匹配判断饰品是否触发。

做法：改成语义族签名 + 结构化效果条件；先列触发条件表，再逐饰品迁移。

风险：中。涉及战斗结算，按饰品逐个迁移。

## 缺口与待复核

- `readSelfWound`（2 行）：无 `verified_self_wound` 字段；暂保留文本解析，
  待决定是否新增字段（Bleed Out 3/4/5）。
- 「待复核」2 行（`amountBesideLabel` 注释、`SHUFFLE_CHOICE_TEXT` 注释）：确认是注释后归入文档。
- 所有单元开工前，先把对应行的「初分」改为复核后的分类（审计表里逐行确认）。

## 顺序建议

1. 单元 1 + 5（低风险、字段已存在）；
2. 单元 3 + 4（核心 11 人先行）；
3. 单元 6（Abomination）；
4. 单元 8 + 2；
5. 单元 7（怪物，分批）；
6. 单元 9（饰品）。

每个单元一个 PR；完成后更新本文件与审计表的「已迁移」状态。
