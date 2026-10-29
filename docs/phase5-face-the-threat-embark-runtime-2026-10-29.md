# Phase 5：Face the Threat 出征 applyCommand 最小运行时（2026-10-29）

> **基线**：#343 通用钩子；本刀把 `runFaceTheThreatEmbarkForQuest` 接到 `chooseNextQuest` / 沙盒 p019。  
> **规则**：spec §14.1、R-11、R-30、R-35、R-120；R-001 / R-048。

## 已接

| 入口 | 行为 |
|------|------|
| `chooseNextQuest`（`resolveChoice` · hamlet-next-quest） | quest **quest:p019** 时在 **RNG 洗牌前** 调钩子；stub → `commandRefused` 且 **cursor 不变**；ok → 写入 `dungeon.faceTheThreatEmbarkPlan` 并照常布置地牢（普通 R-116 选图 + 代币 shuffle，**非** R-121 边缘房） |
| `offerNextQuest` | 正式 **I 级**、本幕 **2 个普通任务已完成**、仍有 `activeBossThreatScriptId` 且 p019 钩子 ok → **不洗牌**，`nextQuestOffers = [quest:p019]`（spec §14.1 / R30） |
| `createCoreDungeonQuest` · p019 | 钩子 ok 时写入同名 plan（无 hamlet applyCommand） |
| `resolveFaceTheThreatEmbarkForChoose` | 集中校验：R-35 饰品等级、p019 跳过 schema `level:3` 占位（R-120） |

模块：`packages/engine/src/boss/face-the-threat-embark-runtime.ts`（含 `shouldForceFaceTheThreatOfferAtNextQuest` / `countCompletedRegularQuestsAtCampaignLevel`）。

## 仍 hold（任务卡 / 本刀不碰）

| 项 | 说明 |
|----|------|
| R-121 Boss 位洗牌写入 | `bossSlotPlacement` 仅校验；room token 目标+2 随机 **未** 写 dungeon |
| 边缘房选图 | quest_map:p011/p012 与 Boss 任务进幕 **未** 接 |
| R-122 Boss XP | `summarizeDungeonQuest` 发放 hold |
| Rising Threat SPECIAL | hold |
| 八槽 confirmed / p016–p018 区域 Boss | R-120 最暗任务 hold |
| `faceTheThreatBossScriptByCampaignLevel` II/III | 无映射时拒绝出征（不消耗 RNG） |
| II/III `offerNextQuest` 强制 p019 | 仍走普通抽卡；升幕 / 完整幕推进 hold |

## 待确认

- （已批）正式 I 级 `offerNextQuest` 强制 p019：触发 = CL **1** + `activeBossThreatScriptId` + 已完成普通任务 ≥ 2 + 钩子 ok。

## 测试

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/engine/src/boss/face-the-threat-embark-runtime.test.ts \
  packages/engine/src/boss/face-the-threat-hooks.test.ts \
  packages/engine/src/boss/threat-establishment.test.ts
```
