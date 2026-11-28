# Cove Boss 印刷目录审阅（2026-11-28）

状态：**资料层入库，不接运行时**。对照附件 `DD_EN_COVE_CARDS_70_120_Boss_Abilities_{FRONT,BACK}.pdf` 与 Cove 大型／中型怪物 FRONT PDF；普通 Boss 房 `room:cove:10`–`12` 已在 main，本刀不改。

## 印刷对照摘要

| 类别            | 张数 | 印刷来源                                | 规范输出                                                |
| --------------- | ---: | --------------------------------------- | ------------------------------------------------------- |
| Boss 能力／故事 |   18 | Boss Abilities p1–18                    | `normalized/extension/cove/boss_abilities.json`         |
| Boss 大型战斗   |    9 | monster_large FRONT p3–11               | `boss_combat_cards.json`（`size: large`, `role: boss`） |
| Boss 召唤物     |    6 | monster_medium FRONT p23／25／27／29–31 | 同上（`role: summon`）                                  |

### 能力卡分组（已核实）

每位 Boss 各 **描述 I–III**（无 `ACTIONS / Round`）与 **能力 I–III**（含 `ACTIONS / Round`）：

| Boss         | 描述 p    | 能力 p    | 每轮行动（能力卡 FRONT） |
| ------------ | --------- | --------- | -----------------------: |
| Shambler     | p001–p003 | p004–p006 |                        1 |
| Siren        | p007–p009 | p010–p012 |                        2 |
| Drowned Crew | p013–p015 | p016–p018 |                        2 |

背面威胁／地牢效果以 `back.textLines` 原样保留；图标仍为 `{icon:…}` 占位，**Q-186**。

### 战斗卡与房间关联

| 名称              | 等级  | ID                                         | 关联房间       |
| ----------------- | ----- | ------------------------------------------ | -------------- |
| Shambler          | I–III | `monster_large:cove:p003`–`p005`           | `room:cove:11` |
| Siren             | I–III | `monster_large:cove:p006`–`p008`           | `room:cove:10` |
| Drowned Crew      | I–III | `monster_large:cove:p009`–`p011`           | `room:cove:12` |
| Shambler Tentacle | I–III | `monster_medium:cove:p023`／`p025`／`p027` | —              |
| Drowned Anchorman | I–III | `monster_medium:cove:p029`–`p031`          | —              |

**未录入（刻意除外）**：`monster_large:cove:p001`–`p002`（Uca Major，留给 I 级普通高等级目录刀）；全册其余 medium 普通怪。

全部战斗／召唤目录项：`boss: true`、`poolEligible: false`、`combatReady: false`。

## 待确认

- **Q-186**：能力卡与战斗卡上的图标语义、技能数值、抗性／免疫与选招均未核准；未写入 `icon-dictionary` 或 `print-icon-additions`（R-048）。
- **Siren 召唤 Pelagic Grouper**（能力卡 p010–p012 正文提及）：本刀未收录对应中型战斗卡（非本 PR 范围中的 Tentacle／Anchorman 清单）。
- **Shambler Tentacle** 印刷名带行内图标；目录 `name` 取「Shambler Tentacle」纯文本，与 FRONT 首行一致。

## 明确未做

- Boss 战斗脚本、召唤部署、房间板块、出征与 Cove 战役牌堆洗牌。
- 修改已登记的 Cove Boss 房或使其进入普通房间／怪物池。
- 批新图标 hash；未改运行时引擎白名单。

## 验证

- `pnpm typecheck`、`pnpm lint`
- `packages/data/tests/cove/bosses/cove-boss-catalog.build.test.ts`
- `packages/data/tests/shared/extract/cove.test.ts`（既有房间／奇物；本刀 raw 断言在 catalog 测试内）
