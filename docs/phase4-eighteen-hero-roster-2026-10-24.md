# 十八英雄建队名录（2026-10-24）

状态：**建队页可选 18 名；技能卡走印刷 map（#286）。十名 STAT 待核实英雄用占位属性 + art-only 技能；战斗按 R-048 拒绝未核实效果。**

## 名录

`FORMAL_HERO_NAMES`（18）：Abomination, Antiquarian, Arbalest, Bounty Hunter, Crusader, Flagellant, Grave Robber, Hellion, Highwayman, Houndmaster, Jester, Leper, Man-at-Arms, Musketeer, Occultist, Plague Doctor, Shieldbreaker, Vestal。

- **已核实 STAT（8）**：原正式八英雄；替补仍要求七张已核实 I 级技能。
- **部分技能 + 占位 STAT（3）**：Jester / Arbalest / Abomination（normalized I–III 技能已进目录；STAT `rosterPendingConfirmation`）。
- **扩展 art-only（7）**：Antiquarian, Leper, Flagellant, Man-at-Arms, Houndmaster, Shieldbreaker, Musketeer（`hero_skill:art:*` + 扩展 STAT 印刷面）。

`FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS` = 上述十名非八核心；UI 标「技能效果未接线」。

## 代码触点

- `packages/engine/src/formal-heroes.ts`、`formal-roster-catalog.ts`
- `apps/web/battle-data-plugin.ts`：`virtual:quest-battle-data` = 34 属性面 + 扩展技能目录
- `apps/web/src/dungeon-sandbox/quest-setup/*`

## 待确认

- 扩展 STAT 页序（map `pendingConfirmation`）
- Jester / Arbalest / Abomination 属性转录与七技能完整性
- 十名英雄的 standee token / 技能 icon（Kyries 后续补图）
