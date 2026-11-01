# Phase 5 · A-07 The Threat is Real III · Lair 禁 Level 1 生成

基线：`main` tip `5de2d3ade9bb91653012a1ad3540b7424254ac7a`（#483 Creeping Darkness 已合）。

## 卡面 SPECIAL（quest:p015）

来源：`packages/data/normalized/corebox/quest_cards.json` → `quest:p015` → `specialRuleLines`：

> Do not spawn any Level 1 Monsters in Lairs

## 已接

| 条目 | 实现 |
| --- | --- |
| 任务门控 | 仅 `dungeon.questDistribution.questId === quest:p015` |
| 房间门控 | 仅 `room.kind === "lair"` |
| 等级判定 | 怪物池卡 `MonsterPoolCard.level`（`instanceId` 页码 → 池卡，R17） |
| 生成路径 | `prepareDungeonMonsters` → `spawnMonsters` 的 `skipSpawn`：跳过 Level 1 实例不落位，牌序仍前进（守恒进 `remaining`） |
| 接线 | `packages/engine/src/threat-is-real-no-l1-lair.ts`；`dungeon-monsters.ts` 传入 skip |

## 未接 / 范围外

- Rising Threat、quest:p014 Creeping Darkness、Purify、Dem Bones 拾取：本 PR 未改。
- `createCoreDungeonQuest` 白名单：未扩大。
- `combatReady`：仍为 false。
- 战斗内后续召唤 / 最暗 / 目标房计划部署：未走本 SPECIAL（仅标准池 `prepareDungeonMonsters` 路径）。
- Stygian / Phase 6 / B 几何：未碰。

## Q-xx

| 编号 | 说明 |
| --- | --- |
| Q-p015-lair-deck-exhaust | 若洗牌后连续 Level 1 实例在 Lair 中不足以填满四姿态，`prepareDungeonMonsters` 按既有惯例 **拒绝命令**，不重洗、不换房。 |

## 验证

```bash
pnpm exec vitest run packages/engine/src/threat-is-real-no-l1-lair.test.ts
```

覆盖：p015 lair 部署无 L1；p015 非 lair 仍可 L1；非 p015 lair 回归；`skipSpawn` 守恒。
