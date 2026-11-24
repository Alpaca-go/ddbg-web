# Ancestor 1 自动选招（boss_ability:p034）

**日期**：2026-11-04
**基线**：`fa3295f5`（#602 后）
**PR**：[#603](https://github.com/Alpaca-go/ddbg-web/pull/603)
**范围**：最终战 Ancestor 1 怪物回合自动行动；不动其他形态、不动 `usable`。

## 依据

`boss_ability:p034`（印刷原文，已入库）：

> Time Heals All: If all Monster Stances are occupied, during his turn, the Ancestor will use the Time Heals All Skill. Otherwise, he will take actions until all Monster Stances are full.

配合 **R-187** 的 `monster_medium:p105` 姿态骰表（1–3 → slot 1 Perfect Replication；4–10 → slot 2 Imperfect Reproduction）。

## 实现

- 新增 `boss/ancestor1-skill-ai.ts`，在 `prepareMonsterAction` 的替换 hook 链上接管 ancestor1 怪物回合：
  - **4 个怪物姿态格全满**（按存活怪物含 Reflections、两格大怪占相邻两格计算）→ `Time Heals All`（slot 3，`Most Wounded` 友方治疗 10），**不掷选招骰**；
  - **未满** → 按 R-187 骰表掷 d10 → slot 1/2 → 调用既有的 Perfect Replication / Imperfect Reproduction（各自完成召唤、Torch −1 / 压力 +2、先攻洗入与 `finishTurn`）。
- RNG：只有真正需要掷选招骰时才推进 `rngCursor`（与 Ancestor 2 的 AI 一致）；全满分支不耗骰。
- 未新增命令、未改存档 schema；显式命令仍保留（可手动重放/测试）。

## 行为边界

- 每回合一次行动；「take actions until all Monster Stances are full」由 4 张先攻卡带来的多次行动完成（每次召唤填一格）。
- Reflections 的 Guard / 死亡时 Ancestor 受 10 伤等其余 p034 规则沿用既有运行时（`ancestor1-reflections-*`）。

## 验证

```bash
pnpm exec vitest run packages/engine/src/boss/ancestor1-skill-ai.test.ts
pnpm exec vitest run packages/engine/src/boss
pnpm typecheck
```

- 新增 4 测：Perfect 分支（骰 1）/ Imperfect 分支（骰 7）/ 全满走 Time Heals All（治疗 10）/ 非 ancestor1 形态不接管。
- `boss` 目录 94 文件 / 737 测通过。
