# 走廊板块几何核对稿（Q-161）

状态：待 Kyries 确认。9 张 `corridor_tile:p006`–`p014` 全部 `review: pending`、`geometryVerified: false`、`segments: []`；`corridor_layout_bindings.json` 的 `bindings` 为空。

来源：`DD_COREBOX_TILES_FRONT.pdf` p6–p14（front）。只读缓存，不入库。

## 逐面待确认

| 板块                 | 页  | 已入库连接口标签            | 区域数 | 共享边 | 仅角点 | 灰点（必须停留） | 容量 / 其它 |
| -------------------- | --- | --------------------------- | ------ | ------ | ------ | ---------------- | ----------- |
| `corridor_tile:p006` | p6  | 1-2、3、4、5、6、7-8、9、10 | ?      | ?      | ?      | ?                | ?           |
| `corridor_tile:p007` | p7  | （无）                      | ?      | ?      | ?      | ?                | ?           |
| `corridor_tile:p008` | p8  | 1、2、3、4、5、6、7、8、9   | ?      | ?      | ?      | ?                | ?           |
| `corridor_tile:p009` | p9  | （无）                      | ?      | ?      | ?      | ?                | ?           |
| `corridor_tile:p010` | p10 | （无）                      | ?      | ?      | ?      | ?                | ?           |
| `corridor_tile:p011` | p11 | （无）                      | ?      | ?      | ?      | ?                | ?           |
| `corridor_tile:p012` | p12 | （无）                      | ?      | ?      | ?      | ?                | ?           |
| `corridor_tile:p013` | p13 | 1-2、3-4、5-6、7-8、9-10    | ?      | ?      | ?      | ?                | ?           |
| `corridor_tile:p014` | p14 | 1-2、3-4、5-6、7-8、9-10    | ?      | ?      | ?      | ?                | ?           |

## 缺口说明

- 目前每张只有「连接口标签 + bbox 中心」这批 span 可证的数据；**没有区域、共享边、仅角点、灰点、容量**。
- `pendingReasons` 记录：段内通道 / 灰点 / 容量未批（Q-45 / R-046）；QuestMap 边 ↔ 板块实例映射未批，引擎探索仍用抽象边。
- `corridor_layout_bindings.json` 仅 `{ schema, review: "pending", bindings: [] }`。

## 确认后录入方式

1. 按房间板块流程逐面标注：区域（含容量/高低地）、共享边、仅角点、灰点、走廊端点与朝向。
2. 写入 `corridor_tile_geometry.json` 的 `segments`，把 `review` / `geometryVerified` 改为 confirmed/true。
3. 再补 `corridor_layout_bindings.json` 的 QuestMap 边 ↔ 板块实例映射（R-116 目前只批了 QuestMap，不批走廊绑定）。
4. 不改引擎探索路径；绑定接线单独切片。

## 现状影响

- 探索仍按抽象边推进，走廊板块只影响展示与后续绑定；未确认前不推定形状、连接或灰点。
