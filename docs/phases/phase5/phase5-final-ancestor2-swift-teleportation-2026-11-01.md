# 最终战 Ancestor 2 · Swift Teleportation

相对 #451（Heart · Impending Doom `finishTurn` 钩子）与 [final-battle-deploy](phase5-final-battle-deploy-2026-10-31.md) 占位姿态区：只接通 **boss_ability:p035** 首段 **Swift Teleportation**，不做 Absolute Nothingness、完整 Acc 结算、Pit Toss、Room Tile 几何、Phase 6，不改 `combatReady`。

## 规则来源

- 官方 Boss Abilities · **Swift Teleportation**（`boss_ability:p035`）：「After the Ancestor finishes an action, roll a {d10} to see where he teleports to: 1-3 {defensive} Area, 4-6 {ranged} Area, 7-9 {support} Area, 10 no teleportation.」
- 图标字典 v1.8 confirmed：`ba58ec175e` / `f53b3fb732` / `3af899ff70` → 三姿态 inline；`d91e56a591` → d10。
- R-001 / R-048：落点只认 `FINAL_BATTLE_MONSTER_STANCE_AREAS`（与 `deployFinalBattleForm` 一致）。

## 已接

| 行为        | 实现                                                                                                                                                                                                                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 行动结束    | `finishTurn` 对 `monster_large:p018` 调用 `bumpAncestor2SwiftTeleportationAfterAction`：消费 `battle.rngCursor` 掷 d10，按表更新 `stance` + `areaId`。                                                                                                                                                                               |
| 显式命令    | `applyAncestor2SwiftTeleportation`：Ancestor 2 怪物回合、落骰并尝试传送，不代替 `finishTurn`（单测与尚未走 `finishTurn` 的 Boss 行动路径）。                                                                                                                                                                                         |
| 骰面映射    | `swiftTeleportStanceFromDie`：1–3 defensive、4–6 ranged、7–9 support、10 → 不传送。                                                                                                                                                                                                                                                  |
| 占位 / 容量 | 与 Gestating Heart · Summon / Ancestor 1 · Replication 相同：按怪物 **姿态轨连续空位**（`stanceSlots` 宽度）判断；**排除传送者自身**占格后再检。目标姿态无连续空位时 **仍消费 RNG、不移动**（大型 `monster_large:p018` 单独在场时 7–9 support 轨不可放 2 格，属占位几何结果，非自造 Aggressive 段）。不实现区域挤占或 displacement。 |

**「一次行动」与引擎**：当前 Ancestor 2 技能执行 hold，钩子挂在怪物行动管线结束时的 `finishTurn(actorId)`（与 #451 Heart、Gestating Heart · Summon 相同）。显式命令与 `finishTurn` 共用同一落骰函数；同一行动不应两者各调用一次。

## hold / 未接

- Absolute Nothingness（目录无支援卡）、Ancestor 2 三招完整 Acc 结算、Impending Doom 技能执行、Pit Toss、Room Tile 正式几何、Phase 6、完整 Ancestor 2 AI。
- `combatReady: true` 前的完整 Boss 运行时。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run packages/engine/src/boss/ancestor2-swift-teleportation.test.ts
```
