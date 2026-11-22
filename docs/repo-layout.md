# 仓库数据、测试与部署边界

## 一句话

**源码里的测试和 JSON 不需要“搬走”才能不部署；部署只上传 `deploy/web`（或 `apps/web/dist`），不要上传仓库根目录。**

## 四层数据

| 路径                                    | 性质                                                        | 运行时要读 | 部署要带              |
| --------------------------------------- | ----------------------------------------------------------- | ---------- | --------------------- |
| `packages/data/extract/**/*.json`       | 从印刷 PDF/图片提取的源数据（raw/parsed）                   | 否         | 否                    |
| `packages/data/normalized/**/*.json`    | 归一化后的游戏数据，由 `packages/data/src/normalize/*` 生成 | **是**     | **是**（会被打进 JS） |
| `packages/data/src/normalize/*.test.ts` | 逐卡/逐房间的黄金测试与审批测试                             | 否         | 否                    |
| `apps/web/src/**/*.test.tsx`            | UI/卡图/沙盒测试                                            | 否         | 否                    |
| `apps/web/src/card-art/*.json`          | 卡图与印刷面映射                                            | **是**     | **是**（会被打进 JS） |
| `apps/web/dist/`                        | Vite 构建产物                                               | **是**     | **是**                |
| `deploy/web/`                           | 本仓库生成的干净部署目录                                    | **是**     | **是**                |

`normalized` 不能删：引擎和 Web 直接 import 这些 JSON；Vite 会把它们转成 JS 模块打进 `battle-catalogs` / `index` 等 chunk。`extract` 不是运行时数据，删除不会影响构建产物，但会失去重新生成 `normalized` 和审计卡面的能力。

## 测试为什么和源码放在一起

Vitest 默认就近查找 `*.test.ts` / `*.test.tsx`；测试大量使用相对路径 import 同目录的 schema、builder 和 JSON。把 600 多个测试文件搬到单独的 `tests/` 目录，需要重写大量相对路径，收益只是“目录看起来更整齐”，风险远大于收益。

测试文件不会被 Vite 打包：构建从 `apps/web/index.html` 出发，只追踪实际 import；测试没有被 import，所以不会进入 `dist/`。

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
