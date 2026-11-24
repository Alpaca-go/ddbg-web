# 十八英雄建队名录（2026-10-24）

状态：**建队页可选 18 名；技能卡走印刷 map（#286）。十一名核心盒 STAT 已核实；七名扩展用占位属性 + art-only 技能；战斗按 R-048 拒绝未核实效果。**

## 名录

`FORMAL_HERO_NAMES`（18）：Abomination, Antiquarian, Arbalest, Bounty Hunter, Crusader, Flagellant, Grave Robber, Hellion, Highwayman, Houndmaster, Jester, Leper, Man-at-Arms, Musketeer, Occultist, Plague Doctor, Shieldbreaker, Vestal。

- **已核实 STAT（11）**：原正式八英雄 + Jester / Arbalest / Abomination；替补仍要求七张已核实 I 级技能。
- **属性已核实 + 技能未全接线（2）**：Jester / Arbalest（各缺一张已核实 I 级；其余六张已接）。**Abomination**：七张 I 级已接（含 Transform），可替补。
- **扩展 art-only（7）**：Antiquarian, Leper, Flagellant, Man-at-Arms, Houndmaster, Shieldbreaker, Musketeer（`hero_skill:art:*` + 扩展 STAT 印刷面）。

`FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS` = 七名扩展英雄；核心 trio 已接线。UI 标「技能效果未接线」。

## 代码触点

- `packages/engine/src/formal-heroes.ts`、`formal-roster-catalog.ts`
- `apps/web/battle-data-plugin.ts`：`virtual:quest-battle-data` = 40 属性面（33 核实 + 7 占位）+ 扩展技能目录
- `apps/web/src/dungeon-sandbox/quest-setup/*`

## 待确认

- 扩展 STAT 页序（map `pendingConfirmation`）
- Jester / Arbalest I 级七张已接线（R-102 / R-103，2026-10-24）
- 十名英雄的 standee token / 技能 icon（Kyries 后续补图）
