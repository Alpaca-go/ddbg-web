# Fanatic I 正式部署入口审核（拟 R-178）

日期：2026-11-04。基线：main @ Fanatic I 战斗运行时与 R-169 几何已合入后。

## 范围

- **本刀**：I 级 Face the Threat、`room:p013` + `deployFanaticI` → 显式 `startBattle`（R39 开战 Pyre）→ `finishDungeonBattle` 最小胜负回村；对标 Collector I 的 R-175 专用部署模式。
- **不做**：Fanatic II/III、翻 `room:p013` / `room_tile` 的 `usable`、扩大 `createCoreDungeonQuest` 白名单、`combatReady`、Speed/选招目录（C-017 已另接）、页面大改。

## 证据

| 项 | 来源 |
| --- | --- |
| 房间几何九区、B 高地、部署落点 | R-169、`packages/data/src/normalize/fanatic-room.ts` |
| Fanatic 进攻 / Pyre 远程开局 | R39、规格书 §14.5、`fanatic-i.ts` · `summon(battleStartPyre)` |
| 先攻 4（Fanatic 3 + Pyre 1） | `fanatic-i-combat-runtime.ts` · `expandFanaticIInitiativeDeckSides` |
| 专用命令与存档 schema | `deployFanaticI`、`quest-save.ts` |
| 目标房绑定文案 | `objective-room-entry.ts` · `deployFanaticI` |
| 胜负交接 | `ruins-i-finish.ts` · `fanatic` 身份 |

## 实现要点

1. **`deployFanaticI`**（`fanatic-i-deploy.ts`）：准入与 `deployCollectorI` 同级（quest:p019、I 级、威胁/描述卡/出征计划/已绑定 `room:p013`、四姿态英雄、RNG 游标保留）；Fanatic 实体 `boss:fanatic:1` 落 `deployment.monsters.aggressive`（B）；`monsterStanceAreas` 写入获批怪物姿态区，供 `startBattle` 将 Pyre 落 **E**（非英雄远程 H）。
2. **`startBattle`**：沿用既有 `applyFanaticIPyreBattleStart`；生产路径优先 `battle.monsterStanceAreas.ranged`。
3. **`finishRuinsIBattle("fanatic")`**：击败记录 `defeatedRuinsBossIdentities: ["fanatic"]`；Pyre 仍须随 R39 在 Fanatic 死亡后移除（运行时已有）。

## 测试

- `fanatic-i-deploy.test.ts`：准入拒绝、九区/Fanatic B/无 Pyre 直至 startBattle/Pyre E/JSON 续接。
- `fanatic-i-finish.test.ts`：胜利清房与全灭 R-044 停点（显式夹具，不声称自然战役）。

## 待确认（拟 R-178）

Kyries 尚未在 `docs/rulings.md` 正文批准 **Fanatic I 专用部署与生产胜负交接** 裁定号。本 PR 代码与文档引用 **R-169、R39、对标 R-175**，并标 **拟 R-178**；合并前需拍板或改号。

## 已知限制

- 自然任务 / 正式页 Playwright / 自然存档 replay 未在本刀扩展（Collector 对标为后续刀）。
- Fanatic II/III 仍走 higher ruins 夹具，不经 `deployFanaticI`。
