# Kyries → Codex：视觉核对队列（verify-queue）2026-10-12

> 2026-10-13最新回传：Kyries/Grok已逐项批准VQ-06、VQ-13–18和QuestMap仅FRONT p1，见R-065及[本轮批准记录](phase3-approved-data-2026-10-13.md)。Treasure T4–T5必须blocked；Spiked接触候选分类正在明确。下表“草稿/待审核”为历史进度，不覆盖本段新批准。几何入库不等于usable，未知图标与所有Q项另行裁定。

UTC+8。本文件供 Kyries 粘贴给 Codex 作为 **next-dev 接手入口**。

## 范围（只做印刷目视，不编裁定）

**Grok Bot 可以对照印刷件目视核对的项**（几何、部署图标、QuestMap 布局读数、特殊槽外观、图标 / 数字清点）。  
**不做**：发明规则、给未确认图标命名、补缺失数字、裁定复合事件顺序。

| 明确 **不在** 本队列（仍是 rulings，见 `docs/rulings.md`） | 说明                                                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Q-52                                                       | 双方全灭胜负 / 战役结果                                                              |
| Q-59                                                       | 起点是否可侦察                                                                       |
| Q-61                                                       | Curio 抽空是否洗回                                                                   |
| Q-62                                                       | 同卡压力到 10 与其他效果复合顺序                                                     |
| Q-63                                                       | 长走廊灰点计费 / 分岔返回裁定（灰点**布局读数**见下方 VQ，裁定本身不在此）           |
| Q-64                                                       | Trap 混合伤口·压力复合顺序                                                           |
| Q-66 / Q-67 / Q-68                                         | 压力 / Curio / 疾病复合（Kyries 已保持待定）                                         |
| **R-048**                                                  | 未标注数字 / 未确认图标：不命名、不猜数值；`semantic=null` / `usable=false` 直至批准 |

参考核对材料（批准范围以各 VQ 的状态和下方记录为准，未列批准项仍保持待确认）：

- [板块逐面核对](phase3-tile-face-review-2026-10-12.md) — Torture Chamber BACK p2，VQ-01–05 已批准；Unholy Aura 仅候选
- [Healing Fountain VQ-06 草稿](phase3-healing-fountain-review-2026-10-12.md) — FRONT p2 / room:p003，未批准
- [Spiked Pit VQ-13 草稿](phase3-spiked-pit-review-2026-10-13.md) — BACK p3 / room:p004，未批准；触发图标仍未知
- [Beacon of Light VQ-14 草稿](phase3-beacon-of-light-review-2026-10-13.md) — FRONT p3 / room:p005，未批准
- [Treasure Chamber VQ-15 草稿](phase3-treasure-chamber-review-2026-10-13.md) — BACK p4 / room:p006，未批准
- [Tomb of Ancestor VQ-16 草稿](phase3-tomb-of-ancestor-review-2026-10-13.md) — FRONT p4 / room:p007，未批准
- [Invocation Chamber VQ-17 草稿](phase3-invocation-chamber-review-2026-10-13.md) — BACK p5 / room:p008，未批准
- [Old Abbey VQ-18 草稿](phase3-old-abbey-review-2026-10-13.md) — FRONT p5 / room:p009，未批准
- [QuestMap 全套标注](phase3-scout-pressure-maps-2026-10-11.md) — p1–14 布局草稿
- [Ritual Chamber 几何](ruins-room-tile-review-2026-10-10.md) / R-054、R-055（已批，仅作对照模板）
- 总交接：`HANDOFF-FROM-CODEX-2026-10-09.md` 顶部；`AGENTS.md` + `rulings.md` 为准

