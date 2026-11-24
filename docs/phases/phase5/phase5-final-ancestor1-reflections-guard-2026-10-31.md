# Ancestor 1st Form · Reflections Guard 常驻

依据 `boss_ability:p034` 原文首句：「The Reflections have {icon:1d1884bc2a} at all times.」图标词典 `1d1884bc2a` → `guard`（confirmed）。规格书 §14.7 第 1 形态同条（R36、R-048）。

## 本刀接通

- 最终战 `ancestor1` 且 `finalFormSequence.status === "fighting"` 时，场上每只存活 Perfect / Imperfect Reflection（`monster_medium:p106` / `p109`，含同 id 后续部署）实体字段 **`guard === true`**。
- **`deployFinalBattleForm`** 生成 Reflections 时写入 `guard: true`，并登记空 `statusStacks: []`（`createBattleState` 的 `statusProjection` 会暂时清掉 guard，部署返回前用 `withAncestor1ReflectionsGuardState` 恢复）。
- **Ancestor 1**（`monster_medium:p105`）**不**获得 Guard。
- **重断言**（最小钩子，文档化）：`removeCasualties` 末尾、`playHeroSkill` 状态施加后，经 `withAncestor1ReflectionsGuardEntities` 恢复 Reflections 的 `guard: true`（不发明卸 Guard 或层数转移）。
- **未**改各形态 `combatReady`；**未**破坏 #444 Imperfect 死亡 → Ancestor +10 伤口。

## 仍 hold

- Perfect / Imperfect Reproduction 完整执行、Reflections 先攻不移除、Absolute Nothingness、Swift Teleportation、Impending Doom、Pit Toss、Room Tile 正式几何、Phase 6。

## 验证

- `ancestor1-reflections-guard.test.ts`：部署 / startBattle 后 Guard；Ancestor 无 Guard；Imperfect 反噬回归；status 清 guard 后重断言。
- `ancestor1-reflections-death.test.ts`、`final-battle-deploy.test.ts` 回归。
- 修改文件 typecheck / ESLint / Prettier；上述引擎测试本机通过。
