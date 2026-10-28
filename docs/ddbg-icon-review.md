# DDBG 图标复核清单（Kyries 勾选）

> 2026-10-12 正式确认：Kyries 已在本对话批准全部 17 个 Q-60 hash 与下表 01–24 手打效果行，记录为 R-064，词典 JSON / CSV 与 Curio 数据已同步。下方“仍待批 / 待词典改”是核对前的历史记录。01 以“抽负面怪癖”为准，早期“美德 / 折磨”口头说明作废。未列图标不推广；板块几何 / 部署仍须逐页核对。

**日期**：2026-10-12（Asia/Shanghai）  
**来源**：`docs/q60-icon-verification-2026-10-12.md`；裁切见 `node_modules/.cache/phase3/q60-review/crops/`；印刷 `CURIO_FRONT_V2` / `q60-review/curio-01..24.png`；规范化 `packages/data/normalized/corebox/curio.json`  
**规则**：R-048 — **不发明语义**。本清单只供勾选与填写你确认的含义；不改词典 / raw / normalized。

## 怎么用

1. 对照印刷裁切或 `curio-01..24.png` 看外观。
2. 认可则把该行 `- [ ]` 改成 `- [x]`。
3. 在「确认含义：」后填写你批准的语义（或写 `decor` / `仅插画` / `并入某某` 等）。
4. 选项仅供参考；不确定就留空或写「暂不批准」。
5. 未勾选 = 继续 Q-60 占位，不推定。

---

## Curio 01–24 手打对照（2026-10-12）

Kyries 手打效果义 vs 印刷效果行（`FRONT_V2` / q60-review / normalized `rows`）。

### 结论摘要

| 类                                       | 卡号                                                                                                                                                                                                                                               |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **顺序/数量/已知类型一致（OK）**         | **01–24 全部**（压力、流血/腐蚀、疾病、金币数额、补给骰、buff/debuff 2t 位置均与印刷一致；无缺漏/多余图标；无 bleed↔blight、buff↔debuff、金币数额错位）                                                                                            |
| **口头 vs 手打（01）**                   | 口头曾说「美德/折磨」，手打为「抽负面怪癖」。**印刷真相支持手打**：红边面具卡面图；与其它负面位同族；词典 `3deae1ab2a` proposal=负面怪癖；卡 06 同卡红面罩 + 金褐面罩并列，对应负/正怪癖，而非单次美德/折磨检定。口头「美德/折磨」视为被手打覆盖。 |
| **词典标签冲突（仍待批，非印刷顺序错）** | 面具族现多标 `decor`，但在效果行；`85e094f269`/`1d9ad90d4a` 词典为 curio_picture（仅插画），手打为「抽饰品卡」                                                                                                                                     |

### 逐卡（印刷顺序 = 手打顺序）

