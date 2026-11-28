# Cove I 级地点牌堆审阅（数据登记）

状态：**仅数据目录 + 内容包隔离；未开放 Cove 出征、洗牌、回村守恒或存档重建。**

## 证据来源

- 印刷：`MG_DD_05_EN_COVE`（禁止用合并册页码作权威）。
- 怪物：`packages/data/normalized/extension/cove/monster_medium.json`，六种 I 级普通怪 p001 / p004 / p007 / p010 / p013 / p016，共 17 张实体页（#827 基准）。
- 奇物：16 张当地 + 核心 8 张通用（`locationCurioPool`，已有 Cove schema）。
- 房间：九张普通 `room:cove:01`–`09`；Boss 房 `10`–`12` 留在 `bossRoomSources`，`poolEligible: false`。
- 规则：核心 R9–R10（通用 + 当地怪物／奇物混池）；扩展 C1 口径对齐 Weald W3 的数据层做法。

## 牌堆构成（I 级普通）

| 子池              | 张数 | 说明                                            |
| ----------------- | ---- | ----------------------------------------------- |
| 通用怪物实例      | 31   | 核心 `monster_pool` I 级 `location: common`     |
| Cove 当地怪物实例 | 17   | `monster-deck:cove:p001`–`p017`，无大型映射副本 |
| 奇物              | 24   | 8 通用 + 16 `curio:cove:p001`–`p016`            |
| 普通房间          | 9    | `room:cove:01`–`09`                             |

当地怪物 `combatReady: false`；全部怪物卡仍 **Q-186** 未核准，不写战斗默认值。

## 明确排除（不进入 I 级普通牌堆）

`excluded-monsters.ts` 登记的 19 张：II/III 普通、三位 Boss、Siren/Shambler/Drowned Crew 召唤物等。不得自发明牌堆比例或准入。

## 停点 / 待确认

- **Q-186**：怪物技能、抗性、房间与奇物运行时效果未核准；本刀只登记实体身份。
- **II / III / Stygian**：无印刷牌堆表证据前不推算构成（比照 Weald 高等级独立刀）。
- **出征接线**：`buildCoveLevelOneLocationDecks` 仅供包过滤与目录校验；战役创建、RNG 洗牌、回村与存档待在后续刀。

## 验证入口

- `packages/data/tests/cove/monsters/monster-pool.test.ts`
- `packages/data/tests/cove/location-decks.test.ts`
- `packages/engine/tests/shared/core/content-packs.test.ts`（地点牌堆隔离）
