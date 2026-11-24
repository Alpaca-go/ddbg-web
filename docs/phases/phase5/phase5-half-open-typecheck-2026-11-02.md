# 半开项验收 · 严格类型检查收口

修复此前阻塞整库 typecheck 的五处错误：无 cardId 的实体不送入 Unholy 卡牌查询；Creeping Darkness 夹具使用合法 encounter 联合与省略可选字段；spawnMonsters 的可选过滤器仅在存在时传入；Warm Up 候选任务由已知目录收窄为 BasicQuestId。同时对齐可选 startBattle 与 Zod 推导的 undefined 类型，不改变省略参数行为。

不补规则数值、不改变 RNG 算法、不放宽存档验证。相关 Creeping Darkness / Threat is Real / Warm Up 三文件14测通过；pnpm typecheck 现已通过所有四个项目。修改文件 ESLint / Prettier 通过。
