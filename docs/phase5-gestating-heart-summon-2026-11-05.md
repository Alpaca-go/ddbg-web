# Gestating Heart 自动召唤（boss_ability:p036 / Dispersion）

**日期**：2026-11-05
**基线**：`c06bdd29`（#603 后）
**PR**：[#604](https://github.com/Alpaca-go/ddbg-web/pull/604)
**范围**：最终战 Gestating Heart 怪物回合自动行动；不动其他形态、不动 `usable`。

## 依据

- `monster_large:p019` slot 1 **Dispersion** 的效果线：`Target Effects marker + Summon`（卡面图标均已 confirmed）。
- `boss_ability:p036` 第二句：`Summon: Summon a random Darkest Dungeon Monster.`
- **R-187**：Gestating Heart 四姿态固定 **slot 1（Dispersion）**，随机召唤走专用运行时。

## 实现

- 在 `gestating-heart-summon.ts` 增加自动入口，接进 `prepareMonsterAction` 的替换 hook：
  - 有可用怪物姿态位 → 走既有 `applyGestatingHeartSummon`（随机 `darkest_monster_pool` + `rngCursor`、洗入先攻、`finishTurn`）；
  - 无位或召唤被拒 → **本回合结束**并记录原因，不发明替代效果（R-048）。
- 未新增命令、未改存档 schema；显式 `applyGestatingHeartSummon` 保留。

## 待确认（Q-xxx）

- 姿态轨已满时，印刷卡面没有写「Dispersion 应做什么」。本刀按「无目标 → 本回合无效果并结束」处理；若你要求改成别的（例如固定伤害、跳过整个回合），一句话我再改。

## 验证

```bash
pnpm exec vitest run packages/engine/src/boss/gestating-heart-skill-ai.test.ts
pnpm typecheck
```

- 新增 3 测：有空位召唤（rngCursor +1、洗入先攻、回合结束）/ 满轨不召唤但仍结束回合 / 非 gestatingHeart 形态不接管。
- 相关回归：`gestating-heart-*`、`ancestor1-*`、`final-form-sequence`、`heart-of-darkness-combat-runtime` 共 9 文件 55 测通过。
