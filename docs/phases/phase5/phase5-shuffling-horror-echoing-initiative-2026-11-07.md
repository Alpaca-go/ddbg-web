# Shuffling Horror Echoing 召唤补先攻卡（2026-11-07）

**基线**：`54ca422c`（Templars 审查补强后）
**授权**：Kyries 2026-11-07（Q-162 选 ① 后继续）。
**依据**：`boss_ability:p033`「Echoing Disassembly: … This will summon a Cultist Priest (unless it's already in play) and Malignant Growth (unless it's already in play).」；核心 R-034 #5「把 1 张先攻卡洗进当前牌堆 → 被召唤的怪物当轮就能行动」、R31。
**范围**：只补 Echoing 召唤的先攻卡洗入；不改自动选招/AI、`combatReady`、`usable` 或任务白名单。

## 改动

| 层   | 改动                                                                                                                                             |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 引擎 | `applyShufflingHorrorEchoingDisassembly`：每只实际召唤的怪物向 `encounter.deck` 洗入 1 张 `monster` side 牌（随机位置），`rngCursor` 每张 +1     |
| 文案 | 事件追加「先攻 +N（R-034）」；`darkest-mid-boss-runtime` 的 p016 wiringHold 改为「召唤（含先攻洗入，R-034）…Echoing 自动选招 / 完整 AI 仍 hold」 |
| 行为 | 被召唤的 Cultist Priest / Malignant Growth 当轮即可进入先攻抽取；已在场的召唤物跳过且不占先攻卡                                                  |

RNG：位置的随机下标使用 `state.seed` + `battle.rngCursor`，按战斗游标顺序消费；同种子同命令同结果，严格存档回放不变。

## 验证

```bash
pnpm exec vitest run packages/engine/src/boss/darkest-shuffling-horror-combat-runtime.test.ts \
  packages/engine/src/boss/darkest-mid-boss-runtime.test.ts \
  packages/engine/src/boss/shuffling-horror-i-natural-save.test.ts
pnpm typecheck
```

- `darkest-shuffling-horror-combat-runtime.test.ts`：空槽召唤 2 只 → 先攻牌堆 +2、游标 +2、事件含「先攻 +2」、同状态重放一致；已在场跳过 → 只 +1。
- `shuffling-horror-i-natural-save.test.ts`：自然探索/击败/回村与严格存档回放仍通过（15.5s）。
- 全量见提交说明。

## 边界（诚实）

- **自动选招 / 完整 AI 仍 hold**（Q-158）：何时使用 Echoing（「If not all Stance Slots for Monsters are filled」）与召唤物的选招仍由玩家/测试显式驱动；本切片不引入自动决策。
- 召唤物的先攻以 side 牌表示（本战斗的先攻牌堆模型），不细化到具体怪物实体；同一轮内谁先行动仍按既有姿态排序规则。
- 不改变 Undulations、Lacerate Acc 或其它技能。
