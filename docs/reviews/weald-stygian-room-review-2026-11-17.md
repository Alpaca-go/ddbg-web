# Weald Stygian 普通房间首批审阅（2026-11-17）

状态：**九张 Stygian 房间卡印刷正面已对照、写入扩展规范化目录；步骤 7 第二刀已接 Stygian 出征效果运行时（保留普通 `room:weald:p00N` 身份）；未改板块几何。**

依据：核心规则书 p.36 Stygian mode（开战无金币；用 Stygian Room Cards 替换 standard Room Cards；Boss 技能 Crit +1）；R-001、R-048。Weald 规则书仅列出「9 Stygian Room Cards」组件，未另写替换程序——本批按核心程序记录：**九张 Stygian 替换同名、同编号的九张 Weald 普通房间**（`stygian_room:weald:p00N` → `room:weald:p00N`），不新增裁定号、不替换 Boss 房、不触碰核心 17 张 Stygian（R-036）。

## 来源与范围

| 项目       | 内容                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------- |
| 印刷 FRONT | `MG_DD_06_EN_WEALD/DD_EN_WEALD_CARDS_63x88_rooms_Stygian_FRONT.pdf`（9 页）                    |
| 印刷 BACK  | 提取 metadata 登记 `...Stygian_BACK.pdf`；当前印刷包无可用 BACK OCR 正文，**不发明背面效果**   |
| Raw        | `packages/data/extract/extension/weald/raw/stygian_room.json`（`n_unique=9`）                  |
| 普通对照   | [普通房间审阅（R-234–R-239）](weald-room-review-2026-11-12.md) 已核准文本                      |
| 规范化输出 | `packages/data/normalized/extension/weald/stygian_rooms.json`（`ddbg-weald-stygian-rooms-v1`） |

本批**不做**：Stygian 战役出征时按地点替换房间、效果 `runtimeReady`、板块字母／容量／墙／高低地核准、Boss 房（p10–p12）、核心盒 17 张 Stygian 查询语义。星标与效果区域绑定仍待后续对照 R-239 普通房，审阅稿只写「待对照，不在本批核准」。

## 逐卡对照（Stygian 印刷正面）

| 编号 | 名称               | 普通效果（已核准，不改写）                                                        | Stygian 差异                                                |
| ---- | ------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| p001 | Fungal Spores      | Toxic Mushrooms：区域未命中 → 区域英雄 1 腐蚀 2t                                  | 同触发与范围；**1 腐蚀 3t**                                 |
| p002 | Ambush             | Unprepared!：开战英雄减益 2t（全文 Heroes）                                       | 同；**减益 3t**                                             |
| p003 | Thick Woods        | 无独立效果段                                                                      | 无独立效果段                                                |
| p004 | Stash              | Precious：怪物在此结束回合 → 其他怪物 **增益 2t、增益 2t**（两项不去重）          | 同；**增益 3t、增益 3t**                                    |
| p005 | Infected Oak       | Poisonous Roots：英雄在此结束回合 → **2 腐蚀 2t**                                 | 同；**2 腐蚀 3t**                                           |
| p006 | Chase in the Woods | 无独立效果段                                                                      | 无独立效果段                                                |
| p007 | Chasm              | 无独立效果段                                                                      | 无独立效果段                                                |
| p008 | Fungal Overgrowth  | Abyssal Puff：真菌摧毁 → 所有怪物 **增益 2t**（普通房核准一项）                   | 印刷 **两项独立增益 2t**（与普通一项 2t 并存，非 OCR 漏项） |
| p009 | The Clearing       | Ours!：拾箱 → 怪物减益 1t、增益 2t；Clearing：英雄/怪物在此结束回合（压力与移箱） | Ours! 改为 **仅增益 3t**（无减益 1t）；Clearing 与普通相同  |

### 需单独说明的两张卡

**p008（2026-11-17 规则书目视复核）**：对照 Weald 普通房与 Stygian 房印刷 PDF **第 8 页**，普通为 **一项** `gain … 2t`，Stygian 为 **两项** `gain … 2t, … 2t`。属印刷差异，**不是** OCR 漏扫；**不**将普通房改成双项，**不**改已合入运行时数值。目录 `reviewedEffect`：`abyssalPuff`、`buffApplications: 2`（`stygian_rooms.json`）。

**p009**：Stygian `Ours!` 行为为单行 `Monsters gain … 3t`，不再出现减益图标／1t。Clearing 段与普通相同，仍含恢复 1 压力与怪物随机移除宝箱。

## 图标与几何

- 腐蚀语义沿用 R-231（Blight = 腐蚀）；其余图标保留印刷 `{icon:…}` 占位，未命名图标继续挂 **Q-186**，不猜语义。
- 卡面地图外观似复用同名普通板块，但 **本批不向 `room_tile_geometry` 写入新几何**，不声称新裁定。

## 本批验证

- `packages/data/src/normalize/weald-stygian-rooms.test.ts`：九张可再生、替换关系、印刷漂移检测、p008／p009 结构化字段、包隔离、拒绝错映射。
- 核心 `stygian-rooms.test.ts` 与 17 张 `corebox/stygian_rooms.json` 不受影响。

## Weald Boss 房与 Stygian（R-036）

- Boss 房 **不替换**：Hag `room:weald:p010`、Shrieker `room:weald:p011`、Brigand Pounder `room:weald:p012` 无 Stygian 印刷版，出征身份保持不变。
- Stygian 下技能 **+1 Crit** 按 **R-036**（自有 Boss Abilities 卡）：Hag、Shrieker、Pounder 与 **Cauldron I–III**（`boss_ability:weald:p019`–`p021`）；不含 Nest、Matchman 等无独立能力卡单位。

## 下一步（开发计划步骤 7）

普通九房替换与六房效果、Boss +1 Crit 与 I–III Boss Stygian 出征接线已完成本批范围；自然跨幕／人工实机仍后置。
