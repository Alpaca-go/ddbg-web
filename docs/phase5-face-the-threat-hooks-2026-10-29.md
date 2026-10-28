# Phase 5：Face the Threat 通用钩子（2026-10-29）

> **范围**：Kyries 批准切片——`faceTheThreatEmbark` / `bossSlotPlacement` 从各 Boss 脚本 stub 抽到引擎通用钩子；**不**收 R-121 洗牌写入、R-122 Boss XP、Rising Threat、Phase 6、单 Boss 战斗全实现。  
> **规则来源**：spec §14.1 / §5.1、R-11、R-30、R-35、R-121、R-046；quest 映射见 [phase5-boss-quest-script-map-2026-10-28.md](./phase5-boss-quest-script-map-2026-10-28.md)。

## 1. 模块与入口

| 符号                                         | 路径                                                | 作用                                                  |
| -------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| `defaultFaceTheThreatEmbarkHook`             | `packages/engine/src/boss/face-the-threat-hooks.ts` | 已注册脚本默认钩子：解析 quest + 威胁 → `combatEntry` |
| `defaultBossSlotPlacementHook`               | 同上                                                | R-121 节点校验 + 布置算法语义                         |
| `runFaceTheThreatEmbarkForQuest`             | 同上                                                | 读 `activeBossThreatScriptId` / CL，调用对应脚本钩子  |
| `runBossSlotPlacementForScript`              | 同上                                                | 按 `scriptId` 探针 Boss 位钩子                        |
| `resolveBossScriptIdForFaceTheThreatContext` | 同上                                                | 薄封装 `resolveBossScriptIdForQuest`                  |

各 Ruins / Weald / Warrens / Cove I 脚本 `hooks` 改为引用上述默认实现；**per-boss override** 仍可在单脚本上替换同名钩子（fixture 测试脚本保留独立 stub）。

## 2. Face the Threat 状态语义（本刀 **不** applyCommand）

### 2.1 输入

- `FaceTheThreatQuestContext` / `BossFaceTheThreatContext`：`questId`、`campaignLevel?`、`activeBossThreatScriptId?`、`scriptId`（钩子调用时）。

### 2.2 解析链（已有 + 本刀固化）

1. `resolveBossScriptIdForQuest(quest:p019, { activeBossThreatScriptId, campaignLevel })`
   - **优先** `dungeon.activeBossThreatScriptId`（spec §2.2 / R11）。
   - 否则 `faceTheThreatBossScriptByCampaignLevel`（仅 CL **I** → Necromancer I 沙盒；II/III **待确认** stub）。
2. 钩子 `ctx.scriptId` 必须与解析结果一致，否则 stub（防止错脚本探针）。

### 2.3 输出 `ok` 时携带

- `resolvedScriptId`、`combatEntry`（`readBossCombatEntry`）、`rulesRef`。
- `wiringHold` = `FACE_EMBARK_WIRING_HOLD`：地牢出征 / 边缘房选图 / quest-wire **未接**；Boss XP 仍 **R-122** hold。

### 2.4 仍 hold（不发明）

- 边缘房板块选择、room token 洗混、Rest 12 点进地牢命令。
- 非 p019 各区域 Face the Threat 任务卡与 Weald/Warrens/Cove 迫近池（见 [phase5-collector-hold-inventory-2026-10-29.md](./phase5-collector-hold-inventory-2026-10-29.md) §8）。

## 3. Boss 位 `bossSlotPlacement`

### 3.1 硬接（R-121）

- 合法 `layoutId`：`quest_map:p011` → `A,B,G`；`quest_map:p012` → `A,C,D`。
- 与 `dungeon_layouts.json` `slotKind: boss` 一致（数据层 `dungeon-layout.test.ts`）。

### 3.2 输出 `ok` 时

- `placementAlgorithm: "objectivePlusTwoRandomNonObjective"`（spec §5.1 / R36 语义）。
- `wiringHold` = `BOSS_SLOT_WIRING_HOLD`：**不** RNG 洗牌、**不**写 dungeon room 状态。

### 3.3 stub 条件

- 非 R-121 布局、`bossSlotNodeIds` 数量 ≠ 3、节点集合与 canonical 不一致。

## 4. 与威胁战役的边界

- `establishImminentThreat` / `drawImminentThreatAfterActAdvance`：仍负责写 `activeBossThreatScriptId`（#334）。
- `clearedBossThreatScriptIdAfterVictory`：击败 Boss 清威胁；`bossThreatClearHoldReason()` 文案更新为「embark 已解析 combatEntry，出征命令仍 hold」。
- `setActiveBossThreat`：测试 stub 不变。

## 5. 测试

```bash
pnpm exec vitest run \
  packages/engine/src/boss/face-the-threat-hooks.test.ts \
  packages/engine/src/boss/threat-establishment.test.ts \
  packages/engine/src/boss/necromancer-i.test.ts \
  packages/engine/src/boss/prophet-i.test.ts \
  packages/engine/src/boss/collector-i.test.ts \
  packages/engine/src/boss/fanatic-i.test.ts \
  packages/engine/src/boss/hag-i.test.ts \
  packages/engine/src/boss/swine-prince-i.test.ts \
  packages/engine/src/boss/siren-i.test.ts \
  packages/engine/src/boss/flesh-i.test.ts \
  packages/engine/src/boss/boss-framework.test.ts
```

## 6. 下一刀（未做）

- quest-wire：`applyCommand` 出征 + 边缘房 + R-121 洗牌写入。
- `faceTheThreatBossScriptByCampaignLevel` II/III 与升幕描述卡等级对齐。
- Collector hold 文档 §8 其余战斗 / 地牢威胁主路径。
