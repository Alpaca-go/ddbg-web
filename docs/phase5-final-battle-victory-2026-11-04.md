# 最终战末形态胜利 → 战役终局（B1）

**日期**：2026-11-04
**基线**：`1b8275b7`（#599 后）
**PR**：[#600](https://github.com/Alpaca-go/ddbg-web/pull/600)
**范围**：Kyries 点名「开 B1」：终局态 + 严格存档 + 网页结局面板；不做回村/新战役，不动准入。

## 依据

- 核心 **R9**：第 4 幕击败最终 Boss（Heart of Darkness）= 胜利。
- 规格书 [§14.7](spec/core-rules-spec-v0.2.md#L984-L994)：「Heart of Darkness … 击败 = 赢得游戏」；[§1](spec/core-rules-spec-v0.2.md#L74) 胜利定义。
- 交接 §3.2 已明示「多形态胜利链 / 战役胜利回村」为未覆盖项，本刀只补**终局本身**。

## 本刀接通

- `DungeonState.campaignVictory?: true`：终局标记，仅由 `finishFinalBattleForm` 在**最后一个形态**被击败时写入，与 `finalFormSequence.status = "complete"` 同一次提交。
- `applyCommand`：终局后**一律拒绝**（含 `finishDungeonBattle` / `startBattle` / `deployFinalBattleForm` / `summarizeDungeonQuest` / `beginReturnToHamlet`），消息「战役已胜利（R9、R41）…」。不静默吞命令，也不改写胜利状态。
- 事件文案：末形态胜利改为「Heart of Darkness已击败，最终战全部形态完成：战役胜利（R9、R41）」。
- 网页：`DungeonSandbox` 在 `campaignVictory` 时整屏渲染 **战役胜利面板**（存活英雄名单 + 终局说明），不再停在无命令可用的战场。

## 存档

- 存档仍是「起点 + 命令日志 + 快照校验」；终局由**回放派生**，**不新增存档字段**，无版本升级。
- `final-battle-natural-save.test.ts` 增断言：把 `snapshot.dungeon.campaignVictory` 伪造成 `true` 时，严格校验必须拒绝。

## 未改

- `combatReady` 仍全 false（数据 17 处）；`room_tile_geometry` 17 usable / 8 false；任务白名单、生产几何、`ancestorGlory`、完整 Boss AI 均未动。
- 胜利后回村（R32）与新战役入口未做，见下方待确认。

## 待确认（Q-xxx）

- 胜利后是否允许按 R32 回村、或直接开新战役（B2）；本刀按 B1 停在结算。

## 验证

```bash
pnpm exec vitest run \
  packages/engine/src/boss/final-battle-victory.test.ts \
  packages/engine/src/boss/final-form-sequence.test.ts \
  packages/engine/src/boss/final-battle-natural-save.test.ts \
  apps/web/src/dungeon-sandbox/quest-return/campaign-victory-panel.test.tsx
pnpm typecheck
```

- 新增 3 条引擎测试（前三形态不置胜利 / 末形态置终局 / 终局拒命令）+ 1 条面板测试，全部通过。
- 相关回归：`final-form-sequence`（5）、`final-battle-deploy`（6）、Ancestor2 与 HoD Acc，合计 42 测通过；自然存档 2 测通过（含新伪造断言）。
- 全量（本机 4 worker）：3211 通过 / 3 失败，均为已知 Windows 并行超时（`warm-up-natural-iii-replay`、`task-sources` ×2），单跑通过；CI 为最终口径。
