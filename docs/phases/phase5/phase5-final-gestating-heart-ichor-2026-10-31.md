# Gestating Heart · Ichor 反击（最小）

依据 `boss_ability:p036` 原文：「Ichor: Each time a Hero deals damage to the Gestating Heart, they {heal} 2 and suffer 2 {blight} 3t.」图标字典 v1.8（R-001）：治疗 2、Blight 强度 2、持续 3 回合。Summon 见 `docs/phase5-final-gestating-heart-summon-2026-10-31.md`（#445 之后单独 PR）。

## 本刀接通

- 最终战形态 `gestatingHeart` 且 `finalFormSequence.status === "fighting"` 时，在英雄技能结算链（`playHeroSkill` / `playHeroSkillTargets` 与 Swine Prince Enraged Destruction 相同挂点）上检测对 **存活** Gestating Heart（`monster_large:p019`）的伤害。
- **事件粒度**：与引擎 `HeroSkillResolution` 一致——每个 `damageDealt > 0` 的目标 resolution 计一次「造成伤害」；多目标技能对每个命中心的 resolution 各触发一次 Ichor。
- 对该次 resolution 的 **攻击英雄**（`actorId`）：走既有 `resolveSeededHeroHealth` + `passiveHeal` 治疗 2（尊重 `healingForbidden` / Unholy Aura）；再经 `applyPassiveStatus` 施加 Blight 2、3t（含疾病追加伤口等既有规则）。
- 未改 `darkest_boss_content.json` 的 `combatReady`（仍为 false）；部署仍用 `deployFinalBattleForm`。

## 仍 hold

- Heart of Darkness Impending Doom / Absolute Nothingness / Time Heals All、Ancestor 2 传送、Pit Toss、Room Tile 几何、Gestating Heart 完整 AI、Phase 6。

## 验证

- `gestating-heart-ichor.test.ts`：造成伤害 → heal + blight；0 伤 / 未命中不触发；心已死 / 非 gestatingHeart 不触发；`combatReady` 仍为 false；多 resolution 计数与 `applyGestatingHeartIchor` 链接。
- 修改文件 typecheck / ESLint / Prettier；引擎相关测试本机通过。
