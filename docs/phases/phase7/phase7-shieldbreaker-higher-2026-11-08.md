# Shieldbreaker II/III 逐卡核实（Phase 7 / R-200）

## 范围

- **21 张**：七技能族 × L1 洗净 + II/III 共 **14 张**（`hero_skill:p317`–`p318`、`p320`–`p321`、`p323`–`p324`、`p326`–`p327`、`p329`–`p330`、`p332`–`p333`、`p335`–`p336`）。
- 数据：`packages/data/src/normalize/verified-weald-shieldbreaker-higher.ts`；引擎审计：`packages/engine/src/shieldbreaker-higher-skills.test.ts`。

## 逐卡覆盖要点

| 技能族       | 覆盖                                                                            |
| ------------ | ------------------------------------------------------------------------------- |
| Pierce       | `20ffe98e2d`→`target_effects` + Ignores Protection；Self Pull 1                 |
| Puncture     | II/III `verified_range` 1–2；Self Pull 1 + Ignores Guard + 目标 Pull 1（Q-183） |
| Adder's Kiss | Self Push；L1 Debuff 2t / L2–III Stun 3t                                        |
| Impale       | 四红骷髅→**单枚** `target_monster`（Q-181，非四头盔人数）；Self Push + Debuff   |
| Expose       | Self Push + 目标 Debuff                                                         |
| Captivate    | stats 伤害洗净；`+N vs {mark}` + 目标 Blight（Q-182）                           |
| Serpent Sway | Self Protection + Pull 1（Q-184）；III + 队友 Protection 2t @ range 1           |

## 审计

**14/14 绿**（II/III d10）；L1 七张纳入同文件签名闸。

## 裁定

**Q-181～Q-184** Kyries 真确认（2026-11-08）；见 `docs/rulings.md`。
