# Phase 6：Stygian 模式骨架（2026-11-08）

状态：**模式骨架已接**；17 张 Stygian 房间卡效果**未接**（R-036 / Q-10 的后续数据工作）。

p02 Torture Chamber 和 p10 Pool of Rebirth 已按 R-227 保存为逐卡核准效果。其余房间的旧审核表仅供查找历史问题。正式对局仍使用标准房间，待房间卡覆盖机制接通。

## 已接

1. **模式枚举**：`DungeonState["mode"]` 现在为 `"standard" | "radiant" | "stygian"`；`createCoreDungeonQuest` / `createDungeonSandbox` / 存档 schema（`packages/data/src/quest-save.ts`）都接受 Stygian。
2. **起始金币**：`startingGoldForMode` Stygian = **0**（Standard 10 / Radiant 20，规格书 §16.1）。
3. **Boss +1 Crit**（R-036 / R37）：新增 `boss/stygian-boss-crit.ts`，列出全部正式 Boss 卡（Ruins 四 Boss I–III、Templar Impaler/Warlord、Mammoth Cyst、White Cell Stalk、Shuffling Horror、Ancestor 1/2、Gestating Heart、Heart of Darkness）；不含 Reflections / Pyre / Collected / 召唤物。
   - `battle-monster.ts`、`battle-monster-targets.ts`、`prophet-i-combat-runtime.ts`、`swine-prince-i-combat-runtime.ts` 的怪物战斗上下文都带 `stygianBossCrit`；
   - `resolveSkill` 的暴击阈值在 Stygian Boss 上 +1。
4. **入口与补给**：Ruins Boss 部署守卫、`dungeon-starting-provisions` 都接受 Stygian；Stagian 补给/探索骰按标准模式（每英雄 2 颗，侦察后 1 颗）。
5. **UI**：开局建队新增 Stygian 按钮；选中后显示警告：房间卡效果未接，当前仍按标准房间结算。

## 未接（下一步）

- **17 张 Stygian 房间卡的效果**：`packages/data/normalized/corebox/stygian_rooms.json` 目前只有 `printedLines`，没有结构化效果；现有房间效果按 Room Tile 几何标志实现，需要先加“按房间卡覆盖房间效果”的机制，再逐张实现。逐卡审核表见 [phase6-stygian-rooms-review-2026-11-08.md](phase6-stygian-rooms-review-2026-11-08.md)（待 Kyries 确认图标与数值）。
  - Ritual Chamber（Cornered）、Torture Chamber（Unholy Aura）、Healing Fountain（治疗 + 压力）、Spiked Pit（Circle of Power / Spiked Pit）、Beacon of Light（Stressful Darkness / Beacon）、Treasure Chamber、Tomb of Ancestor（Ancestor's Glory）、Invocation Chamber（The Invokers / Invoking Abyss）、Old Abbey（Feeling the Presence）、Pool of Rebirth、Hall of Ascension、Eldritch Vault、Toxic Chamber、Eldritch Power Chamber、Teleporters、Evil Eye、Temple of the Chosen。
- **房间替换**：按 R-036 用 17 张 Stygian 卡替换同名的 Ruins 1–9 / 最暗地牢 1–8；Boss 房不替换。替换前 UI 警告保持，不宣称 Stygian 完整。
- 部分数值/图标需要 Kyries 确认后再实现（R-048）。

## 测试

- `boss/stygian-boss-crit.test.ts`：Boss 卡集合（含排除项）、+1 Crit 把同一骰面从命中推成暴击。
- `dungeon-quest-entry.test.ts`：Stygian 起始 0 金。
- `necromancer-i-deploy` / `prophet-i-deploy`：不再拒绝 Stygian。
- `dungeon` / `dungeon-starting-provisions` / `dungeon-provision-integration` / `quest-save` 全过。

## 边界

- 当前 Stygian 只保证模式/金币/Boss Crit/存档；房间仍用标准卡，UI 明确警告。
- 不改 `usable` / `combatReady`、不改 Boss 房间、不实现 Stygian 房间效果。
- 不猜未确认的房间数值/图标。
