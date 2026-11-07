# e2e 恢复可跑与首轮结果（2026-11-08）

状态：**已恢复**。本机用已有的 chromium 1234 跑通了 `apps/web/e2e` 全部 46 条冒烟；没有发现新的功能性 bug，只有已知过期（Templars 自然存档）与长用例的偶发超时。

## 环境

- Playwright `1.63.0`（`apps/web`）默认要 chromium **1243**；本机 `ms-playwright` 只有 **1234**。
- `pnpm --filter @ddbg/web exec playwright install chromium` 在本机长时间无进展，改用环境变量指向已有 Chromium：

```powershell
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE='C:\Users\kyrie\AppData\Local\ms-playwright\chromium-1234\chrome-win64\chrome.exe'
pnpm --filter @ddbg/web exec playwright test --workers=1 --reporter=line
```

- `playwright.config.ts` 只在设置该环境变量时覆盖 `executablePath`，CI 不受影响。

## 结果（46 条）

| 跑法                   | 结果                                    | 说明                                                                                |
| ---------------------- | --------------------------------------- | ----------------------------------------------------------------------------------- |
| 并行（默认 3 workers） | 40 通过 / 6 失败                        | 5 条是并行争用下的超时；1 条是 `templars-i-save` 自然策略打输                       |
| 串行重跑那 6 条        | 10 通过 / 1 失败                        | 只有 `templars-i-save` 真失败（`battle halted: heroesDefeated`）                    |
| 全量串行（拆分前）     | 43 通过 / 1 跳过 / 2 失败               | 失败均为超时：`dungeon.spec` 的 `page.goto` 120s、`prophet-i.spec`（单跑 2/2 通过） |
| **全量串行（拆分后）** | **53 通过 / 1 flaky / 1 skip / 0 失败** | 17.1 分钟；flaky 是 `necromancer-i-save` 的 worker 崩溃（code 134），重试后通过     |

## 稳定性整理（2026-11-08）

- `dungeon.spec.ts` 原来第一条测试是 880 行的连续场景链，已按独立的 `page.goto` 边界拆成 10 条（文件内现在 12 条），每条独立 120s 预算。
- `playwright.config.ts`：`workers: CI ? 2 : 1`（本地串行）、`timeout: 120_000`、`retries: 1`。
- 拆分时补了一处隐含依赖：Wipe/Fundraiser 段原来依赖上一段循环最后一次 `page.goto` 的页面状态，已补独立 `page.goto`。
- 拆分后全量串行 55 条：**53 通过 / 1 flaky（重试后通过）/ 1 skip / 0 失败**。

## 结论

- **没有新的功能性 bug**：除 Templars 自然策略外，所有失败都能重跑通过，或明确是页面导航/长用例超时。
- `templars-i-save.spec.ts` 与 unit 侧 `templars-i-natural-save.test.ts` 是同一场景（seed 5075 / quest:p017），按 **Q-162 保持 skip**；Boss 胜负属玩家决策，不再作为自动化目标。
- 长用例（`smoke.spec` 单条 2 分钟）仍可能在 120s 上限处超时，靠 `retries: 1` 兜底；出现新的 flaky 优先拆用例，不要放宽断言。
- 并行会出现 Vite HMR 端口 24678 冲突警告；本地默认串行已避开。

## 后续可选

- CI 里装匹配的 chromium 1243，或把 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 作为本地开发变量写进 README。
- 把 e2e 纳入里程碑闸门：直接 `pnpm --filter @ddbg/web test:e2e`（本地默认串行 + 重试一次，约 17 分钟），不要每次改动跑。

## 未做

- 没有修改任何业务代码；只加 `executablePath` 环境变量开关、Templars 用例的 skip、dungeon 拆分与 e2e 配置。
- `docs/screenshots/ux02a-*.png` 被 e2e 重新生成后已还原（不同 Chromium 版本的渲染差异，不作为有意改动）。
