# The Black Sheep 在村庄抽事件前把相位打成探索态（R32）

**日期**：2026-11-05
**基线**：`5ede50e0`（#608 后）
**PR**：[#609](https://github.com/Alpaca-go/ddbg-web/pull/609)
**范围**：Fanatic I 迫近威胁被动的村庄相位修复；不改事件内容与数值。

## 症状（自然链实测，种子 2）

`p001 → p002 → p019`（打赢 Fanatic I）→ 回村完成 → `drawHamletEvent` 抽到 **Supply Run** 时被拒绝：

> Supply Run须在完整回村与事件牌池下结算（R32/R-085）

此时 `hamletReturn.phase = "complete"`、无待选、无阵亡、事件牌池 16 张完整，前置条件看起来都满足。

## 根因

`applyBossThreatBlackSheepBeforeHamletEvent` 在抽村庄事件前按 **`"exploration"`** 压力源给压力；当英雄压力到 10 时，`resolveDungeonPressure` 对 `exploration` 的处理是：

```ts
d = { ...d, phase: "awaitingHazards", pending: null };
```

`awaitingHazards` 是地牢探索相位。随后 `drawHamletEvent` 继续抽牌，Supply Run / Labor Force / Traveling Merchants 这些 deferred 事件都要求 `d.phase === "inHamlet"`，于是拒绝。

## 修复

1. `applyBossThreatBlackSheepBeforeHamletEvent`：压力源改为 **`"hamletThreat"`**。`resolveDungeonPressure` 的该分支会把相位恢复为 `inHamlet`（阵亡则 `awaitingReplacement`），与 R32 一致。
2. `drawHamletEvent`：Black Sheep 结算后若仍有 `pendingChoice` / `pending` 或相位不是 `inHamlet`，**先返回压力结算结果**，不在错误相位抽牌；玩家结算后再抽。

## 测试

- 新增 `Fanatic I：Black Sheep 把压力顶到 10 后仍在 inHamlet 抽村庄事件（R32）`：种子 906、四名英雄压力 9，`drawHamletEvent` 无拒绝、相位保持 `inHamlet`、事件正常抽出（修复前该用例会因相位 `awaitingHazards` 被 deferred 事件拒绝）。
- 回归：`threat-passive-runtime` + `hamlet-event` + `hamlet-embark` 共 29 测通过。

## 边界

- 自然链的阵亡补人 / 回村流程仍未接（下一刀 A2a 继续）；本刀只修相位，不改成长链。
