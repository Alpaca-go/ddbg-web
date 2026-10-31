# A-7 指定怪物任务数据计划

#420 已按 Kyries“合入，然后继续”合入 main `5f6d529f`。本刀继续已有核心任务卡文字的数据接线。

公开 `readQuestMonsterPlan`：Break Them II（QUEST FRONT p9）指定 III 级 Bone Bearer；They Are Back III（p13）指定 Bone Captain，Life +20 / Dodge +2。来源为 #408 已入库的十九张任务卡文字目录；规格书 §5.1（官方 R15）给出任务特殊规则入口，R-048 要求不猜未确认字段。

接口校验任务名称、等级和完整 SPECIAL 文字，源文字同步漂移也拒绝，查询返回独立计划。Bone Captain 卡面没有明示怪物等级，保留 null，不将任务等级当作印刷怪物等级。计划不推断指定怪物是额外生成还是替换、不决定牌堆去向和部署顺序，全部 `combatReady: false`。这只是 A-7 数据切片，尚未接入实际目标房战斗；不表示任务 SPECIAL 已完成或新增裁定。

验证：两个数据测试文件四项通过，覆盖现有规范化转录再生、任务生成计划及源文字漂移拒绝；typecheck、修改文件 ESLint/Prettier、build 和 diff 检查通过。不修改网页或存档，不新增阶段末尾 Playwright。全库既有 lint 与回归欠账继续保留；#420 远端质量检查停在 lint，不声称全库全绿。
