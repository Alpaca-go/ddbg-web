# Cove 板块几何待填审阅稿（2026-11-28）

**提案待 Kyries 核对。** 下列数值均仅据 Cove 印刷图（R-048）；核准前 **`geometryVerified` 仍为 false**，不写入 `room_tile_geometry.json`。

不再按 icon hash 批次提议并入。下面列已对照的印刷身份与逐面几何提案。拿不准处已标「待确认」。

字段对齐 Weald 已入库的 `room_tile_geometry`（区域、邻接、部署、特殊区域、零容量、墙/阻断）。

## 怎么填

- **区域字母**：左→右、上→下；印刷字母（如橙星旁 `A`/`B`）在备注中标出，不改变区号除非印刷区与网格合一（见各面说明）。
- **容量**：白/灰圆点（Occupancy）计数。
- **地势**：向上三角 = `high`，向下三角 = `low`，无三角 = `normal`。
- **邻接**：有共享边写 `从-到`；仅角接触标 `cornerOnly`；墙/柱阻断标 `blocked`，并在「墙/阻断」补一句。
- **部署**：攻/防/远程/支援各一区域字母（红黄框印刷位置）；战利品区另列。
- **特殊区域**：仅印刷橙星/绿星/红八星；效果文案若无房间卡依据则写「待确认」。
- 同目录图：`tiles/FRONT-1.png`–`FRONT-6.png`、`BACK-1.png`–`BACK-6.png`（本地对照用，不提交仓库）。

## 身份对照（角标数字已从印刷面读出，请勾确认）

来源：`MG_DD_05_EN_COVE` 的 `DD_COVE_TILES_FRONT.pdf` / `DD_COVE_TILES_BACK.pdf`，各 6 页。

| 勾选 | 板块 ID             | 房间名（目录绑定，请确认） | 分类 | 印刷面   | 角标数字 |
| ---- | ------------------- | -------------------------- | ---- | -------- | -------- |
| [ ]  | `room_tile:cove:01` | Eldritch Augmentation      | 普通 | FRONT p1 | 1        |
| [ ]  | `room_tile:cove:02` | Flooded Room               | 普通 | BACK p1  | 2        |
| [ ]  | `room_tile:cove:03` | The Hoarders               | 普通 | FRONT p2 | 3        |
| [ ]  | `room_tile:cove:04` | Buried Treasures           | 普通 | BACK p2  | 4        |
| [ ]  | `room_tile:cove:05` | Twin Idols                 | 普通 | FRONT p3 | 5        |
| [ ]  | `room_tile:cove:06` | Lairs in Tunnels           | 普通 | BACK p3  | 6        |
| [ ]  | `room_tile:cove:07` | Shipwreck                  | 普通 | FRONT p4 | 7        |
| [ ]  | `room_tile:cove:08` | Sea Rites                  | 普通 | BACK p4  | 8        |
| [ ]  | `room_tile:cove:09` | Temple of the Deep One     | 普通 | FRONT p5 | 9        |
| [ ]  | `room_tile:cove:10` | Siren's Room               | Boss | BACK p5  | 10       |
| [ ]  | `room_tile:cove:11` | Shambler's Room            | Boss | FRONT p6 | 11       |
| [ ]  | `room_tile:cove:12` | Drowned Crew Room          | Boss | BACK p6  | 12       |

其他出入（若有）：

> 无

---

## 01 · Eldritch Augmentation（`room_tile:cove:01`，FRONT p1，角标 1）

图：`tiles/FRONT-1.png`

区域：

| 区域 | 容量 | 地势（high / low / normal） | 备注                                      |
| ---- | ---- | --------------------------- | ----------------------------------------- |
| A    | 2    | normal                      | 宝箱                                      |
| B    | 3    | normal                      | 刻纹圆坛；红八星；`monster_support`       |
| C    | 2    | normal                      | 宝箱；锚章「1」（房间号，非容量）         |
| D    | 4    | normal                      |                                           |
| E    | 2    | normal                      | `monster_ranged`（红框散射/短柱）         |
| F    | 4    | normal                      |                                           |
| G    | 2    | normal                      | `monster_aggressive`                      |
| H    | 2    | normal                      | `monster_defensive`                       |
| I    | 0    | normal                      | 零容量；碎石区未见容量点                  |
| J    | 4    | normal                      | `hero_defensive`、`hero_ranged`（黄框）   |
| K    | 4    | normal                      | `hero_aggressive`、`hero_support`（黄框） |

