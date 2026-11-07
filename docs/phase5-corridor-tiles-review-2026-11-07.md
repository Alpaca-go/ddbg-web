# Q-161 收口：无核心盒走廊板块；8 页误标 + PvP/教程页（2026-11-07）

**结论（Kyries 2026-11-07）**：

- `DD_COREBOX_TILES_FRONT.pdf` 的 **p6、p7、p9–p14** 是 **8 页 Boss 房间板块**（16 面，属 25 面已核实房间），不是走廊；`ports` 1-2…10 是 Prophet Room 的 **Wooden Pews d10 区域标记**（词典 `096ea91bb9`）。
- `TILES_FRONT p8` 与 `TILES_BACK p8` 是 **PvP 地形**（首版不做）。
- `TILES_BACK p1` 是 **Old Road 教程地图**（不做）。
- 两个 PDF 共 **28 页**，减去这 3 页 = **25 页 = 25 张任务/房间板块**，与 `room_tile_geometry.json` 的 25 面一一对应。
- **核心盒没有走廊板块**；`corridor_tile_geometry.json` 全部作废，引擎未使用。

## 25 张房间板块

- 25 面全部 `geometryVerified: true`，各有裁定（R-054 / R-065 / R-066 / R-144 / R-153 / R-156–R-169）。
- 17 面 `usable=true`；8 面 Boss 房间 `usable=false` 是既有标记（Boss 走专属部署，R-162–R-169），不是几何缺口。

## Prophet Room（p006）复核

- 容量 A4/B3/C3/D3/E3/F4/G3/H3、部署 C/D/E/H 与用户卡面一致。
- 11 条共享边、3 条角点（1-2↔6、3↔7-8、4↔6）与 R-167 一致；D–H 共享边确认存在，数据不变。

## 处置

- Q-161 关闭；`corridor_layout_bindings` 不建，探索仍用抽象边（R-116 只批了 QuestMap）。
- `corridor_tile_geometry.json` 及 corridor-tile 生成器/测试为死数据，可另开一刀移除（本刀只记录结论）。
- PvP 地形与 Old Road 教程页不进入首版数据。
