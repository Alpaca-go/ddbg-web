# Cove 打孔板审阅（2026-11-28）

状态：**印刷 FRONT 已导入 1 页；盒内未见 Punchboard BACK。** 仅登记 `packages/data/extract/extension/cove/raw/punchboard.json`（`ddbg-raw-v1` / `kind: sheet`）。不建 normalized、不接运行时或 U-04 立牌映射。

依据：Cove 印刷包 + `docs/rulings.md`（R-001）；不自发明几何或未核实图标（R-048）。印刷 PDF 不提交仓库。

## 来源与范围

| 项目         | 内容                                                  |
| ------------ | ----------------------------------------------------- |
| 文件         | `MG_DD_05_EN_COVE/DD_EN_COVE_PUNCHBOARD_FRONT.pdf` p1 |
| BACK         | **无**（盒内未找到；`sources[].back` = `null`）       |
| 版面 trim    | 145.0 × 95.0 mm（不按核心盒 `punchboard_*` 尺寸类别） |
| Canonical ID | `punchboard:cove:p001`（1 页 / 1 条目）               |

重跑提取（本地 EN_FILES 根目录；仅需 FRONT PDF；`assemble` 允许 `back=None`，见 `ddbg_extract/assemble.py`）：

```bash
# 将 DD_EN_COVE_PUNCHBOARD_FRONT.pdf 置于
#   <EN_FILES>/DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_05_EN_COVE/
# 在仓库根目录用 Python 依赖 PyMuPDF 运行 stage1 + assemble，
# K.SOURCES = [('punchboard', <front_rel>, None, 'sheet', 'extension')]
# 再将 card.id 中 :extension: 替换为 :cove: 写入
# packages/data/extract/extension/cove/raw/punchboard.json
```

Weald 侧已有一键脚本 `extract_weald_location.py`（含双面 punchboard）；Cove 盒内无 BACK 时 **不要** 强行登记 `DD_EN_COVE_PUNCHBOARD_BACK.pdf`。

## 印刷物件盘点（FRONT p1）

| 类型                 |      数量 | 可读文字 / 编号             | 备注                                                                |
| -------------------- | --------: | --------------------------- | ------------------------------------------------------------------- |
| 英雄立牌（拱形剪影） |         2 | `MAN-AT-ARMS`、`FLAGELLANT` | 与 Weald 打孔板同为 2 名扩展英雄立牌；各 1 枚，底部 DwarvenAxe 标签 |
| 其他指示物           | 0（本页） | —                           | 无额外 token／筹码文字；粉线模切区不编运行时语义                    |

提取器 `lines` 合并为单段：`MAN-AT-ARMS FLAGELLANT`；`icons` 为空（无带 hash 的图标聚类）。

## 与仓库前例的对照

- **可循模式**：Weald `extract/extension/weald/raw/punchboard.json`（`category: punchboard`、`punchboard:<pack>:p001`、保留真实 `trim_mm`）。ID 规范 §3 注明 punchboard **目前只有 raw**。
- **未做**：`src/<pack>/punchboard/`、normalized JSON、引擎／UI 接线、`tools/pipeline` Cove 脚本默认列表（当前 `extract_cove_location.py` 未含 punchboard 且假定双面 PDF）。

## 停点（Q-186）

- 立牌模切几何、Rubine 刀线及 PNG 导出：**Q-186**；沿用 R-048，不写入全局图标词典。
- 英雄立牌与 `hero_stat:cove:*`／桌面 `punchboard_token` 占位映射：**U-04** 仍未裁定；本批不映射颜色或 slug。

## 内容包隔离

- `cardContentPack` → `cove`；条目仅在启用 Cove 内容包的数据上下文中出现。
- 不修改核心／Weald 打孔板 raw；不改 `icon-dictionary`。

## 明确未做

Boss／Stygian／英雄 II·III 切片、零容量运行时、任务卡全流程、图标词典、印刷几何导出脚本扩展、出征与战役入口。
