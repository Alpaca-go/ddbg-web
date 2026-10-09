# 遗迹房间板块核对：1 - Ritual Chamber（2026-10-10）

## 1. 范围、基线与来源

**状态：Kyries 已通过核对表（2026-10-10）；容量、高台与邻接按批准表准备数据 PR，合并由 Kyries 执行。** E-F 按 R-054 定稿为不相邻（黑墙阻隔）。未命名图标仍保留空语义，不因几何批准而命名。本次只涉及这一张 Room Tile 的 FRONT 面，不核其他板块、不标地牢探索图、不实现移动。

- 开工时工作区干净；按 Kyries 已确认的远端同步状态，在 `D:\ddbg-web` 的 `main` 执行 `pull --ff-only`，结果为已同步。基线 `4d72d05`（#52 合并后），含六条姿态组和六条 Speed。随后建立文档分支 `codex/phase2-ruins-room-tile-review`。
- 印刷板块：`C:\Users\kyrie\Desktop\新建文件夹\DARKEST DUNGEON EN_FILES\DARKEST_DUNGEON_PRINT_EN_WAVE 1\MG_DD_01_EN_COREBOX_Print\DD_COREBOX_TILES_FRONT.pdf`，**PDF 第 1 页 / FRONT，右上印刷编号 1**。PDF 共 14 页；本次只检查第 1 页。按 PDF 原方向阅读，编号在右上。
- 配套房间卡：同目录 `02_DD_CARDS_COREBOX\DD_EN_COREBOX_CARDS_63x88_rooms_FRONT.pdf`，PDF 第 1 页 / FRONT，标题 **1 - Ritual Chamber**；用于核对板块编号、同一布局及卡面标记，不能拿它补规则。
- 已有 raw 记录：`packages/data/extract/corebox/raw/dungeon_tile.json` 的 **`dungeon_tile:p001`**。虽然提取类别叫 `dungeon_tile`，该 FRONT 页显示的是战斗 Room Tile，不因此把它当探索地牢连通图。配套卡 raw id 为 `room:p001`。**尚无规范化 Room Tile id**；以下 A-J 只是本表的区域定位标签。
- 官方规则书：`C:\Users\kyrie\Desktop\DDBG\DD_EN_COREBOX_RULES.pdf`。已对照完整页面图像 R16、R17、R18、R24、R25（PDF 页序与印刷页码一致）。
- 字典对照：`packages/data/dictionary/icon-dictionary-v1.8.json`、`start_locations_by_placement.csv`。不修改词典、raw、parsed 或规范化 JSON。

来源分工：官方规则书与 `docs/rulings.md` 定规则；印刷 PDF 只用于这张板块的布局、图标和数量观察。没有使用 FAQ、旧仓库或 TTS。原始 PDF 只读，整页渲染及检查用局部图仅留在忽略目录 `node_modules/.cache/room-tile-review/`，不提交图片。

## 2. 判读依据与限制

| 项目        | 依据                                                        | 本表处理                                                                                   |
| ----------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 起始位置    | R16 部署英雄图例、R17 部署怪物；说明书 §6.2                 | 金框 / 红框及姿态图形按已确认对照位置记录；不按剩余姿态反推未知图标                        |
| 容量        | R18 Move 图示明确标注 `Occupancy number/icon`；R24 大小型怪 | 人工数每一区域的圆点；数的是空间容量，不是自动可放的怪物只数                               |
| 邻接与墙    | R-021，说明书 §6.8（R18、R24）                              | 共享边界且无墙才是邻接；仅角点不邻接；黑色矩形空区按墙候选记录，细分区线与地面裂纹不混为墙 |
| 高低地      | R25 High and Low Ground；说明书 §6.9                        | 灰色向上标记为高地；未见红色向下标记；不用紫色地面本身推高低地                             |
| 宝箱 / 交互 | R16 第 7 步、R17 Place Loot Chests、R18 Interact            | 记录区域与印刷 `!` / 宝箱框；不实施奖励、拾取或房间特殊效果                                |
| 移动边界    | 已阅读 R-023 / R-024，R24、说明书 §6.10                     | 本块不计算路径、距离或落点，不消费 Speed；待选不得重掷选招骰的要求留给下一块               |
| 未确认图标  | R-001、R-048                                                | 保留原始 ID 和外观；字典缺条目、`needs_review` / `unreviewed` 不因本表而获批               |

所有数量和边均为**拟议人工标注**，清楚可见也仍需 Kyries 审阅；表中的“未见”是这一面上的观察，不代表运行时默认值。raw 坐标为 TrimBox 左上原点、毫米、y 向下（270 × 270 mm），下表 bbox 只定位已有图标，不是拟造的区域多边形。

