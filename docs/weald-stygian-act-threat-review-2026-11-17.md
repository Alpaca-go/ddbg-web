# Weald Stygian 升幕抽迫近威胁（`drawImminentThreatAfterActAdvance`）核查（2026-11-17）

状态：**核查与规则书只读复核完成；`drawImminentThreatAfterActAdvance` 在 Stygian 生产路径下与 standard／radiant 同源（`establish-imminent-threat.ts` L282–325）。本 PR 不增引擎行为。**

## 计划措辞纠偏

- 原清单「Stygian 升幕引擎仍拒（W3）」**不准确**：唯一与 W3 相关的拒绝条件是 **`locationBossThreats && !wealdHigherBosses`**（L298–302），与 **`mode` 无关**。
- #771 出征准备已派发 **`wealdHigherBosses: true`** 的生产版 `establishImminentThreat`；升幕抽牌在 `#771` 后**不存在** Stygian 专属拦截。
- 仍缺的「拒」仅指：**旧存档／缺版本标记**（同上条件），以及 **`advanceRuinsAct` 整幕链路**仍只接遗迹 p019（工程范围，见下）。

## 规则书只读复核（用户转述证据，独立对照代码）

| 出处                        | 结论                                                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------------------- |
| 核心规则书 **p.35**         | 升级战役后，从**剩余** Boss 的**新等级**描述卡洗抽下一张迫近威胁（II／III 同理）。                       |
| Weald **W3**                | 在已选地点下按**战役等级**组威胁描述池（与 `wealdThreatPool` 一致）。                                    |
| 核心 **p.36–37**、**R-036** | Stygian **不**改变威胁池组成，**不**改变升幕洗抽程序。                                                   |
| **R-258／R-259／R-270**     | 本项目内的**工程版本／验收边界**（如两段威胁试验、p019 生产版本），**不是**规则书禁止 Stygian 升幕抽牌。 |

**无需新裁定号。**

## 代码门禁（`establish-imminent-threat.ts` L282–325）

| 条件                                        | Stygian 专属？ | 性质             |
| ------------------------------------------- | -------------- | ---------------- |
| 战斗进行中／缺 dungeon                      | 否             | R-048            |
| 仍有 `activeBossThreatScriptId`             | 否             | §2.2 流程        |
| `campaignLevel < 2`                         | 否             | R35              |
| `locationBossThreats && !wealdHigherBosses` | **否**         | **版本守卫**     |
| 已击败数 = `level - 1`（Ruins + Weald）     | 否             | §2.2             |
| `wealdThreatPool` 包校验                    | 否             | core＋weald 隔离 |

**无 `mode === "stygian"`。**

## 工程上仍未验收（非本函数拒绝）

- **`advanceRuinsAct`**（第八刀，#773+）：Weald 生产路径已接 `defeatedWealdBossIdentities`／`switchWealdActPools`；仍只认 `quest:p019`。页面升幕按钮仍走同命令。**自然跨幕日志**未建立 → **不能**宣称步骤 8 或完整战役实机。
- 单独命令 `drawImminentThreatAfterActAdvance` 可在**受控夹具**中验证 Stygian 生产态；**不等于**自然养成跨幕。

## 回归（本批）

- `weald-stygian-act-threat-draw.test.ts`：II／III 级抽牌、与 standard 同 RNG、版本停点、核心-only、试验命令隔离。
- **不**将夹具等同于自然日志；无自然跨幕固定 seed 日志则保持「未验收」。

## p008 Stygian 房（同批次文档）

见 [weald-stygian-room-review-2026-11-17.md](weald-stygian-room-review-2026-11-17.md)：**普通一项 2t、Stygian 两项 2t** 已目视结清；不改普通房、不改已合运行时。
