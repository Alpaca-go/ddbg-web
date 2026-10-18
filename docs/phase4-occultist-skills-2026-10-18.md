# Phase 4：Occultist I 级战斗技能与 Dark Ritual

状态：**I 级七战斗技能效果已接线；Dark Ritual I–III 已接（III 依 R-097 LIMITED：`4f7549c1b8`→Buff）。`FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS` 已清空。Q-99（Pilfer 翻面）仍待确认。**

## 1. 基线与来源

基线 main tip `b759e7c`（#244：Occ I 七技能 + Dark Ritual I/II；III 曾因 Q-100 拒绝）。本主题确认 Q-100→R-097 并接通 Dark Ritual III，不裁定 Q-79/Q-80/Q-99，不进 Phase 5。

规则来源：官方 R19–21 / R29 / R33；规格书 §6.5–6.7 / §7；R-001 / R-048 / R-095 / R-096 / R-097；规范化 `hero_skill` p190–p208 与 `hero_stat` p019/p020。不使用 FAQ，不提交 PDF/图片，不改全局词典。

## 2. 技能状态表

| 技能                   | id                | 接线         | 说明                                                              |
| ---------------------- | ----------------- | ------------ | ----------------------------------------------------------------- |
| Sacrificial Stab I     | `hero_skill:p190` | 已接         | `verified_damage_bonus` vs Eldritch +1（新条件 `eldritch`）       |
| Abyssal Artillery I    | `hero_skill:p193` | 已接         | 双目标共享骰；Eldritch +1                                         |
| Weakening Curse I      | `hero_skill:p196` | 已接         | 射程 1–2；Debuff 2t                                               |
| Wyrd Reconstruction I  | `hero_skill:p199` | 已接         | 射程 0–1；治疗 + Bleed 1·2t（面值不改本次治疗伤口）               |
| Vulnerability Hex I    | `hero_skill:p202` | 已接         | 射程 1–2；Mark 2t                                                 |
| Hands from the Abyss I | `hero_skill:p205` | 已接         | Stun 2t + 光照 −1（Dazzling Light 余量解析模式）                  |
| Daemon’s Pull I        | `hero_skill:p208` | 已接         | 既有 Pull 2 位移路径；命中后目标位移                              |
| Dark Ritual            | Hamlet Skill      | **I–III 已接** | Self 压力+1；目标治疗 N / 压力−2 / Buff 3t；公开命令 `darkRitual` |

## 3. Dark Ritual

- 公开命令 `useHamletSkill / darkRitual` + `targetId`（同 Experimental Vapours）；存档 schema 接受该技能名。
- 已核实秘术师 I–III（`hero_stat:p019:front/back`、`hero_stat:p020:front`）；治疗量 2 / 4 / 5。
- 目标须有获批 `verified_buff_defence`（同 Chant）；允许自身为目标（自身亦须有获批 Buff 防御）。
- 自身压力到 10 走村庄意志续接（`hamletDarkRitual`），与 Scout Ahead / Experimental Vapours 同模式。
- III 目标行 `4f7549c1b8` 3t 按 R-097 LIMITED 解释为 Buff（与 I/II 的 `2af41c1ca4` 同义）；词典全局条目可仍为 `unreviewed`。
- 同 hash 亦见于 `hero_stat:p010:front`（Vestal III Chant 行）：R-097 仅记 LIMITED 命名诚实，**不**接线或改写 Vestal III 村庄技能（Pray/Chant 仍仅 I 级）。

## 4. 名单与 UI

- `FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS` = `[]`。
- 网页目录去掉 Occ「技能效果未接线」标签。

## 5. 验收

专项：数据黄金值 + 引擎每战斗技能 + Dark Ritual I–III/schema/名单。本机 typecheck、eslint、完整 Vitest。
