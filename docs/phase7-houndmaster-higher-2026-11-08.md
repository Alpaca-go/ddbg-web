# Houndmaster II/III 逐卡核实（Phase 7 / R-200）

## 范围

- **21 张**：七技能族 × L1 洗净 + II/III 共 **14 张**（`hero_skill:p338`–`p339`、`p341`–`p342`、`p344`–`p345`、`p347`–`p348`、`p350`–`p351`、`p353`–`p354`、`p356`–`p357`）。
- 数据：`packages/data/src/normalize/verified-weald-houndmaster-higher.ts`；引擎审计：`packages/engine/src/houndmaster-higher-skills.test.ts`。

## 逐卡覆盖要点

| 技能族 | 覆盖 |
| --- | --- |
| Hound's Rush | 自身 `d4329c2a97`→`mark`；目标流血 `verified_status_effects`（L1–III） |
| Hound's Harry | 目标流血注解（L1–III） |
| Target Whistle | `20ffe98e2d`→`target_effects`；stats 射程 0 + 清 `0-2` 脏数字（L1–III） |
| Cry Havoc | 压力行沿 Endure/Bolster：`verified_self_stress`、`verified_allies_stress`、`verified_effect_line_receipts`；L1 补 stats 临近双队友（L1–III） |
| Guard Dog | `verified_self_range` + 自身 `protection`（L1–III） |
| Lick Wounds | stats 爪痕 `damage`→`heal` 逐卡；`verified_self_range`（L1–III） |
| Blackjack | `763ad8e857`→`stun` 1t（L1–III） |

## 审计

**14/14 绿**（II/III d10）；L1 七张纳入同文件签名闸。

## 裁定

**Q-178～Q-180** Kyries 真确认（2026-11-08）；见 `docs/rulings.md`。
