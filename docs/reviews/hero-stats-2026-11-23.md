# 英雄属性卡复核（54 面）— 2026-11-23

范围：`hero_stat:*` 共 54 面（18 英雄 × 3 级；Abomination 三张均为 front）。
依据：

- `docs/hero-stat-review-2026-10-10.md`：I 级属性逐卡核对；
- `docs/hero-higher-defence-review-2026-10-15.md`：II/III 抗性/免疫与高等级属性；
- 10 个测试文件、34 项断言：`hero-stat.test.ts`、`hero-higher-defence.test.ts` 及各英雄
  `*-stat.test.ts`（bounty-hunter / core-trio / cove / grave-occultist / musketeer /
  plague-doctor / warrens / weald）。

## 结论

- **54/54 confirmed（数值层）**：Life / Dodge / Speed 与抗性/免疫注解和记录一致。
- 无数据改动。

## 图标命名遗留（不影响本节结论）

部分属性卡仍带未确认图标，`verification.unverified = true`，原因是图示未进词典
（例：`f9c2c60dad`、`7034784ee1`、`e61ed317de`、`d29a868ed8`、`92d117f31a`）。
这些属于 A/C 要处理的**图标命名**问题，不是数值错误；按 R-048 不猜含义，
在 C 的一形一 ID + 词典审阅中统一解决。

## 备注

- 本批只核「属性数值 + 已注解抗性/免疫」；未确认图标的语义仍保持 unverified。
- 54 面全部 confirmed 后，A0.5 的 432 条矩阵完成：378 技能 + 54 属性。
