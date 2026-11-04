# 最终战自然任务与严格存档

基线：main @ R-186（[#595](https://github.com/Alpaca-go/ddbg-web/pull/595)）、R-187（Kyries 确认 [#596](https://github.com/Alpaca-go/ddbg-web/pull/596)）。依据 R-186、R-187、R-122、R-048 与核心 R36/R39、规格书 §14.x。生产入口见 [phase5-final-battle-production-entry-review-2026-11-04.md](phase5-final-battle-production-entry-review-2026-11-04.md)。

`naturalFinalBattle`（`test-helpers/natural-final-battle.ts`）在 `naturalQuest` 完成最暗 **quest:p018**（种子 **3279**）并经 `beginReturnToHamlet` / `finishReturnToHamlet` 后，按村庄 UI 同序驱动 `beginFinalPreparation` → 四天看守人/英雄行动（首行动 Crusader 可用 Zealous Speech，其余走 `hamletActionOptions`）→ `beginFinalBattleProvisions` → `rollDungeonProvisions` / `resolveChoice` → `prepareFinalBattleForms`，停在 **awaitingDeployment**；检查点再执行公开 `deployFinalBattleForm` 与 `startBattle`。不伪造形态胜利、不翻 `combatReady`。

**本刀覆盖**：p018 自然最暗胜利 → 回村 XP → 最后四天 → 最终战补给与形态登记 → 首形态（Ancestor 1 + Reflections）**部署与先攻洗入**（7 张先攻）→ 部署/开战检查点 JSON 严格回放；`preFinalBattleBossCatalogTaskSources` 旧目录空档迁移。

**未覆盖**（诚实边界）：多形态 `finishDungeonBattle` 续接与战役胜利回村；Ancestor 2 / Gestating Heart / Heart of Darkness 完整 AI 与 `combatReady` 运行时；`ancestorGlory` 特殊区；铁匠/游商深度购买（自然路径仅消费既有 `nextQuestProvisionDice` 等任务历史）。

引擎：`rollDungeonProvisions` 在 `startingProvisionChoices === []` 时不再误拒（最暗任务遗留空数组），否则自然最终战补给无法掷骰。

浏览器冒烟：正式 `taskSources` 生成部署检查点存档 → 页面读取 → **开始战斗** → 保存 → 刷新 → 读取后仍为 `awaitingInitiative`（无重复「开始战斗」）。

验证：

```bash
pnpm exec vitest run packages/engine/src/boss/final-battle-natural-save.test.ts
pnpm exec vitest run packages/engine/src/boss/mammoth-cyst-i-natural-save.test.ts
pnpm exec vitest run packages/engine/src/boss/shuffling-horror-i-natural-save.test.ts
pnpm exec vitest run packages/engine/src/boss/templars-i-natural-save.test.ts
pnpm exec vitest run apps/web/e2e/final-battle-save.spec.ts
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

**Q-xxx（待 Kyries）**：是否将「最终战自然存档仅到首形态部署/开战、不含多形态胜利」写入正式裁定（本 PR 仅在本文档标明边界）。
