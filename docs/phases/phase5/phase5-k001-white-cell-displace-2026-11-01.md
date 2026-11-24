# K-001 · White Cell Stalk Displace

日期：2026-11-01；基线：`cb467f94`。

本切片仅接 `monster_medium:p104` slot 2 Displace。依据印刷 FRONT p104、已确认的 target_effects / debuff / shuffle 图标，以及 R-001 / R-048；攻击与效果结算沿用规格书 R20–21 / R27–28。

- 效果签名：`{target_effects}{debuff}2t,{shuffle}Push2`。
- 新增 verified 计划并重新生成规范化目录。沿用通用 `resolveMonsterSkill`，Acc 12、range 1 的攻击命中后输出减益 2t 和 Push2；不引入独立 Boss 命令。
- 测试覆盖命中、落空、错误射程；全目录计划结算回归由 66 招增至 67 招。
- 本刀验收仅含规则结算输出；没有新增生产几何或完整自动选招。Reconstitute 留下一切片；Teleport、combatReady、生产房间几何与完整 AI 保持 hold。

验证：规范化测试与效果计划测试通过；完整质量闸门结果见本次开发说明。

完整闸门（2026-11-01）：

- `pnpm build` 通过（已有 Vite 扩展名 / bundle 大小警告）。
- 本次改动文件 ESLint / Prettier、规范化 8 测、效果计划 6 测通过。
- room-tile 一致性测试全量并行时失败，单独重跑 7 测通过。
- `pnpm typecheck` 失败：creeping-darkness-unholy-stress、dungeon-monsters、warm-up-natural-iii-prefix 等未改动文件的类型错误。
- `pnpm lint` 失败：已有 `.cache` 脚本与未改动源码的 lint 问题。
- `pnpm test`：308 文件通过 / 41 失败，2788 测通过 / 47 失败；包含旧高等级目录断言、存档场景等。本刀未修改这些失败路径，尚未完成基线隔离复核，因此不标记全量通过、不合并。
