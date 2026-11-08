# Shieldbreaker II/III 逐卡核实（Phase 7 / R-200）

## 范围

- **21 张**：七技能族 × L1 洗净 + II/III 共 **14 张**（`hero_skill:p317`–`p318`、`p320`–`p321`、`p323`–`p324`、`p326`–`p327`、`p329`–`p330`、`p332`–`p333`、`p335`–`p336`）。
- 数据：`packages/data/src/normalize/verified-weald-shieldbreaker-higher.ts`；引擎审计：`packages/engine/src/shieldbreaker-higher-skills.test.ts`。

## 逐卡覆盖要点

| 技能族 | 覆盖 |
| --- | --- |
| Pierce | `20ffe98e2d`→`target_effects` + Ignores Protection；`d4329c2a97`→Self Pull 1 |
| Puncture | II/III `verified_range` 1–2；Ignores Guard + 目标 Pull；`Self` 行签收 |
| Adder's Kiss | Self Push；L1 Debuff 2t / L2–III Stun 3t |
| Impale | 四头盔→`target_monster`（Q-181）；Self Push + 目标 Debuff |
| Expose | Self Push + 目标 Debuff |
| Captivate | stats 爪痕 `damage` 洗净；`+N vs {stun}` 条件伤 + 流血（Q-182） |
| Serpent Sway | L1–II Self 射程 0 + Protection + Pull；III 拆 stats 头 + Mark（Q-184） |

## 审计

**14/14 绿**（II/III d10）；L1 七张纳入同文件签名闸。

## 待确认

**Q-181～Q-184** 状态「待 Kyries 确认」；见 `docs/rulings.md`。