邻接：

| 从  | 到  | cornerOnly（是/否） | blocked（是/否） |
| --- | --- | ------------------- | ---------------- |
| A   | D   | 否                  | 否               |
| B   | E   | 否                  | 否               |
| C   | F   | 否                  | 否               |
| D   | G   | 否                  | 否               |
| E   | H   | 否                  | 否               |
| F   | I   | 待确认              | 否               |
| G   | J   | 否                  | 否               |
| J   | K   | 否                  | 否               |
| A   | B   | 否                  | 是               |
| B   | C   | 否                  | 是               |
| D   | E   | 否                  | 是               |
| E   | F   | 否                  | 是               |
| G   | H   | 否                  | 是               |
| H   | I   | 否                  | 是               |
| H   | K   | 待确认              | 待确认           |
| F   | K   | 待确认              | 待确认           |

部署：

| 角色 | 攻击 | 防御 | 远程 | 支援 |
| ---- | ---- | ---- | ---- | ---- |
| 英雄 | K    | J    | J    | K    |
| 怪物 | G    | H    | E    | B    |

战利品区域：A, C

特殊区域（印刷文字）：B — 红八星（效果待确认）

零容量区域：I

墙 / 阻断：上两排及中部左右列之间的两道黑色竖柱阻断 A↔B、B↔C 水平邻接（提案）。

本面其他待确认：黑柱是否贯穿全高（上式按全高提案阻断了全部横向边）；F–I、H–K、F–K 角邻；底行是否仅 J+K 两区。

---

## 02 · Flooded Room（`room_tile:cove:02`，BACK p1，角标 2）

图：`tiles/BACK-1.png`

区域：

| 区域 | 容量 | 地势（high / low / normal） | 备注                                     |
| ---- | ---- | --------------------------- | ---------------------------------------- |
| A    | 3    | normal                      |                                          |
| B    | 6    | normal                      | 双宝箱                                   |
| C    | 2    | normal                      | 锚章「2」                                |
| D    | 4    | normal                      | 橙星 A；`hero_ranged`                    |
| E    | 0    | normal                      | 零容量；黑色 void/柱                     |
| F    | 2    | high                        | 登台；双红框（爪/柱形，语义待确认）      |
| G    | 0    | normal                      | 零容量；黑色 void/柱                     |
| H    | 4    | normal                      | 橙星 A；`hero_aggressive`                |
| I    | 3    | normal                      | `hero_defensive`                         |
| J    | 2    | normal                      | `monster_aggressive`                     |
| K    | 4    | normal                      | 橙星 A；`hero_defensive`、`hero_support` |
| L    | 2    | normal                      | 橙星 A；宝箱                             |

邻接：

| 从  | 到  | cornerOnly（是/否） | blocked（是/否） |
| --- | --- | ------------------- | ---------------- |
| A   | B   | 否                  | 否               |
| B   | C   | 否                  | 否               |
| A   | D   | 否                  | 否               |
| D   | H   | 否                  | 否               |
| H   | I   | 否                  | 否               |
| I   | K   | 否                  | 否               |
| H   | K   | 否                  | 否               |
| I   | J   | 否                  | 否               |
| J   | L   | 否                  | 否               |
| K   | L   | 否                  | 否               |
| B   | E   | 否                  | 是               |
| D   | E   | 否                  | 是               |
| E   | F   | 否                  | 是               |
| E   | I   | 否                  | 是               |
| C   | G   | 否                  | 是               |
| F   | G   | 否                  | 是               |
| G   | L   | 否                  | 是               |
| B   | F   | 否                  | 是               |
| F   | J   | 否                  | 是               |
| D   | I   | 待确认              | 待确认           |

部署：

| 角色 | 攻击 | 防御   | 远程   | 支援   |
| ---- | ---- | ------ | ------ | ------ |
| 英雄 | H    | I      | D      | K      |
| 怪物 | J    | 待确认 | 待确认 | 待确认 |

战利品区域：B, L

特殊区域（印刷文字）：D, H, K, L — 橙星 A（效果待确认）；F 登台与房间卡绑区待确认

零容量区域：E, G

墙 / 阻断：E、G 黑块为柱/void；F 厚框与 B、D、J 之间提案为墙（见上表 blocked）。

本面其他待确认：K 与 I 均见黄盾（防御），上表取 I 为防御、K 为支援；F 第二红框归入 ranged 或 support；水体区与外缘格是否另划区；D–I 是否仅角邻。

