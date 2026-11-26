# 仓库数据、测试与部署边界

## 一句话

**源码里的测试和 JSON 不需要“搬走”才能不部署；部署只上传 `deploy/web`（或 `apps/web/dist`），不要上传仓库根目录。**

## 四层数据

| 路径                                                 | 性质                                                          | 运行时要读 | 部署要带              |
| ---------------------------------------------------- | ------------------------------------------------------------- | ---------- | --------------------- |
| `packages/data/extract/**/*.json`                    | 从印刷 PDF/图片提取的源数据（raw/parsed）                     | 否         | 否                    |
| `packages/data/normalized/**/*.json`                 | 归一化后的游戏数据，由 `packages/data/src/**/*.build.ts` 生成 | **是**     | **是**（会被打进 JS） |
| `packages/data/tests/**`、`packages/engine/tests/**` | 逐卡/逐房间的黄金测试与审批测试                               | 否         | 否                    |
| `apps/web/src/**/*.test.tsx`、`apps/web/e2e/**`      | UI/卡图/沙盒测试与 Playwright 冒烟                            | 否         | 否                    |
| `apps/web/src/card-art/*.json`                       | 卡图与印刷面映射                                              | **是**     | **是**（会被打进 JS） |
| `apps/web/dist/`                                     | Vite 构建产物                                                 | **是**     | **是**                |
| `deploy/web/`                                        | 本仓库生成的干净部署目录                                      | **是**     | **是**                |

`normalized` 不能删：引擎和 Web 直接 import 这些 JSON；Vite 会把它们转成 JS 模块打进 `battle-catalogs` / `index` 等 chunk。`extract` 不是运行时数据，删除不会影响构建产物，但会失去重新生成 `normalized` 和审计卡面的能力。

## `src` 的两层分工

| 路径                     | 性质                                                          | 运行时                                                                      |
| ------------------------ | ------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `packages/data/src/**`   | Zod schema、构建器（`*.build.ts`）、目录/池读取函数           | 部分是：schema 与目录读取会被引擎/Web import；构建器只用于生成 `normalized` |
| `packages/engine/src/**` | 纯 TypeScript 规则引擎：状态、命令、事件、Boss 脚本、存档回放 | 是                                                                          |

`packages/data/src` 里通常一个类型一对文件：`<name>.ts` 放 schema/类型/读取函数，
`<name>.build.ts` 放从 `extract/**` 构造规范化数据的构建器。不要把运行时状态或规则结算写进 `data`；
也不要把卡面 schema 或构建逻辑写进 `engine`。

### 英雄注解层（2026-11-26 定稿）

`packages/data/src/core/heroes/annotations/` 的每个 `hNN-*.ts` 只导出一个模块：

```ts
export const hNN = defineHeroModule({
  id: "hNN",
  hero: "...",
  entries: { status, range, shuffle, targetCount, effectKind, ... },
  fixes, // 纯数据英雄不写
});
```

- 一个英雄一个文件、一个模块；数据表只放在 `entries`，不再单独 `export`。
- 所有 entry / fix key 用 canonical ID；不写 `switch (card.id)`、不写各英雄自己的 `assertX`。
- 共享 runner 在 `patch-helpers.ts`：`applyCardFixes` 要求每个 key 唯一命中一张卡，
  `assertCardMeta` 统一断言英雄 / 卡名 / 等级 / 页码 / 验证状态。
- `TARGET_COUNTS` / `EFFECT_KINDS` 已并入各英雄 `entries`；不要再新增跨英雄中央表。
- 纯数据英雄用 `defineHeroModule` 的 no-op `apply`；有逐卡修正的英雄用 `fixes` 表。
- 验收：`normalized/**` 逐字节不变；`pnpm test` 全绿。

## 测试为什么单独放在 `tests/`

2026-11-25 的 P2–P7 重组把测试从 `src` 移出：

- `packages/engine/tests/**`、`packages/data/tests/**` 镜像各自 `src` 的目录结构；
- `apps/web/e2e/{core,weald}/**` 按包分组，`apps/web/src` 内的测试保持就近；
- 两个包的 `tsconfig.json` 都要 `include: ["src", "tests"]`，否则搬出去的测试不会被 typecheck；
- Vitest 的 `include` 是 `packages/**/*.test.ts`，子目录仍会被收集。

测试文件不会被 Vite 打包：构建从 `apps/web/index.html` 出发，只追踪实际 import；测试没有被 import，所以不会进入 `dist/`。

## 移动文件时的注意事项（2026-11-25 经验）

`typecheck` 只能发现 **import 语句**里的路径错误；下面这些字符串路径错了不会报错，只会在运行时或 e2e 才暴露：

- `new URL("../x", import.meta.url)`（含模板字符串形式，且可能带 `:行号` 后缀）；
- 以字符串传给 `load()` / `read()` / `path.join(ROOT, ...)` 的路径；
- `playwright` 动态 `import("../../../packages/...")`；
- 测试里用 `ROOT` 常量拼出来的目录。

移动目录后要额外跑一遍 e2e 或至少 `pnpm test:e2e -- <相关 spec>`，并确认没有残留的 `packages/<pkg>/src/<旧路径>` 字面量。

## 部署

```bash
pnpm package:web
# 输出：deploy/web/
```

`package:web` 会：

1. 执行 `pnpm build`；
2. 复制 `apps/web/dist` 到 `deploy/web`；
3. 拒绝把 `*.test.ts(x)` 带进部署目录；
4. 打印文件数和体积。

部署平台只指向 `deploy/web`（或 `apps/web/dist`）。不要上传仓库根目录，也不要把 `packages/data/normalized` 作为静态文件单独上传——它已经在构建时打进 JS 了。

## 如果部署包变大

优先检查：

- `apps/web/dist/assets/battle-catalogs-*.js`（战斗数据）
- `apps/web/dist/assets/index-*.js`（主包）
- 字体/图片等静态资源

不要通过删除 `normalized` JSON 或测试文件来减小包体；测试本来就不在包里，`normalized` 删了会缺卡。