印刷根目录（本机只读）：  
`C:\Users\kyrie\Desktop\新建文件夹\DARKEST DUNGEON EN_FILES\DARKEST_DUNGEON_PRINT_EN_WAVE 1\MG_DD_01_EN_COREBOX_Print\`

---

## 2026-10-12 批准记录

Kyries 在本对话回传 Kyries/Grok 目视结果，批准 Torture Chamber BACK p2（遗迹 2）的 **VQ-01、02、03、04、05，无修正**。独立 source.face=back + room:p002；仅批准通行边参与邻接，角点保持 cornerOnly，C–H 与 F–D/H 中下段黑墙保持 blocked；本面部署印刷复核通过，宝箱 A/B/E。H 绑定 Unholy Aura **候选**，本轮不接运行时、不全局复用 Cornered；usable 待治疗拒绝路径就绪。未批准 Fountain 或其余 VQ；不关闭任何 Q 项裁定。

## 2026-10-13 准备范围

Kyries 对 VQ-06 的回传为“尚未审核，先继续准备其他板块”。Fountain 仍待审核，Torture 的既有运行时排除项不撤销。新增遗迹4 / Spiked Pit 与遗迹5 / Beacon of Light 独立草稿，列为 VQ-13 / VQ-14，不将准备指令当作数据批准。生产可用仍1/28。

## Verify queue

| id    | item                                                                                                                                                                                                                   | print source                                                                                 | status                                                                    | next Codex action after Kyries confirms                                                                            |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| VQ-01 | **Torture Chamber（遗迹 2）八区容量**：A–H 圆点 / 拟议容量 2,2,3,4,2,3,3,4；逐区数完整页圆点，不由 raw 碎片推容量                                                                                                      | `DD_COREBOX_TILES_BACK.pdf` **p2**；配套 `rooms_FRONT` p2 `room:p002`                        | Kyries/Grok 已确认（2026-10-12），无修正；已入库，usable=false            | 按修正表（若有）写入独立几何入库；扩展 schema 记 `source.face=back` + 房间身份；**不**因页码把 FRONT p2 当成遗迹 2 |
| VQ-02 | **Torture Chamber 邻接 / 墙 / 角点**：拟议通行 A–C,B–C,B–F,C–D,C–F,D–E,D–G,D–H,E–G,G–H；角点候选 A–B,A–E,F–H 非通路；C–H 与 F–D/H 中下段黑墙                                                                           | 同上 BACK p2 完整页                                                                          | Kyries/Grok 已确认（2026-10-12），无修正；已入库，usable=false            | 生成生产 edges（仅获批对）；角点 `cornerOnly`；黑墙 `blocked`；批准前不改 `usable`                                 |
| VQ-03 | **Torture Chamber 部署图标**：四英雄姿态 → H（左→右拟议 Support/Ranged/Defensive/Aggressive）；怪物 Aggressive/Defensive→D、Ranged→E、Support→C；红框 hash 逐面核，不因 Ritual Chamber 同 hash 自动批新位              | BACK p2 + rooms_FRONT p2 小图对照；hash 见 tile-face 表                                      | Kyries/Grok 已确认（2026-10-12），无修正；已入库，usable=false            | 写入本面 deployment 映射；provisional→printReview；**不**全局升级词典同形图标（R-048）                             |
| VQ-04 | **Torture Chamber 宝箱 / `!`**：A、B、E 各一处（hash `f9f205b9e1` 等 bbox）                                                                                                                                            | BACK p2 + 配套卡                                                                             | Kyries/Grok 已确认（2026-10-12），无修正；已入库，usable=false            | 记录三处 loot 放置点；不实现拾取 / 奖励                                                                            |
| VQ-05 | **Torture Chamber H 星形外观 + 卡面 Unholy Aura 文字对照**：星形 hash `4591aebebd`；卡文 _Heroes in this Area can't heal or be healed._ — 只核外观与文字是否同区对应，**不**把 Ritual Chamber 的 Cornered 语义全局复用 | BACK p2 + rooms_FRONT p2 全文                                                                | Kyries/Grok 已确认（2026-10-12），无修正；已入库，usable=false            | 本面绑定特殊区效果候选；接治疗拒绝路径后才可考虑开放整面；星形不因同 hash 继承 Cornered（R-048）                   |
| VQ-06 | **Healing Fountain（遗迹 3）FRONT p2**：独立区域表、绿色星形、治疗相关图标 / 数字目视（下一张面）                                                                                                                      | `DD_COREBOX_TILES_FRONT.pdf` **p2**；配套 rooms 对应页                                       | 独立逐区草稿已完成，待 Kyries/Grok 目视确认                               | Codex 先出与 Torture 同结构的核对草稿 → Kyries+Grok 目视 → 再入库；禁止用 FRONT p2 覆盖 BACK p2 身份               |
| VQ-07 | **QuestMap 八槽图布局读数**（FRONT p1–10、p13–14）：房间槽数、起点 S、连接段、灰点 X/Y 段数与边列表                                                                                                                    | `02_DD_CARDS_COREBOX/DD_COREBOX_CARDS_193x203_QuestMap_FRONT.pdf`（及 BACK 概览）p1–10/13–14 | 表已录入 `dungeon_layouts.json`，标注仍 **pending**                       | Kyries 确认后把对应页从 pending 升为获批布局；引擎沙盒可改引用获批图；**不**借此裁定 Q-59 / Q-63                   |
| VQ-08 | **QuestMap p11 十六槽 + 特殊槽外观**：槽 A–P、边清单、特殊图案槽 A/B/G、红点 X 的**外观与位置**（`semantic=null`）                                                                                                     | QuestMap FRONT **p11**（BACK 红边）                                                          | 已观察入库为 unresolved / null；仅预览                                    | 确认外观记录无误后仍可保持 null 直至另有裁定；若只批布局不含特殊语义，引擎继续拒绝含未解释标记的开局（R-048）      |
| VQ-09 | **QuestMap p12 十六槽 + 特殊槽外观**：特殊图案槽 A/C/D 外观与边清单                                                                                                                                                    | QuestMap FRONT **p12**                                                                       | 同上                                                                      | 同 VQ-08：布局可批、特殊语义不猜                                                                                   |
| VQ-10 | **TILES 28 面身份索引**：PDF 页 ≠ 印刷房间号；FRONT/BACK 非同一布局；遗迹与最暗地牢各 1–12；现可用几何仍 **1/28**（Ritual Chamber FRONT）                                                                              | `DD_COREBOX_TILES_FRONT.pdf` + `BACK.pdf` 各 14 页联系表                                     | 联系表已生成；Ritual 已可用，Torture 已入库；Fountain / 遗迹4–9草稿待审核 | 每面单独草稿→目视→入库；禁止邻页 / 空余编号猜身份；Boss 面留对应阶段                                               |
| VQ-11 | **后续遗迹 / 最暗地牢 Room Tile 几何与部署**（FRONT/BACK 其余面）：容量圆点、邻接、高低地、金框/红框、宝箱、星形外观                                                                                                   | 各 TILES 页 + 配套 rooms 卡                                                                  | Fountain / 遗迹4–9草稿已准备，其余待逐面核对                              | 按 VQ-01–05 模板逐面推进；`geometryVerified` 与部署分列批准；整面 `usable` 须部署/特殊也齐                         |
| VQ-12 | **图标 / 数字清点（印刷明示项）**：容纳圆点个数、卡面已印 Nt / 面值、部署框个数；仅核对印刷上**看得见**的数                                                                                                            | 当前核对面的 TILES / rooms / 相关卡 PDF                                                      | 随各 VQ 面进行                                                            | 写入获批表；**缺印或 null 不补默认**（R-048）；不把词典 `value=null` 填成猜测                                      |

---

## 状态约定

2026-10-13 本批：#131审核文档已按用户授权合并，未把草稿当作批准。遗迹8/9独立草稿列入VQ-17/18；至此普通遗迹1–9的逐面材料已齐，但实际可用仍1/28，待审核 / 运行时排除项不变。

| id    | item                                                                                                            | print source                                | status                     | next Codex action after Kyries confirms                                                          |
| ----- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------ |
| VQ-17 | Invocation Chamber（遗迹8）：十区容量、九条通行 / 四个角点候选、部署、两宝箱、红星及最后怪物移动 / 轮末压力卡文 | TILES BACK p5 + rooms FRONT p8 / room:p008  | 独立草稿已准备，待目视审核 | 按明确批准项独立入库；怪物行动替换和轮末触发独立接线，不套英雄结束回合钩子、不补AI平手或复合顺序 |
| VQ-18 | Old Abbey（遗迹9）：九区容量、十条通行 / 四个角点候选、部署、两宝箱、两红星及怪癖压力 / 治疗卡文                | TILES FRONT p5 + rooms FRONT p9 / room:p009 | 独立草稿已准备，待目视审核 | 按明确批准项独立入库；完整压力与治疗均须接线，压力到10等顺序未明时保留停点                       |

2026-10-13 续接：#130 审核草稿PR按用户授权合并，不代表草稿数据已批准。继续新增两面材料，实际可用仍1/28；Fountain、VQ-13/14和Torture运行时排除项保持。

| id    | item                                                                                                        | print source                                | status                                   | next Codex action after Kyries confirms                                                 |
| ----- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| VQ-15 | Treasure Chamber（遗迹6）：九区容量、九条通行候选、折形轮廓、四英雄 / 四怪物、一宝箱、A/B绿星及动作交互文字 | TILES BACK p4 + rooms FRONT p6 / room:p006  | 独立草稿已准备；移除全部的目标图标仍未知 | 按明确批准项独立入库；不按Hide and Heal名称补未知图标，特殊交互与复合规则未就绪仍不可用 |
| VQ-16 | Tomb of Ancestor（遗迹7）：九区容量、九条通行 / 四个角点候选、部署、两宝箱、绿星与六项免疫 / 移除卡文       | TILES FRONT p4 + rooms FRONT p7 / room:p007 | 独立草稿已准备；六项免疫中两项图标仍未知 | 按明确批准项独立入库；不只执行已确认四项而开放整卡，不补standing here触发顺序           |

新增两面审核项（与上表使用相同状态约定）：

| id    | item                                                                                                | print source                                | status                                                                    | next Codex action after Kyries confirms                                                     |
| ----- | --------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| VQ-13 | Spiked Pit（遗迹4）：12区容量、S1高地、边界 / 黑墙分类、四英雄 / 四怪物、两宝箱、印刷A/B特殊区      | TILES BACK p3 + rooms FRONT p4 / room:p004  | 独立完整页草稿已完成，待 Kyries/Grok 目视审核；`8c4c3c2ec2` 仍 unreviewed | 按明确批准项独立入库；未知触发图标和复合规则不借目视批准补齐；特殊运行时未完成仍不可用      |
| VQ-14 | Beacon of Light（遗迹5）：9区容量、8条候选边、黑矩形、部署、一宝箱、五红星 / 一绿星、压力图标与数字 | TILES FRONT p3 + rooms FRONT p5 / room:p005 | 独立完整页草稿已完成，待 Kyries/Grok 目视审核                             | 获批后独立入库并接具名结束回合压力增减；不因名称接探索降光；运行时与几何 / 部署未齐仍不可用 |

- **草稿已写，待确认**：Codex/代理已出完整对照表；Kyries 可让 Grok Bot 对照印刷截图 / PDF 页做目视，再口头或书面批准 / 修正。
- **pending 布局**：数据在库但非战役可用；目视通过后才升级。
- **确认后 Codex**：只执行「next Codex action」列；不顺带关闭上表 rulings 停点。

---

## Codex start command（粘贴块）

```text
严格按 AGENTS.md + docs/rulings.md + HANDOFF-FROM-CODEX 顶部。
下一步优先：docs/kyries-verify-queue-2026-10-12.md 中的 VQ 项（Kyries/Grok 目视确认后的入库与接线）。
Q-52 / Q-59 / Q-61–68 仍是 rulings，不在本 verify-queue；不要自行裁定。
R-048：未确认图标不命名、未印数字不发明。
步骤 2 / Phase 3：板块逐面（Torture→Fountain→其余）与 Curio 奖励接口按已有边界推进；不跳 Phase 4。
```