---

## 03 · The Hoarders（`room_tile:cove:03`，FRONT p2，角标 3）

图：`tiles/FRONT-2.png`

区域：

| 区域 | 容量 | 地势（high / low / normal） | 备注                                  |
| ---- | ---- | --------------------------- | ------------------------------------- |
| A    | 2    | high                        | 向上双三角；红爪 `monster_aggressive` |
| B    | 3    | normal                      |                                       |
| C    | 3    | normal                      | 绿星；锚章「3」；`monster_support`    |
| D    | 3    | normal                      | 红剑（第二张 aggressive 位）          |
| E    | 4    | normal                      | 红盾 `monster_defensive`              |
| F    | 3    | normal                      |                                       |
| G    | 4    | normal                      |                                       |
| H    | 4    | normal                      | 见向下橙菱（高低地见下）              |
| I    | 3    | normal                      | 底边四黄框（英雄四角）                |
| J    | 3    | normal                      |                                       |
| K    | 3    | normal                      |                                       |

邻接：

| 从  | 到  | cornerOnly（是/否） | blocked（是/否） |
| --- | --- | ------------------- | ---------------- |
| A   | B   | 否                  | 否               |
| B   | C   | 否                  | 否               |
| A   | D   | 否                  | 否               |
| D   | E   | 否                  | 否               |
| E   | F   | 否                  | 否               |
| C   | F   | 待确认              | 待确认           |
| D   | G   | 否                  | 否               |
| G   | H   | 否                  | 否               |
| F   | H   | 否                  | 否               |
| G   | I   | 否                  | 否               |
| I   | J   | 否                  | 否               |
| J   | K   | 否                  | 否               |
| H   | K   | 待确认              | 待确认           |
| E   | H   | 否                  | 是               |
| E   | J   | 否                  | 是               |
| G   | E   | 待确认              | 是               |

部署：

| 角色 | 攻击 | 防御 | 远程   | 支援 |
| ---- | ---- | ---- | ------ | ---- |
| 英雄 | I    | I    | I      | I    |
| 怪物 | A    | E    | 待确认 | C    |

战利品区域：待确认（C 区船骸/箱图待是否计 loot）

特殊区域（印刷文字）：C — 绿星（效果待确认）

零容量区域：无独立编号区；中央 L 形黑墙见「墙/阻断」

墙 / 阻断：中央 L 形黑色 void 阻断 E↔H、E↔J 及 G 列与中右列部分连通（提案，待勾）。

本面其他待确认：H 向下橙菱是否 `low`；D 红剑是否第二 `monster_aggressive`；C–F、G–E、H–K 邻接；英雄四角是否均算 I 区。

---

## 04 · Buried Treasures（`room_tile:cove:04`，BACK p2，角标 4）

图：`tiles/BACK-2.png`

区域：

| 区域 | 容量 | 地势（high / low / normal） | 备注                        |
| ---- | ---- | --------------------------- | --------------------------- |
| A    | 2    | low                         | 绿星；宝箱                  |
| B    | 3    | normal                      |                             |
| C    | 3    | normal                      | 双红怪（剑、斜线）          |
| D    | 3    | normal                      | 红柱/竖条 `monster_support` |
| E    | 2    | low                         | 绿星                        |
| F    | 2    | low                         |                             |
| G    | 3    | normal                      | 水域                        |
| H    | 3    | normal                      | 红盾 `monster_defensive`    |
| I    | 2    | low                         | `hero_ranged`               |
| J    | 3    | normal                      | 黄剑/盾/旗                  |
| K    | 3    | normal                      |                             |

邻接：

| 从  | 到        | cornerOnly（是/否） | blocked（是/否） |
| --- | --------- | ------------------- | ---------------- |
| A   | B         | 否                  | 否               |
| B   | D         | 否                  | 否               |
| C   | D         | 否                  | 否               |
| C   | F         | 否                  | 否               |
| D   | G         | 否                  | 否               |
| D   | E         | 待确认              | 待确认           |
| E   | H         | 否                  | 否               |
| F   | I         | 否                  | 否               |
| G   | J         | 否                  | 否               |
| H   | K         | 否                  | 否               |
| I   | J         | 否                  | 否               |
| A   | C         | 否                  | 是               |
| B   | 右上 void | —                   | 是               |
| F,I | G,J       | —                   | 是               |
| D,G | E,H,K     | —                   | 是               |

