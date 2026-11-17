# Weald Stygian 升幕抽迫近威胁（`drawImminentThreatAfterActAdvance`）核查（2026-11-17）

状态：**核查完成；待 DDBG·规则书审阅 Weald 战役幕次与核心 §2.2 对齐结论前，不扩展 `advanceRuinsAct` 或新规则。**

## 问题来源

开发计划曾写「II／III 升幕 `drawImminentThreatAfterActAdvance` 引擎仍拒（W3）」——需区分是 **Stygian 模式拦截**、**版本标记停点**，还是 **未接通的正式幕次链路**。

## 代码结论（`packages/engine/src/boss/establish-imminent-threat.ts`）

| 门禁                                               | 是否 Stygian 专用 | 性质                                                                                                                                 |
| -------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `readActiveBossThreatScriptId` 仍激活              | 否                | 规则流程（spec §2.2：击败后升幕再抽）                                                                                                |
| `campaignLevel < 2`                                | 否                | 规则流程（R35）                                                                                                                      |
| `locationBossThreats && !wealdHigherBosses`        | 否                | **历史版本守卫**（W3 文案）；旧战役用了地点池但未显式 `wealdHigherBosses` 时拒绝；#771 生产版 `establishImminentThreat` 已写入该标记 |
| 击败数 `defeatedRuins + defeatedWeald === level-1` | 否                | 规则流程；Weald 击败记入 `defeatedWealdBossIdentities`（#768 生产结算）                                                              |
| `wealdThreatPool` 内容包校验                       | 否                | 包隔离（须显式 core＋weald）                                                                                                         |

**未发现** `mode === "stygian"` 分支。Stygian 在 **生产版** `wealdHigherBosses: true` 下，`drawImminentThreatAfterActAdvance` 与 standard／radiant 共用同一实现与同池。

## 与「整幕升幕」的区别（未在本核查接线的部分）

- `advanceRuinsAct` / `readRuinsActTransitionReadiness`（`act-transition-readiness.ts`）仍只承认 **遗迹 p019 Face the Threat**、`defeatedRuinsBossIdentities` 与 `RUINS_COMBAT_LEVELS`。
- 页面升幕按钮（`quest-summary-panel.tsx` → `advanceRuinsAct`）因此 **不** 覆盖 Weald 地点 Boss 战役的自然幕次闭环——这是 **范围／接线缺口**，不是 Stygian 单行判断。
- Weald 扩展是否在 Stygian 下沿用核心 §2.2 同一升幕序列（两普通任务 + Boss + 抽下一张威胁），**待规则书审阅**；本项目不先行补裁定。

## 已批准依据（引用，不新增裁定）

- **R-036**：Stygian Boss 与房间边界（#768）。
- **R-258／R-259**：Pounder 生产版本与两段威胁（试验入口边界，#771）。
- **R-270**：Boss I–III 核准数据。
- **W3**：地点威胁七位 Boss 池与 `wealdHigherBosses` 版本（`threat-pool.ts`、`higher-boss-sources.test.ts`）。

## 回归（本批）

- `weald-stygian-act-threat-draw.test.ts`：受控夹具验证生产版 Stygian 升幕抽牌、版本停点、核心-only 隔离；**不** 称自然跨幕或完整战役。

## 待规则书／Kyries（暂停实现）

1. Weald（含 Stygian）正式战役的幕次推进是否仍经 `advanceRuinsAct` 同等前置，或另有扩展程序。
2. 地点 Boss 击败后升幕抽牌与遗迹 Boss defeat 记账的合并策略（若与当前 `defeatedRuins`／`defeatedWeald` 分列不一致）。
