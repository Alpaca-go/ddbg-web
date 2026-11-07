# Q-161 核对：p6–p14 里 8 页是房间板块，p008 待确认（2026-11-07）

**结论（Kyries 2026-11-07 确认）**：`DD_COREBOX_TILES_FRONT.pdf` **p6、p7、p9–p14** 是 **8 页 Boss 房间板块**（16 面，属已核实的 25 面），不是走廊板块。`corridor_tile_geometry.json` 里对应这 8 页的 `ports`（1-2、3、4、5、6、7-8、9、10）是 **Prophet Room 的 Wooden Pews d10 区域标记**（词典 `096ea91bb9`），不是走廊出口。

**唯一例外：p008**。它没有对应的 `room_tile_geometry` 面，原始 span 是 **1、2、3、4、5、6、7、8、9**（9 个编号），可能是走廊/交叉口或其它组件，待 Kyries 看一眼 p8 卡面确认。

## 25 张房间板块状态

- 25 面全部 `geometryVerified: true`，均有各自裁定（R-054 / R-065 / R-066 / R-144 / R-153 / R-156–R-169）。
- 17 面 `usable=true`（普通房间与已开运行时房间）；8 面 Boss 房间 `usable=false` 是既有标记（Boss 走专属部署与 R-162–R-169 切片），不是几何缺口。

## Prophet Room（p006）复核

- 容量：1-2=4、3=3、4=3、5=3、6=3、7-8=4、9=3、10=3 → A4/B3/C3/D3/E3/F4/G3/H3，一致。
- 部署：4=英雄 aggressive、5=英雄 support、6=怪物 aggressive、10=英雄 ranged+defensive → C/D/E/H，一致。
- 11 条共享边与 3 条角点（1-2↔6、3↔7-8、4↔6）与 R-167 一致；**5↔10（D–H）共享边经确认存在**，数据保持不变。

## 处置

- p006、p007、p009–p014 的走廊提取作废；不按走廊补几何、不改引擎探索或 QuestMap 绑定。
- p008 待确认后再决定：若为走廊/交叉口，另开 Q 建来源与几何；若为房间，补 room tile。
- `corridor_layout_bindings.json` 仍为空；在 p008 定性前不建绑定。
