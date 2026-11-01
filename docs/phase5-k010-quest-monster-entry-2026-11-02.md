# K-010 · 两项任务指定怪物入场（R-142）

按 Kyries 更正后的确认，Bone Bearer Speed2 及完整姿态表入库，ranged 以显式不可选组表示。Wicked Surge 使用已核实的 Debuff2t、压力1；Self Push1 复用自身位移；Unholy Rally 按完整卡面治疗最重伤友方全部伤口并加 Buff2t，无攻击骰。Wicked Surge 也不消费攻击骰，事件 roll 为 null，不改变其它怪物的随机序列。

Break Them / They Are Back 的指定单怪部署可进入完整战斗。跨级 Bone Bearer 只接受对应真实实例；伪造实例和普通随机遭遇替代仍拒绝。Bone Captain 的 Life+20/Dodge+2 在实体及运行时卡片上保持一致，原始规范化卡片不改。不洗牌、不填满四姿态，不放开其它任务准入。

验证：相关11文件156测通过，含规范化、完整d10区间、两项公开部署入场、友方治疗、无Acc技能及伪造实例拒绝。typecheck、build、改动 TypeScript 文件 ESLint/Prettier 通过。完整单元套件及完整 lint 仍沿用既有未全绿记录，本 PR 不声称全量通过。

补查 Collector 三组33测通过；battle-monster-retarget 三测失败，在本次修改前主干 ee33dba7 独立 worktree 全部复现（射程夹具、缺少旧选择窗、跳过攻击断言）。保留原断言，不把既有失败记作通过。

依据：R-142；官方规则书 R19–20/R24；QUEST p009/p013 与怪物 FRONT p016–17。范围仅 K-010，未批准 Phase 6。
