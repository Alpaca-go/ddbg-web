# A-08 · Warm Up the Halls 自然 III 升幕出征存档回放

**基线**：main `14a17b37`（#481 C-008 已合）  
**切片**：A-7 / A-08 — `quest:p011` 在 **战役 III 级、公开 `advanceRuinsAct` 后抽任务出征** 的路径上，验收 Warm Up 开局改 Torch（#427–#428 机制已合，本刀只补验收夹具与文档）。  
**未扩大** `createCoreDungeonQuest` 白名单；未改 Q-WARM-01–05 默认实现；排除 Rising Threat / R-121 / Boss 生产几何。

## 已接（本 PR）

- 引擎夹具 `packages/engine/src/test-helpers/warm-up-natural-iii-prefix.ts`：
  - 明示 **II 幕末回村边界** `ruinsActReadyForAdvance(2, boss)`（与 `advance-ruins-act.test.ts` 同级池补丁，不冒称自然 Boss 部署）；
  - 公开命令链：`advanceRuinsAct` → 升幕后首次 `drawHamletEvent` 与准备日收束 → `offerNextQuest` → 选 **`quest:p011`** → 开局补给 → **Warm Up 改 Torch**；
  - 固定 **seed + boss** 搜索（默认 `0..511` × 四 Boss），使 III 级候选项含 `p011`。
- 引擎测试 `packages/engine/src/warm-up-natural-iii-replay.test.ts`：
  - 从 `actReady` 边界 **严格命令重放** 与终态一致；
  - 选同批候选项中的 **非 p011** 时不写 `warmUpStartingProvisionTorchChoice`（与 #428 无标记回归不冲突）；
  - **自然 I 级** `guildQuest` 前缀 `createQuestSave` / `loadQuestSave` 仍可加载；
  - **存档**：若 `quest:p019` 起点 + 升幕/出征命令无法通过 `createQuestSave` 回放校验（与 #413 / `advance-ruins-act.test` 一致，缺自然 Boss 全链），测试断言 `createQuestSave` 拒绝并仍以 **actReady 边界重放** 作为本切片正式验收；若未来全链落地，同一测试在 `save !== null` 时自动走 `loadQuestSave` 往返。

## 仍属 A-7 / hold（本 PR 未接）

- 从 **首次出征** 到 II/III 幕末的 **完整自然 Boss 战役命令日志** 写入 `quest:p019` 正式存档（升幕前链路与 B 几何 / R-121 仍 hold）。
- Warm Up **暗房** 自然 III 全链（#427 已有明示夹具 `warm-up-dark-room.ts`，非本刀）。
- 网页专用 UI（仍用通用 `pendingChoice`）。

## Q-WARM / 规则

- Q-WARM-01–05：沿用 [phase5-warm-up-provision-torch-2026-10-31.md](phase5-warm-up-provision-torch-2026-10-31.md) 表内默认实现；本 PR 未裁定变更。

## 验证

```bash
pnpm exec vitest run \
  packages/engine/src/warm-up-natural-iii-replay.test.ts \
  packages/engine/src/warm-up-starting-provisions.test.ts \
  packages/engine/src/warm-up-dark-room.test.ts \
  packages/engine/src/advance-ruins-act.test.ts
```

本刀跑通上述 vitest；不声称全库 CI 全绿。
