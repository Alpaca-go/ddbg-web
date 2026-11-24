# Shieldbreaker（h16）技能语义复核 — 2026-11-23

范围：`hero_skill:weald:h16:p316`–`p336`，共 21 张（7 技能 × I–III）。
依据：Q-181–Q-184、R-209、`docs/phase7-hero-expansion-verification-2026-11-08.md`、
[h16-shieldbreaker.test.ts](../../packages/data/tests/core/heroes/annotations/h16-shieldbreaker.test.ts)。

## 逐族结论

| 技能               | 数据                                                                                         | 判定      |
| ------------------ | -------------------------------------------------------------------------------------------- | --------- |
| Pierce I–III       | 自身 Pull 1；目标 Ignores Protection（文本）；射程 2                                         | confirmed |
| Puncture I–III     | 自身 Pull 1；Ignores Guard；目标 Pull 1；L1 射程 2、L2/III 1–2（Q-183）                      | confirmed |
| Adder's Kiss I–III | 目标 Blight 2、Dur 2/3/3；自身 Push 1（R-209）                                               | confirmed |
| Impale I–III       | 自身 Push 1；目标 Debuff 1/2/2t；stats 四枚 target_monster（同区域最多 4 人，Q-181 + R-209） | confirmed |
| Expose I–III       | 自身 Push 1；目标 Debuff 1/2/2t                                                              | confirmed |
| Captivate I–III    | 对标记目标 +2/+4/+4；目标 Blight 2/3/3、Dur 2t（Q-182）                                      | confirmed |
| Serpent Sway I–III | I/II 自身 Protection 2/3t + Pull 1；III 另给 1 名队友 Protection 2t（射程 1，Q-184）         | confirmed |

## 本次数据改动

无。Shieldbreaker 21 张与 Q-181–Q-184 / R-209 一致。

## 注意

- Impale 的「4 名敌人」由 stats 的四枚 `target_monster` 表达；R-209 已取代 Q-181 的
  「收成单枚 target_monster」写法，当前数据以后者（R-209）为准。
- Pull / Push 走 `hero-skill.ts` 的文本解析，不额外建字段。
