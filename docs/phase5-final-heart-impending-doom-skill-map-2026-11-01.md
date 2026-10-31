# 最终战 Heart of Darkness · Impending Doom d10→技能映射

基线 main `177b17f4`（#456 HoD Acc、#451 落骰已合）。Kyries 已批映射表与 **R-139**。

## 规则来源

- `boss_ability:p037`：Impending Doom 落位骰 +「下次轮到 Heart 时使用 corresponding Skill」。
- `monster_large:p020` 页脚 **Stance/Skill Eligibility**（R-015 读法）：d10 区间 → 技能编号。
- 官方规则书约 p41：提前掷的选招骰（非攻击骰）；**勿**与 Ancestor2 · Swift Teleportation（1–3/4–6/7–9）或三招卡面射程 **0–10** 混淆。

## 映射（R-139）

| d10 | 技能 | Slot |
| --- | --- | --- |
| 1–4 | Know This | 1 |
| 5–7 | Puncture | 2 |
| 8–10 | Dissolution | 3 |

## 本刀接通

| 行为 | 实现 |
| --- | --- |
| 映射纯函数 | `impendingDoomSkillSlotFromDie` / `impendingDoomSkillLabelFromDie`（`heart-of-darkness-impending-doom.ts`） |
| Heart 怪物回合选招 | `applyHeartOfDarknessImpendingDoomSkill`：读 `battle.impendingDoomDie`，无骰/非法面值拒绝，按表调用 #456 的 `applyHeartOfDarknessKnowThis` / `Puncture` / `Dissolution` |
| encounter AI | `prepareMonsterAction` → `heartOfDarknessImpendingDoomShouldReplaceSkill` → `applyHeartOfDarknessImpendingDoomFromEncounter`（`heart-of-darkness-combat-runtime.ts`） |
| 落骰 | #451 不变：`startBattle`、`finishTurn`、`applyHeartOfDarknessImpendingDoomRoll` |

效果线仍 hold（无 `verified_monster_effects` 则 Acc-only）。`combatReady` 仍 false。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/engine/src/boss/heart-of-darkness-impending-doom.test.ts \
  packages/engine/src/boss/heart-of-darkness-skills-acc.test.ts \
  packages/engine/src/boss/heart-of-darkness-combat-runtime.test.ts
```