部署：

| 角色 | 攻击 | 防御 | 远程   | 支援 |
| ---- | ---- | ---- | ------ | ---- |
| 英雄 | J    | J    | I      | J    |
| 怪物 | C    | H    | 待确认 | D    |

战利品区域：A, E

特殊区域（印刷文字）：A, E — 绿星（效果待确认）

零容量区域：右上 L 形黑 void、两道竖向黑带（未单独字母，见墙）

墙 / 阻断：A–C 厚黑线；左右竖向黑带分隔三列走廊；右上 L void。

本面其他待确认：C 双红怪何者算 aggressive；void 是否需正式 `areaId`；D–E 邻接；三角地势与 R-235 Cove 裁定。

---

## 05 · Twin Idols（`room_tile:cove:05`，FRONT p3，角标 5）

图：`tiles/FRONT-3.png`

区域：

| 区域 | 容量 | 地势（high / low / normal） | 备注                       |
| ---- | ---- | --------------------------- | -------------------------- |
| A    | 0    | normal                      | 零容量；章鱼刻纹           |
| B    | 2    | normal                      | 橙星 B；三联宝箱           |
| C    | 1    | normal                      | 绿星                       |
| D    | 0    | normal                      | 零容量；锚章「5」          |
| E    | 2    | normal                      | `monster_aggressive`       |
| F    | 3    | high                        | 登台；`monster_aggressive` |
| G    | 2    | normal                      | `monster_ranged`           |
| H    | 2    | normal                      | 橙星 A                     |
| I    | 0    | normal                      | 零容量；水体               |
| J    | 0    | normal                      | 零容量；水体               |
| K    | 4    | normal                      | 橙星 A                     |
| L    | 3    | normal                      | 双黄框                     |
| M    | 3    | normal                      | 红盾 `monster_defensive`   |
| N    | 3    | normal                      | 黄剑、黄旗                 |

邻接：

| 从  | 到       | cornerOnly（是/否） | blocked（是/否） |
| --- | -------- | ------------------- | ---------------- |
| B   | C        | 否                  | 是               |
| A   | B        | 否                  | 是               |
| C   | D        | 否                  | 是               |
| E   | F        | 否                  | 否               |
| F   | G        | 否                  | 否               |
| E   | H        | 待确认              | 待确认           |
| H   | K        | 否                  | 否               |
| H   | I        | 否                  | 否               |
| I   | J        | 否                  | 否               |
| J   | K        | 否                  | 否               |
| L   | M        | 否                  | 是               |
| M   | N        | 否                  | 是               |
| H   | L        | 否                  | 是               |
| K   | N        | 待确认              | 待确认           |
| E   | L        | 待确认              | 待确认           |
| F   | I        | 待确认              | 待确认           |
| F   | J        | 待确认              | 待确认           |
| B   | 上中黑块 | —                   | 是               |

部署：

| 角色 | 攻击 | 防御 | 远程   | 支援   |
| ---- | ---- | ---- | ------ | ------ |
| 英雄 | N    | L    | 待确认 | N      |
| 怪物 | E    | M    | G      | 待确认 |

战利品区域：B

特殊区域（印刷文字）：B — 橙星 B；C — 绿星；H, K — 橙星 A（效果均待确认）

零容量区域：A, D, I, J

墙 / 阻断：上排 A–B–C–D 多处厚墙；上中黑矩形挡 B/C 与中央；底排 L|M|N 竖墙；水体行与底排横墙提案 H–L 阻断。

本面其他待确认：E 与 F 双 aggressive 印刷；L 第二黄框为 ranged 或 support；高台 F 与 E/G/I/J 阶梯邻接；K–N 连通。

---

## 06 · Lairs in Tunnels（`room_tile:cove:06`，BACK p3，角标 6）

图：`tiles/BACK-3.png`

区域：

| 区域 | 容量 | 地势（high / low / normal） | 备注                     |
| ---- | ---- | --------------------------- | ------------------------ |
| A    | 2    | normal                      | 宝箱                     |
| B    | 4    | normal                      | 三组红框（攻/远程/柱形） |
| C    | 3    | normal                      | 绿星；宝箱               |
| D    | 3    | normal                      | 红盾 `monster_defensive` |
| E    | 3    | normal                      | 红八星                   |
| G    | 3    | normal                      | 绿星                     |
| H    | 4    | normal                      | 四黄框                   |
| I    | 2    | normal                      | 宝箱                     |
| J    | 3    | normal                      |                          |

