# Phase 4：Hellion I Sharpen Spear

#184已按本轮指令合并（head `bc05e8e`，main `a7def6b`），提交与上一轮本机114文件/1055项测试、typecheck、lint、build和村庄冒烟通过的版本一致。本轮按用户最新指令只使用本机质量闸门，不再检查远端Actions。从main建立 `codex/phase4-sharpen-spear`。

已目视核对Hero_STAT_FRONT p3完整卡面，并对照规范化I级Hellion数据：Sharpen Spear = Self Buff 5t，图标 `ef29ccfbe0` 已confirmed/buff。依据规格书§4.4/§7、R33、R20–21、R-001/R-048。只接I级，不外推II/III数值；Highwayman Clean Guns的 `bc2c444070` 仍unreviewed，不按图形/技能名猜测，保持未接通。

复用既有Self状态/被动原语新增独立Buff5t，旧堆保持，不套目标抗性/免疫；同步顶层与combat状态投影。只完成当前Hellion当天的一次行动，不收费、不占建筑、不掷骰、不减压/治疗、不移除看守人、不提前结束当天。与Intimidate二选一，做完Sharpen Spear不能继续用Intimidate。村庄天数不消耗战斗持续时间，实际战斗回合开始沿状态计时原语减一。

公开技能命令新增 `sharpenSpear` 并纳入Zod存档校验。UI仅当前可行动的I级Hellion显示该选项。四项新增测试覆盖旧Buff/Debuff与投影、Self抗性例外与计时、错误身份/未核实属性/II级/坏状态/越序原子拒绝、真实seed2回村至准备结束保存回放。真实日志为Fundraiser提前退出/不捐献/零XP回村，不称任务成功；村庄按墓地→Sharpen Spear→酒馆→Chant继续，保留Buff5t与Chant另一个Buff3t，不注入状态或缩减牌池。

既有一条村庄浏览器冒烟追加两个Hellion选项展示、实际Sharpen Spear派发、推进到Highwayman、金币不变，以及保存刷新后Buff5t不重复发放。总冒烟保持7条，其余六条本主题不重复运行。下一次出征仍未接通，不把状态计时单元场景称为连续战役验收。

当前仍在Phase4，事件保持7/16。Q-79重复墓地来访仍pending；Guild、铁匠临时技能、游商交易、未确认村庄技能/事件、死亡补人/英雄池、下一次出征/奖励骰/等级切换及连续两任务验收继续后续。Phase3人工试玩仍待Kyries确认，未进入Phase5。

本机Node24.20.0低于声明24.21.0，浏览器沿Chromium1234/临时5187端口。用户8080配置、临时资料/脚本/截图与美术不提交。

验证：typecheck、lint、build及115文件/1059项单元与场景测试全部通过。上述村庄浏览器冒烟27.8秒通过，截图已目视检查，显示Hellion Buff5t、当前Highwayman及保持的看守人。临时浏览器 `.last-run.json` 格式化后全仓lint通过，不加入提交。
