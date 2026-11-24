# Phase 4：Weald — Houndmaster / Shieldbreaker（2026-10-24）

状态：**I 级七战斗技能与 STAT I–III 已接线（R-106）。Musketeer 见 [phase4-musketeer-2026-10-24.md](phase4-musketeer-2026-10-24.md)（R-107）。**

## 范围

- `extract_weald_extension.py` + `import-weald-extract-from-ce.mjs` → `packages/data/extract/extension/weald`
- `weald-hero-stat.ts`：六面 `attributesVerified`
- `WEALD_VERIFIED_SKILL_PAGE_BLOCKS`；战役 `battle-data-plugin` 开放 14 张 I 级技能
- 不打开 Weald Boss / 地点机制

## 核实表（R-106）

| 英雄          | STAT（Weald 包）    | Life / Dodge / Speed     |
| ------------- | ------------------- | ------------------------ |
| Houndmaster   | p1 I、背 II；p2 III | 11/1/2 → 15/2/2 → 19/3/2 |
| Shieldbreaker | p3 I、背 II；p4 III | 11/1/2 → 15/2/2 → 19/3/3 |

| 英雄          | I 级技能 id（TDH 页，每 3 页一张）                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Shieldbreaker | p316 Pierce, p319 Puncture, p322 Adder's Kiss, p325 Impale, p328 Expose, p331 Captivate, p334 Serpent Sway                   |
| Houndmaster   | p337 Hound's Rush, p340 Hound's Harry, p343 Target Whistle, p346 Cry Havoc, p349 Guard Dog, p352 Lick Wounds, p355 Blackjack |

页码与 `print-hero-18-art-catalog` 对调见 **Q-106**。

## 测试

`pnpm typecheck && pnpm lint && pnpm test && pnpm build`；`packages/engine/src/weald-skills.test.ts`。