邻接：

| 从  | 到  | cornerOnly（是/否） | blocked（是/否） |
| --- | --- | ------------------- | ---------------- |
| A   | B   | 否                  | 否               |
| B   | C   | 否                  | 否               |
| B   | E   | 否                  | 否               |
| A   | D   | 否                  | 是               |
| D   | E   | 否                  | 否               |
| D   | G   | 否                  | 否               |
| E   | H   | 否                  | 否               |
| E   | I   | 待确认              | 待确认           |
| G   | H   | 否                  | 是               |
| H   | I   | 待确认              | 待确认           |
| I   | J   | 否                  | 否               |
| C   | I   | 否                  | 是               |

部署：

| 角色 | 攻击 | 防御 | 远程 | 支援   |
| ---- | ---- | ---- | ---- | ------ |
| 英雄 | H    | H    | H    | H      |
| 怪物 | B    | D    | B    | 待确认 |

战利品区域：A, C, I

特殊区域（印刷文字）：C, G — 绿星；E — 红八星（效果待确认）

零容量区域：A–D 间、B/E 右侧、G–H 间等黑 void（未字母编号）

墙 / 阻断：见上表；右侧大块黑区隔 C/I 与 B/E。

本面其他待确认：是否单列 F 区；B 三红框分轴；G–H 是否可邻接；E–I 贴边邻接。

---

## 07 · Shipwreck（`room_tile:cove:07`，FRONT p4，角标 7）

图：`tiles/FRONT-4.png`

区域：

| 区域 | 容量 | 地势（high / low / normal） | 备注                            |
| ---- | ---- | --------------------------- | ------------------------------- |
| A    | 2    | normal                      | 宝箱                            |
| B    | 4    | normal                      | 绿星；`monster_support`         |
| C    | 4    | normal                      | 锚章「7」                       |
| D    | 3    | normal                      | 绿星；宝箱；`monster_defensive` |
| E    | 3    | normal                      |                                 |
| F    | 4    | normal                      | 绿星；宝箱                      |
| G    | 3    | normal                      | 宝箱；`monster_ranged`          |
| H    | 4    | normal                      | `monster_aggressive`            |
| I    | 2    | normal                      |                                 |
| J    | 2    | normal                      |                                 |
| K    | 2    | normal                      | 绿星                            |
| L    | 4    | normal                      | 四黄框                          |
| P1   | 0    | normal                      | 零容量；黑柱 (~1,4)             |
| P2   | 0    | normal                      | 零容量；黑柱 (~2,2)             |
| P3   | 0    | normal                      | 零容量；黑柱 (~3,4)             |
| P4   | 0    | normal                      | 零容量；黑柱 (~4,3)             |

邻接：

| 从  | 到    | cornerOnly（是/否） | blocked（是/否） |
| --- | ----- | ------------------- | ---------------- |
| A   | B     | 否                  | 否               |
| B   | C     | 否                  | 否               |
| A   | D     | 否                  | 否               |
| D   | G     | 否                  | 否               |
| G   | H     | 否                  | 否               |
| H   | I     | 否                  | 否               |
| C   | E     | 待确认              | 待确认           |
| E   | F     | 待确认              | 待确认           |
| F   | I     | 待确认              | 待确认           |
| I   | K     | 待确认              | 待确认           |
| K   | L     | 待确认              | 待确认           |
| J   | K     | 否                  | 否               |
| I   | L     | 是                  | 否               |
| K   | I     | 是                  | 否               |
| B   | E     | 是                  | 否               |
| D   | H     | 是                  | 否               |
| *   | P1–P4 | —                   | 是               |

部署：

| 角色 | 攻击 | 防御 | 远程 | 支援 |
| ---- | ---- | ---- | ---- | ---- |
| 英雄 | L    | L    | L    | L    |
| 怪物 | H    | D    | G    | B    |

战利品区域：A, D, F, G

特殊区域（印刷文字）：B, D, F, K — 绿星（效果待确认）

零容量区域：P1, P2, P3, P4

墙 / 阻断：四处黑柱；贴柱边 blocked。

本面其他待确认：P1–P4 正式 `areaId` 命名；C–E–F–I–K–L 全邻接表；右下无路区是否零容量格。

---

## 08 · Sea Rites（`room_tile:cove:08`，BACK p4，角标 8）