## 3. 区域完整对照表

| 标签 | 原方向下的位置 / 划分线索                    | 容量圆点观察         | 拟议容量 | 高低地观察 / 拟议值            | 起始或交互观察                                     |
| ---- | -------------------------------------------- | -------------------- | -------- | ------------------------------ | -------------------------------------------------- |
| A    | 左上大矩形；下沿横线，右侧接上中 / 中横区域  | 左上 2 × 2 圆点      | 4        | 未见高低地标记 / normal        | 未见起始 / 交互标记                                |
| B    | 上中横条，位于上部黑色矩形之上               | 左上三点（上二下一） | 3        | 未见 / normal                  | 未见起始 / 交互标记                                |
| C    | 右上纵条；包含编号 1，向下至右中区域横分线   | 左上三点             | 3        | 未见 / normal                  | 左上红色星形；下部一处 `!` 宝箱框及两个金框；见 §5 |
| D    | 左中纵条；上接 A，下接 H，左侧有黑色缺口     | 左上三点             | 3        | 未见 / normal                  | 下部两个红框（盾形、竖条形）；见 §5                |
| E    | 中部横条，位于上部黑矩形与中央紫色区域之间   | 左上三点             | 3        | 未见 / normal                  | 未见起始 / 交互标记                                |
| F    | 中央紫色矩形，灰色外框；下部周围有宽黑色空区 | 左上竖排两点         | 2        | 左上灰色向上标记 / high（R25） | 左下一个红框斜线 / 箭形标记；见 §5                 |
| G    | 右中纵条；上接 C，下接 J                     | 左上三点             | 3        | 未见 / normal                  | 未见起始 / 交互标记                                |
| H    | 左下横向矩形；上接 D，右接 I                 | 左上竖排两点         | 2        | 未见 / normal                  | 左上红色星形；左下 `!` 宝箱框、两个金框；见 §5     |
| I    | 下中横条；位于中央宽黑区下方                 | 左上三点             | 3        | 未见 / normal                  | 未见起始 / 交互标记                                |
| J    | 右下矩形；上接 G，左接 I                     | 左上竖排两点         | 2        | 未见 / normal                  | 左下一个红框剑形标记；见 §5                        |

容量定位：A `[3.6,3.05,15.03,14.35]`；B `[90.6,3.05,101.9,14.1]`；C `[210.45,3.05,221.75,14.1]`；D `[29.75,90.95,41.05,102.0]`；E `[90.6,72.45,101.9,83.5]`；F `[104.45,122.45,112.83,133.75]`；G `[210.45,121.2,221.75,132.25]`；H `[4.45,212.69,12.83,224.0]`；I `[90.6,212.69,101.9,223.74]`；J `[210.45,212.69,218.83,224.0]`。

字典中 A 的容纳图标 r330 已确认 value=4，C 的 r46 已按规则书确认 value=3，J 的 r100 是已确认容纳变体但 value=null。其余有些容纳组合图标未被词典收录。上表数字来自 R18 已标明的圆点图例与本页人工逐点观察，**不是把词典的 null 填成默认值，也不为缺失 ID 自动造条目**。各区域数量仍须逐项批准。

## 4. 邻接、墙与角点完整对照

### 4.1 共享边界候选（11 对，均待审）

| 区域对 | 可审的边界位置          | 拟议 adjacent / cornerOnly | 状态                     |
| ------ | ----------------------- | -------------------------- | ------------------------ |
| A-B    | A 右侧上段 / B 左侧     | true / false               | 分区线可见，待批准       |
| A-D    | A 下沿右段 / D 上沿     | true / false               | 同上                     |
| A-E    | A 右侧下段 / E 左侧上段 | true / false               | 同上；不是整条边重合     |
| B-C    | B 右沿 / C 左侧上段     | true / false               | 同上                     |
| C-E    | C 左侧下段 / E 右沿     | true / false               | 同上                     |
| C-G    | C 下沿 / G 上沿         | true / false               | 同上                     |
| D-E    | D 右侧上段 / E 左侧下段 | true / false               | 同上                     |
| D-H    | D 下沿 / H 上沿右段     | true / false               | 同上                     |
| G-J    | G 下沿 / J 上沿         | true / false               | 同上；两区各有独立圆点组 |
| H-I    | H 右沿 / I 左沿         | true / false               | 同上                     |
| I-J    | I 右沿 / J 左沿         | true / false               | 同上                     |

