# 最终战 Ancestor 2 · 回合 AI 最小接线

基线：`baa9f6dd`（#460）。依赖 #452 Swift Teleportation、#455 三招 Acc 显式命令。

## 本刀

| 行为 | 实现 |
| --- | --- |
| 怪物回合选招 | `prepareMonsterAction` 在 `ancestor2` + `monster_large:p018` 时调用 `applyAncestor2SkillFromStanceSelection` |
| 选招数据 | `verified-large-monster-fields` 入库 p018：`speed: 3`，四姿态共用 d10 表 1–2→slot1 / 3–6→slot2 / 7–10→slot3（卡面 footer 与 Fanatic III 同型） |
| 执行 | 映射后走 `applyAncestor2RefashionThem` / `UnmakeThemAll` / `EmbraceFutility`（Acc-only，效果线仍 hold） |
| 行动结束 | 仍经 `recordMonsterSkill` → `finishTurn` → `bumpAncestor2SwiftTeleportationAfterAction` |

## 仍 hold

- 三招效果线、`combatReady: true`、HoD Impending Doom AI、Pyre、Room Tile 几何、Phase 6。

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/engine/src/boss/ancestor2-skill-ai.test.ts \
  packages/engine/src/boss/ancestor2-skills-acc.test.ts \
  packages/engine/src/boss/ancestor2-swift-teleportation.test.ts
pnpm exec vitest run packages/data/src/normalize/verified-large-monster-fields.test.ts
```
