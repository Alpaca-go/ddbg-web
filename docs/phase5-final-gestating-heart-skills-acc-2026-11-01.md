# 最终战 Gestating Heart · Acc 攻击技能（调查结论：无）

基线：`monster_large:p019` 规范化 JSON、raw OCR、`docs/spec/core-rules-spec-v0.2.md` §14.7 R41、`boss_ability:p036`。

## 结论

**Gestating Heart 卡面没有 Acc/Crit/伤害/射程/英雄目标优先级的攻击技能**（与 `monster_large:p018` / `p020` 三招 Acc 线不同）。  
卡上仅有 **slot 1 · Dispersion**：效果为 `{target_effects}{summon}`（随机召唤最暗地牢怪物），已由 `applyGestatingHeartSummon`（#445 文档）接通，**不走** `playMonsterSkill` 攻击骰路径。

R41 / `boss_ability:p036` 也只描述 **Ichor** 与 **Summon**，未列出对英雄的 Acc 攻击。

## 卡面字段（`monster_large:p019`）

| Slot | 名称 | Acc | Crit | 伤害 | 目标 | 射程 |
|------|------|-----|------|------|------|------|
| 1 | Dispersion | — | — | — | `null` | — |
| 2 | — | — | — | — | — | — |
| 3 | — | — | — | — | — | — |

- `skills` 数组长度 **1**；`printed_labels` / 攻击 `lines` 无 Crit/Acc/range/damage 图标行。
- 卡级：`life` 100，`header_unlabeled_numbers` Dodge **3**；`verification.unverified: true`，`reasons: ["icon:8707d5d8cf"]`（规范化层仍标 `pending_8707d5d8cf` / `needs_review`，词典 v1.8 已 `confirmed` · `key=summon`）。

## 对比（同 PDF 大型 Boss 邻页）

| 卡 | 攻击技能数 | 示例 |
|----|------------|------|
| `monster_large:p018` | 3 | Refashion Them / Unmake Them All / Embrace Futility（均有 Acc 12 等） |
| `monster_large:p019` | 0（Acc 线） | 仅 Dispersion（召唤） |
| `monster_large:p020` | 3 | Know This / Puncture / Dissolution |

## `playMonsterSkill` 与 icon 8707d5d8cf

1. **当前**：`resolveMonsterSkill` 在 `monster.verification.unverified` 时拒绝（「未验证的怪物卡不结算」），p019 因此不能经通用怪物攻击结算。
2. **仅重跑 `buildNormalizedCorebox` / `writeNormalizedCorebox`**：会把 `8707d5d8cf` 解析为词典 `summon`/`confirmed`，**可清除**卡级 `unverified`（同 icon 亦影响 `monster_large` 中另一张仍 pending 的卡）。
3. **即使 verified**：Dispersion 的 `stats_line` 仍无 `damage` 图标，`resolveMonsterSkill` 仍会拒绝（「当前怪物攻击需要已命名的 damage…」）。Acc 切片 **不应** 仿 `ancestor2-skills-acc.ts` 新增模块；召唤继续用 `gestating-heart-summon.ts`。

## 验证

- `packages/engine/src/boss/gestating-heart-skills-acc.test.ts`（卡面 catalog + 拒绝门回归）
- 既有：`gestating-heart-summon.test.ts`、`gestating-heart-ichor.test.ts`

```bash
pnpm exec vitest run packages/engine/src/boss/gestating-heart-skills-acc.test.ts
```
