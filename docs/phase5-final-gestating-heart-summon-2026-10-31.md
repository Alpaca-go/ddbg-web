# Gestating Heart · Summon 随机召唤（最小）

基线 main `d030b315`（#445 Ichor 已合）。

## 本刀接通

- 依据 `boss_ability:p036` 第二句：「Summon … : {summon} a random Darkest Dungeon Monster.」
- 最终战形态 `gestatingHeart` 且 `finalFormSequence.status === "fighting"` 时，于 Gestating Heart（`monster_large:p019`）**怪物回合**显式命令 `applyGestatingHeartSummon`。
- **随机源**：`packages/data/normalized/corebox/darkest_monster_pool.json` 九种身份（M63–88 普通最暗怪物，与地牢 `darkest.monsterDeck` / 普通房 26 堆同源牌池）；最终战无独立 26 堆，用规范化牌池身份列表 + 战斗 `battle.rngCursor`（按 `combatCardId` 字典序固定候选，可复现）。
- Life / Dodge 从 `battle.monsters` / `battleCatalog` 读取；姿态占位沿用 `deployFinalBattleForm` 的 `final-monster-*`（Ancestor Room 几何 hold 时同占位模型，R-048）。
- 下一可用怪物姿态位召唤；轨满则拒绝。卡面「random」允许**同 cardId 多实例**在场（引擎无唯一约束）。
- 成功后 `finishTurn`。**先攻洗入 hold**（与 Mammoth / Shuffling 召唤切片一致）。
- 未改 `darkest_boss_content.json` / 形态 `combatReady`（仍为 false）。**#445 Ichor 未改逻辑**，仅补 Summon。

## 仍 hold

- Heart of Darkness Impending Doom / Absolute Nothingness、Ancestor 2 传送、Pit Toss、Room Tile 正式几何、Gestating Heart 完整 AI、召唤先攻洗入、Phase 6。

## 验证

- `packages/engine/src/boss/gestating-heart-summon.test.ts`
- `packages/engine/src/boss/gestating-heart-ichor.test.ts`（回归 Ichor）

```bash
pnpm typecheck
pnpm exec vitest run packages/engine/src/boss/gestating-heart-summon.test.ts packages/engine/src/boss/gestating-heart-ichor.test.ts
```
