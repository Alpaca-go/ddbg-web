# 核心盒怪物姿态分组核对：首批 6 条

> **Kyries 已于 2026-10-09 审核并确认全部六条（见 §7）。** 本文保留核对依据与批准分组；运行时从获批人工映射生成规范化数据，不解析本文。卡池其他验证状态不变。
> 核对开始时 tip：`e0933a9`；核对表已提交为 `9c00d78`，本次入库从该提交继续。

## 1. 核对范围与来源

首批选择下表 6 条规范化卡记录（全部 I 级，五种遗迹骷髅怪优先，另选官方规则书示例 Cultist Acolyte）。颜色副本共 17 面，同名记录的副本底栏也逐面核对；不新增怪物种类。没有核 Boss、大型怪或扩展。

| 卡 id                 | 卡名            | 印刷 FRONT 页（1 起算） | 选择原因                             |
| --------------------- | --------------- | ----------------------- | ------------------------------------ |
| `monster_medium:p001` | Bone Soldier    | 1、2、3                 | 遗迹常见前排；固定技能分组           |
| `monster_medium:p004` | Bone Courtier   | 4、5、6                 | 遗迹常见后排；固定与单姿态骰表混合   |
| `monster_medium:p007` | Bone Arbalist   | 7、8、9                 | 遗迹常见后排；两个固定分组           |
| `monster_medium:p010` | Bone Defender   | 10、11                  | 遗迹前排；规则书 R22 选招示例        |
| `monster_medium:p040` | Bone Rabble     | 40、41、42              | 遗迹前排；三个姿态共用技能           |
| `monster_medium:p021` | Cultist Acolyte | 21、22、23              | 核心盒通用后排；R24 解剖图的三段骰表 |

本机只读来源：

- 印刷卡面（下文简称 M）：`C:\Users\kyrie\Desktop\新建文件夹\DARKEST DUNGEON EN_FILES\DARKEST_DUNGEON_PRINT_EN_WAVE 1\MG_DD_01_EN_COREBOX_Print\02_DD_CARDS_COREBOX\DD_EN_COREBOX_CARDS_70_120_monsters_medium_FRONT.pdf`。使用当前目录文件，**没有使用 Old_Version**。
- 官方核心规则书（下文 R + 页码）：`C:\Users\kyrie\Desktop\DDBG\DD_EN_COREBOX_RULES.pdf`，已对照完整页面图像 R17、R21–24；PDF 页序与页脚页码一致。
- 仓库记录：`packages/data/normalized/corebox/monster_medium.json`，以及对应 `extract/corebox/parsed/monster_medium.json` / `raw/monster_medium.json`；图标命名沿用词典 v1.8，不另起含义。
- 规则依据：`docs/rulings.md` 的 R-001、R-015、R-024、R-048；说明书 §6.2、§6.10、G-04 仅作索引，官方规则书及裁定优先。

M 只用于核卡面文字、数字与底栏排列，**不用于补规则**。PDF / 渲染图 / 底栏对照图只在忽略目录 `node_modules/.cache/stance-review/`，不入库；没有修改原始资料。没有使用 FAQ、TTS 或旧仓库。

## 2. 读表规则及并列条件

R21「Monster Turns / Step 2 – Act / 1」规定先按姿态决定技能，多个技能才掷 d10。R22 的 Defender 图示、R24「Stance/Skill Eligibility」图示与 R-015 确定从左到右为 Aggressive → Defensive → Ranged → Support，相邻一组共用右端标签。**不能按提取文本的顺序配对技能号和区间**。

下文 A / D / R / S 分别代表 `aggressive` / `defensive` / `ranged` / `support`；花括号表示视觉分组。区间含两端。固定标签用 `skill`，不用人为补出的 1–10 骰表。骰表本身没有平手：各骰面只对应一个技能。

R24「Check Target」要求多个目标同等满足条件时按姿态顺序选，Guard 优先；R22–23 的 Defender 技能 3 示例中，两名英雄同样远，选更靠前的 Hellion。R-024 保留这条目标并列规则，**不写进 `stanceGroups`**。R17 / R-015 的大型怪两格取更高优先级姿态也是调用方选分组的规则；本批没有大型怪数据。没有额外发明按伤口、射程或 Guard 改选技能的条件。

## 3. 卡面对照表（六条已获批）

“卡面 footer”是按图示读出的姿态与右端原文标签（技能号、区间），不是已有 `footer_lines` 的线性解析。“拟议分组”对应 §4 的完整 JSON。

