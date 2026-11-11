# Musketeer II/III 相对 Arbalest 同源技能（R-200）

## 接线文件

`verified-musketeer-higher.ts` + `verified-hero-statuses`（Skeet Shot 怪物 Debuff 行）+ `verified-rallying-flare`（Skeet I–III）。

## Q-185（Kyries 真确认）

Musketeer 与 Arbalest **数值与效果完全一致**，仅图标/名称不同。`musketeer-arbalest-parity.test.ts` 逐族 L1–III 对照效果行与 `verified_*`。

| Musketeer     | Arbalest            |
| ------------- | ------------------- |
| Aimed Shot    | Sniper Shot         |
| Smokescreen   | Suppressive Fire    |
| Call the Shot | Sniper's Mark       |
| Buckshot      | Bola                |
| Sidearm       | Blindfire           |
| Patch Up      | Battlefield Bandage |
| Skeet Shot    | Rallying Flare      |

## 引擎

移除 `hero-skill.ts` 中 R-008 Musketeer 拒结算分支（R-200）。

## 审计

`musketeer-higher-skills.test.ts`：**14/14 绿**（II/III）。
