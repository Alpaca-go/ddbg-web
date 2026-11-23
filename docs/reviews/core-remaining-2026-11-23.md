# 剩余核心英雄技能复核（Jester / Plague Doctor / Grave Robber / Occultist / Abomination）— 2026-11-23

范围：h06、h07、h09、h10、h11，共 105 张（5 英雄 × 21，含 Abomination 3 张双面变身卡）。

## 证据来源

| 英雄          | 依据                                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Jester        | `docs/phase4-core-trio-skills-2026-10-24.md`（I 级）+ core-higher 注解（II/III）+ `core-trio-skills.test.ts` / `core-higher-skills.test.ts` |
| Plague Doctor | `docs/phase4-plague-*` 记录 + `plague-dot/-multi/-support` 测试 + core-higher                                                               |
| Grave Robber  | `docs/phase4-grave-robber-skills-2026-10-18.md` + `grave-robber-skills.test.ts` + core-higher                                               |
| Occultist     | `docs/phase4-occultist-skills-2026-10-18.md` + `occultist-skills.test.ts` + core-higher                                                     |
| Abomination   | `docs/phase5-a6-abomination-skills-2026-10-31.md` + `abomination-skills.test.ts` + core-higher；变身卡双面                                  |

## 关键数据点

- **Jester**：Dirk Stab Ignores Guard + 自身 Pull 1（R-102）；Harvest / Slice Off 的 Bleed 层数与时序；
  Solo 目标 Stun + 自身 Buff/Pull；Battle Ballad 自身+目标 Buff。
- **Plague Doctor**：Noxious Blast Blight 4 + Debuff；Plague Grenade / Incision / Blinding Gas /
  Disorienting Blast 的 Blight/Bleed/Stun/Push-Pull；Battlefield Medicine 移除 Bleed/Blight + 治疗。
- **Grave Robber**：Lunge / Throw Dagger 条件伤害；Poison Dart Blight；Shadow Fade 自身 Buff+Push；
  Toxin Trickery 移除 Bleed/Blight + 队友 Buff。
- **Occultist**：Sacrificial Stab / Abyssal Artillery 对 Eldritch 条件伤害；Weakening Curse、
  Vulnerability Hex、Hands from the Abyss；Wyrd Reconstruction 的 Bleed + 治疗。
- **Abomination**：Manacles/Beast's Bile 目标状态；Absolution/Rake/Rage/Slam 的自身压力、治疗、
  位移与目标 Debuff 由 `abomination-skills.ts` **运行时合成 verified_***（A2 迁移候选）；
  变身卡 p220–222 为双面、`hero: null`，经 `skillBelongsToFormalHero` 归属 ABOMINATION。

## 结论与注意

- 105 张全部 `confirmed`（数据与既有记录/测试一致）。
- 与 A 方案有关的两处待办：
  1. Abomination 的若干效果目前不在 normalized `verified_*` 里，而是引擎模块运行时合成；
     A2 迁移时应改成数据注解，避免「规则在代码里」。
  2. Plague Doctor Battlefield Medicine、Jester Inspiring Tune 等 self heal/stress/remove
     仍靠文本/引擎回退；A1 审计时决定是否补 `verified_self_heal` / `verified_self_stress` 等字段。
- 本批无数据改动。
