# R-048：Curio 待确认切片（2026-10-27）

Kyries 批准清 **B09 §3** 三项停点（见 `docs/b09-curio-verified-breakpoints-2026-10-27.md`）。本刀只接线已有裁定，不发明印刷效果。

## 三项对照

| §3 条目                             | 结论                      | 依据                                                  | 引擎 / 测试                                                                                                                   |
| ----------------------------------- | ------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 词典降级或 `rows[].effect === null` | **已接（停点模板）**      | R-048、Q-60（R-064 已解决效果行；运行时仍须挡未知行） | `resolveCurioRows` → `blockedReason` 含 `R-048 / Q-60 停点模板`；`dungeon-curio.test.ts`（未知行 p1、转录丢失 p21）           |
| 未获批饰品卡面主动装备              | **已接（弃新卡完成）**    | R-048；R-035 饰品获得流程                             | `trinketOptions` 对 `verification.unverified` 仅 `discard-new`；`awaitTrinket` 文案；`dungeon-curio.test.ts` p5               |
| Q-61 地牢内 Curio 抽空洗回          | **已接（拒抽 + 不洗回）** | R-068（Q-61 confirmed）；回村洗回仍 R32               | `drawDungeonCurio` 在 `deck.length === 0` 时 `commandRefused`；`r048-curio-pending.test.ts`、`dungeon-curio.test.ts` 牌池守恒 |

## §4 停点（饰品 verification，2026-10-28）

详见 [`docs/r048-curio-remaining-2026-10-28.md`](r048-curio-remaining-2026-10-28.md)。

- **生产数据**：核心盒 38 张饰品均已 `verification.unverified=false`（`5fbb752` / Q-47 词典批）。Curio 抽到的 I 级饰品待选可走装备 / 转交；R-048 仍挡夹具或未核实卡（仅 `discard-new`）。
- **自然路径**：`naturalQuest` 对 `dungeon-trinket:` 优先 `equip:*`，与上述一致。

## 仍待确认（本刀不实现）

- 任意 **新** 未获批 Curio 效果行或图标语义（需 R-064 级批准或数据修复，非引擎猜测）。
- **无 Torch** 同卡疾病 + 压力/状态（Q-68 类）；Boss / Phase 5 Curio。

## 如何测

```bash
pnpm typecheck
cd packages/engine && pnpm exec vitest run dungeon-curio r048-curio-pending b09-curio-natural-paths
```
