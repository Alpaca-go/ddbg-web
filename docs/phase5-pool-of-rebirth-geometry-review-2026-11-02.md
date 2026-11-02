# Pool of Rebirth 正式几何与房间效果来源

基线：main `c5cdc1de`（#540）。Kyries 已明确回复“确认本面几何和部署”，记为 R-144；本面已入库，usable=false。

来源：当前版 `DD_COREBOX_TILES_FRONT.pdf` p9，印刷最暗编号1；raw `dungeon_tile:p009` front；配套卡 `room:p014` Pool of Rebirth。不是遗迹编号9，也不是QuestMap。已查看当前本地完整印刷PNG。依据R16/R17部署、R18容量、R25高地、R-021共享边界/角点/墙、R-048不自创几何。

本地标字预览：`D:\ddbg-web\.cache\pool-of-rebirth-labelled-review.png`。字母只定位区域，不改原图；图像不入库。

| 区域 | 图上位置     | 获批容量 | 获批地形 | 印刷部署/标记                                                                |
| ---- | ------------ | -------- | -------- | ---------------------------------------------------------------------------- |
| A    | 左上         | 2        | normal   | 英雄support                                                                  |
| B    | 上中         | 3        | normal   | 无                                                                           |
| C    | 右上         | 2        | normal   | 英雄ranged                                                                   |
| D    | 左侧第二格   | 2        | normal   | 无                                                                           |
| E    | 中左小方格   | 2        | normal   | 怪物aggressive                                                               |
| F    | 红色中央大区 | 6        | normal   | 星形图标4591aebebd，按R-145绑定ROOMS FRONT p14区域效果；不因红色地面推断低地 |
| G    | 右侧高台长格 | 2        | high     | 怪物ranged                                                                   |
| H    | 左侧第三格   | 3        | normal   | 无                                                                           |
| I    | 中下不规则格 | 3        | normal   | 怪物support                                                                  |
| J    | 左下         | 2        | normal   | 英雄defensive                                                                |
| K    | 下中         | 3        | normal   | 怪物defensive                                                                |
| L    | 右下         | 3        | normal   | 英雄aggressive                                                               |

获批可通行邻接（无向，14条）：A-D、B-C、B-F、C-G、D-E、D-H、E-F、F-G、F-H、F-I、H-J、I-K、I-L、K-L。

获批仅角点（9条，不可跨越）：A-E、B-E、B-G、C-F、D-F、E-H、F-J、F-K、G-I。

A-B、J-K、G-L由黑色空区隔开，不补通路。其它未列区域对不视为邻接。图上未见宝箱；不将中央红色地面解释为伤害区。部署：英雄A→L、D→J、R→C、S→A；怪物A→E、D→K、R→G、S→I。

本次仅将本面几何入库，保留usable=false；完整部署/移动/特殊区域运行时验收后再开放本面。其它最暗房间、Boss房、Pit Toss/Teleport及最终战几何不随本面批准。

后续R-145：Kyries提供截图确认TILES FRONT p9→ROOMS FRONT p14。星标按对应房间卡读取效果，不按颜色/形状套Damage或其它房间效果。F区按原文记录回合结束时的Stress与Heal效果；清场复活是独立整房特殊效果。全局词典不改，两段runtimeReady均保留false。

## 接线与验证

新增独立Pool of Rebirth schema，并按strictObject投影锁定整面，拒绝容量、邻接、部署、来源和usable漂移。room_tile_geometry生成目录由9面增至10面，可战面仍为9；不修改默认遗迹房间池。raw/parsed、词典、卡图和印刷资料未改动。规范化再生8测与几何相关4文件17测通过；质量检查结果见PR。

新增效果来源绑定校验：生成管线核对room:p014身份、当前FRONT文件、页码14和完整六行效果文字/图标签名。区域效果与整房清场复活分开保存，不在本次补充未经确认的结算顺序或复活状态。

最终验证：Node24.21.0/pnpm12.9.1，typecheck、lint、build通过。几何入库版本全量381文件/2951测通过；随后R-145效果来源绑定变更经全部data测试与三组相关引擎场景共64文件/267测通过，追加图标缺失拒绝5测通过。不将前一次全量结果表述为效果绑定后的单次全量运行结果。本轮无UI及可战准入变更，不增加Playwright路径。
