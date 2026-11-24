# Houndmaster（h17）技能语义复核 — 2026-11-23

范围：`hero_skill:weald:h17:p337`–`p357`，共 21 张（7 技能 × I–III）。
依据：Q-178–Q-180、R-206、R-209、`docs/phase7-hero-expansion-verification-2026-11-08.md`、
[h17-houndmaster.test.ts](../../packages/data/tests/core/heroes/annotations/h17-houndmaster.test.ts)。

## 逐族结论

| 技能                 | 数据                                                                      | 判定      |
| -------------------- | ------------------------------------------------------------------------- | --------- |
| Hound's Rush I–III   | 自身 Buff 2/3/3t；目标 Bleed L1 1·3t、L2 2·2t、L3 2·3t（Q-178 + R-209）   | confirmed |
| Hound's Harry I–III  | 目标 Bleed 1/2/3、Dur 3/2/2；stats 四枚 target_monster（同区域最多 4 人） | confirmed |
| Target Whistle I–III | 射程 0–2；目标 Mark 2/3/3t + Debuff 1/2/3t（R-206）                       | confirmed |
| Cry Havoc I–III      | 射程 1；队友减压 −1；自身 −1/−1/−2；目标数 L1 2、L2/III 3（Q-179）        | confirmed |
| Guard Dog I–III      | 自身 Protection 2/3/4t；射程 Self                                         | confirmed |
| Lick Wounds I–III    | 目标 Self；自身 Heal 5/6/8（R-206）                                       | confirmed |
| Blackjack I–III      | 目标 Stun 1t（Q-180，非 Debuff）                                          | confirmed |

## 本次数据改动

无。Houndmaster 21 张与 Q-178–Q-180 / R-206 / R-209 一致。

## 注意

- Cry Havoc 的队友减压在数据里是 `verified_target_stress`（按选中的队友逐个结算），
  Q-179 写的是 `verified_allies_stress`。两者在引擎里的结算路径需要 A1 审计确认；
  如果引擎把 `allies_stress` 当作「全体队友」而 `target_stress` 只作用于选中目标，
  则应按 Q-179 改为 allies 语义。
- Hound's Rush 的 `1ff34c908b` 已按 Q-178 逐卡覆盖为 `self_effects`，不再出现在数据里。
