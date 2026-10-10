# Phase 2 状态持续时间与部署核对（2026-10-10）

## 来源与范围

仅用官方核心规则书 R16–21、R24、R28–29 和本地当前版印刷卡面。完整页面图像已核对；不使用 FAQ，不修改原始资料，不提交图像。R-001 / R-018 / R-033 / R-048 生效。下面的 duration 都是卡面明确的 Nt，不是默认值；只补列出的 I 级卡，不跨同名 / 等级推断。

## 状态数据

来源：`02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_44x68_SKILLS_FRONT.pdf`，页码从 1 开始。下列状态图标在词典 v1.8 已 confirmed。数字注解按卡 id、名称、等级、页码、效果行和图标位置核实，缺失或漂移拒绝生成；原 `unlabeled_numbers.numeric=null` 保留。

| 页 / id                | 技能 I            | 范围   | 核实的状态             | 本块不实现的同行效果      |
| ---------------------- | ----------------- | ------ | ---------------------- | ------------------------- |
| 7 / `hero_skill:p007`  | Stunning Blow     | Target | Stun 1t                | —                         |
| 10 / `hero_skill:p010` | Bulwark of Faith  | Self   | Protection 2t；Mark 3t | Light +2                  |
| 31 / `hero_skill:p031` | If It Bleeds      | Target | 面值 2 Bleed，2t       | —                         |
| 37 / `hero_skill:p037` | Adrenaline Rush   | Self   | Buff 3t                | Remove all Bleed / Blight |
| 76 / `hero_skill:p076` | Tracking Shot     | Self   | Buff 3t                | 射程 1–2 尚未接入         |
| 79 / `hero_skill:p079` | Duelist’s Advance | Self   | Riposte 2t             | Pull 1                    |
| 82 / `hero_skill:p082` | Open Vein         | Target | 面值 2 Bleed，2t       | —                         |
| 91 / `hero_skill:p091` | Dazzling Light    | Target | Stun 1t                | Light +1                  |

本块是数据补充，不将这八张卡直接加入 UI 可用技能；也不宣称混合效果、射程区间已支持。未列卡没有 duration 注解，继续明确拒绝缺值，不能据此设为 1t。

## 部署映射：Q-53 待 Kyries 确认

只涉及 Ritual Chamber，`DD_COREBOX_TILES_FRONT.pdf` 第 1 页 FRONT / 编号 1，配套 `room:p001`。已获批的是几何（R-054），部署 / 特殊标记仍未获批。以下是完整页面对照后的**拟议映射**，不写入运行时：

| 对象     | 姿态 / 标记         | 拟议区域                          |
| -------- | ------------------- | --------------------------------- |
| 英雄起点 | Aggressive / Ranged | H                                 |
| 英雄起点 | Defensive / Support | C                                 |
| 怪物起点 | Aggressive          | J                                 |
| 怪物起点 | Defensive / Support | D                                 |
| 怪物起点 | Ranged              | F                                 |
| 战利品   | `!` 宝箱            | C、H 各一处                       |
| 特殊区域 | 红星 Cornered       | C、H：英雄在此结束回合，Stress +1 |

需要明确确认的图标：C 左金框 `39d6ddf024` / 配套卡 `fef75233ed`（r639）是否为英雄 Support 起点；D 红框 `293f170eab`（r216）是否为怪物 Support 起点；C/H 红星 `4591aebebd`（r792）是否对应配套房间卡明文 Cornered。配套卡文字不能自动把尚未确认的图标改成 confirmed（R-048）。其余起点 / 宝箱也只按本页完整表申请映射确认，不扩大到其他板块。

批准前保留 `semantic=null`、`usable=false`，现有 UI 手动沙盒继续可用；正式部署、Cornered 与随机战利品加载不能绕过该缺口。F 仍孤立，不因起点在那里补通路。

## 后续机制与验收

2026-10-10 更新（R-055）：区域表 / C-H 宝箱获批；三处图标按拟议入库为 provisional，待代理对照完整印刷面后一致才最终确认，有出入回退。几何仍 R-054，F 孤立，不补路；暂不将整个板块标 usable。

状态层按 R20–21 / R-018：各次施加分别成堆，每次回合开始各弹一枚，Bleed / Blight 同时造成一次合计伤口，Stun 多堆也只扣一次；抗性只减持续时间 1（R-033），免疫不施加，自身效果不强制抵抗。缺 duration 原子拒绝。

再接意志 / 心脏病、普通怪正式生成及战利品；最后整理官方例子黄金测试与三组合试玩。Q-52 双方同时全灭仍单独待裁定。三条自动冒烟不等于 Kyries 的检查点③试玩确认。
