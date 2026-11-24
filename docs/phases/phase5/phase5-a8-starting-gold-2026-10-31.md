# Phase 5 A-8：Standard / Radiant 开局金（2026-10-31）

## 范围

- 接通难度模式**首次任务创建**时的共享金币：`standard` → **10**，`radiant` → **20**。
- 实现位置：`createDungeonSandbox` 在真实开局补给路径（`startingProvisions === true`，含 `createCoreDungeonQuest` 与 `chooseNextQuest` 前的首趟入口）按 `mode` 写入；纯调试沙盒（无开局补给）仍为 **0**。
- 导出 `startingGoldForMode` 供测试与后续引用。
- 纯调试沙盒（`startingProvisions === false`）仍为 **0** 金；`chooseNextQuest` / `embarkOnQuest` 继续保留 `d.gold`（见 `hamlet-embark.test.ts`）。
- 自然村庄夹具：`NATURAL_ABBEY_SEED` 由 123 调整为 **68**（Radiant 开局金缩短 Fundraiser 自然路径后，123 无法满足 General Repairs 前置；68 仍走完整公开命令）。

## 依据

- `docs/plan.md` Game Modes：Radiant 开局 20 金而非 10（Standard 隐含 10 金，与规则书战役布置一致）。
- R-001 / R-048：不发明数值；未接 Stygian（Phase 6，须 Kyries 明示）。

## 非目标

- Stygian 开局 0 金与 Stygian 房间 / Boss Crit+1。
- 中途 `embarkOnQuest` / `chooseNextQuest` 按 mode 重置金币（仍保留 `d.gold`）。
- 补给掷骰、探索骰、Curio R-048 剩余、combatReady、几何、扩展 Boss。

## 测试

```bash
pnpm typecheck
pnpm --filter @ddbg/engine test packages/engine/src/dungeon-quest-entry.test.ts
pnpm --filter @ddbg/engine test packages/engine/src/dungeon-starting-provisions.test.ts
pnpm --filter @ddbg/engine test packages/engine/src/hamlet-embark.test.ts
pnpm --filter @ddbg/engine test packages/engine/src/natural-quest-paths.test.ts
pnpm test
```

本机上述闸门应绿；远端 CI unstable 按仓库惯例处理。
