# Q-60 图标目视核对（2026-10-12）

> 2026-10-12 更新：Kyries 随后已正式批准本表全部 17 个 hash 与 01–24 手打效果行（R-064），Q-60 图标阻塞已解除。下方“其余 13 个不批准 / 仍被 Q-60 阻塞”等为批准前建议与历史状态，不覆盖本次批准。运行时尚未接入的奖惩仍单独保持停点，不视为图标未确认。

**范围**：Phase 3 Curio / tile 覆盖中的 Q-60；优先 tile 几何、部署、Curio 未核实图标。  
**规则**：R-048 不发明语义；本文件只写观察与建议确认文，**不改**词典 / raw / normalized 生产数据。  
**印刷源**：`DD_EN_COREBOX_CARDS_63x88_CURIO_FRONT_V2.pdf` 全 24 页（pdftoppm 300dpi）；对照 `DD_EN_COREBOX_RULES.pdf` R18「Roll for Provisions」图例；对照已确认 Curio 参照图标 `be17b4ee09`（Bleed）、`a637867634`（Blight）、`b4627031be`（Disease）。渲染与裁切仅在忽略缓存 `node_modules/.cache/phase3/q60-review/`。

## Q-60 是什么

`docs/rulings.md`：

- **问题**：Curio 效果栏中 17 个图标 ID 尚无获批语义，或词典将效果位图标归为 decor / curio_picture；是否修正这些卡面限定条目？
- **处理**：24 张入库并保留抽牌概率；未知行 `effect=null`；整卡不结算、不把未知图标推定为负面。
- **状态**：待 Kyries 确认。

`docs/phase3-curio-2026-10-11.md` 列出同一 17 个 ID；目前仅 `curio:p021` Sarcophagus 四行可结算，其余 23 张至少一行被 Q-60 阻塞。

## Kyries 确认表（17 个阻塞图标）

图例：**match** = 与已确认印刷/规则图例或同组已确认 hash 视觉一致，可提交合并确认；**mismatch** = 与所在词典分组或既有标签明显不符；**unverifiable** = 需 Kyries 命名，本刀不推定。

| 图标 hash    | 词典现状                                                            | 印刷观察（本刀）                                                               | 判定                                                                                                 | 阻塞的 Curio（页 / 名）                                                                                         |
| ------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `ae45f5bcb3` | needs_review；已有 proposal=`roll_for_provisions`；证据写 Core p.18 | 白补给骰 + 蓝色环绕箭头；与 R18「Roll for Provisions」图例一致                 | **match**（建议确认 proposal）                                                                       | p3 Heirloom Chest；p8 Strongbox；p10 Altar of Light；p15 Decorative Urn；p16 Holy Fountain；p20 Display Cabinet |
| `9b6a2b779d` | unreviewed；`group=bleed`；与已确认 `be17b4ee09` 同组               | 红血滴 + 黑描边 + 红晕；印刷 `1 {icon} 3t`，与 Curio Bleed 行式相同            | **match**（建议并入 Bleed / `be17b4ee09` 族）                                                        | p18 Iron Maiden；p19 Display Cabinet                                                                            |
| `12b6af97f2` | **词典未收录**                                                      | 红血滴，外观同 Bleed 族；印刷 `1 {icon} 3t`                                    | **match**（建议收录并并入 Bleed）                                                                    | p6 Stack of Books                                                                                               |
| `e546d025cd` | unreviewed；`group=g_b4627031`（与 Disease `b4627031be` 同组）      | 黄不规则斑块 + 内部黑孔 + 红晕；与 Disease 参照一致，**不是**绿色泪滴状 Blight | **match**（建议并入 Disease / `b4627031be`）                                                         | p17 Iron Maiden；p23 Suit of Armor                                                                              |
| `85e094f269` | confirmed `curio_picture`，但效果语义仍 null                        | 小幅人物插图（店主/货币场景），属插画容器                                      | **unverifiable**（插画已确认，但**奖励效果**未定；不能因插画推断饰品/金币）                          | p5 Stack of Books；p12 Bookshelf；p18 Iron Maiden；p22 Sarcophagus；p24 Suit of Armor                           |
| `1d9ad90d4a` | 词典未收录                                                          | 视觉同类人物插图框（似 curio_picture）                                         | **unverifiable**（需先收录并决定是否仅 decor/插画，以及有无奖励行）                                  | p7 Strongbox                                                                                                    |
| `3fe634e723` | status=decor「装饰 / 非图标」                                       | 效果栏内喜剧/悲剧面具卡面图；多页复现                                          | **mismatch / unverifiable**（词典标 decor，但出现在效果行；需 Kyries 决定是误标 decor 还是效果图标） | p3,6,8,9,11,12,15,17,18,19,22,23（12 张）                                                                       |
| `382acc9dc4` | status=decor                                                        | 效果栏内面具卡面图（同族）                                                     | **mismatch / unverifiable**（同上）                                                                  | p2 Eldritch Altar；p13–14 Confession Booth                                                                      |
| `449d2d43ed` | 词典未收录                                                          | 红边面具卡面图                                                                 | **unverifiable**                                                                                     | p1 Eldritch Altar                                                                                               |
| `7b1a554877` | unreviewed；`group=g_3fe634e7`（与 decor 面具同组）                 | 面具卡面图                                                                     | **unverifiable**                                                                                     | p5 Stack of Books；p20 Display Cabinet                                                                          |
| `3a7dfcb577` | unreviewed                                                          | 面具卡面图（金褐底）                                                           | **unverifiable**                                                                                     | p6 Stack of Books；p11 Bookshelf                                                                                |
| `3ae4312868` | unreviewed；`group=g_3a7dfcb5`                                      | 面具卡面图                                                                     | **unverifiable**                                                                                     | p7 Strongbox；p16 Holy Fountain                                                                                 |
| `3e2792bc5b` | 词典未收录                                                          | 面具卡面图                                                                     | **unverifiable**                                                                                     | p10 Altar of Light                                                                                              |
| `8b7f872f77` | 词典未收录                                                          | 面具卡面图                                                                     | **unverifiable**                                                                                     | p24 Suit of Armor                                                                                               |
| `40c4cc438c` | unreviewed；`group=debuff`；空语义                                  | 橙黄双向下 chevron；印刷旁有 `2t`                                              | **unverifiable**（有 debuff 分组线索，但无规则书命名批准，不推定）                                   | p1 Eldritch Altar；p4 Heirloom Chest                                                                            |
| `73ea0990dd` | 词典未收录                                                          | 蓝色双向上 chevron；印刷 `2t`                                                  | **unverifiable**                                                                                     | p2 Eldritch Altar                                                                                               |
| `3cd8b97ff0` | 词典未收录                                                          | 蓝色双向上 chevron；印刷 `2t`（与 `73ea0990dd` 同形）                          | **unverifiable**                                                                                     | p5 Stack of Books                                                                                               |