| #   | 名称             | 手打                                     | 印刷 iconId 序                                               | 判                                       |
| --- | ---------------- | ---------------------------------------- | ------------------------------------------------------------ | ---------------------------------------- |
| 01  | Eldritch Altar   | 压力+1，抽负面怪癖，debuff 2t，10金币    | `12438e9a49`，`449d2d43ed`，`40c4cc438c` 2t，10×`4bcefdb4d9` | OK（面具=负面；口头美德/折磨已否）       |
| 02  | Eldritch Altar   | 压力+1，抽负面怪癖，腐蚀1/3t，buff 2t    | stress，`382acc9dc4`，blight `a637867634`，`73ea0990dd` 2t   | OK                                       |
| 03  | Heirloom Chest   | 压力+1，抽负面怪癖，疾病，补给骰         | stress，`3fe634e723`，disease `b4627031be`，`ae45f5bcb3`     | OK                                       |
| 04  | Heirloom Chest   | 压力+1，腐蚀1/3t，debuff 2t，5金币       | stress，blight，`40c4cc438c` 2t，5×gold                      | OK                                       |
| 05  | Stack of Books   | 压力+1，抽负面怪癖，Buff 2t，抽饰品卡    | stress，`7b1a554877`，`3cd8b97ff0` 2t，`85e094f269`          | OK（饰品位 vs 词典 curio_picture：见下） |
| 06  | Stack of Books   | 抽负面怪癖，流血1/3t，抽正面怪癖         | `3fe634e723`，bleed `12b6af97f2`，`3a7dfcb577`               | OK（红/金褐面罩对）                      |
| 07  | Strongbox        | 流血1/3t，抽饰品卡，抽正面怪癖，5金币    | bleed `be17b4ee09`，`1d9ad90d4a`，`3ae4312868`，5×gold       | OK                                       |
| 08  | Strongbox        | 抽负面怪癖，疾病，10金币，补给骰         | `3fe634e723`，disease，10×gold，`ae45f5bcb3`                 | OK                                       |
| 09  | Alchemy Table    | 压力+1，抽负面怪癖，流血1/3t，5金币      | stress，`3fe634e723`，bleed，5×gold                          | OK                                       |
| 10  | Altar of Light   | 腐蚀1/3t，5金币，抽正面怪癖，补给骰      | blight，5×gold，`3e2792bc5b`，`ae45f5bcb3`                   | OK                                       |
| 11  | Bookshelf        | 压力+1，抽负面怪癖，流血1/3t，抽正面怪癖 | stress，`3fe634e723`，bleed，`3a7dfcb577`                    | OK                                       |
| 12  | Bookshelf        | 压力+1，抽负面怪癖，流血1/3t，抽饰品卡   | stress，`3fe634e723`，bleed，`85e094f269`                    | OK                                       |
| 13  | Confession Booth | 压力+1，抽负面怪癖，腐蚀1/3t，5金币      | stress，`382acc9dc4`，blight，5×gold                         | OK                                       |
| 14  | Confession Booth | 压力+1，抽负面怪癖，腐蚀1/3t，疾病       | stress，`382acc9dc4`，blight，disease                        | OK                                       |
| 15  | Decorative Urn   | 抽负面怪癖，流血1/3t，10金币，补给骰     | `3fe634e723`，bleed，10×gold，`ae45f5bcb3`                   | OK                                       |
| 16  | Holy Fountain    | 腐蚀1/3t，抽正面怪癖，5金币，补给骰      | blight，`3ae4312868`，5×gold，`ae45f5bcb3`                   | OK                                       |
| 17  | Iron Maiden      | 压力+1，抽负面怪癖，流血1/3t，疾病       | stress，`3fe634e723`，bleed，disease `e546d025cd`            | OK                                       |
| 18  | Iron Maiden      | 压力+1，抽负面怪癖，流血1/3t，抽饰品卡   | stress，`3fe634e723`，bleed `9b6a2b779d`，`85e094f269`       | OK                                       |
| 19  | Display Cabinet  | 压力+1，抽负面怪癖，流血1/3t，10金币     | stress，`3fe634e723`，bleed `9b6a2b779d`，10×gold            | OK                                       |
| 20  | Display Cabinet  | 压力+1，抽负面怪癖，10金币，补给骰       | stress，`7b1a554877`，10×gold，`ae45f5bcb3`                  | OK                                       |
| 21  | Sarcophagus      | 压力+1，流血1/3t，疾病，10金币           | stress，bleed，disease，10×gold                              | OK（无怪癖位，与手打一致）               |
| 22  | Sarcophagus      | 压力+1，抽负面怪癖，流血1/3t，抽饰品卡   | stress，`3fe634e723`，bleed，`85e094f269`                    | OK                                       |
| 23  | Suit of Armor    | 压力+1，抽负面怪癖，流血1/3t，疾病       | stress，`3fe634e723`，bleed，disease `e546d025cd`            | OK                                       |
| 24  | Suit of Armor    | 压力+1，流血1/3t，抽正面怪癖，抽饰品卡   | stress，bleed，`8b7f872f77`，`85e094f269`                    | OK                                       |

---

## 已批准（4 项 match + 本轮手打一致项）

以下已按 verification 文档建议确认；本清单不再要求重核：

- [x] `ae45f5bcb3` — Roll for Provisions / 掷补给骰（proposal 已有；Rules R18）— p3,8,10,15,16,20；**手打「投掷一次补给骰子」全一致**
- [x] `9b6a2b779d` — 并入 Bleed（参考 `be17b4ee09`；`1 {icon} 3t`）— p18,19
- [x] `12b6af97f2` — 词典新收并并入 Bleed — p6
- [x] `e546d025cd` — 并入 Disease（参考 `b4627031be`；非 Blight）— p17,23

### 本轮手打一致、建议勾选（仍待你在词典 batch 正式确认）