图：`tiles/BACK-4.png`

区域：

| 区域 | 容量 | 地势（high / low / normal） | 备注                            |
| ---- | ---- | --------------------------- | ------------------------------- |
| A    | 2    | normal                      | 宝箱                            |
| B    | 3    | normal                      | 橙星 A；`monster_defensive`     |
| C    | 3    | normal                      | 双宝箱；锚章「8」               |
| D    | 3    | high                        | 橙星 B；`monster_aggressive`    |
| E    | 4    | normal                      | 橙星 A                          |
| F    | 3    | high                        | 橙星 B；红喷发 `monster_ranged` |
| G    | 3    | normal                      | 橙星 A                          |
| H    | 4    | normal                      | 橙星 A                          |
| I    | 3    | normal                      | 橙星 A；`monster_aggressive`    |
| J    | 3    | normal                      | 橙星 A                          |
| K    | 4    | normal                      | 橙星 A；四黄框                  |
| L    | 3    | normal                      | 橙星 A                          |

邻接：

| 从  | 到  | cornerOnly（是/否） | blocked（是/否） |
| --- | --- | ------------------- | ---------------- |
| A   | D   | 否                  | 否               |
| B   | C   | 否                  | 否               |
| B   | E   | 否                  | 否               |
| C   | F   | 否                  | 否               |
| D   | E   | 否                  | 否               |
| D   | G   | 否                  | 否               |
| E   | F   | 否                  | 否               |
| E   | H   | 否                  | 否               |
| F   | I   | 否                  | 否               |
| G   | H   | 否                  | 否               |
| G   | J   | 否                  | 否               |
| H   | I   | 否                  | 否               |
| H   | K   | 否                  | 否               |
| I   | H   | 否                  | 否               |
| D   | H   | 是                  | 否               |
| E   | G   | 是                  | 否               |
| E   | I   | 是                  | 否               |
| F   | H   | 是                  | 否               |
| A   | B   | 否                  | 是               |
| J   | K   | 否                  | 是               |
| K   | L   | 否                  | 是               |
| I   | L   | 否                  | 是               |

部署：

| 角色 | 攻击 | 防御 | 远程 | 支援   |
| ---- | ---- | ---- | ---- | ------ |
| 英雄 | K    | K    | K    | K      |
| 怪物 | D    | B    | F    | 待确认 |

战利品区域：A, C

特殊区域（印刷文字）：B,E,G,H,I,J,K,L — 橙星 A；D,F — 橙星 B（效果待确认）

零容量区域：顶排 A–B 间黑块；底排 J–K、K–L、I–L 间黑墙（未单独字母）

墙 / 阻断：见 blocked 行；底中央水域包绕黑块待勾。

本面其他待确认：I 与 D 双 aggressive 位取 D/I 分工；L 是否孤立仅角邻；底部黑块几何。

---

## 09 · Temple of the Deep One（`room_tile:cove:09`，FRONT p5，角标 9）

图：`tiles/FRONT-5.png`

区域：

| 区域 | 容量 | 地势（high / low / normal） | 备注                                   |
| ---- | ---- | --------------------------- | -------------------------------------- |
| A    | 3    | normal                      | 黄盾 `hero_defensive`                  |
| B    | 4    | normal                      | 锚章「9」                              |
| C    | 2    | high                        | 登台；红祭坛框                         |
| D    | 6    | normal                      | 红八星；大宝箱                         |
| E    | 0    | normal                      | 零容量；希腊回纹坛；三组红怪与双宝箱标 |
| F    | 3    | normal                      | 双黄框                                 |
| G    | 3    | normal                      |                                        |
| H    | 4    | normal                      | 黄剑 `hero_aggressive`                 |

邻接：

| 从  | 到  | cornerOnly（是/否） | blocked（是/否） |
| --- | --- | ------------------- | ---------------- |
| A   | B   | 否                  | 否               |
| A   | E   | 待确认              | 否               |
| B   | F   | 否                  | 否               |
| C   | D   | 否                  | 否               |
| D   | E   | 否                  | 否               |
| E   | F   | 否                  | 否               |
| E   | G   | 否                  | 否               |
| F   | H   | 否                  | 否               |
| G   | H   | 否                  | 否               |
| C   | A   | 是                  | 否               |
| C   | G   | 是                  | 否               |
| D   | A   | 是                  | 否               |
| D   | G   | 是                  | 否               |
| A   | F   | 是                  | 否               |
| E   | B   | 是                  | 否               |
| E   | H   | 是                  | 否               |
| G   | F   | 是                  | 否               |

