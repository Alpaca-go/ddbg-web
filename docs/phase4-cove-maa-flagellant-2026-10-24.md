# Phase 4：Cove Man-at-Arms / Flagellant（2026-10-24）

- **裁定**：R-105；待确认 Q-105（Cove STAT 包页 vs TDH 技能/STAT 交叉页）。
- **数据**：`extract/extension/cove` → 合并 `normalized/corebox`；STAT Cove 包 p1–4（几何 TDH p24–27）；技能 TDH 印刷页 p232–273。
- **引擎**：移出 `FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS`；`COVE_VERIFIED_SKILL_PAGE_BLOCKS`；战役沙盒开放 14 张 I 级技能 + 六面 STAT。
- **测试**：`cove-hero-stat.test.ts`、`cove-skills.test.ts`；`pnpm test` / `pnpm typecheck` / `pnpm lint` / `pnpm build`。
- **提取**：`tools/pipeline/extract-print/scripts/extract_cove_extension.py`；CE 校验 `tools/pipeline/scripts/import-cove-extract-from-ce.mjs`（本机 PDF 经 CE 资产 symlink 至 `ddbg-print`）。
