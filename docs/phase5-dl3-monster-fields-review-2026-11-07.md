# DL3 普通怪字段核对稿（Q-159）

状态：**已确认（Kyries 2026-11-07）→ R-196**；三张卡的 Speed/选招已入库，`monster_pool.json` 的 `missingBattleFields` 已清空。

来源：本地私有印刷缓存 COREBOX 怪物**中卡** FRONT p056–61（Brigand Raider / Brigand Hunter）与**大卡** FRONT p4（Adder）。只读缓存，不入库。

## 确认结果（R-196）

| 卡             | pool id               | 战斗卡                | 印刷页                                  | 排 / 占格 | Speed | 进攻              | 防御                       | 远程                       | 支援    |
| -------------- | --------------------- | --------------------- | --------------------------------------- | --------- | ----- | ----------------- | -------------------------- | -------------------------- | ------- |
| Brigand Raider | `monster_medium:p056` | `monster_medium:p056` | medium FRONT p056–58（同卡 I–III 级面） | front / 1 | 2     | 1–7→技2；8–10→技1 | 1–7→技2；8–10→技1          | 1–5→技2；6–10→技1          | 固定技3 |
| Brigand Hunter | `monster_medium:p059` | `monster_medium:p059` | medium FRONT p059–61（同卡 I–III 级面） | back / 1  | 2     | 固定技2           | 固定技1                    | 固定技1                    | 固定技1 |
| Adder          | `monster_medium:p062` | `monster_large:p004`  | large FRONT p4；pool 参考卡 medium p62  | front / 2 | 1     | 1–5→技1；6–10→技2 | 1–3→技1；4–7→技2；8–10→技3 | 1–3→技1；4–7→技2；8–10→技3 | 固定技1 |

> Adder 的战斗卡是**大型卡**（`monster_large:p004`，2 格）；字段以 large FRONT p4 为准，pool 的 `p062` 只是参考卡。防御与远程共用同一张 d10 表（表中两列相同）。

## 入库位置

- Speed：`packages/data/src/normalize/verified-monster-speeds.ts`（p056、p059）；Adder 在 `verified-large-monster-fields.ts`。
- 选招：`verified-monster-stances.ts`（p056、p059）；Adder 在 `verified-large-monster-fields.ts`（大型卡同时带 speed + stanceGroups）。
- `monster_pool.json`：三行 `missingBattleFields` 已从 `["speed","stanceGroups"]` 清空。
- 回归测试：`monster-speed.test.ts`、`verified-monster-stances.test.ts`、`verified-large-monster-fields.test.ts`、`ruins-pool-admission.test.ts` 已按 R-196 更新并新增定向断言。

## 边界

- 只补这三张卡的字段；不改遭遇几何、生产准入白名单或其它卡，不解除 Boss/房间停点。
- **字段齐全不等于可进入半场战斗**：三张卡的技能效果尚未逐招接入，`startDungeonBattle` 仍按 R-048 拒战（`Brigand Raider 技能 1 的完整效果尚未接入…`）；`dungeon-battle-l2-admission.test.ts` 已记录该边界。技能的逐招效果核对另见 **Q-163**。
