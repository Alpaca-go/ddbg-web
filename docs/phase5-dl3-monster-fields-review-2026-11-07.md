# DL3 普通怪字段核对稿（Q-159）

状态：待 Kyries 确认。三张卡在 `monster_pool.json` 的 `missingBattleFields` 均为 `["speed","stanceGroups"]`；确认前相关遭遇不进入生产随机池、不补默认值。

来源：本地私有印刷缓存 COREBOX 怪物**中卡** FRONT p056–61（Brigand Raider / Brigand Hunter）与**大卡** FRONT p4（Adder）。只读缓存，不入库。

## 待确认字段

| 卡             | pool id               | 战斗卡                | 印刷页                                  | 排 / 占格 | Speed（靴印数） | 进攻 | 防御 | 远程 | 支援 |
| -------------- | --------------------- | --------------------- | --------------------------------------- | --------- | --------------- | ---- | ---- | ---- | ---- |
| Brigand Raider | `monster_medium:p056` | `monster_medium:p056` | medium FRONT p056–58（同卡 I–III 级面） | front / 1 | ?               | ?    | ?    | ?    | ?    |
| Brigand Hunter | `monster_medium:p059` | `monster_medium:p059` | medium FRONT p059–61（同卡 I–III 级面） | back / 1  | ?               | ?    | ?    | ?    | ?    |
| Adder          | `monster_medium:p062` | `monster_large:p004`  | large FRONT p4；pool 参考卡 medium p62  | front / 2 | ?               | ?    | ?    | ?    | ?    |

> Adder 的战斗卡是**大型卡**（`monster_large:p004`，2 格）；字段以 large FRONT p4 为准，pool 的 `p062` 只是参考卡。

## 逐卡确认方式

1. **Speed**：数卡面头部的移动靴印数量；不要把黄色 Dodge 数字当 Speed（R-142 有先例更正）。
2. **四姿态选招**：按卡面 footer 的 d10 分段，分别填「进攻 / 防御 / 远程 / 支援」的 slot 编号或 `不可选`；四姿态共用一张表时写「四姿态共用」并给出分段。
3. **不补默认值**：未确认的槽保持缺失；确认后按 R-143 / R-082 等既有模式写入 `packages/data/src/normalize/verified-monster-speeds.ts` 与 `verified-monster-stances.ts`，再重生成 `monster_pool.json`（`missingBattleFields` 应清空）。
4. 卡面若同时有「不可选」姿态与 d10 表，按现有 `stanceGroups` 结构（`unavailable: true` / `rollTable`）记录。

## 现状与影响

- `monster_pool.json`：三张卡均 `location: "common"`、`level: 3`；Adder 的 `combatCardId` 指向 `monster_large:p004`、`stanceSlots: 2`。
- 仅缺字段不阻塞数据校验；生产随机遭遇因 `missingBattleFields` 非空而保持不可用。
- 本稿只列待确认项，不含任何猜测数值。