**E-F 已由 Kyries 裁定不相邻（R-054）**：黑墙阻隔，不可直接移动；`adjacent: false, cornerOnly: false`。红色布条不构成通路。按本表其余边定稿后，F 没有邻接边；保留这个孤立高台，不补桥、不创建跳跃规则。

### 4.2 黑色空区 / 不可通过候选

| 标签 | 位置与可见边界                                  | 拟议处理 / 需核事项                                                   |
| ---- | ----------------------------------------------- | --------------------------------------------------------------------- |
| W1   | B 下方、E 上方的宽黑色横向矩形                  | 不建区域，按 R-021 记墙；B-E 无直接邻接                               |
| W2   | F 两侧与下方的宽黑色空区，位于 D、G、I 内侧之间 | 不建区域，按 R-021 记墙；D-F、F-G、F-I 无直接邻接；E-F 上沿另列待确认 |
| W3   | A 下方、D 左方、H 上方的黑色缺口                | 不建区域，按 R-021 记墙；不把缺口当左侧走廊或穿过 A-H 的边            |

板外黑框和裁切 / 套准标记不是游戏区域。地砖裂纹、木板、书本、家具残骸不自动标成障碍；细黑分区线不自动全部算墙。W1-W3 是本页观察标签，尚不是规范化墙 ID 或精确 polygon。

### 4.3 仅角点候选

| 区域对 | 位置                                      | 拟议 adjacent / cornerOnly |
| ------ | ----------------------------------------- | -------------------------- |
| D-I    | D 右下 / I 左上，W2 左下拐角附近          | false / true               |
| E-G    | E 右下 / G 左上，C 下沿横线与右侧竖线交点 | false / true               |
| G-I    | G 左下 / I 右上，W2 右下拐角附近          | false / true               |

角点均按 R-021 不生成通行边；上述角点归属仍待人工批准。

### 4.4 全部 45 对区域的覆盖索引

每行只列其后标签，防止漏查 / 重复。`边` 指 §4.1 候选，`角` 指 §4.3，`待` 指 E-F，`墙` 指有黑空区隔开，`隔` 指无共享边界（中间有其他区域或空区），都不是运行时推断。

| 起点 | 其余区域对及观察分类                                           |
| ---- | -------------------------------------------------------------- |
| A    | B 边；C 隔；D 边；E 边；F 隔；G 隔；H 墙（W3 / D）；I 隔；J 隔 |
| B    | C 边；D 隔；E 墙（W1）；F 隔；G 隔；H 隔；I 隔；J 隔           |
| C    | D 隔；E 边；F 隔；G 边；H 隔；I 隔；J 隔                       |
| D    | E 边；F 墙（W2）；G 隔；H 边；I 角；J 隔                       |
| E    | F 待；G 角；H 隔；I 隔（F / W2）；J 隔                         |
| F    | G 墙（W2）；H 隔；I 墙（W2）；J 隔                             |
| G    | H 隔；I 角；J 边                                               |
| H    | I 边；J 隔                                                     |
| I    | J 边                                                           |

## 5. 起始、宝箱与其他标记

下表的姿态名称来自**同张配套房间卡已确认的图标 / 精确位置**及 R16-R17 图例，与板块相同位置逐一视觉对照；不是批量给板块 raw iconId 赋语义。即使房间卡对应位置已确认，板块映射仍待本次审阅批准，raw / 词典原状态保持不变。

| 区域 | 板块观察与 raw 定位                                                                                                  | 已确认的房间卡对照 / 拟议记录                                                                                                                             |
| ---- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C    | 两个金框：左竖条形 `39d6ddf024` `[214.83,103.75,226.91,115.83]`；右盾形 `1a71d94723` `[229.11,103.75,241.19,115.83]` | 右盾形对应 `room:p001` 的 r132，placement 表明确为 hero_defensive；左框对应房间卡 `fef75233ed` r639，仍 unreviewed，**stance=null，不按排除法填 Support** |
| D    | 红框盾形 `1f26dc63eb` `[34.0,193.92,46.08,206.0]`、竖条形 `293f170eab` `[48.42,193.92,60.5,206.0]`                   | 配套卡 r365 / r340 分别已确认为 monster_defensive / monster_support；板块后者本身 r216 仍 needs_review，不改词典状态，映射待批                            |
| F    | 红框斜线形 `643d396fef` `[108.25,168.33,120.33,180.41]`                                                              | 板块 r808 已确认为怪物 Ranged 姿态；房间卡 r241 是已确认起始位置，拟议 monster_ranged 起始区 F                                                            |
| H    | 金框斜线形 `7ab26866fc` `[8.12,251.0,20.2,263.08]`、剑形 `7b8c742c86` `[22.62,251.0,34.7,263.08]`                    | 配套卡 r328 / r184 已确认为 hero_ranged / hero_aggressive                                                                                                 |
| J    | 红框剑形 `8787ebb1b2` `[214.53,251.0,226.61,263.08]`                                                                 | 配套卡 r107、placement 表已确认为 monster_aggressive                                                                                                      |
| C、H | 各一处带 `!` 的宝箱框；印刷 `!` bbox 为 `[221.98,86.2,226.13,97.24]`、`[15.18,232.37,19.34,243.4]`                   | R16 第 7 步 / R17 宝箱图例；配套卡 r65 已确认，拟议每区一处宝箱放置点，合计 2 处，不实现拾取                                                              |
| C、H | 各一处红色星形 `4591aebebd`，bbox `[219.26,3.62,230.93,15.49]`、`[11.1,212.43,22.76,224.3]`                          | 板块 r792 仍 unreviewed；记录外观和位置，**semantic=null**。配套卡虽有同形标记旁的特殊效果说明，本块不据此给未确认图标命名或实现效果                      |
| F    | 灰色向上双层标记（位于圆点右侧）                                                                                     | 与 R25 高地图例直接对照；拟议 high，具体板块定位 / 容量仍待审                                                                                             |

