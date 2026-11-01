# K-001 · White Cell Stalk Reconstitute

日期：2026-11-01；基线：`fd04788c`（Displace #486）。

依据：monster_medium FRONT p104、已 confirmed 的 target_effects / heal / buff / range 图标；R-001 / R-048，规格书 R20–24。Reconstitute 指定 Mammoth Cyst，射程 2，治疗 14、Buff 2t，无 Acc。

- 入库 slot 1 verified 计划，保留原始双 heal 图标签名，不改原始文字。
- `playMonsterSkill` 对该卡 slot 1 分派专用友方结算；沿用 Collected Vestal 的射程上限与高地修正、状态堆、回合结束处理，不伪造攻击骰。
- 只接受 White Cell Stalk 自己的怪物回合与存活 Mammoth Cyst。已保存技能/目标不匹配沿用入口拒绝；未知区域与无通路拒绝。
- 单测通过公开命令覆盖治疗 14、Buff 2t、治疗封顶、错误目标、死亡、不可达、错误回合、保存选招冲突、确定性与输入不变；RNG 与仅结束回合相比不多消耗攻击骰。

验证：专项 3 文件共 17 测通过；build 通过（已有 Vite 警告）；改动文件 ESLint / Prettier 通过。全量 typecheck 仍有上一刀记录的 5 处未改动路径类型错误，本次新增文件无类型错误。全量 lint / test 的上一刀失败记录见 Displace 验收文档，本刀不重复运行无关失败集。

边界：K-001 两招均已接最小结算；Teleport、完整自动选招、生产几何、combatReady 仍 hold。未增加 UI 或任务白名单，非阶段收尾，不新增 Playwright 路径。