| 卡 id / 卡名                          | 卡面 footer（按图示）                                            | 拟议 `stanceGroups`                               | 依据                                  | 不确定项 / 状态                                                    |
| ------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------ |
| `monster_medium:p001` Bone Soldier    | `{A D R} 1`；`{S} 2`；无 d10                                     | A/D/R 固定 1；S 固定 2                            | M1–3 底栏；R21、R-015                 | 图示可读，副本一致；**已确认（2026-10-09）**                       |
| `monster_medium:p004` Bone Courtier   | `{A} 2`；`{D} d10: 1 1-5 / 2 6-10`；`{R S} 1`                    | A 固定 2；D 掷 1–5→1、6–10→2；R/S 固定 1          | M4–6 底栏；R21、R-015                 | 图示可读，副本一致；**已确认（2026-10-09）**。原始文本区间顺序倒排 |
| `monster_medium:p007` Bone Arbalist   | `{A D} 2`；`{R S} 1`；无 d10                                     | A/D 固定 2；R/S 固定 1                            | M7–9 底栏；R21、R-015                 | 图示可读，副本一致；**已确认（2026-10-09）**                       |
| `monster_medium:p010` Bone Defender   | `{A D} d10: 2 1-5 / 1 6-10`；`{R S} 3`                           | A/D 掷 1–5→2、6–10→1；R/S 固定 3                  | M10–11 底栏；R21–22 的同卡图示、R-015 | 与规则书一致，副本一致；**已确认（2026-10-09）**                   |
| `monster_medium:p040` Bone Rabble     | `{A D R} 1`；`{S} 2`；无 d10                                     | A/D/R 固定 1；S 固定 2                            | M40–42 底栏；R21、R-015               | 图示可读，副本一致；**已确认（2026-10-09）**                       |
| `monster_medium:p021` Cultist Acolyte | `{A} d10: 1 1-5 / 3 6-10`；`{D R S} d10: 1 1-4 / 2 5-7 / 3 8-10` | A 掷 1–5→1、6–10→3；D/R/S 掷 1–4→1、5–7→2、8–10→3 | M21–23 底栏；R24 解剖图、R21、R-015   | 与规则书一致，副本一致；**已确认（2026-10-09）**                   |

本批没有看不清而必须留空的骰面。六条已由 Kyries 在审核此表后批准；批准范围仅为这里的姿态分组。卡面其余 `numeric: null`、duration、Speed 与图标不在本次核实范围，继续按 R-048 保留。

技能号核对（同时与规范化 `skills[].slot/name` 对上）：

| 卡 id                 | 卡上技能号 → 名称                                               |
| --------------------- | --------------------------------------------------------------- |
| `monster_medium:p001` | 1 → Graveyard Slash；2 → Graveyard Stumble                      |
| `monster_medium:p004` | 1 → Tempting Goblet；2 → Knife in the Dark                      |
| `monster_medium:p007` | 1 → Quarrel；2 → Bayonet Jab                                    |
| `monster_medium:p010` | 1 → Axeblade；2 → Dead Weight；3 → Clumsy Axeblade              |
| `monster_medium:p040` | 1 → Bump in the Night；2 → Tic-Toc                              |
| `monster_medium:p021` | 1 → Stressful Incantation；2 → Eldritch Pull；3 → Eldritch Push |

### 3.1 现有原始 footer 保留

以下逐 token 抄录规范化卡的 `footer_lines`；`[icon:id]` 仅保留原 ID，空白合并为单空格，**没有重排**。各卡均只有一行。可回到同 id 的 raw / parsed 核查；这部分不能直接充当分组输入。

