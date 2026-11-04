# 形态间带阵亡英雄续战（R-044 / R-035）

**日期**：2026-11-05
**基线**：`68072832`（#605 后）
**PR**：[#606](https://github.com/Alpaca-go/ddbg-web/pull/606)
**范围**：最终战形态间续战与开战门槛；不改其他战斗。

## 问题（实测）

把自然战斗策略接到最终战真打时发现：形态 1 有英雄阵亡后，`deployFinalBattleForm` 会以「须保留四名存活英雄」拒绝部署下一形态；即使放行，`startBattle` 也会以「普通遭遇战需要 4 名存活英雄（R16）」拒绝。

与 **R-044 / R-035** 冲突：最终战各形态之间**不补人**，阵亡英雄应保留为阵亡实体继续续战。

## 修复

- `deployFinalBattleForm`：
  - 首形态部署仍要求 4 名地牢英雄均存活（`d.heroes` 无 dead）；
  - 形态间续战只要求**四名英雄实体仍在场**，允许其中有人阵亡；阵亡实体与存活者的伤口/压力原样带入下一形态。
- `startBattle`：`finalFormSequence === "fighting"` 时只要求「至少 1 名英雄存活」，阵亡英雄不进先攻（先攻牌堆本来就过滤 dead）；普通遭遇仍要求 4 名存活英雄（R16 不变）。

## 验证

```bash
pnpm exec vitest run packages/engine/src/boss/final-battle-dead-heroes.test.ts
pnpm exec vitest run packages/engine/src/boss packages/engine/src/encounter.test.ts
```

- 新增 2 测：形态间一名英雄阵亡仍可部署并开战（阵亡者保留、存活者伤口保留）/ 首形态仍拒绝已阵亡的地牢英雄。
- `boss` + `encounter` 回归：98 文件 / 765 测通过。

## 未改 / 后续

- 未改普通遭遇的 4 人门槛。
- 下一步：三形态连续真实回放（自然战斗策略）+ 严格存档，验证从开局到战役胜利。
