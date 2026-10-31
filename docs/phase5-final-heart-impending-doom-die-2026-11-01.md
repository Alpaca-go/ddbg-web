# 最终战 Heart of Darkness · Impending Doom 骰子落位

相对 #450（Imperfect Reproduction）与 [final-battle initiative 切片](phase5-final-battle-initiative-2026-10-31.md)：接通 **boss_ability:p037** 的 **d10 落位**；**d10→技能映射**见 [Impending Doom 技能映射](phase5-final-heart-impending-doom-skill-map-2026-11-01.md) 与 **R-139**。不改 `combatReady`。

## 规则来源

- 官方 Boss Abilities · **Impending Doom**（`boss_ability:p037`）：「At the start of Battle and each time Heart of Darkness finishes an action, roll a {d10} and place it next to its card. Next time its turn comes, it'll use the corresponding Skill.»
- 规格书 §14 / 最终战 Heart 描述（待 Kyries 检查点 ① 同步）。
- R-001 / R-048。

## 已接

| 行为 | 实现 |
| --- | --- |
| 开战落骰 | `startBattle` 链 `applyHeartOfDarknessImpendingDoomOnBattleStart`：仅 `finalFormSequence.current.id === "heartOfDarkness"` 且 `status === "fighting"`；消费 `battle.rngCursor` 一次后进入第 1 轮先攻洗牌。 |
| 行动结束落骰 | `finishTurn` 对 `monster_large:p020` 实体调用 `bumpHeartOfDarknessImpendingDoomAfterAction`；覆盖 `battle.impendingDoomDie`（1–10）。 |
| 显式命令 | `applyHeartOfDarknessImpendingDoomRoll`：Heart 怪物回合、仅落骰，不代替 `finishTurn`（供测试与尚未走 `finishTurn` 的 Boss 行动路径）。 |
| 状态字段 | `BattleState.impendingDoomDie?: number`（1–10）。 |

**「一次行动」与引擎**：当前 Heart 技能执行 hold，最接近的通用钩子是怪物行动管线结束时的 `finishTurn(actorId)`（与 Gestating Heart · Summon、Ancestor 1 · Time Heals All 相同）。显式命令与 `finishTurn` 共用同一 RNG 落骰函数；同一行动不应两者各调用一次。

## hold / 未接

- 三招 **效果线**（压力/光照等）至 `verified_monster_effects` 入库前不结算。
- ~~**d10 → 技能映射**~~ → 已接（R-139、[技能映射文档](phase5-final-heart-impending-doom-skill-map-2026-11-01.md)）。
- Absolute Nothingness、Swift Teleportation、Pit Toss、Room Tile 几何、Phase 6、完整 Heart AI（`combatReady: true` 前）。

## 待确认

- ~~**Q**：Impending Doom 的 d10 面值与三技能 range 0–10 的对应关系~~ → **R-139** 已裁定。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run packages/engine/src/boss/heart-of-darkness-impending-doom.test.ts packages/engine/src/boss/final-battle-initiative.test.ts
```