- [x] `40c4cc438c` — **Debuff 2t**（橙黄双向下 chevron + `2t`）— p1,4；手打 debuff 2t；词典 group=debuff、语义空
- [x] `73ea0990dd` / `3cd8b97ff0` — **Buff 2t**（蓝色双向上 chevron + `2t`，同形）— p2 / p5；手打 buff 2t
- [x] 负面怪癖面具族（效果行，**非 decor**；红/暗面罩卡图）— 手打「抽负面怪癖」；与 `3deae1ab2a` proposal 同族证据
  - `449d2d43ed` p1；`382acc9dc4` p2,13,14；`3fe634e723` p3,6,8,9,11,12,15,17,18,19,22,23；`7b1a554877` p5,20
- [x] 正面怪癖面具族（金褐面罩卡图）— 手打「抽正面怪癖」
  - `3a7dfcb577` p6,11；`3ae4312868` p7,16；`3e2792bc5b` p10；`8b7f872f77` p24
- [x] `85e094f269` / `1d9ad90d4a` — 手打 **抽饰品卡**（店主/货币场景小插图）— p5,7,12,18,22,24 / p7  
      **矛盾标记**：词典现为 `confirmed curio_picture`（仅插画、效果语义 null）。印刷位置与手打一致为奖励效果；是否改词典 key 仍待正式 batch，**此处按手打记「抽饰品卡」，并保留词典冲突标注**。

---

## 待核 / 矛盾保留

### 面具（原 Q-60 masks）— 手打已赋义，词典仍多 `decor`

效果栏内面具卡面图。裁切示例：`crops/3fe634e723-p3.png`、`382acc9dc4-p2.png`、`449d2d43ed-p1.png` 等。

- [x] `3fe634e723` — 确认含义：**抽负面怪癖**（手打；原 decor 标签与效果行冲突 → 待词典改）
- [x] `382acc9dc4` — 确认含义：**抽负面怪癖**（并入负面面具族）
- [x] `449d2d43ed` — 确认含义：**抽负面怪癖**（红边；01 口头「美德/折磨」已否，以手打+印刷为准）
- [x] `7b1a554877` — 确认含义：**抽负面怪癖**（`group=g_3fe634e7`）
- [x] `3a7dfcb577` — 确认含义：**抽正面怪癖**
- [x] `3ae4312868` — 确认含义：**抽正面怪癖**（`group=g_3a7dfcb5`）
- [x] `3e2792bc5b` — 确认含义：**抽正面怪癖**
- [x] `8b7f872f77` — 确认含义：**抽正面怪癖**

### curio_picture — 手打 vs 词典

- [x] `85e094f269` — 确认含义：**抽饰品卡**（手打）；**矛盾**：词典 `curio_picture` / 效果语义 null
- [x] `1d9ad90d4a` — 确认含义：**抽饰品卡**（手打；与上同形）；词典未收录

### Chevrons

- [x] `40c4cc438c` — 确认含义：**Debuff 2t**
- [x] `73ea0990dd` — 确认含义：**Buff 2t**
- [x] `3cd8b97ff0` — 确认含义：**Buff 2t**（并入 `73ea0990dd`）

---

## Tile 几何 / 部署备忘（非本清单勾选主体）

| 项目                                 | 现状                                                          | 是否还需眼                           |
| ------------------------------------ | ------------------------------------------------------------- | ------------------------------------ |
| `room_tile:p001` Ritual Chamber 几何 | `geometryVerified=true`（R-054）                              | 精确区域 polygon 仍未标（bbox≠轮廓） |
| `room_tile:p001` 部署                | `usable=true`，`printReview=verified`（R-055）                | 本页已 verified；不自动推广到其他板  |
| 其余 Room Tile                       | TILES_FRONT 共 14 页；规范化几何目前仅 1 条                   | 是：p2–14 几何 + 部署                |
| QuestMap 布局                        | 14 页 `review: confirmed`（R-065 / R-123 / R-118 / R-119）；Q-45 边缘房等仍延后 | Q-59 / Q-63 等仍待裁定               |
| Q-59 起点侦察、光照表、陷阱缩写      | 仍待确认                                                      | 是                                   |
| 容纳图标词典缺口                     | 部分 occupancy value=null / 未收录                            | 是（不因几何批准而命名）             |

---

## 缓存路径（不提交）

- `node_modules/.cache/phase3/q60-review/curio-01..24.png`
- `node_modules/.cache/phase3/q60-review/crops/*`
- `node_modules/.cache/phase3/q60-review/rules-18.png`
- `node_modules/.cache/phase3/curio/FRONT_V2-1..24.png`

<!-- updated by curio 01-24 typed compare 2026-10-12T08:20:03.745Z -->