部署：

| 角色 | 攻击 | 防御 | 远程 | 支援   |
| ---- | ---- | ---- | ---- | ------ |
| 英雄 | H    | A    | F    | 待确认 |
| 怪物 | E    | E    | E    | 待确认 |

战利品区域：D, E

特殊区域（印刷文字）：D — 红八星（效果待确认）

零容量区域：E

墙 / 阻断：外廓厚黑边；无内柱。

本面其他待确认：E 零容量是否仍作怪物部署区；F 第二黄框为 support；C 红祭坛语义；角邻是否收录全集。

---

## 10 · Siren's Room（`room_tile:cove:10`，BACK p5，角标 10，Boss）

图：`tiles/BACK-5.png`

区域：

| 区域 | 容量 | 地势（high / low / normal） | 备注               |
| ---- | ---- | --------------------------- | ------------------ |
| A    | 3    | high                        | 黄盾               |
| B    | 3    | high                        | 黄剑、黄弓         |
| C    | 3    | high                        | 黄杖               |
| D    | 2    | high                        |                    |
| E    | 3    | high                        |                    |
| F    | 2    | high                        |                    |
| G    | 2    | high                        |                    |
| H    | 4    | high                        | 红八星；石螺旋     |
| I    | 2    | high                        |                    |
| J    | 2    | high                        | 四红框             |
| K    | 0    | normal                      | 零容量；水中碎木板 |
| L    | 2    | normal                      |                    |

邻接：

| 从  | 到  | cornerOnly（是/否） | blocked（是/否） |
| --- | --- | ------------------- | ---------------- |
| A   | B   | 否                  | 否               |
| B   | C   | 否                  | 否               |
| A   | D   | 否                  | 否               |
| B   | E   | 否                  | 否               |
| C   | F   | 否                  | 否               |
| D   | G   | 否                  | 否               |
| E   | H   | 否                  | 否               |
| F   | I   | 否                  | 否               |
| G   | J   | 否                  | 否               |
| H   | K   | 否                  | 否               |
| I   | L   | 否                  | 否               |
| J   | K   | 否                  | 否               |
| K   | L   | 否                  | 否               |
| D   | E   | 否                  | 是               |
| E   | F   | 否                  | 是               |
| B   | D   | 是                  | 否               |
| B   | F   | 是                  | 否               |
| D   | H   | 是                  | 否               |
| F   | H   | 是                  | 否               |
| G   | K   | 是                  | 否               |
| I   | K   | 是                  | 否               |

部署：

| 角色 | 攻击 | 防御 | 远程 | 支援 |
| ---- | ---- | ---- | ---- | ---- |
| 英雄 | B    | A    | B    | C    |
| 怪物 | J    | J    | J    | J    |

战利品区域：无

特殊区域（印刷文字）：H — 红八星（效果待确认）

零容量区域：K；中行双黑柱（未字母，见墙）

墙 / 阻断：D–E、E–F 间黑色竖柱。

本面其他待确认：Boss 房间部署是否单列 runtime；K 无点仍为可行走水或纯装饰；上行三角是否全区 high。

---

## 11 · Shambler's Room（`room_tile:cove:11`，FRONT p6，角标 11，Boss）

图：`tiles/FRONT-6.png`

区域：

| 区域 | 容量 | 地势（high / low / normal） | 备注                      |
| ---- | ---- | --------------------------- | ------------------------- |
| A    | 4    | normal                      |                           |
| B    | 3    | normal                      |                           |
| C    | 0    | normal                      | 零容量；黑柱              |
| D    | 2    | normal                      | 绿星；锚章「11」          |
| E    | 2    | normal                      | 黄盾、黄弓                |
| F    | 0    | normal                      | 零容量；黑柱              |
| G    | 3    | normal                      | 红爪 `monster_aggressive` |
| H    | 3    | normal                      | 黄盾/旗                   |
| I    | 2    | normal                      | 红抓痕                    |
| J    | 4    | normal                      | 红剑；触手区              |
| K    | 3    | normal                      | 红盾                      |
| L    | 2    | normal                      | 绿星                      |
| M    | 3    | normal                      | 黄剑                      |
| N    | 0    | normal                      | 零容量；黑柱              |
| O    | 3    | normal                      | 宝箱                      |

邻接：