未观察到其他明确的交互标记；紫色仪式纹样、书、凳子和碎木不自动成为可交互对象。

## 6. 不确定项与审批范围

1. **E-F 已解决**：Kyries 明确裁定黑墙阻隔、不相邻，见 R-054；几何可以据此定稿。
2. **C 左金框的姿态**：板块 ID 未收录，对应房间卡 r639 未确认；只记金框竖条外观，不补缺失姿态。
3. **C、H 红色星形语义**：r792 未确认，保持原始 ID 与位置，不命名、不执行卡面效果。
4. **几何已批准，图标不扩大批准范围**：10 个区域的容量 / 高低地、11 对共享边、3 对角点按通过的核对表准备入库。板块未知 ID 不因配套卡视觉相同自动升级为 confirmed；尤其 D 的 r216 保持 needs_review。运行时可用卡池不因几何获批而绕过未验证标记。
5. **区域精确边界坐标尚未标注**：本文 bbox 是现有 raw 图标位置；没有伪造 polygon。若入库需精确轮廓，应在获批区域划分上人工标注同一页，而非拿图标 bbox 当区域范围。

## 7. 拟议结构化草稿（只在本文，非 schema / 游戏数据）

`reviewStatus` 表示尚未批准；数字均对应 §3 的人工观察。`edgeCandidates` 不是运行时邻接表；未决 E-F 明列 null。未知起始和标记均保留空语义，不能导入可用卡池。

