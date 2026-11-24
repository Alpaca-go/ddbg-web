# 四核心II/III级英雄条件防御限定复核

本轮已合并#189（head `70524f5`，main `8b8b5e0`）。当前分支 `codex/phase4-hero-higher-defence`。准备Guild英雄升级时发现：Life/Dodge/Speed已在2026-10-10获批，但完整抗性/免疫此前仅批准四张I级卡。沿R-048先单独完成高等级防御前置，不把I级防御外推，也不把高等级属性已获批当作全部图标已批准。

已逐页目视本机当前版Hero STAT FRONT p2/4/8/10、BACK p1/3/7/9的完整卡面及左右栏，并与核心规则书R21/R27术语对照。Kyries于2026-10-15明确回复“批准这八张卡的表格”，记为R-081/Q-84 confirmed。

| id                   | 英雄           | 抗性                | 免疫    |
| -------------------- | -------------- | ------------------- | ------- |
| hero_stat:p001:back  | Crusader II    | Stun、Shuffle       | 空      |
| hero_stat:p002:front | Crusader III   | Stun、Debuff        | Shuffle |
| hero_stat:p003:back  | Hellion II     | Bleed、Blight       | 空      |
| hero_stat:p004:front | Hellion III    | Stun、Bleed、Blight | 空      |
| hero_stat:p007:back  | Highwayman II  | Stun、Bleed         | 空      |
| hero_stat:p008:front | Highwayman III | Stun、Bleed、Blight | 空      |
| hero_stat:p009:back  | Vestal II      | Stun、Bleed         | 空      |
| hero_stat:p010:front | Vestal III     | Stun、Bleed         | Disease |

独立 `verified_higher_condition_defence` 保存这八张限定批准，I级 `verified_condition_defence` 和Buff专项注解不变。生成器按完整栏标题/下一段标题及图标左右坐标校验原始放置，缺图标、多图标、跨栏或标题漂移拒绝；卡名/等级/正反面/文件/页码继续按既有属性身份校验。schema与读取器均匹配具体id、卡名、等级、来源面、完整列表及审批日期，不能仅靠attributesVerified或同名卡激活。

仍保留未命名图标、全局词典和整卡unverified原因，不全局重命名红滴、蓝箭头或其他图标。原始PDF、渲染/对比图只在本机私有临时目录，不提交美术；不使用FAQ。新字段明确区分Shuffle和Disease，不能把它们直接放入持续状态堆或用Nt减一处理。

本主题只交付限定规范化数据、schema、纯读取器和三个数据场景，尚未启用高等级战斗、疾病免疫或位移防御运行时，也没有新增Guild英雄升级、XP付款或装备槽命令。当前战斗入口继续仅接受I级英雄，不静默套用I级状态逻辑。官方R21还明确：升级时新获得免疫不会清除已经承受的效果（例：已有疾病），后续升级不能借此自动治病。后续先接高等级防御适配，再接Guild英雄升级/装备槽；单个任务最高3XP，付4XP升级的自然路径还需要连续任务接口，不能注入XP后称自然战役验收。

当前仍为Phase4、事件7/16，Q-79/Q-80 pending；人工试玩未代签，未进入Phase5。用户8080配置、临时资料/脚本和美术不提交。此为数据前置主题，没有UI变化，不新增或重复浏览器冒烟。

验证：本机typecheck、lint、120文件/1083项单元与场景测试、build全部通过（`pnpm test --maxWorkers=4`），未检查远端Actions。生成通过PowerShell设置WRITE_NORMALIZED再执行既有normalize测试入口，其他规范化文件无差异。Node24.20.0低于声明24.21.0；临时PDF检查图和本地资料均未提交。
