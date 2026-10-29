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

## 2. Face the Threat 状态语义（出征 **已** 接 applyCommand 最小路径）

### 2.1 输入

- `FaceTheThreatQuestContext` / `BossFaceTheThreatContext`：`questId`、`campaignLevel?`、`activeBossThreatScriptId?`、`scriptId`（钩子调用时）。

### 2.2 解析链（已有 + 本刀固化）

1. `resolveBossScriptIdForQuest(quest:p019, { activeBossThreatScriptId, campaignLevel })`
   - **优先** `dungeon.activeBossThreatScriptId`（spec §2.2 / R11）。
   - 否则 `faceTheThreatBossScriptByCampaignLevel`（仅 CL **I** → Necromancer I 沙盒；II/III **待确认** stub）。
2. 钩子 `ctx.scriptId` 必须与解析结果一致，否则 stub（防止错脚本探针）。

### 2.3 输出 `ok` 时携带

- `resolvedScriptId`、`combatEntry`（`readBossCombatEntry`）、`rulesRef`。
- `wiringHold` = `FACE_EMBARK_WIRING_HOLD`：边缘房 / R-121 洗牌 **未接**；Boss XP 仍 **R-122** hold。
- **`chooseNextQuest` 成功** 后 additionally 写入 `dungeon.faceTheThreatEmbarkPlan`（见 [phase5-face-the-threat-embark-runtime-2026-10-29.md](./phase5-face-the-threat-embark-runtime-2026-10-29.md)）。

### 2.4 仍 hold（不发明）

- 边缘房板块选择、room token 洗混（R-121 算法写入）、Rest 12 点以外的 Boss 布置命令。
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
- `clearedBossThreatScriptIdAfterVictory`：击败 Boss 清威胁；`bossThreatClearHoldReason()` 指向升幕抽牌与 Face the Threat 出征（见 `face-the-threat-embark-runtime`）；R-121 仍 hold。
- `setActiveBossThreat`：沙盒已接（写 `activeBossThreatScriptId`）；仍不替代 `establishImminentThreat` / 升幕抽牌。

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

- R-121 / 边缘房：`bossSlotPlacement` RNG 写入 dungeon。
- `faceTheThreatBossScriptByCampaignLevel` II/III 与升幕描述卡等级对齐。
- Collector hold 文档 §8 其余战斗 / 地牢威胁主路径。
- 幕末 `offerNextQuest` 强制 p019（不抽卡）。
