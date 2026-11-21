# Cove 奇物逐卡审阅（首批）

状态：**印刷已导入 16 张；压力与补给骰两图标沿用核心词典；其余 52 行保留 Q-186 停点，待 Kyries 逐卡核准。**

来源：`DD_EN_COVE_CARDS_63x88_CURIO_FRONT.pdf` / `BACK.pdf`（MG_DD_05_EN_COVE）**p1–16**。背面均为同一 Curio 图案，不提供额外效果。

## 已核对卡名（FRONT 逐页）

| 页码 | 名称                   |
| ---- | ---------------------- |
| p1   | Barnacle Crusted Chest |
| p2   | Barnacle Crusted Chest |
| p3   | Bas Relief             |
| p4   | Bas Relief             |
| p5   | Brackish Tide Pool     |
| p6   | Brackish Tide Pool     |
| p7   | Eerie Coral            |
| p8   | Eerie Coral            |
| p9   | Fish Idol              |
| p10  | Fish Idol              |
| p11  | Fish Carcass           |
| p12  | Fish Carcass           |
| p13  | Giant Oyster           |
| p14  | Giant Oyster           |
| p15  | Ship’s Figurehead      |
| p16  | Ship’s Figurehead      |

## 运行边界

- ID 为 `curio:cove:p001`–`p016`，16 张实体卡，共 64 行，不按同名合并。
- 仅 `12438e9a49`（压力 +1）与 `ae45f5bcb3`（补给骰）写入效果；其余行的 Cove 专有图标 hash 不在全局词典，按 R-048 保留 `effect: null` 与 **Q-186**。
- 未开放 Cove 地点出征；`locationCurioPool` / `curioPoolSchemaForLocation("cove")` 仅登记目录，供内容包过滤测试。
- 提取命令：`python3 tools/pipeline/extract-print/scripts/extract_cove_location.py --input <EN_FILES 根目录>`。
