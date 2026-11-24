# C-011 第一刀：Necromancer I 死亡清场与技能召唤

基线：`main` @ `2d4f1ea`。本刀只接 I 级战斗，不收任务卡、几何、II/III 或 Phase 6 hold。

## 依据

- 规格书 §14.4–14.5，官方规则书 R20、R31、R38；已对照本地 PDF 的三页图像，R20 规定目标效果只在命中时发生。
- R38：Boss 被击败后移出其他怪物；I 级预备 Bone Rabble，技能召唤放首个空姿态、目标区域，先攻加入当前牌堆。
- `docs/rulings.md` R-034：满轨无效；满区挤占英雄到最近可用区域，被怪物占满则玩家选怪物移走。复用 `PendingChoice`，同距落点交玩家选择。
- 印刷卡图像与 extract / normalized：`boss_ability:p004`、`monster_medium:p089`、`monster_medium:p040`。前两招的整行必须精确匹配已确认的 Self Push 1 + Target Summon Bone Rabble；其他内容仍拒绝。

## 运行时

- `removeCasualties` 统一接 R38 清场，覆盖技能伤害、回合开始状态等死亡入口。伴战怪物保留日志身份，标记退出战场，不增加伤口或永久移出怪物牌池；旧尸体不重复补位。
- `playMonsterSkill` 前两招保留原射程、共享攻击骰与自身 Push，完成自身阶段后在目标区域执行一次召唤原语。全部落空不召唤；满轨不洗先攻、不消耗召唤 RNG。
- 属性从已核实卡读取，不补默认 Dodge；先查战斗目录，必要时读 dungeon 的 battleCatalog。未知容量、缺卡或没有挤占去处明确拒绝。
- 召唤物先攻插入当前牌堆，按当前姿态可在当轮行动；选择续接不重掷、不重复伤害或结束回合。
- `necromancerSummon` 待选只在现有战斗选择 UI 中显示；不新增存档协议。

## 验证与保留项

`necromancer-i-combat-runtime.test.ts` 使用真实 normalized 技能，覆盖前两招、自身位移、当轮行动、确定性 / 输入不变、满轨、满区待选、拒绝回滚、攻击与 Blight 死亡清场。

本刀相关 7 文件共 99 测试通过（新增 9 条）；typecheck、build、改动代码 ESLint / Prettier 通过。原 `necromancer-i.test.ts` 对旧 hold 文案 `/applyCommand/` 的断言已对齐现有 `R-121` 文案，未修改任务卡实现。

全量 test / lint 未绿：干净 `2d4f1ea` 副本同样复现 normalized 生成数据及自然流程 / 存档等测试失败、10 个 ESLint 错误和 72 个文件的 Prettier 提示。本机 `pnpm lint` 另扫到未跟踪 `.cache` 启动脚本；这些缓存不提交，本刀不夹带无关清理。

C-011 总项继续未勾选：卡面自动姿态选招、第三招 Six Feet Under（纯压力 + 召唤）及完整 AI 留 C-012；本刀没有声称可以从正式出征走完该 Boss。R-121、Boss 房间几何和 II/III 保持原 hold。
