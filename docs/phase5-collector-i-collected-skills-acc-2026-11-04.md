# Collector I · Collected 三召唤物技能战斗闭环

**日期**：2026-11-04  
**基线**：main @ [#580](https://github.com/Alpaca-go/ddbg-web/pull/580)（Show Collection / Life Steal 验收）  
**裁定**：[R-176](rulings.md#r-176)、Collect All 与 G/E/A 落区见 [HANDOFF-2026-11-04-collector-i.md](HANDOFF-2026-11-04-collector-i.md)

## 范围

- 仅 **Collector I** 三只 **Collected**（`monster_medium:p098` / `p095` / `p101`），技能 **Head Knocker / Headhunt / Headache**。
- 走 **`deployCollectorI` → `startBattle` → Collect All → 各 Collected 的 `prepareMonsterAction` / `moveMonsterToRange` / `playMonsterSkill`**；Vestal 友方走既有 `playCollectedVestalSkill`（无攻击骰）。
- 卡面与 `verified_monster_effects` 来自 **正式 `battle.monsters` 目录**（非 `skills:[]` 夹具）。
- **G/E/A** 挤占落区：Collect All 在英雄占满对应区域时仍召唤并挤占；闭环测试在真实房间几何上断言落点与后续选招。

## 卡面（I 级 / 已核实）

| 卡              | 技能         | Speed | 目标                 | 射程 | Acc/Crit | verified 效果    |
| --------------- | ------------ | ----- | -------------------- | ---- | -------- | ---------------- |
| p098 MAA        | Head Knocker | 1     | Closest              | 1    | 9 / 0    | Stun 1t          |
| p095 Highwayman | Headhunt     | 1     | Furthest             | 2    | 9 / 1    | 流血 1·2t        |
| p101 Vestal     | Headache     | 2     | Most Wounded（友方） | 2    | 无 Acc   | Buff 2t + 治疗 7 |

缺 `verified_monster_effects` 或 attack 视图未就绪时 **`playMonsterSkill` 整次拒绝**（R-048）。

## 测试

`packages/engine/src/boss/collector-i-collected-skills-acc.test.ts`：正式目录卡面 + Collect All 与 G/E/A 挤占 + 三技能命中/友方结算 + 三枚 Collected 先攻侧依次推进 + 效果漂移拒绝。

```bash
pnpm typecheck
pnpm exec vitest run packages/engine/src/boss/collector-i-collected-skills-acc.test.ts
pnpm lint
```

## 仍 hold

与 [HANDOFF-2026-11-04-collector-i.md](HANDOFF-2026-11-04-collector-i.md) 一致：`combatReady`、任务白名单、Collector II/III、Fanatic 等未改。Show Collection / Life Steal 见 [phase5-collector-i-skills-acc-2026-11-04.md](phase5-collector-i-skills-acc-2026-11-04.md)。
