# Ancestor 1st Form · Reflections 死亡反噬（Imperfect）

依据 `boss_ability:p034` 原文：「When a Imperfect Reflection dies, the Ancestor suffers 10 {wounds}.」规格书 §14.7 第 1 形态同条（R36、R-048）。

## 本刀接通

- 最终战 `ancestor1` 且 `finalFormSequence.status === "fighting"` 时，在 `removeCasualties` 链上登记 Imperfect Reflection（`monster_medium:p109`）新死亡：若仍有存活 Ancestor 1（`monster_medium:p105`），对其施加 **10** 点伤口（`wounds >= life` 走既有怪物死亡判定；反噬致死则同一 casualty 批继续处理）。
- 部署仍由既有 `deployFinalBattleForm` 登记 Actor + Reflections 支援；**未**改 `combatReady`。
- Reflections Guard 常驻见 [`phase5-final-ancestor1-reflections-guard-2026-10-31.md`](phase5-final-ancestor1-reflections-guard-2026-10-31.md)。

## 仍 hold

- Time Heals All（已另 PR 接通）、Ancestor 2 Swift Teleportation、Gestating Heart Ichor、Pit Toss、Room Tile 几何、Reflections 先攻不移除、Perfect Reflection 其它规则、完整 AI、Phase 6。

## 验证

- `ancestor1-reflections-death.test.ts`：Imperfect 死亡 +10；Perfect 不触发；Ancestor 已死不触发；非 `ancestor1` 形态不触发；`combatReady` 仍为 false。
- 修改文件 typecheck / ESLint / Prettier；引擎相关测试本机通过。
