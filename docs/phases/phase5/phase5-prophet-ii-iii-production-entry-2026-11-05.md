# Prophet II/III 生产入口（2026-11-05）

**基线**：`70ce039c`（#612 后）
**授权**：Kyries 2026-11-05 指示一次性补齐 Prophet / Collector / Fanatic 的 II/III 生产入口，并拆 PR。
**范围**：遗迹 Boss Prophet II/III 的生产部署、目标房绑定与胜负交接。不改存档 schema、任务白名单、`usable` 或 `combatReady`。

## 接入

| 层       | 改动                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------ |
| 引擎命令 | `deployProphetII` / `deployProphetIII`；`deployRuinsBoss` 统一处理 Prophet/Collector 的 I–III 级 |
| 房间     | R-167 已获批 `room:p011` / `room_tile:p006:front`；Boss 进攻/E，英雄按 R-167 C/D/H               |
| 等级     | 严格 `campaignLevel === level`、`explorationSetup.dungeonLevel === level`                        |
| 威胁     | 只匹配 `boss:ruins:prophet:2/3` + `boss_ability:p008/p009`                                       |
| 胜负     | `finishDungeonBattle` 增加 II/III 分支；胜利清目标房、清威胁、追加击败身份；全灭沿用 R-044       |
| 网页     | `RuinsBossRoomActions` 增加 Prophet II/III                                                       |
| helper   | `naturalQuest` 识别 Prophet II/III 脚本                                                          |
| 存档命令 | `savedCommandSchema` 收录两个新命令                                                              |

依据：核心 R16–17、R30、R38、R-044；R-167 房间几何；R-173 的 I 级专用部署模式；`boss_ability:p008/p009` 已核实卡文。

## 验证

```bash
pnpm exec vitest run \
  packages/engine/src/boss/prophet-higher-deploy.test.ts \
  packages/engine/src/boss/prophet-higher-finish.test.ts \
  packages/engine/src/boss/prophet-i-deploy.test.ts \
  packages/engine/src/boss/prophet-i-finish.test.ts \
  packages/engine/src/boss/objective-room-entry.test.ts
pnpm typecheck
```

- 新增 10 测：II/III 部署（`monster_large:p006/p007`、Life 106/151、区域 E）、`startBattle` 先攻、错等级/错威胁/篡改计划拒绝、胜利清房与击败记录、失败停点。
- 既有 Prophet I 部署/胜负与四 Boss 房间入口回归通过。

## 边界（诚实）

- **严格存档未覆盖**：`QuestStart` 只从 I 级入口回放，II/III 状态不能单独 `createQuestSave`；本切片用公开命令回放与夹具验证。
- **未接**：Collector / Fanatic 的 II/III（另两个 PR）；II→III 自然战役全链回放。
