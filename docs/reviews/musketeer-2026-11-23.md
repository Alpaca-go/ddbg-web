# Musketeer（h18）技能语义复核 — 2026-11-23

> **状态：pending**。Kyries 2026-11-23 确认：Musketeer 与 Arbalest 效果完全一致，
> 只有技能图标和技能名不同。因此 Musketeer **不单独判定**，等 Arbalest 核对通过后
> 按 Q-185 同步；本文记录的是同步前的对照核查。

范围：`hero_skill:musketeer:h18:p358`–`p378`，共 21 张（7 技能 × I–III）。
依据：Q-185 裁定（Musketeer 与 Arbalest 效果完全一致，仅图标与技能名不同）、
[musketeer-arbalest-parity.test.ts](../../packages/data/src/normalize/musketeer-arbalest-parity.test.ts)。

## 方法

1. 逐族与 Arbalest 对照（Sniper Shot、Suppressive Fire、Sniper's Mark、Bola、Blindfire、
   Battlefield Bandage、Rallying Flare）。
2. 现有 parity 测试比较 `effect_lines` 签名与 `verified_*` 字段；
   本次额外用脚本比较了两边的**数值序列**（stats_line 与 effect_lines 里的数字），
   补上 parity 测试没有覆盖的 stats_line。
3. 结果：7 族 × 3 级，数值序列 **0 处差异**；差异只在图标（例如 Arbalest 用
   `damage_or_heal_combined_marker`，Musketeer 用 `heal`），符合 Q-185「仅图标不同」。

## 逐族结论

| Musketeer           | Arbalest 对照       | 数据                                                                           | 判定      |
| ------------------- | ------------------- | ------------------------------------------------------------------------------ | --------- |
| Aimed Shot I–III    | Sniper Shot         | 条件伤害 +3/+5/+9 vs marked；stats damage 9/6、12/8、16/10                     | confirmed |
| Smokescreen I–III   | Suppressive Fire    | 目标 Debuff 1/2/3t；射程 1–2；damage 4/2、6/3、7/4                             | confirmed |
| Call the Shot I–III | Sniper's Mark       | 目标 Mark 2/3/4t；Acc 10/11/12                                                 | confirmed |
| Buckshot I–III      | Bola                | 自身 Push 1/2/2、目标 Push 2；无 `verified_*`，与对照卡一致                    | confirmed |
| Sidearm I–III       | Blindfire           | 自身 Push 1/2/2；射程 0–2；damage 8/5、11/6、14/8                              | confirmed |
| Patch Up I–III      | Battlefield Bandage | 自身 Buff 2t；治疗 6/4、8/5、10/7                                              | confirmed |
| Skeet Shot I–III    | Rallying Flare      | 清除 stun/mark；目标 Monster Debuff 2t；`verified_rallying_flare` 与对照卡一致 | confirmed |

## 注意

- stats_line 的图标差异是裁定允许的（Q-185），不是错误；数值一致即可。
- Push / 清除状态 / Debuff 的结算路径与 Arbalest 共用，A1 审计时一并确认。
- 本轮同样没有重新查看卡图，证据是 Q-185 + parity 测试 + 数值对照。
