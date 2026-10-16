# Phase 4：赏金猎人 I 级技能核图与目标减益限定修正

本轮已合并 [#213](https://github.com/Alpaca-go/ddbg-web/pull/213)，head `008be77`，main `f21a8d4`；与上一轮 1206 项测试、三条战斗冒烟和其他质量闸门通过的代码相同。保留本地 8080 与未跟踪资料。从 main 建立 `codex/phase4-bounty-skill-review`。

## 来源与核图

只读当前版印刷 `02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_44x68_SKILLS_FRONT.pdf` p43/46/49/52/55/58/61，逐页查看完整卡面；图像保留在本机 `node_modules/.cache/bounty-skill-review/`，不提交。规则依据官方 R19–21（规格书 §6.5–6.7、§7）、R-001/R-048，不使用 FAQ。R21 图例明确区分蓝色上双箭头 Buff 与橙色下双箭头 Debuff。

下表只记录当前 I 级七卡，未扩散到 II/III。`verification.unverified=false` 仅是规范化图标状态，不能替代完整效果入场验收。

| id / FRONT页           | 名称             | 射程 / 目标 | Crit / Acc 与伤害       | 完整附加效果                           |
| ---------------------- | ---------------- | ----------- | ----------------------- | -------------------------------------- |
| `hero_skill:p043` / 43 | Collect Bounty I | 0 / 怪物1   | Crit1→10，Acc9→6        | 对 Humans +1伤害；对 Mark +2伤害       |
| `hero_skill:p046` / 46 | Mark for Death I | 0–2 / 怪物1 | Acc10，无Crit和基础伤害 | 自身 Buff2t；目标 Mark3t、**Debuff2t** |
| `hero_skill:p049` / 49 | Come Hither I    | 2 / 怪物1   | Crit0→4，Acc9→2         | 目标 Mark2t、Pull2                     |
| `hero_skill:p052` / 52 | Uppercut I       | 0 / 怪物1   | Crit0→5，Acc9→3         | 目标 Stun1t、Push2                     |
| `hero_skill:p055` / 55 | Flashbang I      | 1–2 / 怪物1 | Acc10，无Crit和基础伤害 | 目标 Stun1t、Push1 或 Pull1，玩家选择  |
| `hero_skill:p058` / 58 | Finish Him I     | 0–1 / 怪物1 | Crit1→10，Acc9→6        | 对 Stun +2伤害                         |
| `hero_skill:p061` / 61 | Caltrops I       | 2 / 怪物1   | Crit1→2，Acc9→1         | 目标 Bleed2·3t、**Debuff1t**           |

## Q-91 / R-089 限定修正（已确认）

当前全局词典 v1.8 把 `763ad8e857` 命名为 `buff`、confirmed；两张卡的目标框却印橙色向下双箭头，与 R21 Debuff 图例一致。Mark for Death 的自身框蓝色上箭头 `d4329c2a97` 照常为 Buff，不跟目标框一起改。R-088 只批准属性卡 III 的另一枚图标，不能代替本次技能卡审批。

Kyries 明确回复“批准两行限定修正及完整效果”（2026-10-16），已记录 R-089。只批准以下两行限定映射，保持原图标 ID、raw/parsed 和全局词典不变，不批准该 ID 在其他卡上的含义：

| id / 效果框                | `763ad8e857` 限定解释 | 完整效果与时长                      | 接线范围                                                               |
| -------------------------- | --------------------- | ----------------------------------- | ---------------------------------------------------------------------- |
| `hero_skill:p046` / 目标框 | Debuff                | 目标 Mark3t + Debuff2t；自身 Buff2t | 加入已核射程0–2和全部状态行；自身无视是否命中，目标只在命中/暴击时施加 |
| `hero_skill:p061` / 目标框 | Debuff                | 目标 Bleed2·3t + Debuff1t           | 保留基础/暴击伤害，再施加完整状态；Bleed不作为即时额外伤害             |

已在生成层按卡 id、英雄名、等级、页码、原图标与完整效果签名检查，仅修改对应目标效果段的语义并附加已核实状态注解；原图标清单仍保留词典转录。畸变、重复、未知输入拒绝，非本卡保持原样。既有状态运行时完整消费这些同行效果，无需新增引擎分支。生成文件只改这两张卡。

新增测试覆盖两卡十个骰面、公开命令命中/落空、基础/暴击伤害与独立流血计时、非法输入原子拒绝、种子回放及 JSON 往返；数据测试覆盖限定映射、词典隔离、生成一致性、幂等与输入漂移拒绝。这是机制夹具验收，尚不是正式四人战役中的第五英雄入口或死亡替换验收。

## 后续边界

本小主题优先完整接 Mark for Death I / Caltrops I。其余五张继续独立接线：Collect Bounty 双条件与 Finish Him 的 Stun 条件不套用现有 marked/unholy 单条件注解；Come Hither / Uppercut / Flashbang 需完整状态与目标位移、分支选择续接。未完成前不开放赏金猎人完整英雄入口、不伪装死亡补人已可用；II/III、Scout Ahead、死亡名单/饰品让渡/继承XP/免费升级仍后续。Q-79/Q-80 保持 pending，未进 Phase 5。
