# Phase 4 摘记：Warrens Antiquarian / Leper（2026-10-24）

- **裁定**：R-104；待确认 Q-103（TDH 技能页码 vs #286）、Q-104（STAT 未入词典图标）。
- **数据**：`extract/extension/warrens` → 合并 `normalized/corebox`；STAT TDH p28–31；技能印刷页 p274–315。
- **引擎**：移出 `FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS`；替补白名单与战役 `battle-data-plugin` 开放 I 级七技能。
- **测试**：`warrens-hero-stat.test.ts`、`warrens-skills.test.ts`；`pnpm test` / `pnpm typecheck` / `pnpm lint` / `pnpm build`。