| 从  | 到  | cornerOnly（是/否） | blocked（是/否） |
| --- | --- | ------------------- | ---------------- |
| A   | B   | 否                  | 否               |
| A   | E   | 否                  | 否               |
| B   | G   | 否                  | 否               |
| D   | H   | 否                  | 否               |
| E   | I   | 否                  | 否               |
| G   | H   | 否                  | 否               |
| G   | J   | 否                  | 否               |
| H   | K   | 否                  | 否               |
| I   | J   | 否                  | 否               |
| I   | L   | 否                  | 否               |
| J   | K   | 否                  | 否               |
| J   | M   | 否                  | 否               |
| K   | O   | 否                  | 否               |
| L   | M   | 否                  | 否               |
| B   | F   | 否                  | 是               |
| G   | C   | 否                  | 是               |
| K   | N   | 否                  | 是               |
| J   | E   | 是                  | 否               |
| J   | H   | 是                  | 否               |
| J   | O   | 是                  | 否               |

部署：

| 角色 | 攻击 | 防御 | 远程   | 支援   |
| ---- | ---- | ---- | ------ | ------ |
| 英雄 | M    | E    | E      | H      |
| 怪物 | G    | K    | 待确认 | 待确认 |

战利品区域：O

特殊区域（印刷文字）：D, L — 绿星（效果待确认）

零容量区域：C, F, N

墙 / 阻断：黑柱 C、F、N。

本面其他待确认：I 红抓痕是否 second aggressive；H 黄盾/旗分 defensive vs support；触手格是否改变 J 容量或邻接。

---

## 12 · Drowned Crew Room（`room_tile:cove:12`，BACK p6，角标 12，Boss）

图：`tiles/BACK-6.png`

区域：

| 区域 | 容量 | 地势（high / low / normal） | 备注                     |
| ---- | ---- | --------------------------- | ------------------------ |
| A    | 3    | normal                      | 黄盾                     |
| B    | 4    | normal                      | 黄剑、黄弓               |
| C    | 3    | normal                      | 黄杖；锚章「12」         |
| D    | 3    | normal                      | 红八星                   |
| E    | 3    | normal                      |                          |
| F    | 3    | normal                      |                          |
| G    | 3    | normal                      | 红八星                   |
| H    | 4    | normal                      | 红八星；双红怪（爪、弓） |
| I    | 2    | normal                      | 红剑、红盾               |
| J    | 2    | normal                      | 红八星；双宝箱           |

邻接：

| 从  | 到  | cornerOnly（是/否） | blocked（是/否） |
| --- | --- | ------------------- | ---------------- |
| A   | B   | 否                  | 否               |
| B   | C   | 否                  | 否               |
| A   | D   | 否                  | 否               |
| B   | E   | 否                  | 否               |
| C   | F   | 否                  | 否               |
| D   | G   | 否                  | 否               |
| E   | H   | 否                  | 否               |
| F   | J   | 否                  | 是               |
| G   | I   | 否                  | 否               |
| H   | I   | 否                  | 否               |
| I   | J   | 否                  | 否               |
| D   | E   | 否                  | 是               |
| F   | H   | 是                  | 否               |

部署：

| 角色 | 攻击 | 防御 | 远程 | 支援   |
| ---- | ---- | ---- | ---- | ------ |
| 英雄 | B    | A    | B    | C      |
| 怪物 | H    | I    | H    | 待确认 |

战利品区域：J

特殊区域（印刷文字）：D, G, H, J — 红八星（效果待确认）

零容量区域：D–E 间竖柱、E–F–H–J 交界 L 形黑块（未字母）

墙 / 阻断：D–E 柱；F–J L 墙。

本面其他待确认：H/I 是否拆为 two areas 或 H 内部分段；I 双红怪分 aggressive/defensive；E–F 角缝与 L 墙关系。

---

## 附录：词典里仍待你表态的一项（与几何分开）

[#826](https://github.com/Alpaca-go/ddbg-web/pull/826) 已按你确认的 85 条并入、10 条姿态改标、3 个新 key 录入，暂不合入。下面这一条当时没有单独拍板，不并进几何表：

- v1.8 里 `area_marker` 的释义仍写「红」。Cove 印刷里同职能也有绿/橙。是否改写冻结释义，还是只在 changelog 注明放宽：

> 待确认

`low_ground`（单独向下三角）已记下释义；本批没有对应 hash，不建空 key，无需填。
