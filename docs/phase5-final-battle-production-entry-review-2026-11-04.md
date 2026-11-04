# 最终战 `deployFinalBattleForm` 生产部署审核（R-186）

日期：2026-11-04。基线：main @ R-165 几何已合（#593 形）、`deployFinalBattleForm` 占位部署已合（#429）。**R-186 待 Kyries 确认**（本 PR）。

## 范围

- **本刀**：最终战补给与形态流程就绪后 · **`deployFinalBattleForm`** → 显式 **`startBattle`** → 形态间 **`finishDungeonBattle`** 续接；对标最暗中途 Boss **`deployMammothCystI`（R-184）** 生产几何，不用 `final-*-*` 占位 stance 区。
- **不做**：`combatReady: true`、`room_tile:p014:back` 的 `usable: true`、`ancestorGlory` 运行时、扩 `createCoreDungeonQuest` / `selectRoomTile`、自然战役严格存档、II/III、扩展包、Phase 6。

## 证据

| 项                          | 来源                                                  |
| --------------------------- | ----------------------------------------------------- |
| 十一区与部署落点            | R-165、`packages/data/src/normalize/ancestor-room.ts` |
| 生产 deploy                 | **R-186**、[rulings.md](rulings.md#r-186)             |
| 命令与存档                  | `deployFinalBattleForm`、`quest-save.ts`              |
| Summon / Nothingness 姿态区 | `FINAL_BATTLE_MONSTER_STANCE_AREAS`（E/B/A/J）        |

## 实现要点

1. **`readAncestorRoomProductionTile`**：`ancestorRoomSchema` 校验 JSON 中 `room_tile:p014:back`，要求 `geometryVerified` + `printReview: verified` + **`usable: false`**（与 R-184 相同：生产 deploy 不依赖 `usable: true`）。
2. **`deployFinalBattleForm`**：`roomTileBattleAreas` 十一区；英雄/怪物 `areaId` 来自 R-165 deployment；`monsterStanceAreas` 写入 BattleState；形态间续战保留英雄实体。
3. **依赖占位区的运行时**（Gestating Heart Summon、Absolute Nothingness、Ancestor 1 Replication 等）改读 **`FINAL_BATTLE_MONSTER_STANCE_AREAS`**（印刷 E/B/A/J），不再使用 `final-monster-*`。

## 测试

```bash
pnpm exec vitest run \
  packages/engine/src/boss/final-battle-deploy.test.ts \
  packages/engine/src/boss/gestating-heart-summon.test.ts \
  packages/engine/src/boss/ancestor2-absolute-nothingness.test.ts
```

## 已知限制

- 各形态 Boss 技能与特殊能力完整 AI 仍 hold；`combatReady: false` 时只保证 Life/Dodge 与几何部署。
- `ancestorGlory` 等特殊区仍因 `usable: false` 不在 BattleArea 上激活（与 R-165 边界一致）。
