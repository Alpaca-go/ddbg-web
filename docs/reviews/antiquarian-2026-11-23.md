# Antiquarian（h15）技能语义复核 — 2026-11-23

范围：`hero_skill:warrens:h15:p295`–`p315`，共 21 张（7 技能 × I–III）。
依据：Q-167–Q-171、R-209、`docs/phases/phase7/phase7-hero-expansion-verification-2026-11-08.md`、
[warrens-antiquarian-higher.test.ts](../../packages/data/tests/core/heroes/annotations/h15-antiquarian.test.ts)。

## 逐族结论

| 技能                       | 数据                                                               | 判定                                  |
| -------------------------- | ------------------------------------------------------------------ | ------------------------------------- |
| Nervous Stab I–III         | 纯攻击，stats 与卡面一致                                           | confirmed                             |
| Festering Vapours I–III    | 目标 Blight 2/2/3、Dur 2/3/3，Debuff 1/2/2（R-209）                | confirmed                             |
| Get Down! I–III            | 自身 Buff 2/3/4 + 自身 Push（III 为 Push 1 or 2，Q-168）           | confirmed（补 `verified_self_range`） |
| Flashpowder I–III          | 目标 Stun 1/1/2 + Debuff 1/2/2（Q-167）                            | confirmed                             |
| Fortifying Vapours I–III   | 自身 Heal 1/2/4、自身 Buff 2/3/3、目标 Buff 2/3/3（Q-169 / R-209） | confirmed（补 `verified_self_heal`）  |
| Invigorating Vapours I–III | 队友 Buff 2/3/4、自身 Buff 2/2/3（Q-170 / R-209）                  | confirmed                             |
| Protect Me I–III           | 目标 Guard/Protection/Mark；II 3/2/2、III 3/3/1（Q-171）           | confirmed                             |

## 本次数据改动

- `Get Down!` p301–303：新增 `verified_self_range: true`（印刷头行 `{range} Self`，Q-168）。
- `Fortifying Vapours` p307–309：新增 `verified_self_heal`（1/2/4；Q-169 的自身治疗行）。

两处都是把卡面已确认的自身语义写成结构化字段，游戏效果不变；
重生成后 `hero_skill.json` 新增 6 个字段（18 行）。

## 注意

- Get Down! 的 Push 由 `hero-skill.ts` 的 `SHUFFLE_TEXT` / `shufflePushDistance` 解析（Q-168），
  不额外建字段。
- Invigorating Vapours 的「队友」通过 `target_hero` 头行 + target scope 表达，
  与 Q-170 一致；A1 审计时确认引擎按队友选目标。
