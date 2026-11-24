# Phase 5：定威胁 / 迫近威胁正式流程（2026-10-28）

> Kyries 批准本刀：规则书 **spec §2.4**（战役开局）、**§2.2 第 1 步**（升幕抽下一张威胁）；R-001 / R-048。  
> 在 #334 被动接线之上，用 RNG 洗抽 Boss Description 卡并写入战役状态。

## 命令（正式入口）

| 命令                                            | 规则         | 行为                                                                                                                                                                                     |
| ----------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{ type: "establishImminentThreat" }`           | spec §2.4    | 战役 I 级、尚未定威胁时：洗 4 张 Ruins **I 级** Boss 描述卡，随机抽 1 张 → `imminentThreatDescriptionCardId`；若对应 **已注册** 脚本 → `activeBossThreatScriptId` + #334 村庄 / 地牢被动 |
| `{ type: "drawImminentThreatAfterActAdvance" }` | spec §2.2 §1 | 无激活威胁、战役 ≥ II、已击败 Boss 数 = `campaignLevel - 1`：从**剩余** Ruins Boss 的**当前战役等级**描述卡中洗抽 1 张（同上写入）                                                       |

## 与 `setActiveBossThreat` 的关系

- **`setActiveBossThreat`**：测试 / 沙盒命令，经 `applyActiveBossThreatToDungeon` 挂接被动（与上表相同），**不**洗描述卡、**不**耗 RNG；事件文案含「stub」以区别于正式定威胁。
- **正式战役**应使用上表两命令。

## 状态字段

| 字段                              | 含义                                                               |
| --------------------------------- | ------------------------------------------------------------------ |
| `imminentThreatDescriptionCardId` | 最近一次抽到的 Boss Description 印刷 id                            |
| `activeBossThreatScriptId`        | 仅当抽到已注册脚本时设置                                           |
| `unregisteredImminentThreatHold`  | 抽到 Prophet / Collector / Fanatic 等未落地脚本时的 hold 文案      |
| `defeatedRuinsBossIdentities`     | Boss 战胜利清除威胁时写入（`finishDungeonBattle`），供升幕抽牌排除 |

描述卡 id 见 `boss/threat-description-catalog.ts`（extract `boss_ability:p001/p007/p013/p019` 等核实）。

## 已注册脚本映射

| 描述卡                               | 脚本                       |
| ------------------------------------ | -------------------------- |
| `boss_ability:p001`（Necromancer I） | `boss:ruins:necromancer:1` |

其它 Boss / 等级：**不编造脚本**；只记录描述卡 + `unregisteredImminentThreatHold`。

## 关联改动

- **quest:p019** `resolveBossScriptIdForQuest`：若存在 `activeBossThreatScriptId` 且已注册，**优先于**缺省 CL I → Necromancer I 沙盒映射（spec §2.2 / R11）。
- **击败 Boss**：仍由 #334 清除 `activeBossThreatScriptId`；本刀追加 `defeatedRuinsBossIdentities`。

## 仍 hold（本刀不做）

- §2.2 升幕其余步骤（加怪物 / 换任务堆 / 饰品）与 `advanceCampaignLevel` 沙盒命令合并
- `faceTheThreatEmbark`、R-121 Boss 位、R-122 Boss XP、Rising Threat SPECIAL

## 测试

```bash
pnpm exec vitest run \
  packages/engine/src/boss/threat-establishment.test.ts \
  packages/engine/src/boss/threat-campaign.test.ts \
  packages/engine/src/boss/quest-bridge.test.ts
```