### 阻塞汇总

- **整卡可结算**：仅 `curio:p021`。
- **仍被 Q-60 阻塞**：其余 23 张。
- **若只批准上面 4 个 match 项**（`ae45f5bcb3`、`9b6a2b779d`、`12b6af97f2`、`e546d025cd`）：可解开部分行，但多数卡仍被面具 / curio_picture / chevron 行挡住，**不会**一次放开全部 23 张。

## 可粘贴的 Codex 确认文（仅 match 项）

> Kyries 确认 Q-60 批次（2026-10-12 目视，对照 CURIO_FRONT_V2 + Rules R18 + 已确认 Curio Bleed/Disease）：
>
> 1. `ae45f5bcb3` → 采用既有 proposal：`roll_for_provisions` /「掷补给骰」；status→confirmed；证据=Rules R18「Roll for Provisions」白骰+蓝环箭头。
> 2. `9b6a2b779d` → 并入已有 Bleed（参照 Curio `be17b4ee09`）；印刷行式 `1 … 3t`。
> 3. `12b6af97f2` → 词典新收并并入 Bleed（同形红血滴 + `1 … 3t`）。
> 4. `e546d025cd` → 并入已有 Disease（参照 `b4627031be`）；同组 g_b4627031；外观为黄斑块，不是 Blight 绿泪滴。  
>    其余 13 个 Q-60 ID（面具效果行、curio_picture 奖励语义、橙/蓝 chevron）**本次不批准**，继续 R-048 占位。  
>    不改生产数据直至 Kyries/Codex 显式执行词典 batch。

## Tile 几何 / 部署：图标以外仍需 Kyries 眼睛

| 项目                                 | 现状（事实）                                                                                                  | 是否还需 Kyries                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `room_tile:p001` Ritual Chamber 几何 | `room_tile_geometry.json`：`geometryVerified=true`，容量/高低地/邻接已入库（R-054）                           | 几何已定稿；**精确区域 polygon 仍未标注**（文档写明 bbox≠区域轮廓） |
| `room_tile:p001` 部署                | 同文件：`usable=true`，`deployment.printReview=verified`，英雄/怪物起点、宝箱、Cornered 已 confirmed（R-055） | **本页部署已 verified**；不自动推广到其他板块同形图标               |
| 其余 Room Tile                       | TILES_FRONT PDF **共 14 页**；规范化几何文件目前 **仅 1 张**                                                  | **是**：p2–14 几何 + 部署整页待核                                   |
| QuestMap 布局                        | 14 页已录入但全部 `pending`（Q-45）；p11/p12 特殊槽与红点 `semantic=null`（Q-47）                             | **是**                                                              |
| Q-59 起点侦察、光照表、陷阱缩放      | 仍待确认（phase3-scout / backtracking 文档）                                                                  | **是**                                                              |
| 容纳图标词典缺口                     | 部分 occupancy 变体 value=null / 未收录（ruins-room-tile-review）                                             | **是**（不因几何批准而命名）                                        |

## 本刀未做

- 未修改 `icon-dictionary-v1.8.json`、raw、normalized Curio / tile 生产数据。
- 未把面具图标命名为 quirk，未把 chevron 命名为 horror/buff，未把 `curio_picture` 推断为饰品奖励。
- 未重新渲染/提交 TILES 全 14 页几何（超出「先出确认表」；p001 数据已 usable）。

## 缓存路径（不提交）

- `node_modules/.cache/phase3/q60-review/curio-01..24.png`
- `node_modules/.cache/phase3/q60-review/crops/*`
- `node_modules/.cache/phase3/q60-review/rules-18.png`
