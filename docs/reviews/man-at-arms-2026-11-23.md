# Man-at-Arms（h12）技能语义复核 — 2026-11-23

范围：`hero_skill:cove:h12:p232`–`p252`，共 21 张（7 技能 × I–III）。
依据：Q-176、Q-177、R-209、`docs/phase7-hero-expansion-verification-2026-11-08.md`、
[h12-man-at-arms.test.ts](../../packages/data/src/normalize/hero-annotations/h12-man-at-arms.test.ts)。

## 逐族结论

| 技能              | 数据                                                                    | 判定      |
| ----------------- | ----------------------------------------------------------------------- | --------- |
| Crush I–III       | 纯攻击；stats damage 10/7、14/9、16/11                                  | confirmed |
| Rampart I–III     | 目标 Stun 1t + Push 1/2/2；自身 Pull 1（文本解析）                      | confirmed |
| Bellow I–III      | 目标 Debuff 1/2/3t；stats 四枚 target_monster（R-209：同区域最多 4 人） | confirmed |
| Defender I–III    | 自身 Guard + Protection：I 1t/2t、II 2t/2t、III 2t/3t（Q-177 + R-209）  | confirmed |
| Retribution I–III | 自身 Mark 2t + Riposte：I 2t，II/III 3t（Q-176）                        | confirmed |
| Command I–III     | 自身与目标 Buff 2/2/3t（R-209）                                         | confirmed |
| Bolster I–III     | 自身与目标压力 −1；目标数按头行；III 射程 1 + 三枚 target_hero          | confirmed |

## 本次数据改动

无。Man-at-Arms 21 张与 Q-176 / Q-177 / R-209 一致；`Defender` 的 I 级
Guard 1t / Protection 2t 以 R-209 的修订为准（与卡面一致）。

## 注意

- Rampart 的 Push/Pull 是文本解析（`SHUFFLE_TEXT`），不额外建字段。
- Bellow 的「4 名敌人」由 stats 的四枚 `target_monster` 表达（R-209），不是四段独立效果。
