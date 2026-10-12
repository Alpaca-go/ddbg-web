# 四核心 I 级英雄的状态抗性 / 免疫（限定批准已入库）

为了接入怪物造成的流血、腐蚀、眩晕、减益与标记，复核本地当前版 `DD_EN_COREBOX_CARDS_100x180_Hero_STAT_FRONT.pdf` 的完整页 1 / 3 / 7 / 9，并对照官方核心规则书 R21 的条件图例及抗性说明。图片仅留私有忽略缓存，不提交。

| 规范化 id            | 英雄         | 印刷页 | 抗性栏 | 免疫栏 | 依据 / 状态                                                   |
| -------------------- | ------------ | ------ | ------ | ------ | ------------------------------------------------------------- |
| hero_stat:p001:front | Crusader I   | H1     | Stun   | 空     | 抗性栏仅金色三菱形，字典 8db71542d2 已命名 Stun               |
| hero_stat:p003:front | Hellion I    | H3     | Bleed  | 空     | 抗性栏仅红滴；字典 d29a868ed8 仍未命名，图形与 R21 Bleed 一致 |
| hero_stat:p007:front | Highwayman I | H7     | Stun   | 空     | 抗性栏仅金色三菱形，字典 8db71542d2 已命名 Stun               |
| hero_stat:p009:front | Vestal I     | H9     | Bleed  | 空     | 抗性栏仅红滴；字典 d29a868ed8 仍未命名，图形与 R21 Bleed 一致 |

Kyries 于 2026-10-12 明确确认并批准，接入仅限以上四个 id / front / I 级：Crusader、Highwayman 的抗性列表为 `[stun]`，Hellion、Vestal 为 `[bleed]`；四人的免疫列表为空。完整框内没有其他条件图标，不按同名扩展到 II / III 级，也不全局升级 d29a868ed8。

官方 R21 已明确：抗性将所施加条件的持续时间减少一回合；免疫取消该条件。该数值不需要另造裁定。本次批准的是上述卡面完整栏的限定读取，不是其他卡面或全局词典的命名审批。

`hero-stat.ts` 以 raw id + front + I 级、卡名、原始完整栏与左右坐标校验；`verified_condition_defence` 独立保存限定审批，未命名红滴仍保留原始 key / unverified 原因。没有修改词典，没有把红滴的旧 blight 错标用于抗性，没有将绿滴命名为 Stun，也未外推 II / III。战斗读取完整条件防御后按 R21 / R-033 减 Nt，1t 减为 0 时不放代币，Bleed / Blight 面值不变；缺防御 / 伪造审批仍整次拒绝。

种子 11 真实 Pliskin / Spitter 部署已可入场并完整四轮撤退，状态堆随英雄回传地图。
