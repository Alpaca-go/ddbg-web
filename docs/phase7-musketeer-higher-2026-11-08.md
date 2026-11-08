# Musketeer II/III 相对 Arbalest 同源技能（R-200）

## 接线文件

`verified-musketeer-higher.ts` + `verified-hero-statuses`（Skeet Shot 怪物 Debuff 行）+ `verified-rallying-flare`（Skeet I–III）。

## 与 Arbalest 差异

| Musketeer | Arbalest 对照 | 差异要点 |
| --------- | ------------- | -------- |
| Call the Shot | Sniper's Mark | 目标 **Debuff**（`f70a42e51f`），非 Mark |
| Smokescreen I | Suppressive Fire I | **Q-185**：印刷 Mark+Protection vs Debuff |
| 其余同族 | Sniper Shot / Bola / Blindfire / Bandage / Rallying Flare | 结构平行，OCR 洗净见 higher 文件 |

## 引擎

移除 `hero-skill.ts` 中 R-008 Musketeer 拒结算分支（R-200）。

## 审计

`musketeer-higher-skills.test.ts`：**14/14 绿**（II/III）。
