# Bounty Hunter / Arbalest 技能复核 — 2026-11-23

范围：Bounty Hunter（h03，p043–p063）、Arbalest（h08，p148–p168），各 21 张。

## Bounty Hunter

依据：`docs/phases/phase4/phase4-collect-bounty-2026-10-16.md`、`bounty-status-skills.test.ts`、R-141。

| 技能                 | 数据                                                                          |
| -------------------- | ----------------------------------------------------------------------------- |
| Collect Bounty I–III | 条件伤害 +1/+2 vs Humans、+2/+3 vs Marked；p044 Acc `1O` 已按 R-141 修正为 10 |
| Mark for Death I–III | 目标 Mark 3t + Debuff 2/2/3t；自身 Buff 2/3/3t；射程 0–2                      |
| Come Hither I–III    | 目标 Mark 2/2/3t + Pull 2；射程 2                                             |
| Uppercut I–III       | 目标 Stun 1t + Push 2                                                         |
| Flashbang I–III      | 目标 Stun 1t；Push/Pull 1/2/3 自选                                            |
| Finish Him I–III     | 条件伤害 +2/+3/+4 vs Stunned；射程 0–1                                        |
| Caltrops I–III       | 目标 Bleed 2/3/3 + Debuff 1/2/3t；射程 2                                      |

21/21 confirmed。

## Arbalest

依据：`docs/phases/phase4/phase4-core-trio-skills-2026-10-24.md`（I 级）、core-higher 注解（II/III）、
`core-trio-skills.test.ts`、`core-higher-skills.test.ts`。

| 技能                      | 数据                                            |
| ------------------------- | ----------------------------------------------- |
| Sniper Shot I–III         | 条件伤害 +3/+5/+9 vs Marked；射程 2             |
| Suppressive Fire I–III    | 目标 Debuff 1/2/3t；两目标；射程 1–2            |
| Sniper's Mark I–III       | 目标 Mark 2/3/4t                                |
| Bola I–III                | 自身 Push 1/2/2 + 目标 Push 2；两目标           |
| Blindfire I–III           | 自身 Push 1/2/2；射程 0–2                       |
| Battlefield Bandage I–III | 自身 Buff 2t；目标治疗 6/4、8/5、10/7           |
| Rallying Flare I–III      | 清除自身/友方 Stun+Mark；目标 Monster Debuff 2t |

21/21 confirmed。Arbalest 通过后，Musketeer 可按 Q-185 同步（parity 测试已存在）。

## 注意

- 两批均无数据改动。
- Bounty Hunter 的 Push/Pull 与 Ignores 走文本解析；Arbalest 的 Push 同样。
