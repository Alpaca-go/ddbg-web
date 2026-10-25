# Phase 4：Musketeer（2026-10-24）

状态：**I 级七战斗技能与 STAT I–III 已接线（R-107）。`FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS` 已清空。**

## 范围

- `extract_musketeer_extension.py` + `import-musketeer-extract-from-ce.mjs` → `packages/data/extract/extension/musketeer`
- `musketeer-hero-stat.ts`：三面 `attributesVerified`
- `MUSKETEER_VERIFIED_SKILL_PAGE_BLOCKS`；战役 `battle-data-plugin` 开放 7 张 I 级技能
- 不打开 PvP / Musketeer 专属扩展机制

## 核实表（R-107）

| 英雄      | STAT（MG_DD_08 包）                                 | Life / Dodge / Speed     |
| --------- | --------------------------------------------------- | ------------------------ |
| Musketeer | STAT_FRONT p1 I、STAT_BACK p1 II；STAT_FRONT p2 III | 14/0/1 → 19/1/1 → 24/2/2 |

| I 级技能（包内页，id 前缀 `hero_skill:musketeer:`）                                                                |
| ------------------------------------------------------------------------------------------------------------------ |
| p001 Aimed Shot, p004 Smokescreen, p007 Call the Shot, p010 Buckshot, p013 Sidearm, p016 Patch Up, p019 Skeet Shot |

技能 id 与 art map 页序见 **Q-107**。

## 测试

`pnpm typecheck && pnpm lint && pnpm test && pnpm build`；`packages/engine/src/musketeer-skills.test.ts`、`packages/data/src/normalize/musketeer-hero-stat.test.ts`。
