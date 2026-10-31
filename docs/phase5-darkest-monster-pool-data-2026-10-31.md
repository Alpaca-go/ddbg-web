# 核心数据：最暗地牢普通怪物牌池

基线 main `03e93d7`（#403 已合入）。Kyries 要求暂缓小问题，优先接入核心包数据。本刀接入最暗独立牌池数据，不继续零碎流程修补。

依据：官方核心规则书 R35–36、规格书 §14.7，R-001 / R-048。已目视 R35/R36 完整页图和当前印刷怪物 FRONT M63/M66/M69/M72/M75/M78/M80/M83/M86 完整卡面；各份数沿现有 raw/normalized 页组逐一校验。R35 要求最暗地牢移除此前全部怪物，只用最暗怪物，且全为 III 级。印刷卡仅提供身份/卡文/数字，不补规则。

| 身份              | 印刷页组 | 张数 | 前后排 |
| ----------------- | -------- | ---- | ------ |
| Ascended Brawler  | M63–65   | 3    | Front  |
| Ascended Witch    | M66–68   | 3    | Back   |
| Rapturous Cultist | M69–71   | 3    | Front  |
| Cultist Priest    | M72–74   | 3    | Back   |
| Malignant Growth  | M75–77   | 3    | Front  |
| Flesh Hound       | M78–79   | 2    | Front  |
| Polyp             | M80–82   | 3    | Back   |
| Antibody          | M83–85   | 3    | Front  |
| Defensive Growth  | M86–88   | 3    | Back   |

共 9 种 / 26 张，Front 14 / Back 12，均为单姿态位普通怪物。输出 `darkest_monster_pool.json`，由 `buildNormalizedCorebox` / `writeNormalizedCorebox` 再生；提供 Zod schema 和实体身份展开函数。Boss 与召唤物 M89 及以后、所有大型 Boss、不在这 26 张普通池中。Common/Ruins 的原 62 张目录不变，不把最暗怪物追加到普通战役池。

每张记录已有战斗卡引用、等级、页组与缺项。当前九种均缺独立获批 Speed / stanceGroups，`battleReady: false`，实体展开不带 SpawnCard 的 `verified` 标记；本刀不把图标可命名当成整卡可战斗，不改入场白名单，不擅自批准数值或几何。后续核实技能与选招后再接最暗遭遇。

验证：5 文件 / 21 条相关数据测试通过，覆盖再生、26 份身份唯一性、地点/等级/排位/份数/来源漂移拒绝，以及 Boss/召唤物与普通池隔离；typecheck、build、本次 TS 文件 ESLint/Prettier 通过。全仓既有规范化快照等失败沿 #400 记录，本刀只写新目录，不顺带再生旧卡，不声明全仓全绿。私有 PDF、卡图和核对拼图均未提交。