- `monster_medium:p001`：`[icon:9e89b8399f] [icon:d85db127a6] [icon:8bd94417b0] [icon:7d361d5859] [icon:0ba73142d3] [icon:6cee7f5b3b] 1 [icon:802ad6ada3] [icon:81250916ec] 2`
- `monster_medium:p004`：`[icon:9e89b8399f] [icon:995efc58a1] 2 [icon:b5d7889153] [icon:7eeaf1ad74] [icon:9446490c37] [icon:be11b8ced8] 2 [icon:986406076a] [icon:986406076a] 1 6-10 1-5 [icon:0ba73142d3] [icon:39b6880840] [icon:802ad6ada3] [icon:1348d729eb] 1`
- `monster_medium:p007`：`[icon:9e89b8399f] [icon:f7400b538c] [icon:538ebeb34d] [icon:81250916ec] 2 [icon:0ba73142d3] [icon:39b6880840] [icon:802ad6ada3] [icon:81250916ec] 1`
- `monster_medium:p010`：`[icon:b5d7889153] [icon:2ce1cd4d1b] [icon:a11d67845d] [icon:f7e08a02e7] [icon:7eeaf1ad74] [icon:9446490c37] [icon:6a08bec9e4] 2 [icon:986406076a] 1 [icon:986406076a] 6-10 1-5 [icon:0ba73142d3] [icon:39b6880840] [icon:802ad6ada3] [icon:01d6f8c930] 3`
- `monster_medium:p040`：`[icon:9e89b8399f] [icon:f7400b538c] [icon:8bd94417b0] [icon:d311f5fad9] [icon:0ba73142d3] [icon:9614979938] 1 [icon:802ad6ada3] [icon:01d6f8c930] 2`
- `monster_medium:p021`：`[icon:b5d7889153] [icon:2ce1cd4d1b] [icon:903a585468] [icon:9446490c37] 3 1 [icon:986406076a] [icon:986406076a] 6-10 1-5 [icon:f7e08a02e7] [icon:7eeaf1ad74] [icon:d311f5fad9] [icon:5824725929] [icon:010cc97a8a] [icon:ff1b2876c1] [icon:5824725929] [icon:dd27139285] [icon:ef63419250] [icon:7c7de22bc1] [icon:be11b8ced8] 3 2 1 [icon:986406076a] [icon:986406076a] [icon:986406076a] 8-10 5-7 1-4`

其中 `802ad6ada3` 的词典 key 为 `monster_stance_slot_ranged_support`，meaning 还带“待确认”字样；这里不改名，也不据它推断姿态。具体 R/S 位置与分组由完整卡面和 R-015 对照。现有 `verification.unverified: false` 只表示既有规范化验证状态，**不证明姿态组已核实**。

## 4. 已批准 JSON（审批记录，不由运行时加载）

每个 key 对应同 id 卡的 `stanceGroups`，不跨等级或同名扩散；这六条已进入获批人工映射。

```json
{
  "monster_medium:p001": [
    { "stances": ["aggressive", "defensive", "ranged"], "skill": 1 },
    { "stances": ["support"], "skill": 2 }
  ],
  "monster_medium:p004": [
    { "stances": ["aggressive"], "skill": 2 },
    {
      "stances": ["defensive"],
      "rollTable": [
        { "min": 1, "max": 5, "skill": 1 },
        { "min": 6, "max": 10, "skill": 2 }
      ]
    },
    { "stances": ["ranged", "support"], "skill": 1 }
  ],
  "monster_medium:p007": [
    { "stances": ["aggressive", "defensive"], "skill": 2 },
    { "stances": ["ranged", "support"], "skill": 1 }
  ],
  "monster_medium:p010": [
    {
      "stances": ["aggressive", "defensive"],
      "rollTable": [
        { "min": 1, "max": 5, "skill": 2 },
        { "min": 6, "max": 10, "skill": 1 }
      ]
    },
    { "stances": ["ranged", "support"], "skill": 3 }
  ],
  "monster_medium:p040": [
    { "stances": ["aggressive", "defensive", "ranged"], "skill": 1 },
    { "stances": ["support"], "skill": 2 }
  ],
  "monster_medium:p021": [
    {
      "stances": ["aggressive"],
      "rollTable": [
        { "min": 1, "max": 5, "skill": 1 },
        { "min": 6, "max": 10, "skill": 3 }
      ]
    },
    {
      "stances": ["defensive", "ranged", "support"],
      "rollTable": [
        { "min": 1, "max": 4, "skill": 1 },
        { "min": 5, "max": 7, "skill": 2 },
        { "min": 8, "max": 10, "skill": 3 }
      ]
    }
  ]
}
```

## 5. 审批前拟定的最小入库路径

以下保留准备阶段的计划，实施情况见 §7。

