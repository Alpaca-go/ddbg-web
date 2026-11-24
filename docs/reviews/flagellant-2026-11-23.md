# Flagellant（h13）技能语义复核 — 2026-11-23

范围：`hero_skill:cove:h13:p253`–`p273`，共 21 张（7 技能 × I–III）。
依据：Q-172–Q-175、R-208、`docs/phase7-hero-expansion-verification-2026-11-08.md`、
[h13-flagellant.test.ts](../../packages/data/tests/core/heroes/annotations/h13-flagellant.test.ts)。

## 逐族结论

| 技能                  | 数据                                                                                                        | 判定      |
| --------------------- | ----------------------------------------------------------------------------------------------------------- | --------- |
| Punish I–III          | 自身有流血/腐蚀时 +2 伤害（`verified_actor_damage_bonus`）；目标 Bleed 2/2/3、Dur 2/3/3，Debuff 1t（Q-172） | confirmed |
| Rain of Sorrows I–III | 条件伤害 +2/+3/+4；目标 Blight 3、Dur 2/3/4（R-208）                                                        | confirmed |
| Exsanguinate I–III    | 目标 Bleed 2/3/3、Dur 3/3/4；自身 Heal 3/5/7 + Debuff 1t（Q-174）                                           | confirmed |
| Reclaim I–III         | 自身 Bleed 1、Dur 3t；射程 0–1；L3 另有自身 Heal 5（R-208）                                                 | confirmed |
| Redeem I–III          | 友方治疗 + 同等自身治疗 + 自身 Debuff 1t（Q-174 / R-208）                                                   | confirmed |
| Suffer I–III          | 转移队友流血/腐蚀（`verified_bleed_blight_transfer`）；自身 Mark 2/2/1、Buff 2/3/4（Q-173 / R-208）         | confirmed |
| Endure I–III          | 自身与目标压力各 −1；射程 1/1–2/1–2，Acc 12/14/16，Crit 0/0/1（Q-175）                                      | confirmed |

## 本次数据改动

无。Flagellant 的 21 张在数据层与 Q-172–Q-175 / R-208 一致。

## 注意

- Endure I（p268）没有 `verified_range`，stats 印刷射程为 1；L2/L3 有注解。
  A1 审计时确认引擎是否把「无注解 + 射程 1」当作默认值，若需要显式化再补。
- Suffer 的 `{stress}` 与 `to the Flagellant.` 两行通过 `verified_effect_line_receipts`
  签收，属于「已核对但无独立效果」的行，不是缺口。
