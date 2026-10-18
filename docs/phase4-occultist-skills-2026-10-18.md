# Phase 4：Occultist I 级战斗技能与 Dark Ritual

状态：**I 级七战斗技能效果已接线；Dark Ritual I/II 已接；Dark Ritual III 因 `4f7549c1b8` 未命名停在 Q-100。`FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS` 已清空。Q-99（Pilfer 翻面）仍待确认。**

## 1. 基线与来源

基线 main tip `947cbec`（#243：R-096 Pilfer 抽取；Q-99 待确认）。本主题接通 Occ I 级七技能与 Dark Ritual I/II，不裁定 Q-79/Q-80/Q-99，不进 Phase 5。

规则来源：官方 R19–21 / R29 / R33；规格书 §6.5–6.7 / §7；R-001 / R-048 / R-095 / R-096；规范化 `hero_skill` p190–p208 与 `hero_stat` p019/p020。不使用 FAQ，不提交 PDF/图片，不改全局词典。

## 2. 技能状态表

| 技能                   | id                | 接线              | 说明                                                              |
| ---------------------- | ----------------- | ----------------- | ----------------------------------------------------------------- |
| Sacrificial Stab I     | `hero_skill:p190` | 已接              | `verified_damage_bonus` vs Eldritch +1（新条件 `eldritch`）       |
| Abyssal Artillery I    | `hero_skill:p193` | 已接              | 双目标共享骰；Eldritch +1                                         |
| Weakening Curse I      | `hero_skill:p196` | 已接              | 射程 1–2；Debuff 2t                                               |
| Wyrd Reconstruction I  | `hero_skill:p199` | 已接              | 射程 0–1；治疗 + Bleed 1·2t（面值不改本次治疗伤口）               |
| Vulnerability Hex I    | `hero_skill:p202` | 已接              | 射程 1–2；Mark 2t                                                 |
| Hands from the Abyss I | `hero_skill:p205` | 已接              | Stun 2t + 光照 −1（Dazzling Light 余量解析模式）                  |
| Daemon’s Pull I        | `hero_skill:p208` | 已接              | 既有 Pull 2 位移路径；命中后目标位移                              |
| Dark Ritual            | Hamlet Skill      | **I/II 已接**     | Self 压力+1；目标治疗 N / 压力−2 / Buff 3t；公开命令 `darkRitual` |
| Dark Ritual III        | Hamlet Skill      | **拒绝（Q-100）** | 目标行 `4f7549c1b8` 3t 未命名；不发明                             |

## 3. Dark Ritual

- 公开命令 `useHamletSkill / darkRitual` + `targetId`（同 Experimental Vapours）；存档 schema 接受该技能名。
- 仅已核实秘术师 I–II（`hero_stat:p019:front/back`）；治疗量 2 / 4。
- 目标须有获批 `verified_buff_defence`（同 Chant）；允许自身为目标。
- 自身压力到 10 走村庄意志续接（`hamletDarkRitual`），与 Scout Ahead / Experimental Vapours 同模式。
- III（`hero_stat:p020:front`）整次拒绝并引用 Q-100。

## 4. 名单与 UI

- `FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS` = `[]`。
- 网页目录去掉 Occ「技能效果未接线」标签。

## 5. 验收

专项：数据黄金值 + 引擎每战斗技能 + Dark Ritual I/II/拒绝 III/schema/名单。本机 typecheck、eslint、完整 Vitest。
