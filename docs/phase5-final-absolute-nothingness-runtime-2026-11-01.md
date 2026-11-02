# Ancestor 2 · Absolute Nothingness 占位最小运行时

依据 `boss_ability:p035`（Boss Abilities 第 35 页）：「The Absolute Nothingness are untargetable but they still occupy one space in their Areas.」与 `absolute_nothingness_support.json`（Q-AN-001：无印刷战斗卡，3 枚棋子）。

## 数值来源（Kyries 批准）

| 字段  | 值     | 来源                                                      |
| ----- | ------ | --------------------------------------------------------- |
| Life  | 999    | DD wiki（非印刷 Monster 卡；Kyries 明示采用 wiki）        |
| Dodge | 999    | 同上                                                      |
| 类型  | Cosmic | 写入合成目录 `type_position_tags`（引擎无独立 type 字段） |

## 运行时行为

| 项           | 实现                                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 合成 id      | `support:absolute_nothingness`（`ABSOLUTE_NOTHINGNESS_MONSTER_CARD_ID`）                                                                                     |
| 部署         | Ancestor 2 `deployFinalBattleForm` 后自动调用；亦可用 `applyAncestor2DeployAbsoluteNothingness`                                                              |
| 落位         | 固定 `monster_defense` / `monster_ranged` / `monster_support` → 占位 `final-monster-*` 各 1；**按 areaId 是否已有怪物**判断空位（非 Gestating Heart 随机池） |
| untargetable | 实体 `untargetable: true`；`playHeroSkill` / `playHeroSkillTargets` 拒绝                                                                                     |
| 行动         | 无 AI / 技能；先攻轮到该实体时 `completeTurnStart` 自动 `finishTurn`                                                                                         |
| 占位         | `stanceSlots: 1`；`startBattle` 姿态轨校验跳过 untargetable 棋子（仍占 areaId）                                                                              |

## 明确 hold / 未接

- `combatReady: true`、印刷 Monster 卡入库、`status: linked`
- Absolute Nothingness 攻击、Swift Teleportation 改动（本刀未改）、Pit Toss、Room Tile 正式几何、Phase 6

## 验证

- `ancestor2-absolute-nothingness.test.ts`：部署数量、占位、HP/Dodge、Cosmic 标签、不可选中、非 Ancestor2 拒绝、部分部署
- `pnpm typecheck` / `pnpm --filter @ddbg/engine test`
