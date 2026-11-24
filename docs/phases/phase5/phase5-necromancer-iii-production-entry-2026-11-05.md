# Necromancer III 生产入口（2026-11-05）

**基线**：`4d57704`（Necromancer II 生产入口后）
**授权**：Kyries 2026-11-05 指示在 II 之后继续 Necromancer III。
**范围**：遗迹 Boss III 级的生产部署、目标房绑定与胜负交接。不改存档 schema、任务白名单、`usable` 或 `combatReady`。

## 接入

| 层          | 改动                                                                                          |
| ----------- | --------------------------------------------------------------------------------------------- |
| 引擎命令    | 新增 `deployNecromancerIII`，沿用 `deployNecromancerI/II` 的真实几何部署模式                  |
| 房间        | 使用 R-166 已获批 `room:p010` / `room_tile:p006:back`；Boss 进攻/A，四英雄/G                  |
| 等级        | 严格要求 `campaignLevel === 3`、`explorationSetup.dungeonLevel === 3`（部署与胜负交接均校验） |
| 威胁        | 只匹配 `boss:ruins:necromancer:3` + 描述卡 `boss_ability:p003`，错级/错卡原子拒绝             |
| 胜负        | `finishDungeonBattle` 走 III 级分支；胜利清目标房、清威胁、追加击败身份，英雄全灭沿用 R-044   |
| 网页        | `RuinsBossRoomActions` 增加 III 级入口，按 `campaignLevel` 匹配                               |
| 测试 helper | `naturalQuest` 在 p019 目标房识别 III 级脚本并派发 `deployNecromancerIII`                     |

依据：核心 R16–17、R30、R38、R-044；R-135（Reanimation）；R-166 房间几何；R-172 的 I 级专用部署模式；`boss_ability:p006` 已核实卡文。

## 验证

```bash
pnpm exec vitest run \
  packages/engine/src/boss/necromancer-iii-deploy.test.ts \
  packages/engine/src/boss/necromancer-iii-finish.test.ts \
  packages/engine/src/boss/objective-room-entry.test.ts \
  packages/engine/src/boss/necromancer-ii-deploy.test.ts \
  packages/engine/src/boss/necromancer-ii-finish.test.ts \
  packages/engine/src/boss/necromancer-i-deploy.test.ts \
  packages/engine/src/boss/necromancer-i-finish.test.ts
pnpm typecheck
```

- 新增 5 测：III 级部署实体 `monster_medium:p091` / Life 144 / 区域 A；`startBattle` 写入 `bossCombatThreatCeased` 并洗先攻；错等级/错威胁/篡改计划拒绝；胜利清房与击败记录；非胜利/错等级拒绝。
- 既有 I/II 级部署、胜负、房间入口回归通过。

## 边界（诚实）

- **III→最暗地牢未接**：III 级 Boss 胜利后如何进入最暗地牢（quest:p016–p018）不在本切片；`advanceRuinsAct` 只处理 I→II、II→III。
- **严格存档未覆盖**：`QuestStart` 只从 I 级入口回放，当前存档模型没有「战役等级 + 前序命令」起点；III 级状态不能单独 `createQuestSave`。本切片用公开命令回放与夹具验证，不声称 III 级自然存档通过。
- **未接**：Prophet / Collector / Fanatic 的 II/III 生产入口，III→最暗自然战役回放，`combatReady`、`usable`、任务白名单、R-121 边缘房与 Phase 6。
