# 位移终点切入大型怪：块级让位与截断（Q-19 → R-199）

状态：**已裁定（Kyries 2026-11-07：顺移）→ R-199**。`resolveShuffle` 不再对「终点落进另一大型怪两格」整条拒绝，改为块级让位 + 同向级联 + 顶到轨道边界截断。

## 复现（改动前的停点）

`quest:p005`（Rising Threat）seed 15 的 Curio 守卫战：

- Cultist Brawler（`monster_medium:p018`，Speed 2）放 **Stumbling Scratch**（自带 Pull 1），站在 **ranged**。
- Pull 1 的目标格位是 **defensive**，而该格被一只 2 格大型怪（`monster_large:p003`）占着；它的两格是 aggressive+defensive。
- 旧逻辑（`shuffle.ts` 的 Q-19 守卫）整条拒绝：「位移终点切入另一大型怪的两格之间，需 Q-19 补充裁定」，自然链停住。
- 该场景下让位会一路级联到 support 位的小怪，顶到轨道尾 → 按 R-199 截断姿态、区域照常。

## 裁定摘要（R-199）

1. 同阵营角色在姿态轨上按「插入」顺移；大型怪 2 格**整体**让位，最小移动量为「与插入块不重叠」，被让位者再撞到别人则同向级联。
2. 让位越出 0–4 时，这一次**姿态位移截断**：被位移者保持原姿态；区域位移按 R-020 ④ 独立照常。
3. 让位不造成伤害、不改区域、不额外掷骰；Shuffle 抗性 / 免疫仍只作用于被位移者本人。

## 实现

- `packages/engine/src/shuffle.ts`：
  - 保留既有「被穿过 / 落点上的同阵营角色按 `delta × 宽度` 基准顺移」；
  - 基准顺移后仍与插入块重叠的（只可能是跨在插入点上的 2 格大型怪），按块沿同一方向逐格让位，并对后续同阵营块级联；
  - 任一块越出 0–4 即回滚整次姿态位移（`stanceSteps: 0`），区域 `path` / `areaId` 照常写回；
  - 让位方向：Push 向前段（-1），Pull 向后段（+1）。
- 旧守卫（含 `Q-19` 的 `refuse`）删除；`stanceSteps` 语义不变（截断为 0）。

## 测试

- `packages/engine/src/shuffle.test.ts`：Q-19 用例改为三条断言（Push 1 截断、Push 2 整块顺移、Pull 1 向后让两格），并新增「级联顶到轨道边界整次截断」用例。
- `packages/engine/src/b09-curio-natural-paths.test.ts`：去掉 `KNOWN_HOLDS = ["Q-19"]`；`quest:p001` / `quest:p005` 各 100 个种子的自然路径无 `commandRefused`、无停点。

## 边界

- 只处理姿态轨；区域位移仍按 R-020 ④ 与既有区域容量规则独立结算。
- 不实现「位移途中绕开大型怪」等其它未裁定细节；不改自然策略或种子（R-190）。

## 验证

- `pnpm typecheck`：通过。
- 全量 `pnpm test --maxWorkers=2 --testTimeout=30000`：**457 文件 / 3307 通过 / 1 跳过**（R-199 前 3306；新增让位级联用例 1 条）。
