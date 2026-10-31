# 最终战 Heart of Darkness · Impending Doom 骰子落位

相对 #450（Imperfect Reproduction）与 [final-battle initiative 切片](phase5-final-battle-initiative-2026-10-31.md)：只接通 **boss_ability:p037** 首句与第二句中的 **d10 落位**，不执行 Know This / Puncture / Dissolution，不改 `combatReady`。

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

- **d10 → 技能映射**：Know This / Puncture / Dissolution 卡面均为 range **0–10**，能力卡未印明确分段表；**不得自造 1–3 映射**。
- 按落位骰 **自动或手动执行** 上述技能、Absolute Nothingness、Swift Teleportation、Pit Toss、Room Tile 几何、Phase 6、完整 Heart AI。
- `combatReady: true` 前的完整 Boss 运行时。

## 待确认

- **Q**：Impending Doom 的 d10 面值与三技能 range 0–10 的对应关系（官方规则书 / 卡面核对后写入 `docs/rulings.md`）。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run packages/engine/src/boss/heart-of-darkness-impending-doom.test.ts packages/engine/src/boss/final-battle-initiative.test.ts
```
