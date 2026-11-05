# Collector II/III 生产入口（2026-11-05）

**基线**：`4f2f6c99`（Prophet II/III 合入后）
**授权**：Kyries 2026-11-05 指示一次性补齐 Prophet / Collector / Fanatic 的 II/III 生产入口，并拆 PR。
**范围**：遗迹 Boss Collector II/III 的生产部署、目标房绑定与胜负交接。不改存档 schema、任务白名单、`usable` 或 `combatReady`。

## 接入

| 层                   | 改动                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| 引擎命令             | `deployCollectorII` / `deployCollectorIII`，复用 level-aware `deployRuinsBoss`                   |
| 房间                 | R-168 `room:p012` / `room_tile:p007:back`；Boss 进攻/C，英雄按 R-168 H/B                         |
| 等级                 | 严格 `campaignLevel === level`、`explorationSetup.dungeonLevel === level`                        |
| 威胁                 | 只匹配 `boss:ruins:collector:2/3` + `boss_ability:p014/p015`                                     |
| 召唤物               | 按 `RUINS_COMBAT_LEVELS.collector[level-1].collected` 校验同级 Man-at-Arms / Highwayman / Vestal |
| 胜负                 | `finishDungeonBattle` 增加 II/III 分支；胜利清目标房、清威胁、追加击败身份；全灭沿用 R-044       |
| 网页 / helper / 存档 | 同步增加 Collector II/III 入口与命令                                                             |

依据：核心 R16–17、R30、R38–R39、R-044；R-168 房间几何；R-175 的 I 级专用部署模式；`boss_ability:p014/p015` 已核实卡文。

## 验证

```bash
pnpm exec vitest run \
  packages/engine/src/boss/collector-higher-deploy.test.ts \
  packages/engine/src/boss/collector-higher-finish.test.ts \
  packages/engine/src/boss/collector-i-deploy.test.ts \
  packages/engine/src/boss/objective-room-entry.test.ts
pnpm typecheck
```

- 新增 10 测：II/III 部署（`monster_medium:p093/p094`、Life 88/111、区域 C）、先攻、错等级/错威胁/篡改计划拒绝、胜利清房（含清空 F 区宝箱占位后交接）与击败记录、失败停点。
- 既有 Collector I 部署与四 Boss 房间入口回归通过。

## 边界（诚实）

- **严格存档未覆盖**：`QuestStart` 只从 I 级入口回放，II/III 状态不能单独 `createQuestSave`；本切片用公开命令回放与夹具验证。
- **未接**：Fanatic 的 II/III（下一个 PR）；Collector II/III 的完整 Collect All 回合验收与自然战役全链仍另切片。
