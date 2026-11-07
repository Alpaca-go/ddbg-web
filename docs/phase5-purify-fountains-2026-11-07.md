# Purify the Fountains：任务药水与净化消耗（R-197）

**基线**：`cb4d5498`（Rising Threat 合入后）
**授权 / 依据**：Kyries 2026-11-07 确认（R-197）：`dd2d2467ec` = Potion；开局携带 3 个不可丢弃的任务药水；池满时先拿再丢弃超出上限的部分；净化 = 2 行动 + 1 药水。
**范围**：只接 Purify（`quest:p010`）的任务补给与净化消耗；不动 `usable` / `combatReady` / 任务白名单，不改治疗泉常规效果。

## 改动

| 层   | 改动                                                                                                                                       |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 数据 | `basic-quests.ts` 的 `quest:p010` 增加 `questStartingProvisions: [{ face: "potion", count: 3 }]`、`objectiveRecoveryProvision: "potion"`     |
| 补给 | 新增 `quest-provisions.ts`：任务补给 id 前缀 `dungeon-quest-provision:`；开局把 3 个药水加入公共池；超过 16 时**先拿任务药水，再按池序丢弃既有尾部**，事件记录丢弃项 |
| 使用 | `dungeon-provision-use.ts`：任务药水不能作普通药水使用（只用于净化），单独拒绝（R-197）                                                       |
| 净化 | `dungeon-objective.ts`：首次净化行动额外消耗 1 个任务药水；没有则拒绝且状态不变；第二次行动不再耗药水；完成才清理目标房                          |

RNG：任务补给不掷骰、不消耗游标；净化只消耗行动与库存，回放确定。

## 验证

```bash
pnpm exec vitest run packages/engine/src/quest-p010-purify.test.ts
pnpm exec vitest run packages/engine/src/dungeon-objective.test.ts \
  packages/engine/src/dungeon-starting-provisions.test.ts \
  packages/engine/src/dungeon-quest-entry.test.ts \
  packages/engine/src/dungeon-provision-use.test.ts
pnpm typecheck
```

- 新增 5 测：开局 3 个任务药水（8+3）；池满 16 时保留任务药水并丢弃 3 个既有；净化首次耗 1 药水 + 2 行动、完成后才清理；无药水拒绝且状态不变；任务药水不能作普通药水。
- 既有目标房 / 开局补给 / 任务入口 / 补给使用回归通过。

## 边界

- 「丢弃超出上限」当前按**既有池尾部顺序**自动丢弃（事件列明 id）；若要求玩家选择丢弃哪些，需要另开 Q 或改为 pending choice。
- 治疗泉「未净化不生效」的常规效果仍未接（见 `phase5-a07-purify-set-aside-2026-11-01.md` 的 hold）。
- Dem Bones 无需改代码：现有「2 行动、任意英雄、完成后清理」已符合 R-197；绿区 A4 与 Ancestor's Glory 同区的事实记录在核对稿与 R-197。
