# C-008 · II/III 普通遭遇入场盘点与回归

**日期**：2026-11-01  
**基线**：`4462f801`（#480 Echoing Disassembly 已合）  
**切片**：A-09 / C-008 · 非 Boss Common+Ruins 牌堆；R-001 / R-048 / R-082 / R-083

## 结论（本刀）

- **DL2**：牌堆内 5 张 II 级战斗身份 **全部** 已在 R-083 批准 `hasApprovedHigherMonsterFields`；`startDungeonBattle` 闸门与 #201 以来一致，**无需**向 verified-speeds/stances 塞未核实数据。
- **DL3**：牌堆新增 4 张 III 级身份 **均无** B-7 Speed/选招；`monster_pool.json` 标 `missingBattleFields: ["speed","stanceGroups"]`，入场在 **完整战斗字段** 探针即拒（早于「高等级批准」分支），保留真实部署文案。
- **可放宽集合（DL2）**：`RUINS_DL2_APPROVED_HIGHER_COMBAT_IDS`（5 个 combatCardId，见下表）。
- **仍 hold（DL3 池）**：Bone Bearer / Brigand Raider / Brigand Hunter / Adder — 类别 **B-7 未批 Speed+选招**；部分技能另有 **effect_lines** hold，须 A-01 单卡单招，本刀不发明效果。
- **引擎改动**：仅注释 + 共享拒战文案分类；**未**改 `combatReady`、任务卡 SPECIAL、最暗路径。

## 盘点 · DL2 池（`verification.unverified !== true` 且 `hasApprovedHigherMonsterFields`）

| combatCardId          | 名称          | 池 level | 批准依据                                |
| --------------------- | ------------- | -------- | --------------------------------------- |
| `monster_medium:p013` | Bone Spearman | 2        | R-082                                   |
| `monster_medium:p050` | Gargoyle      | 2        | R-083 + Protection                      |
| `monster_medium:p053` | Rattler       | 2        | R-083；自身状态技能已接（C-010 seed35） |
| `monster_large:p001`  | Bone Captain  | 2        | R-083                                   |
| `monster_large:p003`  | Ghoul         | 2        | R-083；感染线 C-010 seed100             |

牌堆内 **无**「catalog 已 verified 但未进 `hasApprovedHigherMonsterFields`」的 II 级身份。

## 盘点 · DL3 池（仍拒 · 代表例）

| combatCardId          | 名称           | 拒战主因（实测/字段）                                        |
| --------------------- | -------------- | ------------------------------------------------------------ |
| `monster_medium:p016` | Bone Bearer    | 缺 Speed/stanceGroups → `…完整战斗字段待核实；保留真实部署…` |
| `monster_medium:p056` | Brigand Raider | 同上                                                         |
| `monster_medium:p059` | Brigand Hunter | 同上                                                         |
| `monster_large:p004`  | Adder          | 同上                                                         |

若将来 B-7 批核上述卡，仍须逐 skill 通过 `readMonsterAttackView` / `resolveMonsterSkillEffects`（`effect_lines` skip 仍拒），与 I 级 B02 / `isSkillAdmissionRefusal` 政策一致。

## 两类缺口（与 HANDOFF C-008 对齐）

| 类型                        | 现状                                        | 本刀                                                              |
| --------------------------- | ------------------------------------------- | ----------------------------------------------------------------- |
| 池子抽到 **未批** 高等级    | DL3 四身份：字段闸门                        | 回归锁定文案；不硬开                                              |
| **已批** 仍因技能 effect 拒 | DL2 混合部署可能出现（如 L1 怪未接 effect） | II 扫描允许 `skillRefused`，**禁止**「等级 / 高等级限定批准不符」 |

## 代码触点

- 闸门：`packages/engine/src/dungeon-battle.ts`（`hasApprovedHigherMonsterFields` + 技能探针）
- 盘点：`packages/data/src/normalize/ruins-pool-admission.ts`
- 拒战分类：`packages/engine/src/dungeon-battle-admission.ts`
- 回归：`dungeon-battle-l1-admission.test.ts`（不回退）、`dungeon-battle-l2-admission.test.ts`

## 验证

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/engine/src/dungeon-battle-l1-admission.test.ts \
  packages/engine/src/dungeon-battle-l2-admission.test.ts \
  packages/data/src/normalize/ruins-pool-admission.test.ts
```

可选：`pnpm exec vitest run packages/engine/src/dungeon-ii-monster.test.ts packages/engine/src/ii-natural-replay.test.ts`（DL2 自然回放夹具，与本刀直接相关）。

## 建议下一刀

- **B-7**：逐张批 DL3 池 Speed/选招后再开 C-008 续篇；或
- **A-01**：DL2 已批卡剩余 effect_lines（如 Ghoul 非感染技能）；或
- **A-7 收尾** / 停（无 III 池批核前不宜再放宽闸门）。