1. Kyries 按 §3 的 **id** 确认 / 修正每条；在本文记录批准范围与日期。没有获批的条目留在本文，**不加载草稿文件**。
2. 在 `packages/data/src/normalize/` 新增一个只含获批 id 的人工映射模块，例如 `verified-monster-stances.ts`。每条引用本文页码和批准记录；用已有 `monsterStanceGroupsSchema` 校验。不从 `footer_lines` 自动解析，不改 raw / parsed，不在技能号前后猜配对。
3. 在 `build.ts` 的 `buildMonsterMedium` 普通技能卡分支按 id 附加获批分组，然后交给现有 `normalizedMonsterMediumFileSchema`。没有映射就保持字段缺省，不补固定技能、不填 null、不修改 `verification` 的其他拒绝原因。映射中未知 id / 非普通技能卡 / 重复 id 必须报错，防止拼错后静默失效。
4. `write.ts` 的 `loadNormalizedCorebox → buildNormalizedCorebox → writeNormalizedCorebox` 沿现有路径再生成规范化层；不要只手改输出 JSON（会在下次生成时丢失）。`tools/pipeline/src/normalize-corebox.ts` 保持现有委托入口，无需新增一套管线。
5. 在数据测试中锁住：生成结果等于获批映射、重复生成一致、非本批卡仍无分组、原 footer / null 数值 / 验证原因不变。继续使用现有 schema 测试锁四姿态覆盖、相邻分组、1–10 完整无重叠、区间不倒置及技能号唯一存在。在引擎测试中逐个姿态、每个骰面验证实际选招（含边界 4/5/7/8/10），固定组无需骰；保留未获批卡拒绝测试。
6. 当前本块的真实卡缺分组测试在获批入库时需改为“未获批 id 拒绝 + 获批 id 精确分组”的正反例，不能直接删掉安全门。跑 typecheck、lint、test、build；只做数据入库主题，命令接线、移动、多目标另开块。

现有 schema 校验结构，不知道谁批准了卡面。最小路径的信任边界是**只从获批人工映射附加字段**，不是把 `unverified=false` 当成姿态审批。现已按 §7 实施。其余未获批真实卡仍缺省并拒绝自动选招。

## 6. 核对准备阶段的验证与交接（历史记录）

- 清单 / 来源与卡面核对阶段分别运行 `pnpm typecheck`、`pnpm lint`、`pnpm test`：均通过，224 项测试。
- 本块新增 `packages/engine/src/monster-stance-data.test.ts`，直接读取六条真实规范化卡，在四种姿态及未给骰 / 1 / 5 / 10 下锁住缺分组拒绝，验证输入不变。拟议 JSON 未作为已核实测试夹具。
- 最终检查结果见本日 `HANDOFF-FROM-CODEX-2026-10-09.md` 的“姿态数据核对准备块”。
- 刻意没做：规范化分组入库、管线写入实现、图标重命名、补 null、规则裁定、寻路、多目标、死门、Boss、战斗 UI、提交 / 推送 / 合并。
- 下一块：Kyries 确认本表后，只为获批 id 接人工映射、生成与校验；不要在同块串入自动移动。

## 7. Kyries 批准与本次入库（2026-10-09）

Kyries 在审核本表后回复：“我看过了，建议六条都可以确认”。据此确认 §3–4 的全部六个 id，未批准其他怪物或卡面字段。

- `packages/data/src/normalize/verified-monster-stances.ts` 保存本批人工映射、卡名、等级和印刷页码；按 id 精确匹配。`buildMonsterMedium` 在现有生成流程附加分组，最终交给已有规范化 schema。没有手改 raw / parsed，也不解析 footer。
- 除已有四姿态、相邻分组、完整骰面和唯一技能引用校验外，入库会拒绝未知 / 重复映射 id、卡池重复 id、大型参考卡，以及卡名 / 等级 / 页码漂移。
- 重生成后，仅 `monster_medium.json` 的六条卡增加 `stanceGroups`；与提交 `9c00d78` 比较，移除新增字段后内容完全一致，全部其他规范化文件无差异。原 footer、null、图标、验证状态和统计保持原值。
- 更新真实卡选招测试：获批六条在四姿态、全部 d10 骰面（含 4/5/7/8/10 边界）精确选招，固定技能不要求选招骰；未获批真实卡继续拒绝。已有命令拒绝测试显式移除分组，保留缺数据时不消费 RNG 的约束。
- 新增人工映射入库测试，覆盖生成一致、重复生成、字段保留、输入不变，以及上述拒绝条件。质量结果见本日交接笔记的“首批获批姿态分组入库块”。

本次只完成获批分组的数据接入，没有新增移动、寻路、多目标、死门、Boss、扩展、战斗 UI 或规则裁定。下一块再选择普通怪物单目标流程的后续工作；仍未核实的 Speed、duration 等字段继续按 R-048 拒绝。
