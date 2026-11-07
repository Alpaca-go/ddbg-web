# 玩家策略 Act I 链（2026-11-07）

状态：**已批准（Kyries 2026-11-07）**，用于 §4.3 的「合法 Act I 链」。固定 seed 2（既有战役测试种子，未按结果挑种子）。目前链到 Act I Boss 的 offer 为止；Boss 战术与跨幕存档验收仍未完成。

## 策略定义

1. **开局**：`establishImminentThreat`（spec §2.4），威胁随任务持续推进（R-124 / R-126）。
2. **任务选择**：有 `quest:p019` 必打；否则按清剿优先级 `p001 → p002 → p003 → p004 → p005`。
3. **战斗**：保守打分——击杀优先、避免英雄掉血（`playNaturalBattle` 的 `survival` 选项，默认关闭）。
4. **休息**：每间房后「全队伤口 + 压力 > 6」就休息（`restThreshold` 选项，默认 12）。
5. **村庄**：先治疗建筑（`heal10` / `heal5` / `tavern6` / `tavern3`），再任取一个被引擎接受的公开行动。

## 结果

- `seed 2`：p001 胜利、p002 胜利 → 两个普通任务后 **`quest:p019` 正常进入 next-quest offer**（威胁 `boss:ruins:fanatic:1`），链停在开局补给完成（`phase: ready`）。
- 继续跑 p019 任务：能正常探索、战斗到合法终局（可能因驿站耗尽而战役失败）。**输赢是玩家决策，不作为测试目标**；测试只断言没有引擎拒绝/卡死、至少打完一场战斗。

## 实现

- `packages/engine/src/test-helpers/natural-battle.ts`：新增 `survival` 打分选项（默认关闭，自然策略不变）。
- `packages/engine/src/test-helpers/natural-quest.ts`：新增 `survival` 与 `restThreshold` 选项（默认关闭/12）；战役已失败时不再尝试准备替补。
- `packages/engine/src/player-strategy-act-i.test.ts`：固定上述策略与 seed 2，断言两个普通任务后 p019 进入 offer、威胁持续，并跑到 p019 任务的合法终局且无引擎冲突。

## 边界

- 不是自然策略，也不改自然测试的默认策略/种子（R-190）。
- 只验证到 Boss offer；不声称 Act II 存档验收完成。
- 探针期间还发现并修复了两个旁置目标房的牌堆守恒 bug（见交接 §4.3 与 `b1039c9a`）。
