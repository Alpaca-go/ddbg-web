# Weald 地点内容导入

日期：2026-11-11。第一批：复用核心包提取器，建立完整地点文字与图标位置数据。**这批不是可玩地点的交付，正式战役入口仍未开放。**

## 数据位置

`packages/data/extract/extension/weald/raw/` 新增九类：monster_medium、monster_large、boss_ability、curio、room、stygian_room、quest、dungeon_tile、punchboard。
怪物另有同目录 `parsed/monster_medium.json` 和 `parsed/monster_large.json`。
全部非英雄 ID 为 `<category>:weald:pNNN`，兼容现有内容包隔离。既有英雄 raw / parsed 原样保留。

| 类别                     | 实际印刷卡/页数 | 去重后条目 |
| ------------------------ | --------------: | ---------: |
| monster_medium           |              25 |         15 |
| monster_large            |              15 |         14 |
| boss_ability             |              21 |         21 |
| curio                    |              16 |         16 |
| room（含 Boss）          |              12 |         12 |
| stygian_room             |               9 |          9 |
| quest                    |              15 |         15 |
| dungeon_tile（每页双面） |               6 |          6 |
| punchboard（双面）       |               1 |          1 |

副本依核心算法保留 `pages`、`copies` 和 `copy_variants`，不能按去重后条目数建实际牌堆。打孔板保留真实 trim_mm，使用通用 punchboard sheet 类别，不套核心盒尺寸。

## 重跑

在仓库根目录，安装核心提取器的 Python 依赖 PyMuPDF、Pillow、imagehash、numpy 后执行：

```powershell
py -3 tools/pipeline/extract-print/scripts/extract_weald_location.py --input 'C:\Users\kyrie\Desktop\新建文件夹\DARKEST DUNGEON EN_FILES'
```

可用 `--out` 指定审阅输出目录。输入是 EN_FILES 根目录。脚本先检查全部十八份 PDF 是否存在，再提取；不清空输出目录。缓存仅在忽略目录 `node_modules/.cache/weald-extract/`。不提交 PDF、PNG 或图标切图。

加 `--review` 生成私有本地审阅页 `node_modules/.cache/weald-review/cards/index.html`，包含所有去重条目的正反面图像和提取文本。标题保留全部副本页码，图像展示首份副本，点击可看原尺寸。页面、218 张整卡图及图标裁切均不入库。

页尾图标区展示非 decor 聚类的裁切、来源卡页与词典同 ID 的候选含义。候选仍须对图核实，不能自动批准；decor 聚类则在整卡审阅时核对。

图标 ID 是本批感知聚类结果，不以其空间位置映射核心词典，也不自动批准语义。`decor` 是提取器启发式标记，需要卡面复核，不能当作人工核准。
parsed 的 `issues` 和 `failures` 显式保留失败；成功解析也只表示结构完整，不代表图标或战斗数值已获核准。

## 解析停点

- medium p1–3 Ectoplasm 的重复 slot 1 已修复：Weald 使用 14pt 的技能徽章定位下限，区别 17.46pt 徽章与 11pt 召唤数量。核心提取器保留原有默认参数。只修版面定位，不改变印刷效果。
- medium p20–22 Brigand Pounder：未取得类型/位置行。不得自填标签。
- large p7–9 Shrieker’s Nest：无普通技能块，需专属卡面结构。
- large p13–15 Cauldron Empty：无普通技能块，需专属空/满锅结构。
- medium 与 large 中其余结构完整条目仍须逐卡核实。参考卡不能额外算大型单位副本。

## 后续顺序与 Q-186

沿用核心包 raw → 图标/卡面/几何审阅 → normalized → 引擎 → UI 的顺序。

1. 对照当前印刷正反面核实上述解析停点；核实当地怪物牌堆、等级和大型卡对应。
2. 转录与审阅奇物、任务和普通/Stygian 房间效果、房间分布、当地与通用牌堆边界。
3. 核实 12 面板块几何、零容量区域与真菌放置标记。仅已确认字段进入 normalized。
4. 接入 W-03 零容量通行/回合结束限制、W-04 全场禁疗与技能摧毁。
5. 完成三 Boss 各等级数据、能力与附属单位脚本，加入启用地点的 Boss 池。
6. 最后开放任务选择、出征、回村、升级与存档回放，并增加 1–3 条关键路径浏览器冒烟。

Q-186 是这批卡面与几何的待审项，未新增 Kyries 裁定。规则依据见 [Weald 规格书](spec/weald-rules-spec-v0.1.md) W-01–W-05、R-001、R-048。

本批只涉及提取数据与 schema 校验，没有新增 UI 或战斗行为，因此未为其添加浏览器用例。

## 验证结果

- 最终环境：Node 24.21.0、pnpm 12.9.1。
- `pnpm typecheck`、`pnpm lint`、`pnpm build` 通过。
- `pnpm test`：481 个文件通过；3,674 测通过、1 测沿用既有跳过，耗时 1,192.49 秒。
- 针对 Weald 与核心导入完整性的两个文件：21 测通过。
- 私有审阅页生成成功：218 张正反面整卡图、302 个非 decor 图标裁切；抽查整卡与 Life 图标裁切位置。
- `git diff --cached --check` 通过；暂存内容没有 PDF、PNG 或其他美术文件。