```json
{
  "reviewStatus": "awaiting_kyries",
  "rawId": "dungeon_tile:p001",
  "normalizedId": null,
  "location": "ruins",
  "printedNumber": 1,
  "roomCardRawId": "room:p001",
  "source": { "file": "DD_COREBOX_TILES_FRONT.pdf", "page": 1, "face": "front" },
  "areas": [
    {
      "label": "A",
      "position": "upper-left",
      "capacityCandidate": 4,
      "elevationCandidate": "normal"
    },
    {
      "label": "B",
      "position": "upper-middle",
      "capacityCandidate": 3,
      "elevationCandidate": "normal"
    },
    {
      "label": "C",
      "position": "upper-right",
      "capacityCandidate": 3,
      "elevationCandidate": "normal"
    },
    {
      "label": "D",
      "position": "middle-left",
      "capacityCandidate": 3,
      "elevationCandidate": "normal"
    },
    {
      "label": "E",
      "position": "middle-crossbar",
      "capacityCandidate": 3,
      "elevationCandidate": "normal"
    },
    {
      "label": "F",
      "position": "central-purple",
      "capacityCandidate": 2,
      "elevationCandidate": "high"
    },
    {
      "label": "G",
      "position": "middle-right",
      "capacityCandidate": 3,
      "elevationCandidate": "normal"
    },
    {
      "label": "H",
      "position": "lower-left",
      "capacityCandidate": 2,
      "elevationCandidate": "normal"
    },
    {
      "label": "I",
      "position": "lower-middle",
      "capacityCandidate": 3,
      "elevationCandidate": "normal"
    },
    {
      "label": "J",
      "position": "lower-right",
      "capacityCandidate": 2,
      "elevationCandidate": "normal"
    }
  ],
  "edgeCandidates": [
    { "areas": ["A", "B"], "adjacent": true, "cornerOnly": false },
    { "areas": ["A", "D"], "adjacent": true, "cornerOnly": false },
    { "areas": ["A", "E"], "adjacent": true, "cornerOnly": false },
    { "areas": ["B", "C"], "adjacent": true, "cornerOnly": false },
    { "areas": ["C", "E"], "adjacent": true, "cornerOnly": false },
    { "areas": ["C", "G"], "adjacent": true, "cornerOnly": false },
    { "areas": ["D", "E"], "adjacent": true, "cornerOnly": false },
    { "areas": ["D", "H"], "adjacent": true, "cornerOnly": false },
    { "areas": ["G", "J"], "adjacent": true, "cornerOnly": false },
    { "areas": ["H", "I"], "adjacent": true, "cornerOnly": false },
    { "areas": ["I", "J"], "adjacent": true, "cornerOnly": false },
    { "areas": ["E", "F"], "adjacent": null, "cornerOnly": false },
    { "areas": ["D", "I"], "adjacent": false, "cornerOnly": true },
    { "areas": ["E", "G"], "adjacent": false, "cornerOnly": true },
    { "areas": ["G", "I"], "adjacent": false, "cornerOnly": true }
  ],
  "wallCandidates": [
    { "label": "W1", "position": "between-B-and-E", "polygon": null },
    { "label": "W2", "position": "beside-and-below-F", "polygon": null },
    { "label": "W3", "position": "left-of-D", "polygon": null }
  ],
  "startingCandidates": [
    { "area": "C", "side": "hero", "stance": "defensive", "roomDictionaryRank": 132 },
    { "area": "C", "side": "hero", "stance": null, "rawIconId": "39d6ddf024" },
    { "area": "D", "side": "monster", "stance": "defensive", "roomDictionaryRank": 365 },
    { "area": "D", "side": "monster", "stance": "support", "roomDictionaryRank": 340 },
    { "area": "F", "side": "monster", "stance": "ranged", "roomDictionaryRank": 241 },
    { "area": "H", "side": "hero", "stance": "ranged", "roomDictionaryRank": 328 },
    { "area": "H", "side": "hero", "stance": "aggressive", "roomDictionaryRank": 184 },
    { "area": "J", "side": "monster", "stance": "aggressive", "roomDictionaryRank": 107 }
  ],
  "lootPlacementCandidates": [
    { "area": "C", "count": 1 },
    { "area": "H", "count": 1 }
  ],
  "unresolvedMarkers": [
    { "area": "C", "rawIconId": "4591aebebd", "semantic": null },
    { "area": "H", "rawIconId": "4591aebebd", "semantic": null }
  ],
  "usable": false
}
```

## 8. 确认后最小入库路径

1. Kyries 按区域、容量、边界、角点、墙、起始和交互逐项确认，明确 E-F 与未确认标记；只批准本板块 / 本面，不扩散到其他页或同形图标。
2. 另开单主题数据块，在 `packages/data/src/normalize/` 增加**按已批原始 id / FRONT 页人工映射**的入口；先补 Room Tile 的 Zod schema，再在现有生成路径附加获批几何。未知 / 重复 id、页码 / 编号漂移、未知区域引用、重复边、容量脏值、未决连接必须拒绝。当前没有这套 schema，本块不创建。
3. 邻接显式记录两端与 `cornerOnly`；墙不建成可通行区域。若 schema 支持未核实占位，则仍 `usable=false`，不能用 `null -> 0/1` 或“没有边就是不邻接”掩盖未决项。未确认图标保留原 ID；文档中的候选不等于字典批准。
4. 由现有规范化生成入口输出，只允许新增 / 修改这一张板块记录；不手改生成 JSON，不从颜色、轮廓、裂纹或图标数量自动批量标图。其他卡牌和词典保持不变；验证生成一致与拒绝路径即可，不建立 evidence / proof 链。

只有本表获确认并且移动所需几何已具备，才进入下一块：普通怪单目标按已批 Speed 移动（选技 → 目标 → 射程 → 移动 → 攻击 / 跳过）；沿用 R-023 / R-024，移动待选期间保存选招、目标和 RNG。本块没有实现这条流程。

## 9. 验证

本块仅新增核对 Markdown 并追加交接笔记；没有改代码、schema、游戏数据或原始资料。Node 24.21.0 / pnpm 12.9.1 下按顺序运行 `pnpm typecheck && pnpm lint && pnpm test && pnpm build`，全部通过，测试为 18 文件、242 项。文档 JSON 可解析、区域 / 候选引用无重复且未标为可用；`git diff --check` 通过，数据与代码无 diff。结果同步记入 `HANDOFF-FROM-CODEX-2026-10-09.md` 本次条目。不是 Phase 2 结束，没有 UI 变更，不新增 Playwright 测试。
