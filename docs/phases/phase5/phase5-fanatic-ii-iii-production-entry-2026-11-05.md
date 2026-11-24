# Fanatic II/III 生产入口（2026-11-05）

**基线**：`093444de`（Collector II/III 合入后）
**授权**：Kyries 2026-11-05 指示一次性补齐 Prophet / Collector / Fanatic 的 II/III 生产入口，并拆 PR。
**范围**：遗迹 Boss Fanatic II/III 的生产部署、目标房绑定与胜负交接。不改存档 schema、任务白名单、`usable` 或 `combatReady`。

## 接入

| 层                   | 改动                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| 引擎命令             | `deployFanaticII` / `deployFanaticIII`，复用 level-aware Fanatic 部署                               |
| 房间                 | R-169 `room:p013` / `room_tile:p007:front`；Boss 进攻/B（Large 两格），英雄按 R-169 H/A/C           |
| 等级                 | 严格 `campaignLevel === level`、`explorationSetup.dungeonLevel === level`                           |
| 威胁                 | 只匹配 `boss:ruins:fanatic:2/3` + `boss_ability:p020/p021`                                          |
| Pyre                 | 按 `RUINS_COMBAT_LEVELS.fanatic[level-1].pyre` 写入同级 Pyre（p012/p013）；`startBattle` 仍落远程/E |
| 胜负                 | `finishDungeonBattle` 增加 II/III 分支；胜利清目标房、清威胁、追加击败身份；全灭沿用 R-044          |
| 网页 / helper / 存档 | 同步增加 Fanatic II/III 入口与命令                                                                  |

依据：核心 R16–17、R30、R38–R39、R-044；R-169 房间几何；R-178 的 I 级专用部署模式；R-136（Pyre I–III）；`boss_ability:p020/p021` 已核实卡文。

## 验证

```bash
pnpm exec vitest run \
  packages/engine/src/boss/fanatic-higher-deploy.test.ts \
  packages/engine/src/boss/fanatic-higher-finish.test.ts \
  packages/engine/src/boss/fanatic-i-deploy.test.ts \
  packages/engine/src/boss/fanatic-i-finish.test.ts \
  packages/engine/src/boss/objective-room-entry.test.ts
pnpm typecheck
```

- 新增 10 测：II/III 部署（`monster_large:p009/p010`、Life 55/72、区域 B、Large 两格）、`startBattle` 写入同级 Pyre、错等级/错威胁/篡改计划拒绝、胜利清房与击败记录、失败停点。
- 既有 Fanatic I 部署/胜负与四 Boss 房间入口回归通过。

## 边界（诚实）

- **严格存档未覆盖**：`QuestStart` 只从 I 级入口回放，II/III 状态不能单独 `createQuestSave`；本切片用公开命令回放与夹具验证。
- **未接**：II/III 的完整 Boss AI/回合验收、II→III 自然战役全链回放、III→最暗地牢。
