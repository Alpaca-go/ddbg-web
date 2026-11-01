import { defenceTrinketReaction } from "./trinket-reactions";
import { projectAbominationSkill } from "./abomination-skills";
import type { HeroHealthEffect } from "./hero-health";
import { statusStackProblem } from "./status";
import type { StatusEffect, StatusStack } from "./status";
import { readVerifiedStatusEffects } from "./skill-status";
import {
  criticalStress,
  hasQuirk,
  passiveDamageWounds,
  passiveHeal,
  passiveLevel,
  passiveStress,
} from "./passive";
import type { PassiveHolder } from "./passive";
import { resolveAttackDamage } from "./attack-damage";

/**
 * 已验证英雄技能对一个已选目标的命中伤害或治疗，以及规则书已经写明的后续步骤。
 *
 * 规则书第 19–20 页（说明书 §6.5）：Crit X 的 X、Acc Y 的 Y 是阈值。规范化数据
 * 不把标签旁边的整数命名成伤害。只有 stats_line 上已命名的 `damage` 或 `heal`
 * 才把这两个整数当成伤害或治疗。暴击不减 Dodge；命中阈值是 Acc − Dodge。
 *
 * 伤害后续（R-026、R-019、R-017，说明书 §6.6）：基础值之后，目标有 Protection
 * 时攻击伤害减半，向上取整，只减一次。结果 ≥ 1 才算受到伤害。目标有 Riposte
 * 时，按减半之前的伤害向上取整一半，反弹给攻击者。反弹不是攻击：不被 Protection
 * 减半，也不再触发 Riposte。怪物的伤口 ≥ 调用方传入的 Life 则死亡。Life 来自
 * 规范化怪物卡上已命名的 `life`。
 *
 * 暴击压力（R-031，说明书 §6.5 第 8 步）：打出暴击，包括治疗暴击，使用者与同区域
 * 其他英雄的压力各 −1，一次技能只减一次。压力停在 0–10。到 10 以后的意志检定
 * 和心脏病不在这一层。
 *
 * 卡面印的立即压力（规则书第 20–21 页，说明书 §6.5 第 5、7 步，§7.2，§8.1）：
 * 一条效果行只有已命名的自身效果或目标效果标记，加上已命名的 stress，行内文字
 * 只有空白、「Self」和与数值相同的整数，并且所有这类压力数字的 `numeric` 都是
 * 同一个整数、条数对得上时，按那个整数增减压力。自身效果在掷骰之后、无论命中
 * 与否都生效。目标效果只对命中或暴击的目标生效。然后才结算暴击压力。
 * `numeric` 为 null 的数字（例如带「+」的 `+1`）不加。对不上的效果行仍整行跳过。
 *
 * 自身治疗（规则书第 20 页，说明书 §6.5 第 5 步，G-02）：一条效果行只有已命名的
 * `self_effects` 和已命名的 `heal`，文字只有空白、Self，以及与数值相同的非负整数。
 * 这个整数是治疗图标里面、`numeric` 已经是整数的那个数，不从别的文字里补。
 * 行内可以带着 `damage_or_heal_combined_marker`，仍不解释这个标记。条数和这类
 * 治疗数字对得上才扣使用者的伤口，落空也扣，最低到 0。暴击不改这个固定治疗量。
 * 它在伤害、目标治疗和反弹之前。对不上的行仍整行跳过。
 *
 * 同一条自身效果里的治疗和压力（规则书第 19 页 Note、第 20–21 页，说明书 §6.5
 * 第 5 步、§8.1）：没有 Crit / Acc 的技能不掷骰，直接生效。一条效果行只有已命名的
 * 自身效果、已命名的 `heal`、已命名的 `stress`，文字只有空白、Self、治疗图标里的
 * 非负整数、压力图标后面的整数，以及这两个整数之间的逗号。两个整数的 `numeric`
 * 都已经是整数时，扣使用者的伤口，并按那个整数改压力。不看骰面，暴击也不改这两个
 * 固定数字。行内可以带着 `damage_or_heal_combined_marker`，仍不解释这个标记。
 * 目标那一行如果还写着 `numeric` 为 null 的光照「+1」，整行仍跳过，不把治疗和
 * 压力拆出来给目标。效果行里的英雄头盔仍不当成 stats 行上的目标个数。和增益、
 * 回合数写在同一行的治疗整数仍不扣。
 *
 * 移除流血和腐蚀（规则书第 20 页目标效果、第 21 页移除全部堆叠，第 12 页
 * 「Remove all Bleed」）：一条效果行只有已命名的目标效果、已命名的 bleed、
 * 已命名的 blight，文字只有空白和「Remove」。命中或暴击时清掉目标这两种状态的
 * 全部堆叠，落空不清。不读回合数，也不使用 `numeric` 为 null 的数字。和增益、眩晕
 * 混在同一行的「Remove」仍整行跳过。
 *
 * 换行后的「Remove」加流血和腐蚀（规则书第 20 页：自身效果标记管这一框里的效果；
 * 第 21 页移除全部堆叠）：一条效果行只有文字「Remove」、已命名的 bleed 和已命名的
 * blight，行内没有自身或目标标记。标记印在同一效果框的另一行，提取时被拆开。
 * 这种行按顺序配给还没有自己的「Remove」行的自身效果或目标效果标记。两边条数
 * 必须一样；多了或少了就不配，这两行都不清。配给自身的，没有 Acc 也清，落空也清。
 * 配给目标的，和带标记的那条一样，只在命中、暴击，或这张技能没有 Acc 时清。
 * 不从词典里「被移除」和「后接数值」这两句说明挑图标：两枚流血的 key 都是 bleed，
 * 认的是印刷文字「Remove」。效果行里的英雄头盔仍不当成目标个数，也不用来核对阵营。
 * 增益「2t」仍不放堆。
 *
 * 自身移除流血（规则书第 19 页 Note、第 20 页自身效果、第 21 页移除全部堆叠，
 * 说明书 §6.5 第 5 步、§7.1）：一条效果行只有已命名的自身效果和已命名的 bleed，
 * 文字只有「Self」和「Remove」。版面提取在 Self 前夹了一个 U+0007，它不是图标
 * 也不是数字，不参与认词。没有 Acc 的技能不掷骰，直接生效。清掉使用者的全部流血
 * 堆叠；有 Acc 时落空也清，因为自身效果无视命中、抗性和免疫。不改伤口，不放新堆。
 * 和腐蚀、增益或目标效果写在同一行的「Remove」仍整行跳过。Adrenaline Rush III
 * 的另一行把目标的 Remove Bleed / Blight 和增益「2t」（numeric 为 null）写在一起，
 * 不清目标，也不放增益。射程「0-1」的 numeric 为 null，传入距离就整次拒绝，自身
 * 的移除也不发生。效果行里的英雄头盔仍不当成区域内的目标个数，也不用来核对阵营。
 *
 * 施加流血或腐蚀（规则书第 21 页，x / Nt；说明书 §7.2）：面值可以是目标效果旁边
 * 已命名的非负整数，Wyrd Reconstruction I 的「1」、Plague Grenade I 的「3」都是。
 * 持续回合印成「2t」「3t」，`numeric` 为 null。没有回合数就不能放代币（R-048）。
 * 不把面值当成命中时立刻造成的伤口，也不把它加进或减掉这次伤害或治疗。
 * 治疗仍只按 Crit / Acc 旁边的整数。眩晕、增益、减益、标记同样不从 null 的回合数放堆。
 *
 * 只有 Acc、没有 Crit，也没有已命名 damage / heal 的眩晕（规则书第 21 页 Stun 按 Nt
 * 放代币）：Barbaric YAWP!、Blinding Gas 的 stats 行只有「Acc N」。眩晕印成「1t」，
 * `numeric` 为 null，不放堆（R-048）。Acc 旁边的整数是命中阈值，不是伤害。
 * YAWP! 的射程是单个 0，正面有两枚已命名的怪物头，个数和距离仍先核对；对得上之后
 * 整次拒绝，伤口不动。Blinding Gas 的射程是「1-2」，numeric 为 null，传入距离就
 * 按区间拒绝。Stunning Blow 有已命名的 damage，伤害照常结算，同一条「1t」仍跳过。
 *
 * 位移（规则书第 21 页 Shuffle，说明书 §6.5 第 5、7 步，§6.7）：一条效果行只有
 * 已命名的自身效果或目标效果、已命名的 `shuffle`，文字只有空白、自身行上的
 * 「Self」，以及恰好「Push N」或「Pull N」。N 是这段文字里的正整数。印刷把
 * 「Push 1」印成一整段，所以它不在 `unlabeled_numbers` 里；不从别的数字，也不从
 * `numeric` 为 null 的回合数里读距离。自身位移在掷骰之后、无论命中与否都记上。
 * 目标位移只在命中或暴击时记上。暴击、Protection、Riposte 都不改这个距离。
 * 目标有 Shuffle 抗性时，目标位移再少 1，最低到 0（规则书第 21 页，R-020、R-033）。
 * 只减一次。自身位移不减：英雄位移自己时可以选择无视自己的抗性，这里不替玩家选。
 * 不把免疫当成距离直接归零。确认过的图标 key 仍是 `shuffle_resist`，含义没有另分成免疫。
 * 印刷文字恰好是「Push N or Pull N」、两边是同一个正整数时，调用方传入选定的
 * 方向才记上那个距离，不替玩家选其中一边。没传入方向时这行仍跳过，技能若没有
 * 别的可结算效果就整次拒绝。和眩晕、增益、标记或反击写在同一行，或「Push N or」
 * 被拆开的，仍整行跳过。没有 Crit 的这种技能不会暴击：不把缺的 Crit 当成 0，
 * 也不把 Acc 当成伤害。眩晕「1t」的 numeric 为 null，不放堆。
 * 这一层不挪区域、不挪姿态轨。
 *
 * 无视防护（规则书第 20 页目标效果可以改这次攻击的伤害，第 21 页 Protection
 * 把攻击伤害减半）：一条效果行只有已命名的目标效果、文字「Ignores」、已命名的
 * `protection`。命中或暴击的攻击伤害不减半；落空没有伤害。不移除防护代币，
 * 也不改 Riposte：反弹仍按减半之前的伤害。治疗本来就不减半。自身效果上的
 * Protection、带回合数的防护，以及「Ignores」旁边没命名的图标，都不算这条。
 *
 * 无视守护（R-102、规则书第 21 页 Guard 与 R-024）：一条效果行只有文字「Ignores」、
 * 已命名的 `guard`。不把 Guard 代币移除；调用方在选目标时不强制改选 Guard 敌人。
 * 「Ignores」旁边没命名的图标不算这条。
 *
 * 切换形态（规则书第 38 页，说明书 §16.3；自身效果见第 20 页，说明书 §6.5
 * 第 5 步）：一条效果行只有已命名的自身效果，文字恰好是「Self Change: Beast」
 * 或「Self Change: Human」。没有 Acc 的技能不掷骰，直接生效（规则书第 19 页
 * Note）。结果写在 `actorForm` 上，只记下要换成的形态。不翻转技能卡、英雄卡、
 * 姿态代币或棋子。不传 `face` 时只读正面 `effect_lines`。传入 `face: "back"`
 * 时改读 `back_face_skill.lines`：Transform to Human 印的「Self Change: Human」
 * 换成人形。背面自己的姿态行代替正面顶行；正面那个没有点亮标记的远程图标
 * 不拿来挡背面。正面 `front_icons` 也不拿来数背面的目标。
 * 背面一行只有已命名的文字底板，文字恰好是「Beast Form Only」或
 * 「Human Form Only」时，那是使用条件。调用方传入了当前形态才核对，对不上就
 * 整次拒绝。不传就不猜现在是哪一种。底板图标的词典说明同时写了两种形态，
 * 没有这句印刷文字时不从说明里挑一种（R-048）。正面顶行的底板没有这句文字。
 * 背面压力「-1」不在 `unlabeled_numbers` 里，而且和「Allies:」写在同一行，不加。
 * 减益「1t」「2t」「3t」不放堆。正面的治疗整数也不在背面这一次扣。
 * 邻行的压力 `+2` 和增益回合 `numeric` 为 null，不加。和它们写在同一行的治疗
 * 整数也不是「Self + heal」那一种自身治疗，不扣伤口。
 *
 * 自身目标（规则书第 19 页技能解剖：写「Self」= 自身；说明书 §6.5）：stats 行有
 * 恰好一个已命名的射程图标、没有英雄或怪物目标图标，并且有恰好一个独立的词
 * 「Self」。目标必须是使用者自己，阵营是英雄。仍按 Crit / Acc 掷骰，命中阈值
 * 照常减 Dodge。治疗和自身压力用这一层已经有的规则。不把效果行里自身效果框上的
 * 「Self」当成目标，也不把只有「Self」、没有已命名治疗或伤害的卡当成这次能结算
 * 的自身目标。不按射程挪区域。
 *
 * 可用姿态（规则书第 19 页技能解剖，说明书 §6.5 第 1 步）：顶行四个已命名的
 * 姿态图标，点亮的才能用这张技能。从左到右是 Support、Ranged、Defensive、
 * Aggressive；这里按图标 key 认，不靠格子顺序猜。调用方传入使用者的当前姿态时，
 * 未点亮就整次拒绝，伤口和压力都不改。不传就不检查，也不替英雄猜现在站在哪一格。
 * 「Human/Beast Form Only」文字底板不读成人形或兽形。憎恶顶行那个没有写成点亮或
 * 未点亮的远程图标，不当成可用，也不当成禁用。不移动姿态代币，也不查本回合是否
 * 已经成功用过这张技能。
 *
 * 射程（规则书第 19 页技能解剖，说明书 §6.5 第 2 步，图例 I-07）：目标区域与
 * 使用者的距离必须恰好等于弯箭头旁边的那个非负整数。射程 0 是使用者自己的区域。
 * 调用方传入已经算好的区域距离时才核对；对不上就整次拒绝，自身效果、伤害、治疗
 * 和位移都不发生。不传就不检查，也不在这里算板块上的步数。区间「0-1」「1-2」
 * 「0-2」的 numeric 为 null，不拆成两个距离。射程图标后面只有 Self 或 All Allies、
 * 没有这个整数时，也不把它们当成 0。目标区域更低时，这个单个整数的上限可以再加 1，
 * 原来的距离仍然可以（规则书第 25 页，R-022）。区间的 numeric 仍是 null，不加这一档。
 *
 * 一个区域内能选几个（规则书第 19 页技能解剖，说明书 §6.5 第 3 步，图例 I-08、
 * I-09）：stats 行上已命名的怪物头或英雄头盔有几个，就最多选几个。调用方传入这次
 * 在该区域选中的个数时，必须是 1 到这个个数。少选可以；多选就整次拒绝，自身效果、
 * 伤害、治疗和位移都不发生。不传就不检查，也不替调用方挑人。一次调用仍只结算传入
 * 的那一个目标。效果行里的头盔不计数：Inspiring Cry、Battle Ballad 的 stats 行是空的，
 * 不从效果行凑个数。stats 行和效果行都没有这些图标时，用卡面正面 `front_icons` 里
 * 已命名的头盔或怪物头，个数和阵营都用它们。Inspiring Tune I 的 stats 行只排进了
 * 「Crit 2 Acc 20」，两枚英雄头盔在正面图标里。效果行里已经有头盔时仍不用正面图标，
 * 避免和效果行重复计数。正面也没有时，不把 Self 或 All Allies 当成个数。
 * 不把 Crit / Acc 阈值当成伤害；伤害必须由已命名 damage 图标及旁边数字支持。
 * Zealous Accusation I/II/III 已按完整印刷和 R-062 核实。选空区域算成功使用（R-025），
 * 但这一层始终带着一个已选目标，传入 0
 * 不在这里结算。不以友方为目标时，调用方标明这次没有选中有 Guard 的敌人，整次拒绝
 * （规则书第 21 页，R-024）。目标是英雄或 Self 时不拒绝。不从「1t」读出谁现在有 Guard，
 * 也不改选谁。
 *
 * 已有的增益（规则书第 21 页，说明书 §6.5 第 4 步、§7.2）：使用者身上每一堆 Buff
 * 让这次掷骰的暴击阈值 +1。暴击仍先于命中、仍不减 Dodge。不传堆数就当作没有。
 * 这里数的是堆，不是一堆里还剩几枚代币（R-018）。不从卡面的「2t」「3t」「4t」读堆数，
 * 那些回合数的 numeric 为 null，这一张技能也不因此放上新的增益。饰品不加。
 * 光照 ≤4 的 Crit +1 写在后面。标记和高地对命中阈值的加值也写在后面。
 *
 * 已有的减益（规则书第 21 页，R-016，说明书 §6.5 第 4 步、§7.2）：目标是怪物时，
 * 目标身上每一堆 Debuff 再让暴击阈值 +1，和使用者自己的增益堆加在一起。暴击仍不减
 * Dodge。命中阈值、印刷伤害和印刷治疗都不加。目标是英雄时不加，友方治疗和给自己
 * 的技能都不会因为对方身上的减益更容易暴击。不传堆数就当作没有。数的是堆，不是
 * 一堆里还剩几枚代币（R-018）。不从卡面的「1t」「2t」「3t」「4t」读堆数，那些
 * 回合数的 numeric 为 null，这一张技能也不因此放上新的减益。饰品仍不加。
 * 光照 ≤4 的 Crit +1 写在后面。标记和高地对命中阈值的加值也写在后面。
 *
 * 已有的标记（规则书第 21 页，R-019，说明书 §6.5 第 4 步、§7.2）：目标是怪物时，
 * 目标身上每一堆 Mark 让命中阈值 +1，也就是 Acc + 堆数 − Dodge。暴击仍先看、仍不减
 * Dodge，印刷伤害和印刷治疗也不加。说明书 §7.2 写的是攻击被标记角色的敌人；目标是
 * 英雄时不加，友方治疗和给自己的技能都不会因为对方身上的标记更容易命中。不传堆数就
 * 当作没有。数的是堆，不是一堆里还剩几枚代币（R-018）。不从卡面的「2t」「3t」「4t」
 * 读堆数，那些回合数的 numeric 为 null，这一张技能也不因此放上新的标记。效果行里
 * 「+N vs」伤害只有逐卡复核条件伤害注解才读取；缺注解 numeric=null 仍跳过。和标记写在同一行的
 * Pull 仍整行跳过。饰品仍不加。高地和光照写在后面。
 *
 * 高地（规则书第 25 页，说明书 §6.5 第 4 步、§6.9，R-022）：调用方标明目标所在区域
 * 比使用者低时，命中阈值 +1，也就是 Acc + 标记堆数 + 1 − Dodge。暴击仍先看、仍不减
 * Dodge，印刷伤害和印刷治疗也不加。从低处打向高处或同一高度都不减 Acc。不传就当作
 * 没有。友方治疗同样加：规则书写的是任意 creature，R-022 据此包含友方。目标写的是
 * Self，或卡面射程恰好是 0 且没有传入更远的距离，或传入的距离是 0，都是使用者自己的
 * 区域，不能再低，整次拒绝。单个整数射程的上限可以再加 1，原来的距离仍然可以。
 * 区间保留原 numeric=null；逐卡复核注解另给边界，按 R-022 对更低区域上限 +1。
 * 光照 ≤4 的 Crit +1、光照恰好 5 的英雄 Dodge +1，以及光照恰好 0 的怪物 Dodge +1，
 * 写在后面。卡面光照 +1、`+N vs` 和饰品仍不加。
 *
 * 光照（规则书第 29 页，说明书 §5.10、§6.5 第 4 步，R-002）：调用方传入当前光照
 * 0–4 时，暴击阈值 +1。4→0 逐级累加，所以 4、3、2、1、0 都有这一项。暴击仍先于
 * 命中、仍不减 Dodge。友方治疗同样加：规则书写的是英雄和怪物的 Crit +1。恰好为 5
 * 时没有这项暴击。不传就不加暴击。和已有的增益、减益堆加在一起。
 * 光照恰好为 5、并且目标是英雄时，命中阈值再减 1：英雄 Dodge +1，只在恰好为 5
 * 时有。友方治疗和写着 Self 的技能同样减：Dodge 加在英雄身上，治疗也要减目标 Dodge。
 * 目标是怪物时不加。
 * 光照恰好为 0、并且目标是怪物时，命中阈值再减 1：怪物 Dodge +1，只在恰好为 0
 * 时有。命中阈值是 Acc + 标记堆数 + 高地 −（Dodge + 这一档的 1）。暴击仍不减这
 * 1 点。和光照 5 的英雄 Dodge 不会叠在同一次上。目标是英雄时不加，友方治疗和
 * Self 都不减。怪物 Acc +1 不加在英雄的命中上：这一层结算的是英雄技能，攻击方
 * 不是怪物。不改印刷伤害或治疗。
 * 光照 2–1，以及累加到光照 0 的「每次承受压力额外 +1」（R-002），仍不加。
 * 这一层已经结算的压力都是减压力：Inspiring Tune、Absolution 的 −1，以及打出暴击
 * 的 −1。减压力不是承受压力。会让英雄加压力的印刷数字，Rage / Rake / Slam 的
 * 「+1」、Transform 的「+2」，numeric 都是 null，不加，也不能拿它们当成一次已经
 * 发生的压力事件再额外 +1。没有已验证的英雄技能对英雄造成伤害，承受暴击的 +1
 * 压力也不会在这里发生。卡面光照「+1」「+2」的 numeric 为 null。Hands from the
 * Abyss 的「-1」虽然 numeric 是 −1，但没有挂在已命名的光照图标上，并且和眩晕
 * 「2t」（numeric 为 null）写在同一行，不改传入的光照，也不加进伤害或 Dodge。
 * 饰品和 Stygian 的 Boss Crit +1 不加。
 *
 * 不解释 `damage_or_heal_combined_marker`。英雄 Life、死门骰都不在这里。
 */

export type SkillIconRef = {
  readonly key: string | null;
  readonly naming: string;
};

export type SkillSegment =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "icon"; readonly icon: SkillIconRef };

/** 规范化英雄技能里这一层会读的字段。多出来的字段可以留在对象上。 */
export type HeroSkillCardView = {
  readonly verified_self_range?: true;
  readonly verified_required_form?: SkillForm;
  readonly verified_allies_stress?: number;
  readonly verified_self_stress?: {
    readonly lineIndex: number;
    readonly amount: number;
    readonly source: "print_front";
  };
  readonly verified_target_disease?: true;
  readonly id: string;
  readonly hero: string | null;
  readonly verification: { readonly unverified: boolean };
  readonly printed_labels: readonly { readonly label: string; readonly value: number | null }[];
  readonly unlabeled_numbers: readonly {
    /** 印刷出来的那段数字。区间如「0-1」整段在这里，`numeric` 为 null。 */
    readonly text?: string;
    readonly numeric: number | null;
    readonly anchor:
      | { readonly type: "printed_label"; readonly label: string }
      | {
          readonly type: "beside_icon";
          readonly left_icon: SkillIconRef | null;
          readonly inside_icon: SkillIconRef | null;
        };
  }[];
  readonly stats_line: readonly SkillSegment[] | null;
  readonly verified_range?: {
    readonly min: number;
    readonly max: number;
    readonly source: "print_front";
  };
  readonly effect_lines: readonly (readonly SkillSegment[])[];
  readonly verified_self_heal?: {
    readonly lineIndex: number;
    readonly amount: number;
    readonly source: "print_front";
  };
  readonly verified_target_stress?: {
    readonly lineIndex: number;
    readonly amount: number;
    readonly source: "print_front";
  };
  readonly verified_target_support?: {
    readonly lineIndex: number;
    readonly heal: number;
    readonly stress: number;
    readonly light: number;
    readonly source: "print_front";
  };
  readonly verified_target_header?: {
    readonly lineIndex: 0;
    readonly source: "print_front";
  };
  readonly verified_damage_bonus?: {
    readonly lineIndex: number;
    readonly amount: number;
    readonly condition: "marked" | "unholy" | "stunned" | "human" | "blighted" | "eldritch";
    readonly source: "print_front";
  };
  readonly verified_damage_bonuses?: readonly NonNullable<
    HeroSkillCardView["verified_damage_bonus"]
  >[];
  readonly verified_status_effects?: readonly (StatusEffect & {
    readonly scopeLineIndex?: number;
    readonly lineIndex: number;
    readonly segmentIndex: number;
    readonly scope: "self" | "target";
  })[];
  readonly verified_rallying_flare?: {
    readonly cleanupLineIndex: 0;
    readonly cleanupSignature: string;
    readonly monsterDebuffLineIndex: 1;
    readonly monsterDebuffSignature: string;
    readonly debuffDuration: number;
    readonly source: "print_front";
  };
  /**
   * 技能卡顶行。点亮的姿态图标表示能从那个姿态使用（规则书第 19 页）。
   * 不传就无法在调用方给出当前姿态时核对。
   */
  readonly top_row_icons?: readonly SkillIconRef[];
  /**
   * 卡面正面上的图标。stats 行和效果行都没有已命名目标图标时，用这里已命名的
   * 英雄头盔或怪物头补阵营和个数（规则书第 19 页）。不传就只看 stats 行。
   */
  readonly front_icons?: readonly SkillIconRef[];
  /**
   * 双面技能的背面。只有 `face: "back"` 时读 `lines`。
   * 不传表示这张卡没有另一面效果。
   */
  readonly back_face_skill?: {
    readonly name: string;
    readonly level: number;
    readonly lines: readonly (readonly SkillSegment[])[];
  } | null;
};

export type SkillTargetSide = "hero" | "monster";

/**
 * 英雄技能顶行的四种姿态。规则书第 19 页从左到右是
 * Support → Ranged → Defensive → Aggressive。
 */
export type SkillStance = "support" | "ranged" | "defensive" | "aggressive";

/** 同区域里的另一名英雄，只带这一层要改的压力。 */
export type SkillAreaHero = PassiveHolder & {
  readonly id: string;
  readonly stress: number;
};

export type SkillActorState = PassiveHolder & {
  readonly id: string;
  readonly wounds: number;
  /** 0–10。不传就不改这名英雄的压力。 */
  readonly stress?: number;
  /**
   * 攻击者自己的 Protection。反弹不是攻击，这里减半不会用到（R-017）。
   */
  readonly protection?: boolean;
  /** 攻击者自己的 Riposte。反弹不会再触发 Riposte（R-017）。 */
  readonly riposte?: boolean;
  /**
   * 使用者现在的姿态。传入时，技能顶行该格必须是已命名的点亮图标。
   * 不传就不做这一步可用性检查。
   */
  readonly stance?: SkillStance;
  /**
   * 使用者身上已经有的 Buff 堆数。每一堆让暴击阈值 +1（规则书第 21 页）。
   * 不传当作 0。不从卡面回合数读堆数，也不在这里放新的增益或移除代币。
   */
  readonly buffStacks?: number;
  /**
   * 使用者现在的形态（规则书第 38 页）。背面印了「Beast Form Only」或
   * 「Human Form Only」时才核对。不传就不检查，也不从文字底板的词典说明里猜。
   */
  readonly form?: SkillForm;
};

/** 目标已经选好。区域怎么相邻不在这里。 */
export type SkillTargetState = PassiveHolder & {
  /** Finish Him / Lunge / Throw Dagger 等条件读取当前真实状态堆，不用历史事件。 */
  readonly statusStacks?: readonly StatusStack[];
  /** 已验证怪物卡的印刷类型标签；缺失时不能判定 vs Unholy，不按名字推断。 */
  readonly monsterTypeTags?: readonly string[];
  readonly id: string;
  readonly side: SkillTargetSide;
  readonly wounds: number;
  readonly dodge: number;
  /**
   * 至少一层 Protection，或怪物卡上的内置 Protection。
   * 两种同时在场也只减半一次（R-019）。不传表示没有。
   */
  readonly protection?: boolean;
  /** 至少一层 Riposte。不传表示没有。 */
  readonly riposte?: boolean;
  /**
   * 怪物卡心形里的 Life。不传就不判断死亡。
   * 英雄的 Life 不在规范化数据里，传了会拒绝。
   */
  readonly life?: number;
  /** 英雄压力 0–10。怪物没有压力轨。 */
  readonly stress?: number;
  /**
   * 目标身上已经有的 Debuff 堆数。目标是怪物时，每一堆让暴击阈值 +1
   * （规则书第 21 页，R-016）。目标是英雄时不加：友方和自己都不是敌人。
   * 不传当作 0。不从卡面回合数读堆数，也不在这里放新的减益或移除代币。
   */
  readonly debuffStacks?: number;
  /**
   * 目标身上已经有的 Mark 堆数。目标是怪物时，每一堆让命中阈值 +1
   * （规则书第 21 页，R-019）。目标是英雄时不加：友方和自己都不是敌人。
   * 不传当作 0。不从卡面回合数读堆数，也不在这里放新的标记或移除代币。
   */
  readonly markStacks?: number;
  /**
   * 目标对 Shuffle 有抗性（规则书第 21 页，R-020、R-033）。
   * 为真时，目标效果上的 Push / Pull 距离少 1，最低 0。不传表示没有。
   * 不作用在自身位移上。不从卡面回合数读，也不把免疫和抗性合成一次归零。
   */
  readonly shuffleResist?: boolean;
};

export type SkillCombatState = {
  readonly allies?: readonly SkillAreaHero[];
  readonly trinketHealingMetadata?: true;
  readonly trinketScope?: import("./battle").BattleState;
  /** R26：本次技能宣告后主动使用的饰品修正，不是常驻属性或 Buff。 */
  readonly trinketModifiers?: {
    readonly crit: number;
    readonly accuracy: number;
    readonly dealNoDamage?: boolean;
    readonly damage?: number;
  };
  /** 引擎内部续接：骰面阈值仍用声明时光照，自身效果不重复。 */
  readonly ownEffectsApplied?: true;
  readonly effectLight?: number;
  readonly target: SkillTargetState;
  /** 使用这张技能的英雄。目标有 Riposte 时必须有。 */
  readonly actor?: SkillActorState;
  /**
   * 与使用者同区域的其他英雄。打出暴击时各 −1 一次（R-031）。
   * 不要把使用者或目标放进来。
   */
  readonly heroesBesideActor?: readonly SkillAreaHero[];
  /**
   * 与目标同区域、这次没有被选为目标的英雄。
   * 只有英雄目标承受伤害暴击时各 +1 一次（R-031）。
   */
  readonly untargetedHeroesBesideTarget?: readonly SkillAreaHero[];
  /**
   * 目标英雄是不是和使用者在同一区域。
   * 为真时，打出暴击也给目标压力 −1（R-031 的「同区域其他英雄」）。
   */
  readonly targetInActorArea?: boolean;
  /**
   * 目标区域与使用者的距离（规则书 spaces away）。传入时必须等于卡面那个射程整数。
   * 目标区域更低时，也可以是这个整数再加 1（R-022）。不传就不做这一步。不在这里
   * 算最短步数。区间只有附逐卡复核注解才检查，原 numeric=null 不改。
   */
  readonly areaDistance?: number;
  /**
   * 这次在目标区域里选中的、符合技能目标类型的角色个数。传入时必须是 1 到
   * stats 行已命名目标图标的个数。不传就不做这一步。不在这里挑人，也不把
   * 同一次使用套到其余目标上。
   */
  readonly targetsInArea?: number;
  /**
   * 场上有 Guard 的敌人，而这次选中的目标里没有他（规则书第 21 页，R-024）。
   * 技能目标是怪物时整次拒绝，自身效果也不发生。目标是英雄或 Self 时这条不适用。
   * 不传或为假就不查。不从卡面上的「1t」判断谁有 Guard，也不替调用方改选目标。
   */
  readonly guardedEnemyOmitted?: boolean;
  /**
   * 卡面印「Push N or Pull N」时，使用者选定的方向（规则书第 21 页）。
   * 不传就不替玩家选，这种行不算已经结算的位移。
   * 印成单一 Push 或 Pull 的行不用这个字段，传入了也不改那一行的方向。
   */
  readonly shuffleChoice?: "push" | "pull";
  /**
   * 目标所在区域是否比使用者低（规则书第 25 页：高地 > 普通 > 低地）。
   * 为真时命中阈值 +1，并把单个整数射程的上限再加 1，原距离仍可选（R-022）。
   * 不传或为假都不加，从低打高也没有惩罚。已复核区间按 R-022 上限 +1。
   */
  readonly targetAreaLower?: boolean;
  /**
   * 当前光照 0–5（规则书第 29 页，R-002）。0–4 让暴击阈值 +1。恰好 5 不加暴击，
   * 但目标是英雄时命中阈值再减 1（英雄 Dodge +1）。恰好 0 且目标是怪物时，命中
   * 阈值再减 1（怪物 Dodge +1）。不传就这些都不加。英雄技能不加怪物 Acc +1。
   * 光照 2–1 以及光照 0 的「承受压力额外 +1」不加：这里结算到的压力都是减少，
   * 卡面上的加压力 numeric 为 null。不从卡面「+1」读。
   */
  readonly light?: number;
  /**
   * 结算这张双面技能的哪一面。不传或 `front` 用正面效果行。
   * `back` 用 `back_face_skill.lines`（规则书第 38 页 Transform to Human）。
   */
  readonly face?: "front" | "back";
};

export type SkippedSkillEffect = {
  readonly code: "effect_lines" | "damage_or_heal_combined_marker";
};

/**
 * 规则书第 21 页的 Push / Pull。距离从卡面印的正整数来；目标有 Shuffle 抗性时
 * 再少 1，最低 0。还没落到区域或姿态轨上。
 */
export type SkillShuffle = {
  readonly direction: "push" | "pull";
  readonly distance: number;
};

/** 规则书第 38 页憎恶的两种形态。卡面印的是 Beast / Human。 */
export type SkillForm = "beast" | "human";

/** 已命名生命效果的发生顺序；不能从最终伤口差值逆推（R20、R29）。 */
export type SkillHealthEffect = {
  readonly rawHealing?: number;
  readonly entityId: string;
  readonly side: SkillTargetSide;
  readonly source: "selfHeal" | "selfWound" | "targetHeal" | "attack" | "riposte" | "passiveStress";
  readonly passiveKey?: string;
  readonly rollPassive?: boolean;
  readonly pressureBoundary?: true;
  readonly critical?: boolean;
  readonly effect: HeroHealthEffect;
};

export type SkillEffectsResolution = {
  readonly resolution: HeroSkillResolution;
  readonly healthEffects: readonly SkillHealthEffect[];
  readonly own?: SkillEffectsResolution;
};

export type HeroSkillResolution = {
  readonly targetDisease?: true;
  /** R-084：Howl的目标行在全部攻击后逐名执行；待选保留剩余目标。 */
  readonly orderedMonsterTargetEffects?: { readonly light: -1; readonly stress: 2 };
  readonly skillId: string;
  readonly targetId: string;
  readonly status: "resolved" | "refused";
  readonly reason: string | null;
  readonly outcome: "crit" | "hit" | "miss" | null;
  readonly effect: "damage" | "heal" | "stress" | null;
  /** 卡面上 Crit / Acc 旁边的整数。还没做 Protection。 */
  readonly printedAmount: number | null;
  /** Protection 之后的伤害。只有伤害类命中或暴击才有数字；落空和治疗为 null。 */
  readonly damageDealt: number | null;
  /** 反弹给攻击者的伤害。没触发为 null。 */
  readonly riposteDamage: number | null;
  readonly wounds: number;
  /** 攻击者结算后的伤口。没传入攻击者时为 null。 */
  readonly actorWounds: number | null;
  /** 怪物伤口 ≥ Life。没传入 Life，或目标不是怪物时为 false。 */
  readonly targetDead: boolean;
  /**
   * 命中或暴击时，目标效果清掉全部 Bleed 堆叠。
   * 没有这条效果，或落空，为 false。不改堆上的面值：规则书是整堆移除。
   */
  readonly targetBleedCleared: boolean;
  /** 与 Bleed 同一条目标效果，清掉全部 Blight 堆叠。 */
  readonly targetBlightCleared: boolean;
  /**
   * 自身效果清掉使用者的全部 Bleed 堆叠。
   * 没有 Acc 时不掷骰也清；有 Acc 时落空也清。没有这条效果，或整次拒绝，为 false。
   * 不改堆上的面值：规则书是整堆移除。不表示目标身上的流血被清掉。
   */
  readonly actorBleedCleared: boolean;
  /**
   * 自身效果清掉使用者的全部 Blight 堆叠。
   * 和流血写在同一条「Remove」上时，与 `actorBleedCleared` 一起为 true。
   * 只有流血、没有腐蚀的那条（Adrenaline Rush III）不把腐蚀清掉。
   */
  readonly actorBlightCleared: boolean;
  /**
   * 自身效果上印的 Push / Pull。落空也有。没有这条效果时为 null。
   * 调用方对一次技能使用只采用一次。区域和姿态轨不在这一层。
   */
  readonly actorShuffle: SkillShuffle | null;
  /**
   * 目标效果上印的 Push / Pull。只在命中或暴击时有。落空为 null。
   * 目标有 Shuffle 抗性时，距离是印刷值再少 1，最低 0。0 表示减完了，不是落空。
   */
  readonly targetShuffle: SkillShuffle | null;
  /**
   * 命中或暴击的攻击伤害没有被 Protection 减半。
   * 卡面目标效果是「Ignores」加已命名的防护，并且这次不是落空。否则为 false。
   * 不表示防护代币被移除。
   */
  readonly targetProtectionIgnored: boolean;
  /** Rallying Flare 等：自身效果清除眩晕与标记堆（R-103）。 */
  readonly actorStunMarkCleared: boolean;
  /** 英雄目标清除眩晕与标记；怪物目标不设置。 */
  readonly targetStunMarkCleared: boolean;
  /**
   * 自身效果印的「Self Change: Beast / Human」。没有 Acc 时不掷骰也记上。
   * 没有这条效果时为 null。不表示卡和棋子已经翻面。
   */
  readonly actorForm: SkillForm | null;
  readonly actorStress: number | null;
  readonly targetStress: number | null;
  readonly besideActorStress: readonly SkillAreaHero[] | null;
  readonly untargetedBesideTargetStress: readonly SkillAreaHero[] | null;
  readonly skipped: readonly SkippedSkillEffect[];
  readonly actorStatusEffects?: readonly StatusEffect[];
  readonly targetStatusEffects?: readonly StatusEffect[];
  readonly targetTrinketStatusEffects?: readonly StatusEffect[];
  readonly actorLightDelta?: number;
  readonly targetLightDelta?: number;
};

const NAMED = new Set(["confirmed", "confirmed_rulebook"]);

function nonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function positiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function isStress(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 10;
}

/** 减半向上取整。只用于非负整数。 */
function halfUp(value: number): number {
  return Math.ceil(value / 2);
}

function clampStress(value: number): number {
  if (value < 0) return 0;
  if (value > 10) return 10;
  return value;
}

function copyHeroes(heroes: readonly SkillAreaHero[] | null): SkillAreaHero[] | null {
  if (heroes === null) return null;
  return heroes.map((hero) => ({ ...hero }));
}

function snapshotHeroes(value: readonly SkillAreaHero[] | undefined): SkillAreaHero[] | null {
  if (!Array.isArray(value)) return null;
  const heroes: SkillAreaHero[] = [];
  for (const hero of value) {
    if (typeof hero !== "object" || hero === null) continue;
    heroes.push({
      id: typeof hero.id === "string" ? hero.id : "",
      stress: typeof hero.stress === "number" ? hero.stress : 0,
    });
  }
  return heroes;
}

function refuse(
  skill: HeroSkillCardView,
  combat: SkillCombatState,
  reason: string,
): HeroSkillResolution {
  const actorWounds = typeof combat.actor?.wounds === "number" ? combat.actor.wounds : null;
  const actorStress = typeof combat.actor?.stress === "number" ? combat.actor.stress : null;
  const targetStress = typeof combat.target.stress === "number" ? combat.target.stress : null;
  return {
    skillId: skill.id,
    targetId: combat.target.id,
    status: "refused",
    reason,
    outcome: null,
    effect: null,
    printedAmount: null,
    damageDealt: null,
    riposteDamage: null,
    wounds: combat.target.wounds,
    actorWounds,
    targetDead: false,
    targetBleedCleared: false,
    targetBlightCleared: false,
    actorBleedCleared: false,
    actorBlightCleared: false,
    actorShuffle: null,
    targetShuffle: null,
    targetProtectionIgnored: false,
    actorStunMarkCleared: false,
    targetStunMarkCleared: false,
    actorForm: null,
    actorStress,
    targetStress,
    besideActorStress: snapshotHeroes(combat.heroesBesideActor),
    untargetedBesideTargetStress: snapshotHeroes(combat.untargetedHeroesBesideTarget),
    skipped: [],
  };
}

function namedKeys(segments: readonly SkillSegment[] | null): string[] {
  if (!segments) return [];
  const keys: string[] = [];
  for (const segment of segments) {
    if (segment.type !== "icon") continue;
    const key = segment.icon.key;
    if (key === null || !NAMED.has(segment.icon.naming)) continue;
    keys.push(key);
  }
  return keys;
}

function threshold(skill: HeroSkillCardView, label: "Crit" | "Acc"): number | null {
  const found = skill.printed_labels.filter((item) => item.label === label);
  if (found.length !== 1) return null;
  const value = found[0]?.value;
  if (value === undefined || value === null || !nonNegativeInteger(value)) return null;
  return value;
}

/** 印在 Crit / Acc 标签旁边的那个整数。不是伤害字段名。 */
function amountBesideLabel(skill: HeroSkillCardView, label: "Crit" | "Acc"): number | null {
  const found: number[] = [];
  for (const item of skill.unlabeled_numbers) {
    if (item.anchor.type !== "printed_label" || item.anchor.label !== label) continue;
    if (item.numeric === null || !nonNegativeInteger(item.numeric)) continue;
    found.push(item.numeric);
  }
  if (found.length !== 1) return null;
  return found[0] ?? null;
}

type ImmediateStress = {
  readonly self: number;
  readonly target: number;
  /** 对得上的立即压力行。没有时为 0。 */
  readonly lineCount: number;
};

type SelfHeal = {
  /** 从使用者伤口扣除的总量。没有时为 0。 */
  readonly amount: number;
  readonly lineCount: number;
};

type SelfHealStress = {
  /** 从使用者伤口扣除的总量。没有时为 0。 */
  readonly heal: number;
  /** 加到使用者压力上的总量。减压是负数。没有时为 0。 */
  readonly stress: number;
  /** 对得上的「Self + heal + stress」行。没有，或各行数字不一致时为 0。 */
  readonly lineCount: number;
};

type ConditionRemoval = {
  /**
   * 要清掉目标全部流血和腐蚀的行。带目标标记的，以及换行后配给目标标记的。
   * 没有时为 0。只在命中、暴击，或没有 Acc 时用。
   */
  readonly targetLines: number;
  /**
   * 要清掉使用者全部流血和腐蚀的行。带自身标记的，以及换行后配给自身标记的。
   * 没有时为 0。落空也清。只有流血、没有腐蚀的那条不在这里。
   */
  readonly actorLines: number;
  /**
   * 换行后配给目标的行。没有 Acc、也没有别的可结算效果时，靠它让技能仍然生效。
   * 已经算进 `targetLines`。
   */
  readonly pairedTargetLines: number;
  /** 认出来的「Remove + bleed + blight」行，含换行后配上的。用来算跳过的效果行。 */
  readonly lineCount: number;
};

/**
 * 只接受「标记 + stress」这一条效果，并且卡上每个非空的 stress `numeric` 都是同一个整数。
 * 条数对不上，或行里还有别的已命名图标，就不结算这条，留给 effect_lines 跳过。
 */
function readImmediateStress(skill: HeroSkillCardView): ImmediateStress {
  const none: ImmediateStress = { self: 0, target: 0, lineCount: 0 };
  const explicit = skill.verified_self_stress;
  if (explicit) {
    const line = skill.effect_lines[explicit.lineIndex];
    const text = line
      ?.map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
      .join("")
      .replace(/\s/g, "");
    return text ===
      `{self_effects}Self{stress}${explicit.amount > 0 ? "+" : ""}${explicit.amount}` &&
      line?.every((s) => s.type === "text" || NAMED.has(s.icon.naming)) &&
      Number.isSafeInteger(explicit.amount)
      ? { self: explicit.amount, target: 0, lineCount: 1 }
      : none;
  }
  const numerics: number[] = [];
  for (const item of skill.unlabeled_numbers) {
    if (item.anchor.type !== "beside_icon") continue;
    const left = item.anchor.left_icon;
    if (left === null || left.key !== "stress" || !NAMED.has(left.naming)) continue;
    if (item.anchor.inside_icon !== null) continue;
    if (item.numeric === null || !Number.isInteger(item.numeric)) continue;
    numerics.push(item.numeric);
  }
  const shared = numerics[0];
  if (shared === undefined || numerics.some((value) => value !== shared)) return none;

  const matched: ("self" | "target")[] = [];
  for (const line of skill.effect_lines) {
    const audience = stressLineAudience(line, shared);
    if (audience === null) continue;
    matched.push(audience);
  }
  if (matched.length === 0 || matched.length !== numerics.length) return none;

  let self = 0;
  let target = 0;
  for (const audience of matched) {
    if (audience === "self") self += shared;
    else target += shared;
  }
  return {
    self,
    target,
    lineCount: matched.length,
  };
}

/**
 * 只接受「Self + heal」这一条自身效果。治疗量必须是治疗图标内的非负整数，
 * 并且每条这种行和每一个这种数字对得上。组合标记可以待在行里，不拿它当治疗量。
 */
function readSelfHeal(skill: HeroSkillCardView): SelfHeal {
  const none: SelfHeal = { amount: 0, lineCount: 0 };
  const confirmed = skill.verified_self_heal;
  if (confirmed)
    return confirmed.source === "print_front" &&
      nonNegativeInteger(confirmed.amount) &&
      skill.effect_lines[confirmed.lineIndex] &&
      selfHealLine(skill.effect_lines[confirmed.lineIndex]!, confirmed.amount)
      ? { amount: confirmed.amount, lineCount: 1 }
      : none;
  const numerics: number[] = [];
  for (const item of skill.unlabeled_numbers) {
    if (item.anchor.type !== "beside_icon") continue;
    if (item.anchor.left_icon !== null) continue;
    const inside = item.anchor.inside_icon;
    if (inside === null || inside.key !== "heal" || !NAMED.has(inside.naming)) continue;
    if (item.numeric === null || !nonNegativeInteger(item.numeric)) continue;
    numerics.push(item.numeric);
  }
  const shared = numerics[0];
  if (shared === undefined || numerics.some((value) => value !== shared)) return none;

  let lineCount = 0;
  for (const line of skill.effect_lines) {
    if (selfHealLine(line, shared)) lineCount += 1;
  }
  if (lineCount === 0 || lineCount !== numerics.length) return none;
  return { amount: shared * lineCount, lineCount };
}

/** R20：已命名 Wound 与旁边整数对上整行才结算；自身创伤无视命中和防护。 */
function readSelfWound(skill: HeroSkillCardView): SelfHeal {
  const lines = skill.effect_lines.filter(
    (line) =>
      line.every((s) => s.type === "text" || NAMED.has(s.icon.naming)) &&
      /^\{self_effects\}Self\d+\{wound\}$/.test(
        line
          .map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
          .join("")
          .split(String.fromCharCode(7))
          .join("")
          .replace(/\s/g, ""),
      ),
  );
  const amounts = skill.unlabeled_numbers.filter(
    (n) =>
      n.anchor.type === "beside_icon" &&
      n.anchor.left_icon === null &&
      n.anchor.inside_icon === null &&
      n.numeric !== null &&
      nonNegativeInteger(n.numeric),
  );
  if (lines.length !== 1 || amounts.length !== 1) return { amount: 0, lineCount: 0 };
  const amount = amounts[0]!.numeric!;
  const text = lines[0]!
    .filter((s) => s.type === "text")
    .map((s) => s.text)
    .join("")
    .split(String.fromCharCode(7))
    .join("")
    .replace(/\s/g, "");
  return text === `Self${amount}` ? { amount, lineCount: 1 } : { amount: 0, lineCount: 0 };
}

function selfHealLine(line: readonly SkillSegment[], amount: number): boolean {
  let self = 0;
  let heal = 0;
  let marker = 0;
  let sawAmount = false;
  let sawSelfWord = false;
  for (const segment of line) {
    if (segment.type === "text") {
      const text = segment.text.trim();
      if (text === "") continue;
      if (text === "Self") {
        sawSelfWord = true;
        continue;
      }
      if (/^\d+$/.test(text) && Number(text) === amount) {
        sawAmount = true;
        continue;
      }
      return false;
    }
    if (!NAMED.has(segment.icon.naming) || segment.icon.key === null) return false;
    if (segment.icon.key === "self_effects") {
      self += 1;
      continue;
    }
    if (segment.icon.key === "heal") {
      heal += 1;
      continue;
    }
    if (segment.icon.key === "damage_or_heal_combined_marker") {
      marker += 1;
      continue;
    }
    return false;
  }
  return self === 1 && heal === 1 && marker <= 1 && sawAmount && sawSelfWord;
}

/** 「1」「1,」「-1」。逗号只是两个效果之间的分隔，不是另一个数字。 */
const PAIRED_AMOUNT = /^(-?\d+)\s*,?$/;

function pairedAmount(text: string): number | null {
  const matched = PAIRED_AMOUNT.exec(text);
  const raw = matched?.[1];
  if (raw === undefined) return null;
  const value = Number(raw);
  if (!Number.isInteger(value)) return null;
  return value;
}

function confirmedHealAmount(skill: HeroSkillCardView, amount: number): boolean {
  if (!nonNegativeInteger(amount)) return false;
  return skill.unlabeled_numbers.some((item) => {
    if (item.numeric !== amount || item.anchor.type !== "beside_icon") return false;
    const inside = item.anchor.inside_icon;
    return inside !== null && inside.key === "heal" && NAMED.has(inside.naming);
  });
}

function confirmedStressAmount(skill: HeroSkillCardView, amount: number): boolean {
  if (!Number.isInteger(amount)) return false;
  return skill.unlabeled_numbers.some((item) => {
    if (item.numeric !== amount || item.anchor.type !== "beside_icon") return false;
    if (item.anchor.inside_icon !== null) return false;
    const left = item.anchor.left_icon;
    return left !== null && left.key === "stress" && NAMED.has(left.naming);
  });
}

/**
 * 只接受「Self + heal + stress」这一条自身效果。治疗量在治疗图标后面，压力量在
 * 压力图标后面。两个数都必须在 `unlabeled_numbers` 里有相同的非 null `numeric`。
 * 各行的治疗量或压力量不一致时，一条都不采用。
 */
function readSelfHealStress(skill: HeroSkillCardView): SelfHealStress {
  const none: SelfHealStress = { heal: 0, stress: 0, lineCount: 0 };
  const heals: number[] = [];
  const stresses: number[] = [];
  for (const line of skill.effect_lines) {
    const parsed = selfHealStressLine(line);
    if (parsed === null) continue;
    if (!confirmedHealAmount(skill, parsed.heal) || !confirmedStressAmount(skill, parsed.stress)) {
      return none;
    }
    heals.push(parsed.heal);
    stresses.push(parsed.stress);
  }
  const heal = heals[0];
  const stress = stresses[0];
  if (heal === undefined || stress === undefined) return none;
  if (heals.some((value) => value !== heal) || stresses.some((value) => value !== stress)) {
    return none;
  }
  return { heal: heal * heals.length, stress: stress * stresses.length, lineCount: heals.length };
}

function selfHealStressLine(
  line: readonly SkillSegment[],
): { heal: number; stress: number } | null {
  let self = 0;
  let heal = 0;
  let stress = 0;
  let marker = 0;
  let sawSelfWord = false;
  let healAmount: number | null = null;
  let stressAmount: number | null = null;
  let pending: "heal" | "stress" | null = null;
  for (const segment of line) {
    if (segment.type === "text") {
      const text = segment.text.trim();
      if (text === "") continue;
      if (text === "Self") {
        sawSelfWord = true;
        continue;
      }
      const amount = pairedAmount(text);
      if (amount === null || pending === null) return null;
      if (pending === "heal") {
        if (healAmount !== null) return null;
        if (!nonNegativeInteger(amount)) return null;
        healAmount = amount;
      } else {
        if (stressAmount !== null) return null;
        stressAmount = amount;
      }
      pending = null;
      continue;
    }
    if (!NAMED.has(segment.icon.naming) || segment.icon.key === null) return null;
    if (segment.icon.key === "self_effects") {
      self += 1;
      continue;
    }
    if (segment.icon.key === "heal") {
      heal += 1;
      pending = "heal";
      continue;
    }
    if (segment.icon.key === "stress") {
      stress += 1;
      pending = "stress";
      continue;
    }
    if (segment.icon.key === "damage_or_heal_combined_marker") {
      marker += 1;
      continue;
    }
    return null;
  }
  if (self !== 1 || heal !== 1 || stress !== 1 || marker > 1 || !sawSelfWord) return null;
  if (healAmount === null || stressAmount === null || pending !== null) return null;
  return { heal: healAmount, stress: stressAmount };
}

/** 规则书第 19 页把自身效果印成「Self」。只认这个词，不从其它文字里读规则。 */
function stressLineAudience(
  line: readonly SkillSegment[],
  amount: number,
): "self" | "target" | null {
  let audience: "self" | "target" | null = null;
  let stress = 0;
  let sawAmount = false;
  let sawSelfWord = false;
  for (const segment of line) {
    if (segment.type === "text") {
      const text = segment.text.trim();
      if (text === "") continue;
      if (text === "Self") {
        sawSelfWord = true;
        continue;
      }
      if (/^-?\d+$/.test(text) && Number(text) === amount) {
        sawAmount = true;
        continue;
      }
      return null;
    }
    if (!NAMED.has(segment.icon.naming) || segment.icon.key === null) return null;
    if (segment.icon.key === "self_effects" || segment.icon.key === "target_effects") {
      if (audience !== null) return null;
      audience = segment.icon.key === "self_effects" ? "self" : "target";
      continue;
    }
    if (segment.icon.key === "stress") {
      stress += 1;
      continue;
    }
    return null;
  }
  if (audience === null || stress !== 1 || !sawAmount) return null;
  if (sawSelfWord && audience !== "self") return null;
  return audience;
}

/**
 * 版面提取夹在 Self 前面的窄字形（U+0007）。不是图标，也不是数字。
 * 不写进正则，避免把控制字符放进字符类。
 */
const EXTRACTED_SELF_MARK = String.fromCharCode(7);

/**
 * 「Remove + bleed + blight」。标记可以在同一行，也可以在同一效果框的另一行。
 * 和增益、回合数写在同一行的不算。文字必须是「Remove」这一个词。
 */
function readConditionRemoval(skill: HeroSkillCardView): ConditionRemoval {
  const none: ConditionRemoval = {
    targetLines: 0,
    actorLines: 0,
    pairedTargetLines: 0,
    lineCount: 0,
  };
  let markedTarget = 0;
  let markedSelf = 0;
  let unmarked = 0;
  const openBoxes: ("self" | "target")[] = [];
  for (const line of skill.effect_lines) {
    const kind = removeBleedBlightKind(line);
    if (kind === "target") {
      markedTarget += 1;
      continue;
    }
    if (kind === "self") {
      markedSelf += 1;
      continue;
    }
    if (kind === "unmarked") {
      unmarked += 1;
      continue;
    }
    const audience = effectBoxAudience(line);
    if (audience !== null) openBoxes.push(audience);
  }
  let pairedSelf = 0;
  let pairedTarget = 0;
  if (unmarked > 0 && unmarked === openBoxes.length) {
    for (const audience of openBoxes) {
      if (audience === "self") pairedSelf += 1;
      else pairedTarget += 1;
    }
  }
  if (markedTarget === 0 && markedSelf === 0 && pairedSelf === 0 && pairedTarget === 0) {
    return none;
  }
  return {
    targetLines: markedTarget + pairedTarget,
    actorLines: markedSelf + pairedSelf,
    pairedTargetLines: pairedTarget,
    lineCount: markedTarget + markedSelf + pairedSelf + pairedTarget,
  };
}

/** 这一行是不是刚好「Remove」加一枚流血、一枚腐蚀。多出来的图标让整行都不算。 */
function removeBleedBlightKind(
  line: readonly SkillSegment[],
): "self" | "target" | "unmarked" | null {
  let self = 0;
  let target = 0;
  let bleed = 0;
  let blight = 0;
  const words: string[] = [];
  for (const segment of line) {
    if (segment.type === "text") {
      for (const raw of segment.text.split(/\s+/)) {
        const word = raw.split(EXTRACTED_SELF_MARK).join("");
        if (word !== "") words.push(word);
      }
      continue;
    }
    if (!NAMED.has(segment.icon.naming) || segment.icon.key === null) return null;
    if (segment.icon.key === "self_effects") {
      self += 1;
      continue;
    }
    if (segment.icon.key === "target_effects") {
      target += 1;
      continue;
    }
    if (segment.icon.key === "bleed") {
      bleed += 1;
      continue;
    }
    if (segment.icon.key === "blight") {
      blight += 1;
      continue;
    }
    return null;
  }
  if (bleed !== 1 || blight !== 1 || words.length !== 1 || words[0] !== "Remove") return null;
  if (self === 1 && target === 0) return "self";
  if (target === 1 && self === 0) return "target";
  if (self === 0 && target === 0) return "unmarked";
  return null;
}

/**
 * 自身效果或目标效果标记所在的那一行。这一行自己已经是「Remove」时，不再接收换行。
 * 同一行有两种标记，或同一种有两枚，就不把换行配过来。
 */
function effectBoxAudience(line: readonly SkillSegment[]): "self" | "target" | null {
  let self = 0;
  let target = 0;
  for (const segment of line) {
    if (segment.type !== "icon") continue;
    if (!NAMED.has(segment.icon.naming) || segment.icon.key === null) continue;
    if (segment.icon.key === "self_effects") self += 1;
    if (segment.icon.key === "target_effects") target += 1;
  }
  if (self === 1 && target === 0) return "self";
  if (target === 1 && self === 0) return "target";
  return null;
}

type SelfBleedRemoval = {
  /** 对得上的「Self Remove」加流血。没有，或不止一条时为 0。 */
  readonly lineCount: number;
};

/**
 * 只接受「自身效果 + Self Remove + bleed」这一整行。
 * 文字必须是这两个词。提取进来的窄字形不当成第三个词。
 * 还有别的已命名图标，或混着回合数，就不算这条。
 */
function readSelfBleedRemoval(skill: HeroSkillCardView): SelfBleedRemoval {
  let lineCount = 0;
  for (const line of skill.effect_lines) {
    if (selfRemoveBleedLine(line)) lineCount += 1;
  }
  if (lineCount !== 1) return { lineCount: 0 };
  return { lineCount: 1 };
}

function selfRemoveBleedLine(line: readonly SkillSegment[]): boolean {
  let self = 0;
  let bleed = 0;
  const words: string[] = [];
  for (const segment of line) {
    if (segment.type === "text") {
      for (const raw of segment.text.split(/\s+/)) {
        const word = raw.split(EXTRACTED_SELF_MARK).join("");
        if (word !== "") words.push(word);
      }
      continue;
    }
    if (!NAMED.has(segment.icon.naming) || segment.icon.key === null) return false;
    if (segment.icon.key === "self_effects") {
      self += 1;
      continue;
    }
    if (segment.icon.key === "bleed") {
      bleed += 1;
      continue;
    }
    return false;
  }
  return (
    self === 1 && bleed === 1 && words.length === 2 && words[0] === "Self" && words[1] === "Remove"
  );
}

type ReadShuffles = {
  readonly self: SkillShuffle | null;
  readonly target: SkillShuffle | null;
  readonly lineCount: number;
};

const SHUFFLE_TEXT = /^(Push|Pull) (\d+)$/;

/** 「Push 2 or Pull 2」。两边必须是同一个正整数，方向由调用方选定。 */
const SHUFFLE_CHOICE_TEXT = /^Push (\d+) or Pull (\d+)$/;

/**
 * 只接受「标记 + shuffle + Push N / Pull N」这一整行。
 * 距离只来自这段印刷文字。同一侧有两条时都不采用，留给 effect_lines 跳过。
 * 「Push N or Pull N」只有在没有已经写明方向的目标位移、并且调用方选定了方向时，
 * 才记成那一次目标位移。没选定、两边距离不同、或和别的图标写在同一行，都不算。
 */
function readShuffles(skill: HeroSkillCardView, choice: "push" | "pull" | undefined): ReadShuffles {
  const selves: SkillShuffle[] = [];
  const targets: SkillShuffle[] = [];
  const choices: number[] = [];
  for (const line of skill.effect_lines) {
    const parsed = shuffleFromLine(line);
    if (parsed !== null) {
      if (parsed.audience === "self") selves.push(parsed.move);
      else targets.push(parsed.move);
      continue;
    }
    const distance = shuffleChoiceDistance(line);
    if (distance !== null) choices.push(distance);
  }
  const self = selves.length === 1 && selves[0] !== undefined ? selves[0] : null;
  let target = targets.length === 1 && targets[0] !== undefined ? targets[0] : null;
  const chosen = choices.length === 1 ? choices[0] : undefined;
  if (
    target === null &&
    targets.length === 0 &&
    chosen !== undefined &&
    (choice === "push" || choice === "pull")
  ) {
    target = { direction: choice, distance: chosen };
  }
  return {
    self,
    target,
    lineCount: (self === null ? 0 : 1) + (target === null ? 0 : 1),
  };
}

/** 接线层沿用同一解析器开方向选择，不解析未命名数字（R-048）。 */
export function needsHeroSkillShuffleChoice(
  skill: HeroSkillCardView,
  face: "front" | "back" = "front",
): boolean {
  const selected = selectFace(skill, face);
  if (!selected.ok) return false;
  const push = readShuffles(selected.skill, "push").target;
  const pull = readShuffles(selected.skill, "pull").target;
  if (push?.direction === "push" && pull?.direction === "pull") return true;
  const statusPush = readVerifiedStatusEffects(selected.skill, "push");
  const statusPull = readVerifiedStatusEffects(selected.skill, "pull");
  return (
    statusPush.status === "resolved" &&
    statusPull.status === "resolved" &&
    statusPush.targetShuffle?.direction === "push" &&
    statusPull.targetShuffle?.direction === "pull"
  );
}

/** 合并使用者与自身目标的快照时，沿用纯函数的 Self 判定（R19）。 */
export function heroSkillUsesSelfTarget(
  skill: HeroSkillCardView,
  face: "front" | "back" = "front",
): boolean {
  const selected = selectFace(skill, face);
  return selected.ok && readsAsSelfTarget(selected.skill);
}

/**
 * 目标效果上单独一行「Push N or Pull N」。N 两边相同才是一个距离。
 * 多出来的图标、自身标记，或拆成两段的「Push N or」，都不算。
 */
function shuffleChoiceDistance(line: readonly SkillSegment[]): number | null {
  let target = 0;
  let shuffles = 0;
  let distance: number | null = null;
  for (const segment of line) {
    if (segment.type === "text") {
      const text = segment.text.trim();
      if (text === "") continue;
      const matched = SHUFFLE_CHOICE_TEXT.exec(text);
      if (matched === null || distance !== null) return null;
      const push = Number(matched[1]);
      const pull = Number(matched[2]);
      if (!positiveInteger(push) || push !== pull) return null;
      distance = push;
      continue;
    }
    if (!NAMED.has(segment.icon.naming) || segment.icon.key === null) return null;
    if (segment.icon.key === "target_effects") {
      target += 1;
      continue;
    }
    if (segment.icon.key === "shuffle") {
      shuffles += 1;
      continue;
    }
    return null;
  }
  if (target !== 1 || shuffles !== 1 || distance === null) return null;
  return distance;
}

function shuffleFromLine(
  line: readonly SkillSegment[],
): { readonly audience: "self" | "target"; readonly move: SkillShuffle } | null {
  let audience: "self" | "target" | null = null;
  let shuffles = 0;
  let sawSelfWord = false;
  let move: SkillShuffle | null = null;
  for (const segment of line) {
    if (segment.type === "text") {
      const text = segment.text.trim();
      if (text === "") continue;
      if (text === "Self") {
        sawSelfWord = true;
        continue;
      }
      const matched = SHUFFLE_TEXT.exec(text);
      if (matched === null || move !== null) return null;
      const distance = Number(matched[2]);
      if (!positiveInteger(distance)) return null;
      move = {
        direction: matched[1] === "Push" ? "push" : "pull",
        distance,
      };
      continue;
    }
    if (!NAMED.has(segment.icon.naming) || segment.icon.key === null) return null;
    if (segment.icon.key === "self_effects" || segment.icon.key === "target_effects") {
      if (audience !== null) return null;
      audience = segment.icon.key === "self_effects" ? "self" : "target";
      continue;
    }
    if (segment.icon.key === "shuffle") {
      shuffles += 1;
      continue;
    }
    return null;
  }
  if (audience === null || shuffles !== 1 || move === null) return null;
  if (sawSelfWord !== (audience === "self")) return null;
  return { audience, move };
}

type IgnoresProtection = {
  /** 对得上的「Ignores Protection」目标效果行。没有时为 0。 */
  readonly targetLines: number;
};

/**
 * 只接受「目标效果 + Ignores + protection」这一整行。
 * 没有目标效果标记、文字不是「Ignores」、或防护图标没命名，就不算这条。
 * 不读回合数，也不把这行理解成移除防护。
 */
function readIgnoresProtection(skill: HeroSkillCardView): IgnoresProtection {
  let targetLines = 0;
  for (const line of skill.effect_lines) {
    if (ignoresProtectionLine(line)) targetLines += 1;
  }
  return { targetLines };
}

function ignoresProtectionLine(line: readonly SkillSegment[]): boolean {
  let target = 0;
  let protection = 0;
  let sawIgnores = false;
  for (const segment of line) {
    if (segment.type === "text") {
      const text = segment.text.trim();
      if (text === "") continue;
      if (text === "Ignores") {
        if (sawIgnores) return false;
        sawIgnores = true;
        continue;
      }
      return false;
    }
    if (!NAMED.has(segment.icon.naming) || segment.icon.key === null) return false;
    if (segment.icon.key === "target_effects") {
      target += 1;
      continue;
    }
    if (segment.icon.key === "protection") {
      protection += 1;
      continue;
    }
    return false;
  }
  return target === 1 && protection === 1 && sawIgnores;
}

type IgnoresGuard = {
  readonly targetLines: number;
};

/** 只接受「Ignores + guard」整行（R-102）。 */
function readIgnoresGuard(skill: HeroSkillCardView): IgnoresGuard {
  let targetLines = 0;
  for (const line of skill.effect_lines) {
    if (ignoresGuardLine(line)) targetLines += 1;
  }
  return { targetLines };
}

export function skillIgnoresGuard(skill: HeroSkillCardView): boolean {
  return readIgnoresGuard(skill).targetLines > 0;
}

function ignoresGuardLine(line: readonly SkillSegment[]): boolean {
  let guard = 0;
  let sawIgnores = false;
  for (const segment of line) {
    if (segment.type === "text") {
      const text = segment.text.trim();
      if (text === "") continue;
      if (text === "Ignores") {
        if (sawIgnores) return false;
        sawIgnores = true;
        continue;
      }
      return false;
    }
    if (!NAMED.has(segment.icon.naming) || segment.icon.key === null) return false;
    if (segment.icon.key === "guard") {
      guard += 1;
      continue;
    }
    return false;
  }
  return guard === 1 && sawIgnores;
}

type FormChange = {
  readonly form: SkillForm | null;
  /** 对得上的变身行。没有，或不止一条时为 0。 */
  readonly lineCount: number;
};

const FORM_TEXT = /^Self Change: (Beast|Human)$/;

/**
 * 只接受「自身效果 + Self Change: Beast / Human」这一整行。
 * 文字必须是这一整句。不从卡背、技能名或别的文字里读形态。
 */
function readFormChange(skill: HeroSkillCardView): FormChange {
  const forms: SkillForm[] = [];
  for (const line of skill.effect_lines) {
    const form = formFromLine(line);
    if (form !== null) forms.push(form);
  }
  const form = forms.length === 1 ? forms[0] : undefined;
  if (form === undefined) return { form: null, lineCount: 0 };
  return { form, lineCount: 1 };
}

function formFromLine(line: readonly SkillSegment[]): SkillForm | null {
  let self = 0;
  let phrase: string | null = null;
  for (const segment of line) {
    if (segment.type === "text") {
      const text = segment.text.trim();
      if (text === "") continue;
      if (phrase !== null) return null;
      phrase = text;
      continue;
    }
    if (!NAMED.has(segment.icon.naming) || segment.icon.key === null) return null;
    if (segment.icon.key === "self_effects") {
      self += 1;
      continue;
    }
    return null;
  }
  if (self !== 1 || phrase === null) return null;
  const matched = FORM_TEXT.exec(phrase);
  if (matched?.[1] === "Beast") return "beast";
  if (matched?.[1] === "Human") return "human";
  return null;
}

const FORM_ONLY_TEXT = /^(Beast|Human) Form Only$/;

/**
 * 只接受「文字底板 + Beast Form Only / Human Form Only」这一整行。
 * 底板的词典说明同时写了两种形态，没有这句印刷文字就不算限定（R-048）。
 */
function formRequirementFromLine(line: readonly SkillSegment[]): SkillForm | null {
  let plates = 0;
  let form: SkillForm | null = null;
  for (const segment of line) {
    if (segment.type === "text") {
      const text = segment.text.trim();
      if (text === "") continue;
      if (form !== null) return null;
      const matched = FORM_ONLY_TEXT.exec(text);
      if (matched?.[1] === "Beast") form = "beast";
      else if (matched?.[1] === "Human") form = "human";
      else return null;
      continue;
    }
    if (segment.type !== "icon") return null;
    if (!NAMED.has(segment.icon.naming) || segment.icon.key !== "text_plate") return null;
    plates += 1;
  }
  if (plates !== 1 || form === null) return null;
  return form;
}

/**
 * 印出来的形态限定。没有这种行时不限制。不止一条，或两种都有，整次不结算。
 * 没传入当前形态时不检查。
 */
function formRequirementProblem(skill: HeroSkillCardView, combat: SkillCombatState): string | null {
  if (skill.verified_required_form && combat.actor?.form !== skill.verified_required_form)
    return "技能需要对应的憎恶形态（R38）";
  const required: SkillForm[] = [];
  for (const line of skill.effect_lines) {
    const form = formRequirementFromLine(line);
    if (form !== null) required.push(form);
  }
  if (required.length === 0) return null;
  const form = required[0];
  if (form === undefined || required.length !== 1 || required.some((item) => item !== form)) {
    return "这张技能的形态限定读不清，不能确定要人形还是兽形（规则书第 38 页，R-048）";
  }
  const current = combat.actor?.form;
  if (current === undefined) return null;
  if (current === form) return null;
  const printed = form === "beast" ? "Beast Form Only" : "Human Form Only";
  const expected = form === "beast" ? "兽形" : "人形";
  return `这张技能印着 ${printed}，当前形态不是${expected}（规则书第 38 页）`;
}

function isStanceIcon(icon: SkillIconRef): boolean {
  if (icon.key === null || !NAMED.has(icon.naming)) return false;
  return STANCE_LIT.has(icon.key) || STANCE_UNLIT.has(icon.key) || STANCE_UNMARKED.has(icon.key);
}

/** 背面版式里单独的一行姿态图标。没有时为 null。两行都像姿态行时读不清。 */
function stanceRowIcons(
  lines: readonly (readonly SkillSegment[])[],
): { ok: true; icons: readonly SkillIconRef[] | null } | { ok: false } {
  let found: readonly SkillIconRef[] | null = null;
  for (const line of lines) {
    const icons: SkillIconRef[] = [];
    let stanceLine = true;
    for (const segment of line) {
      if (segment.type === "text") {
        if (segment.text.trim() !== "") {
          stanceLine = false;
          break;
        }
        continue;
      }
      if (segment.type !== "icon" || !isStanceIcon(segment.icon)) {
        stanceLine = false;
        break;
      }
      icons.push(segment.icon);
    }
    if (!stanceLine || icons.length === 0) continue;
    if (found !== null) return { ok: false };
    found = icons;
  }
  return { ok: true, icons: found };
}

/**
 * `front` 原样返回。`back` 改用背面效果行和背面姿态行，并清掉正面图标，
 * 避免正面的头盔或未点亮标记被当成背面的。
 */
function selectFace(
  skill: HeroSkillCardView,
  face: "front" | "back",
): { ok: true; skill: HeroSkillCardView } | { ok: false; reason: string } {
  try {
    const projected = projectAbominationSkill(skill, face);
    if (projected) return { ok: true, skill: projected };
  } catch {
    return { ok: false, reason: "憎恶技能身份、效果或背面与已核实卡面不符（R-048）" };
  }
  if (face === "front") return { ok: true, skill };
  const back = skill.back_face_skill;
  if (back == null || !Array.isArray(back.lines)) {
    return { ok: false, reason: "这张技能没有背面效果可以结算（规则书第 38 页）" };
  }
  for (const line of back.lines) {
    if (!Array.isArray(line)) {
      return { ok: false, reason: "背面效果行读不清（规则书第 38 页）" };
    }
  }
  const stance = stanceRowIcons(back.lines);
  if (!stance.ok) {
    return { ok: false, reason: "背面的姿态行读不清，不能核对能否使用（规则书第 19、38 页）" };
  }
  return {
    ok: true,
    skill: {
      ...skill,
      effect_lines: back.lines,
      front_icons: [],
      top_row_icons: stance.icons ?? [],
    },
  };
}

/**
 * 规则书第 19 页把目标印成「Self」：射程图标后面这个词，不是英雄或怪物图标。
 * 只看 stats 行。效果行里自身效果框上的「Self」不算。
 */
function readsAsSelfTarget(skill: HeroSkillCardView): boolean {
  const line = skill.stats_line;
  if (line === null) {
    if (
      !skill.verified_status_effects?.length ||
      skill.verified_status_effects.some((entry) => entry.scope !== "self")
    )
      return false;
    return skill.effect_lines.some(
      (line) =>
        line
          .map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
          .join("")
          .replace(/\s+/g, "") === "{range}Self" &&
        line.every((s) => s.type === "text" || NAMED.has(s.icon.naming)),
    );
  }
  let range = 0;
  let targetIcon = 0;
  let selfWords = 0;
  for (const segment of line) {
    if (segment.type === "text") {
      const trimmed = segment.text.trim();
      if (trimmed === "") continue;
      for (const token of trimmed.split(/\s+/)) {
        if (token === "Self") selfWords += 1;
      }
      continue;
    }
    if (!NAMED.has(segment.icon.naming) || segment.icon.key === null) continue;
    if (segment.icon.key === "range") range += 1;
    if (segment.icon.key === "target_hero" || segment.icon.key === "target_monster") {
      targetIcon += 1;
    }
  }
  return range === 1 && targetIcon === 0 && selfWords === 1;
}

function hasCombinedMarker(skill: HeroSkillCardView, keys: readonly string[]): boolean {
  if (keys.includes("damage_or_heal_combined_marker")) return true;
  for (const line of skill.effect_lines) {
    for (const segment of line) {
      if (segment.type !== "icon") continue;
      if (segment.icon.key !== "damage_or_heal_combined_marker") continue;
      if (!NAMED.has(segment.icon.naming)) continue;
      return true;
    }
  }
  return false;
}

function skippedEffects(
  skill: HeroSkillCardView,
  keys: readonly string[],
  resolvedEffectLines: number,
): SkippedSkillEffect[] {
  const skipped: SkippedSkillEffect[] = [];
  if (hasCombinedMarker(skill, keys)) {
    skipped.push({ code: "damage_or_heal_combined_marker" });
  }
  if (skill.effect_lines.length > 0 && resolvedEffectLines !== skill.effect_lines.length) {
    skipped.push({ code: "effect_lines" });
  }
  return skipped;
}

function readAreaHeroes(
  value: readonly SkillAreaHero[] | undefined,
  label: string,
): { ok: true; heroes: SkillAreaHero[] | null } | { ok: false; reason: string } {
  if (value === undefined) return { ok: true, heroes: null };
  if (!Array.isArray(value)) return { ok: false, reason: `${label}必须是数组` };
  const seen = new Set<string>();
  const heroes: SkillAreaHero[] = [];
  for (const hero of value) {
    if (typeof hero !== "object" || hero === null) {
      return { ok: false, reason: `${label}里有空项` };
    }
    if (typeof hero.id !== "string" || hero.id.length === 0) {
      return { ok: false, reason: `${label}里的英雄缺少 id` };
    }
    if (!isStress(hero.stress)) {
      return { ok: false, reason: `${label}里的压力必须是 0 到 10 的整数` };
    }
    if (seen.has(hero.id)) return { ok: false, reason: `${label}里有重复的英雄` };
    seen.add(hero.id);
    heroes.push({ id: hero.id, stress: hero.stress });
  }
  return { ok: true, heroes };
}

const STANCE_LIT = new Map<string, SkillStance>([
  ["stance_support_lit", "support"],
  ["stance_ranged_lit", "ranged"],
  ["stance_defensive_lit", "defensive"],
  ["stance_aggressive_lit", "aggressive"],
]);

const STANCE_UNLIT = new Map<string, SkillStance>([
  ["stance_support_unlit", "support"],
  ["stance_ranged_unlit", "ranged"],
  ["stance_defensive_unlit", "defensive"],
  ["stance_aggressive_unlit", "aggressive"],
]);

/**
 * 词典把这枚图标写成「confirm lit/unlit」。key 本身不是点亮，也不是未点亮。
 * 不从英文说明里补。
 */
const STANCE_UNMARKED = new Map<string, SkillStance>([["stance_ranged_abomination_row", "ranged"]]);

export type HeroSkillStanceMark = "lit" | "unlit" | "unknown";

type StanceMark = HeroSkillStanceMark;

/** 卡面顶行从左到右：支援 → 远程 → 防御 → 进攻（规则书 §6.5 / UI 原型）。 */
export const HERO_SKILL_STANCE_DISPLAY_ORDER = [
  "support",
  "ranged",
  "defensive",
  "aggressive",
] as const satisfies readonly SkillStance[];

function isSkillStance(value: unknown): value is SkillStance {
  return (
    value === "support" || value === "ranged" || value === "defensive" || value === "aggressive"
  );
}

/**
 * 顶行里已命名的点亮 / 未点亮姿态。文字底板跳过，不读成形态。
 * 同一姿态出现两次，或有认不出的图标，整行都不采用。
 */
export function readHeroSkillStanceMarks(
  skill: Pick<HeroSkillCardView, "top_row_icons">,
): Record<SkillStance, HeroSkillStanceMark> | null {
  const read = readStanceMarks(skill);
  return read.ok ? read.marks : null;
}

/** 已选技能里，每个姿态被多少张卡面标为「点亮可用」。 */
export function aggregateLitHeroSkillStanceCounts(
  skills: readonly Pick<HeroSkillCardView, "top_row_icons">[],
): Record<SkillStance, number> {
  const counts: Record<SkillStance, number> = {
    support: 0,
    ranged: 0,
    defensive: 0,
    aggressive: 0,
  };
  for (const skill of skills) {
    const marks = readHeroSkillStanceMarks(skill);
    if (!marks) continue;
    for (const stance of HERO_SKILL_STANCE_DISPLAY_ORDER) {
      if (marks[stance] === "lit") counts[stance] += 1;
    }
  }
  return counts;
}

function readStanceMarks(
  skill: Pick<HeroSkillCardView, "top_row_icons">,
): { ok: true; marks: Record<SkillStance, StanceMark> } | { ok: false } {
  const icons = skill.top_row_icons;
  if (!Array.isArray(icons)) return { ok: false };
  const marks: Record<SkillStance, StanceMark | "absent"> = {
    support: "absent",
    ranged: "absent",
    defensive: "absent",
    aggressive: "absent",
  };
  for (const icon of icons) {
    if (typeof icon !== "object" || icon === null) return { ok: false };
    if (typeof icon.naming !== "string" || !NAMED.has(icon.naming)) return { ok: false };
    if (icon.key === "text_plate") continue;
    if (typeof icon.key !== "string") return { ok: false };
    const lit = STANCE_LIT.get(icon.key);
    const unlit = STANCE_UNLIT.get(icon.key);
    const unmarked = STANCE_UNMARKED.get(icon.key);
    let stance: SkillStance | undefined;
    let mark: StanceMark | undefined;
    if (lit !== undefined) {
      stance = lit;
      mark = "lit";
    } else if (unlit !== undefined) {
      stance = unlit;
      mark = "unlit";
    } else if (unmarked !== undefined) {
      stance = unmarked;
      mark = "unknown";
    }
    if (stance === undefined || mark === undefined) return { ok: false };
    if (marks[stance] !== "absent") return { ok: false };
    marks[stance] = mark;
  }
  return {
    ok: true,
    marks: {
      support: marks.support === "absent" ? "unknown" : marks.support,
      ranged: marks.ranged === "absent" ? "unknown" : marks.ranged,
      defensive: marks.defensive === "absent" ? "unknown" : marks.defensive,
      aggressive: marks.aggressive === "absent" ? "unknown" : marks.aggressive,
    },
  };
}

/**
 * 规则书第 19 页：只有点亮的姿态能使用这张技能。
 * 没传入当前姿态时不检查。读不清，或该格没有点亮标记时，整次不结算。
 */
function stanceProblem(skill: HeroSkillCardView, combat: SkillCombatState): string | null {
  const stance = combat.actor?.stance;
  if (stance === undefined) return null;
  const read = readStanceMarks(skill);
  if (!read.ok) {
    return "技能顶行的姿态图标读不清，不能核对能否使用（规则书第 19 页）";
  }
  const mark = read.marks[stance];
  if (mark === "lit") return null;
  if (mark === "unlit") {
    return "当前姿态没有点亮，不能使用这张技能（规则书第 19 页）";
  }
  return "这张技能的该姿态没有标明点亮或未点亮，不能当作可用（R-048）";
}

type PrintedRange =
  | { readonly kind: "exact"; readonly distance: number }
  | { readonly kind: "interval"; readonly min: number; readonly max: number }
  | { readonly kind: "null_numeric" }
  | { readonly kind: "absent" };

/**
 * 接受唯一已命名射程图标旁的整数，或文本匹配的逐卡复核区间。
 * 原 numeric=null 不改；无注解区间、图标内数字、Self / All Allies 都不补距离。
 */
export function readPrintedRange(
  skill: Pick<HeroSkillCardView, "unlabeled_numbers" | "verified_range">,
): PrintedRange {
  if (skill.verified_range) {
    const range = skill.verified_range;
    const numbers = skill.unlabeled_numbers.filter(
      (item) =>
        item.anchor.type === "beside_icon" &&
        item.anchor.left_icon?.key === "range" &&
        NAMED.has(item.anchor.left_icon.naming) &&
        item.anchor.inside_icon === null,
    );
    if (
      range.source !== "print_front" ||
      !nonNegativeInteger(range.min) ||
      !nonNegativeInteger(range.max) ||
      range.min > range.max ||
      numbers.length !== 1 ||
      numbers[0]?.numeric !== null ||
      numbers[0].text !== `${range.min}-${range.max}`
    )
      return { kind: "null_numeric" };
    return { kind: "interval", min: range.min, max: range.max };
  }
  let exact: number | null = null;
  let count = 0;
  let sawNull = false;
  for (const item of skill.unlabeled_numbers) {
    if (item.anchor.type !== "beside_icon") continue;
    const left = item.anchor.left_icon;
    if (left === null || left.key !== "range" || !NAMED.has(left.naming)) continue;
    if (item.anchor.inside_icon !== null) continue;
    if (item.numeric === null || !nonNegativeInteger(item.numeric)) {
      sawNull = true;
      continue;
    }
    count += 1;
    exact = item.numeric;
  }
  if (sawNull) return { kind: "null_numeric" };
  if (count !== 1 || exact === null) return { kind: "absent" };
  return { kind: "exact", distance: exact };
}

/**
 * 规则书第 19 页：选中的区域与使用者的距离必须等于印出来的射程。
 * 第 25 页、R-022：目标区域更低时，单个整数的上限可以再加 1，原距离仍可选。
 * 没传入距离时不检查。逐卡复核区间按 R-022 上限 +1；无注解区间仍拒绝。
 */
function rangeProblem(skill: HeroSkillCardView, combat: SkillCombatState): string | null {
  if (combat.areaDistance === undefined) return null;
  if ((skill as HeroSkillCardView & { readonly target?: string }).target === "Special") {
    return null;
  }
  if (
    ((skill.verified_self_range || skill.verified_status_effects?.length) &&
      readsAsSelfTarget(skill)) ||
    (skill as HeroSkillCardView & { readonly target?: string }).target === "Self"
  )
    return combat.areaDistance === 0 && combat.actor?.id === combat.target.id
      ? null
      : "Self 技能只能作用于使用者自己";
  const printed = readPrintedRange(skill);
  if (printed.kind === "interval") {
    const reach = printed.max + Number(combat.targetAreaLower === true);
    return combat.areaDistance >= printed.min && combat.areaDistance <= reach
      ? null
      : "目标区域与使用者的距离不是卡面印的射程（规则书第 19 页）";
  }
  if (printed.kind === "null_numeric") {
    return "射程印成区间，旁边数字的 numeric 为 null，不能核对不同距离（规则书第 19 页，R-048）";
  }
  if (printed.kind !== "exact") {
    return "卡面没有恰好一个射程整数，不能把 Self 或 All Allies 当成距离 0（规则书第 19 页，R-048）";
  }
  const reach = combat.targetAreaLower === true ? printed.distance + 1 : printed.distance;
  if (combat.areaDistance < printed.distance || combat.areaDistance > reach) {
    return "目标区域与使用者的距离不是卡面印的射程（规则书第 19 页）";
  }
  return null;
}

/**
 * 规则书第 25 页：只有目标区域比使用者低，命中阈值才 +1。
 * 同一区域不能再低。Self 是使用者自己的区域。射程 0 且没有传入距离时也是。
 * 传入距离 1 时，射程 0 可以走到高地可选的那一档，不在这里拒绝。
 * 没传入这个标志时不检查。射程上限的 +1 在射程核对里。
 */
function elevationProblem(skill: HeroSkillCardView, combat: SkillCombatState): string | null {
  if (combat.targetAreaLower !== true) return null;
  if (readsAsSelfTarget(skill)) {
    return "技能目标写的是 Self，与使用者在同一区域，高地不能让命中阈值 +1（规则书第 19、25 页）";
  }
  if (combat.areaDistance === 0) {
    return "目标与使用者在同一区域，高地不能让命中阈值 +1（规则书第 25 页）";
  }
  const printed = readPrintedRange(skill);
  if (printed.kind === "exact" && printed.distance === 0 && combat.areaDistance === undefined) {
    return "卡面射程是 0，目标在使用者自己的区域，高地不能让命中阈值 +1（规则书第 19、25 页）";
  }
  return null;
}

type PrintedTargets =
  | { readonly kind: "exact"; readonly max: number }
  | { readonly kind: "hero_or_monster"; readonly max: number }
  | { readonly kind: "absent" }
  | { readonly kind: "mixed" };

function countNamedTargets(icons: readonly SkillIconRef[]): {
  hero: number;
  monster: number;
  heroOrMonster: number;
} {
  let hero = 0;
  let monster = 0;
  let heroOrMonster = 0;
  for (const icon of icons) {
    if (!NAMED.has(icon.naming) || icon.key === null) continue;
    if (icon.key === "target_hero") hero += 1;
    if (icon.key === "target_monster") monster += 1;
    if (icon.key === "target_hero_or_monster") heroOrMonster += 1;
  }
  return { hero, monster, heroOrMonster };
}

function lineTargetIcons(line: readonly SkillSegment[]): SkillIconRef[] {
  const icons: SkillIconRef[] = [];
  for (const segment of line) {
    if (segment.type === "icon") icons.push(segment.icon);
  }
  return icons;
}

/**
 * stats 行优先。效果行里已经有已命名的头盔或怪物头时，不改用正面图标，
 * 那些仍不计数。两边都没有时，才用 `front_icons`。
 */
function readTargetIconCounts(skill: HeroSkillCardView): {
  hero: number;
  monster: number;
  heroOrMonster: number;
} {
  // 已逐卡核实的无Acc卡：提取器将射程0/单英雄目标行放入effect_lines[0]。
  // 明确注解才读取；不从其他效果行或未核实卡推断目标。
  if (skill.verified_target_header !== undefined) {
    const header = skill.verified_target_header;
    const line = skill.effect_lines[0];
    const text = line
      ?.map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
      .join("")
      .replace(/\s+/g, "");
    if (
      header.lineIndex !== 0 ||
      header.source !== "print_front" ||
      skill.stats_line !== null ||
      skill.printed_labels.length !== 0 ||
      skill.effect_lines.length < 2 ||
      !/^\{range\}[0-2](?:\{target_hero\}){1,3}$/.test(text ?? "") ||
      !skill.verified_status_effects?.length ||
      skill.verified_status_effects.some((e) => e.lineIndex < 1) ||
      line?.some((s) => s.type === "icon" && !NAMED.has(s.icon.naming))
    )
      return { hero: 0, monster: 0, heroOrMonster: 0 };
    return countNamedTargets(lineTargetIcons(line!));
  }
  // p019 的射程 / 目标行被提取到 effect_lines；只读逐卡复核注解对应的已确认行。
  if (skill.verified_rallying_flare) {
    const heroOrMonster = (skill.front_icons ?? []).filter(
      (icon) => NAMED.has(icon.naming) && icon.key === "target_hero_or_monster",
    ).length;
    if (heroOrMonster > 0) return { hero: 0, monster: 0, heroOrMonster };
    return { hero: 0, monster: 0, heroOrMonster: 0 };
  }
  if (skill.verified_target_support) {
    const line = skill.effect_lines[0];
    const text = line
      ?.map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
      .join("")
      .replace(/\s+/g, "");
    if (
      /^\{range\}\d+(?:\{target_hero\}){1,2}$/.test(text ?? "") &&
      !line?.some((s) => s.type === "icon" && !NAMED.has(s.icon.naming))
    )
      return countNamedTargets(lineTargetIcons(line!));
    return { hero: 0, monster: 0, heroOrMonster: 0 };
  }
  const stats = countNamedTargets(lineTargetIcons(skill.stats_line ?? []));
  if (stats.hero > 0 || stats.monster > 0 || stats.heroOrMonster > 0) return stats;
  for (const line of skill.effect_lines) {
    const onLine = countNamedTargets(lineTargetIcons(line));
    if (onLine.hero > 0 || onLine.monster > 0) return { hero: 0, monster: 0, heroOrMonster: 0 };
  }
  return countNamedTargets(skill.front_icons ?? []);
}

/**
 * 只数已命名的 target_monster / target_hero。
 * 效果行、Self、All Allies 都不算。stats 行和效果行都没有时，用卡面正面的。
 * 两种目标图标同时在场时不定个数。
 */
export function readPrintedTargets(skill: HeroSkillCardView): PrintedTargets {
  const counts = readTargetIconCounts(skill);
  if (counts.hero > 0 && counts.monster > 0) return { kind: "mixed" };
  if (counts.heroOrMonster > 0 && (counts.hero > 0 || counts.monster > 0)) return { kind: "mixed" };
  if (counts.heroOrMonster > 0) return { kind: "hero_or_monster", max: counts.heroOrMonster };
  if (counts.hero > 0) return { kind: "exact", max: counts.hero };
  if (counts.monster > 0) return { kind: "exact", max: counts.monster };
  return { kind: "absent" };
}

/**
 * 规则书第 19 页：一个区域内最多选 N 个目标，N 是目标图标的个数。
 * 没传入个数时不检查。读不出 N，或个数不在 1 到 N 之间时，整次不结算。
 */
function targetCountProblem(skill: HeroSkillCardView, combat: SkillCombatState): string | null {
  if (combat.targetsInArea === undefined) return null;
  if ((skill as HeroSkillCardView & { readonly target?: string }).target === "Special") return null;
  if (
    (skill.verified_self_range || skill.verified_status_effects?.length) &&
    readsAsSelfTarget(skill)
  )
    return combat.targetsInArea === 1 && combat.actor?.id === combat.target.id
      ? null
      : "Self 技能只能选择使用者自己";
  const printed = readPrintedTargets(skill);
  if (printed.kind === "mixed") {
    return "stats 行同时有英雄和怪物目标图标，不能确定一个区域内能选几个（规则书第 19 页）";
  }
  if (printed.kind === "hero_or_monster" || printed.kind === "exact") {
    if (combat.targetsInArea < 1 || combat.targetsInArea > printed.max) {
      return "一个区域内选中的目标个数必须是 1 到卡面目标图标的个数（规则书第 19 页）";
    }
    return null;
  }
  return "stats 行没有已命名的目标图标，不能把 Self、All Allies 或效果行里的图标当成区域内能选几个（规则书第 19 页，R-048）";
}

function combatProblem(combat: SkillCombatState): string | null {
  if (
    combat.trinketModifiers &&
    ((combat.trinketModifiers.damage !== undefined &&
      (!Number.isSafeInteger(combat.trinketModifiers.damage) ||
        combat.trinketModifiers.damage < 0)) ||
      !Number.isSafeInteger(combat.trinketModifiers.crit) ||
      !Number.isSafeInteger(combat.trinketModifiers.accuracy) ||
      (combat.trinketModifiers.dealNoDamage !== undefined &&
        typeof combat.trinketModifiers.dealNoDamage !== "boolean"))
  )
    return "饰品修正必须是已核实整数（R26、R-048）";
  const target = combat.target;
  if (target.side !== "hero" && target.side !== "monster") {
    return "目标阵营必须是 hero 或 monster";
  }
  if (!nonNegativeInteger(target.wounds)) return "伤口必须是非负整数";
  if (!nonNegativeInteger(target.dodge)) return "Dodge 必须是非负整数";
  if (target.protection !== undefined && typeof target.protection !== "boolean") {
    return "Protection 必须是布尔值";
  }
  if (target.riposte !== undefined && typeof target.riposte !== "boolean") {
    return "Riposte 必须是布尔值";
  }
  if (target.shuffleResist !== undefined && typeof target.shuffleResist !== "boolean") {
    return "Shuffle 抗性必须是布尔值";
  }
  if (target.life !== undefined && !positiveInteger(target.life)) return "Life 必须是正整数";
  if (target.side === "hero" && target.life !== undefined) {
    return "英雄 Life 不在这一层结算：规范化数据没有英雄 Life，死门骰哪几面是骷髅也没有命名（R-005）";
  }
  if (target.side === "monster" && target.stress !== undefined) return "怪物没有压力轨";
  if (target.stress !== undefined && !isStress(target.stress)) {
    return "压力必须是 0 到 10 的整数";
  }
  if (target.debuffStacks !== undefined && !nonNegativeInteger(target.debuffStacks)) {
    return "目标的减益堆数必须是非负整数";
  }
  if (target.markStacks !== undefined && !nonNegativeInteger(target.markStacks)) {
    return "目标的标记堆数必须是非负整数";
  }
  if (combat.targetInActorArea !== undefined && typeof combat.targetInActorArea !== "boolean") {
    return "targetInActorArea 必须是布尔值";
  }
  if (combat.targetInActorArea === true && target.side !== "hero") {
    return "怪物目标不能算进使用者区域的压力（R-031）";
  }
  if (combat.targetInActorArea === true && target.stress === undefined) {
    return "目标在使用者的区域里，但没有压力（R-031）";
  }

  const actor = combat.actor;
  if (target.riposte === true && actor === undefined) {
    return "目标有 Riposte，但没有攻击者可以承受反弹（R-017）";
  }
  if (actor !== undefined) {
    if (typeof actor.id !== "string" || actor.id.length === 0) return "攻击者缺少 id";
    if (!nonNegativeInteger(actor.wounds)) return "攻击者伤口必须是非负整数";
    if (actor.stress !== undefined && !isStress(actor.stress)) {
      return "攻击者的压力必须是 0 到 10 的整数";
    }
    if (actor.protection !== undefined && typeof actor.protection !== "boolean") {
      return "攻击者的 Protection 必须是布尔值";
    }
    if (actor.riposte !== undefined && typeof actor.riposte !== "boolean") {
      return "攻击者的 Riposte 必须是布尔值";
    }
    if (actor.stance !== undefined && !isSkillStance(actor.stance)) {
      return "使用者的姿态必须是 support、ranged、defensive 或 aggressive";
    }
    if (actor.buffStacks !== undefined && !nonNegativeInteger(actor.buffStacks)) {
      return "使用者的增益堆数必须是非负整数";
    }
    if (actor.form !== undefined && actor.form !== "beast" && actor.form !== "human") {
      return "使用者的形态必须是 beast 或 human";
    }
  }
  if (combat.face !== undefined && combat.face !== "front" && combat.face !== "back") {
    return "技能面必须是 front 或 back";
  }
  if (combat.areaDistance !== undefined && !nonNegativeInteger(combat.areaDistance)) {
    return "区域距离必须是非负整数";
  }
  if (combat.targetAreaLower !== undefined && typeof combat.targetAreaLower !== "boolean") {
    return "目标区域是否比使用者低必须是布尔值";
  }
  if (
    combat.light !== undefined &&
    (!Number.isInteger(combat.light) || combat.light < 0 || combat.light > 5)
  ) {
    return "光照必须是 0 到 5 的整数";
  }
  if (combat.targetsInArea !== undefined && !nonNegativeInteger(combat.targetsInArea)) {
    return "区域内选中的目标个数必须是非负整数";
  }
  if (combat.guardedEnemyOmitted !== undefined && typeof combat.guardedEnemyOmitted !== "boolean") {
    return "有没有漏选 Guard 敌人必须是布尔值";
  }
  if (
    combat.shuffleChoice !== undefined &&
    combat.shuffleChoice !== "push" &&
    combat.shuffleChoice !== "pull"
  ) {
    return "Push 或 Pull 的方向必须是 push 或 pull";
  }

  const beside = readAreaHeroes(combat.heroesBesideActor, "使用者身边的英雄");
  if (!beside.ok) return beside.reason;
  const untargeted = readAreaHeroes(combat.untargetedHeroesBesideTarget, "目标身边没被选中的英雄");
  if (!untargeted.ok) return untargeted.reason;

  if (beside.heroes !== null && beside.heroes.length > 0 && actor?.stress === undefined) {
    return "同区域英雄的暴击压力要和使用者的压力一起结算（R-031）";
  }
  if (
    beside.heroes !== null &&
    actor !== undefined &&
    beside.heroes.some((hero) => hero.id === actor.id)
  ) {
    return "使用者的压力写在 actor 上，不要放进身边名单";
  }
  if (beside.heroes !== null && beside.heroes.some((hero) => hero.id === target.id)) {
    return "目标的压力写在目标上，不要放进使用者身边的名单";
  }
  if (untargeted.heroes !== null && untargeted.heroes.some((hero) => hero.id === target.id)) {
    return "被选中的目标不在「没被选中」的名单里";
  }
  if (
    untargeted.heroes !== null &&
    actor !== undefined &&
    untargeted.heroes.some((hero) => hero.id === actor.id)
  ) {
    return "使用者的压力写在 actor 上，不要放进没被选中的名单";
  }
  if (beside.heroes !== null && untargeted.heroes !== null) {
    const besideIds = new Set(beside.heroes.map((hero) => hero.id));
    if (untargeted.heroes.some((hero) => besideIds.has(hero.id))) {
      return "同一名英雄不要同时出现在两份区域名单里";
    }
  }
  return null;
}

/**
 * 规则书第 21 页：Shuffle 抗性让区域和姿态各少移 1。这里只记一个距离，两边都用它，
 * 所以只减 1，最低 0。目标就是使用者时不减（R-020：英雄位移自己可以选择无视抗性）。
 */
function resistedTargetShuffle(
  move: SkillShuffle | null,
  combat: SkillCombatState,
): SkillShuffle | null {
  if (move === null || combat.target.shuffleResist !== true) return move;
  if (combat.actor !== undefined && combat.target.id === combat.actor.id) return move;
  return { direction: move.direction, distance: Math.max(0, move.distance - 1) };
}

/**
 * 结算一张英雄技能。`roll` 是 d10 面值（1–10），由调用方用 `rollD10` 取得。
 * 未验证的卡、对不上的目标、当前姿态没有点亮、印了形态限定但对不上、区域距离
 * 不是印出来的射程、选中的个数超过卡面目标图标、打怪物却没选中有 Guard 的敌人、
 * 增益、减益或标记堆数不是非负整数、把使用者自己的区域当成更低、光照不是 0 到 5
 * 的整数、Shuffle 抗性或 Guard 标志不是布尔值、Push 或 Pull 的方向不是这两个词、
 * 读不出整数的 Crit / Acc、要结算背面但没有背面，都原样留下伤口。
 */
export function resolveHeroSkill(
  skill: HeroSkillCardView,
  combat: SkillCombatState,
  roll: number,
): HeroSkillResolution {
  return resolveSkill(skill, combat, roll, "hero");
}

/** 生命接线使用的纯视图；原技能 API / 命令形状保持不变。 */
export function resolveHeroSkillEffects(
  skill: HeroSkillCardView,
  combat: SkillCombatState,
  roll: number,
): SkillEffectsResolution {
  const {
    healthEffects = [],
    own,
    ...resolution
  } = resolveSkill(skill, combat, roll, "hero", true);
  return { resolution, healthEffects, ...(own ? { own } : {}) };
}

/** R19–20：空区域没有命中对象；只执行自身效果，不制造命中或暴击。 */
export function resolveHeroSkillEmptyAreaEffects(
  skill: HeroSkillCardView,
  combat: Pick<
    SkillCombatState,
    "actor" | "light" | "areaDistance" | "targetAreaLower" | "guardedEnemyOmitted"
  >,
  roll: number,
): SkillEffectsResolution {
  const counts = readTargetIconCounts(skill);
  // 仅供共用卡面校验的空目标投影，不是战斗实体；其数值不参与命中、生命或压力结算。
  const context: SkillCombatState = {
    ...combat,
    target: { id: "", side: counts.hero > 0 ? "hero" : "monster", wounds: 0, dodge: 0 },
  };
  if (readsAsSelfTarget(skill))
    return {
      resolution: refuse(skill, context, "Self 技能不能选择空区域（R19）"),
      healthEffects: [],
    };
  if (readPrintedTargets(skill).kind !== "exact")
    return {
      resolution: refuse(skill, context, "空区域技能缺少已核实目标图标（R-048）"),
      healthEffects: [],
    };
  if (counts.monster > 0 && combat.guardedEnemyOmitted)
    return {
      resolution: refuse(skill, context, "空区域没有选中必须优先攻击的 Guard 敌人（R-024）"),
      healthEffects: [],
    };
  const {
    healthEffects = [],
    own: _own,
    ...resolution
  } = resolveSkill(skill, context, roll, "hero", true, true);
  void _own;
  return { resolution, healthEffects };
}

/** 仅供怪物规范化适配层使用；不经包入口导出。 */
export function resolveMonsterAttackView(
  skill: HeroSkillCardView,
  combat: SkillCombatState,
  roll: number,
): HeroSkillResolution {
  return resolveSkill(skill, combat, roll, "monster");
}

/** 怪物适配层的同一效果视图；不另解析卡面。 */
export function resolveMonsterAttackEffects(
  skill: HeroSkillCardView,
  combat: SkillCombatState,
  roll: number,
): SkillEffectsResolution {
  const {
    healthEffects = [],
    own,
    ...resolution
  } = resolveSkill(skill, combat, roll, "monster", true);
  return { resolution, healthEffects, ...(own ? { own } : {}) };
}

function resolveSkill(
  skill: HeroSkillCardView,
  combat: SkillCombatState,
  roll: number,
  sourceSide: SkillTargetSide,
  includeHealthEffects = false,
  emptyArea = false,
): HeroSkillResolution & {
  readonly healthEffects?: readonly SkillHealthEffect[];
  readonly own?: SkillEffectsResolution;
} {
  if (skill.hero !== null && skill.hero.trim().toLowerCase() === "musketeer") {
    return refuse(skill, combat, "Musketeer 不在首版（R-008）");
  }
  if (skill.verification.unverified) {
    return refuse(skill, combat, "未验证的技能不结算（R-048）");
  }
  if (!Number.isInteger(roll) || roll < 1 || roll > 10) {
    return refuse(skill, combat, "d10 必须是 1 到 10 的整数");
  }
  const problem = combatProblem(combat);
  if (problem !== null) return refuse(skill, combat, problem);
  const selected = selectFace(
    skill,
    combat.face ??
      ((skill.id === "hero_skill:p221" || skill.id === "hero_skill:p222") &&
      combat.actor?.form === "beast"
        ? "back"
        : "front"),
  );
  if (!selected.ok) return refuse(skill, combat, selected.reason);
  const active = selected.skill;
  const allies =
    active.verified_allies_stress === undefined ? null : readAreaHeroes(combat.allies, "所有队友");
  if (
    allies &&
    (!allies.ok || allies.heroes === null || allies.heroes.some((h) => h.id === combat.actor?.id))
  )
    return refuse(skill, combat, "变身需要完整且不含自身的存活队友列表（R38）");
  const stance = sourceSide === "hero" ? stanceProblem(active, combat) : null;
  if (stance !== null) return refuse(skill, combat, stance);
  const formLimit = formRequirementProblem(active, combat);
  if (formLimit !== null) return refuse(skill, combat, formLimit);
  const elevation = elevationProblem(active, combat);
  if (elevation !== null) return refuse(skill, combat, elevation);
  const range = rangeProblem(active, combat);
  if (range !== null) return refuse(skill, combat, range);
  const targetCount = targetCountProblem(active, combat);
  if (targetCount !== null) return refuse(skill, combat, targetCount);

  const target = combat.target;
  const support = active.verified_target_support;
  if (support) {
    const line = active.effect_lines[support.lineIndex];
    const text = line
      ?.map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
      .join("")
      .replace(/\s+/g, "");
    if (
      !Number.isSafeInteger(support.lineIndex) ||
      support.lineIndex < 0 ||
      ![1, 2].includes(support.lineIndex) ||
      active.effect_lines.length !== support.lineIndex + 1 ||
      !Number.isSafeInteger(support.heal) ||
      support.heal <= 0 ||
      !Number.isSafeInteger(support.stress) ||
      support.stress >= 0 ||
      !Number.isSafeInteger(support.light) ||
      support.light <= 0 ||
      support.source !== "print_front" ||
      active.printed_labels.length ||
      active.stats_line !== null ||
      text !==
        `{target_effects}{damage_or_heal_combined_marker}{heal}${support.heal},{stress}${support.stress},{light}+${support.light}` ||
      line?.some(
        (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
      )
    )
      return refuse(skill, combat, "目标支持注解与已确认卡面不符（R-048）");
    if (combat.light === undefined || (!emptyArea && target.stress === undefined))
      return refuse(skill, combat, "目标支持效果缺少光照或压力轨");
  }
  const stress = support ? { self: 0, target: 0, lineCount: 0 } : readImmediateStress(active);
  const extraStress = active.verified_target_stress;
  if (extraStress) {
    const line = active.effect_lines[extraStress.lineIndex];
    const text = line
      ?.map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
      .join("")
      .replace(/\s+/g, "");
    if (
      !Number.isSafeInteger(extraStress.lineIndex) ||
      extraStress.lineIndex < 0 ||
      !Number.isSafeInteger(extraStress.amount) ||
      extraStress.amount <= 0 ||
      extraStress.source !== "print_front" ||
      text !== `{target_effects}{stress}+${extraStress.amount}` ||
      line?.some(
        (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
      )
    )
      return refuse(skill, combat, "目标压力注解与已确认卡面不符（R-048）");
    if (!emptyArea && target.stress === undefined)
      return refuse(skill, combat, "目标压力效果缺少压力轨");
  }
  if (
    active.verified_damage_bonuses !== undefined &&
    (active.verified_damage_bonus !== undefined ||
      !Array.isArray(active.verified_damage_bonuses) ||
      active.verified_damage_bonuses.length < 2 ||
      Array.from(active.verified_damage_bonuses).some((b) => !b || typeof b !== "object") ||
      new Set(active.verified_damage_bonuses.map((b) => b.lineIndex)).size !==
        active.verified_damage_bonuses.length)
  )
    return refuse(skill, combat, "多条条件伤害注解重复、缺失或与单条注解冲突（R-048）");
  const bonuses =
    active.verified_damage_bonuses ??
    (active.verified_damage_bonus ? [active.verified_damage_bonus] : []);
  for (const bonus of bonuses) {
    const line = active.effect_lines[bonus.lineIndex];
    const text = line
      ?.map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
      .join("")
      .replace(/\s+/g, "");
    const conditionSuffix =
      bonus.condition === "marked"
        ? "{mark}"
        : bonus.condition === "stunned"
          ? "{stun}"
          : bonus.condition === "blighted"
            ? "{blight}"
            : bonus.condition === "human"
              ? "Humans"
              : bonus.condition === "eldritch"
                ? "Eldritch"
                : "Unholy";
    if (
      !Number.isSafeInteger(bonus.lineIndex) ||
      bonus.lineIndex < 0 ||
      !Number.isSafeInteger(bonus.amount) ||
      bonus.amount <= 0 ||
      !["marked", "unholy", "stunned", "human", "blighted", "eldritch"].includes(bonus.condition) ||
      bonus.source !== "print_front" ||
      text !== `{target_effects}{damage}+${bonus.amount}vs${conditionSuffix}` ||
      line?.some(
        (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
      )
    )
      return refuse(skill, combat, "条件伤害注解与已确认卡面不符（R-048）");
    if (
      !emptyArea &&
      (bonus.condition === "unholy" ||
        bonus.condition === "human" ||
        bonus.condition === "eldritch") &&
      target.side === "monster" &&
      (!target.monsterTypeTags?.length ||
        target.monsterTypeTags.some((tag) => typeof tag !== "string" || !tag.trim()))
    )
      return refuse(skill, combat, "条件伤害缺少已验证怪物类型（R-048）");
    if (
      !emptyArea &&
      (bonus.condition === "stunned" || bonus.condition === "blighted") &&
      (!Array.isArray(target.statusStacks) || statusStackProblem(target.statusStacks))
    )
      return refuse(
        skill,
        combat,
        bonus.condition === "stunned"
          ? "眩晕条件伤害缺少合法的当前状态堆（R-048）"
          : "枯萎条件伤害缺少合法的当前状态堆（R-048）",
      );
  }
  const statusesRead = readVerifiedStatusEffects(active, combat.shuffleChoice);
  if (statusesRead.status === "refused") return refuse(skill, combat, statusesRead.reason);
  let statuses = statusesRead;
  if (statuses.self.length && combat.actor === undefined)
    return refuse(skill, combat, "自身状态效果缺少使用者");
  const selfHeal = readSelfHeal(active);
  const selfWound = readSelfWound(active);
  const paired = readSelfHealStress(active);
  const removal = readConditionRemoval(active);
  const selfBleed = readSelfBleedRemoval(active);
  const originalShuffles = readShuffles(active, combat.shuffleChoice);
  if (statuses.targetShuffle && originalShuffles.target)
    return refuse(skill, combat, "目标状态同行与独立位移重复，拒绝猜测");
  const shuffles = {
    ...originalShuffles,
    self: statuses.selfShuffle ?? originalShuffles.self,
    target: statuses.targetShuffle ?? originalShuffles.target,
  };
  const ignoresProtection = readIgnoresProtection(active);
  const ignoresGuard = readIgnoresGuard(active);
  const rallyingFlare = active.verified_rallying_flare;
  if (rallyingFlare) {
    const cleanup = active.effect_lines[rallyingFlare.cleanupLineIndex];
    const monsterLine = active.effect_lines[rallyingFlare.monsterDebuffLineIndex];
    const cleanupSig = cleanup
      ?.map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    const monsterSig = monsterLine
      ?.map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    if (
      cleanupSig !== rallyingFlare.cleanupSignature ||
      monsterSig !== rallyingFlare.monsterDebuffSignature ||
      cleanup?.some(
        (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
      ) ||
      monsterLine?.some(
        (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
      )
    )
      return refuse(skill, combat, "Rallying Flare 注解与已确认卡面不符（R-048）");
  }
  if (rallyingFlare && target.side === "hero") {
    statuses = {
      ...statuses,
      target: statuses.target.filter((effect) => effect.kind !== "debuff"),
    };
  }
  const formChange = readFormChange(active);
  const keys = namedKeys(active.stats_line);
  const kinds = new Set(keys.filter((key) => key === "damage" || key === "heal"));
  if (kinds.size > 1) {
    return refuse(skill, combat, "stats_line 同时有已命名的 damage 和 heal");
  }
  let effect: "damage" | "heal" | "stress" | null;
  if (kinds.size === 0) {
    if (stress.self === 0 && stress.target === 0) {
      if (
        formChange.form === null &&
        paired.lineCount === 0 &&
        selfBleed.lineCount === 0 &&
        removal.actorLines === 0 &&
        removal.pairedTargetLines === 0 &&
        shuffles.self === null &&
        shuffles.target === null &&
        statuses.lineCount === 0 &&
        !support &&
        !extraStress &&
        !active.verified_rallying_flare
      ) {
        return refuse(skill, combat, "stats_line 没有已命名的 damage 或 heal");
      }
      effect = null;
    } else {
      effect = "stress";
    }
  } else {
    effect = kinds.has("damage") ? "damage" : "heal";
  }

  // 没有伤害、治疗，但已经记上位移：仍要按 Acc 掷骰。变身和没有 Acc 的自身效果不掷。
  // 无 Acc / 无 printed_labels 的自身位移（如 Shadow Fade）与变身同类，不因 Push/Pull 强行要 Acc。
  const formOnly =
    (effect === null || active.verified_allies_stress !== undefined) &&
    shuffles.target === null &&
    statuses.target.length === 0 &&
    !support &&
    !extraStress &&
    (shuffles.self === null || active.printed_labels.length === 0);
  const selfTarget =
    readsAsSelfTarget(active) ||
    (active as HeroSkillCardView & { readonly target?: string | null }).target === "Self";
  const targetCounts = readTargetIconCounts(active);
  const printedTargets = readPrintedTargets(active);
  const targets = new Set<"target_hero" | "target_monster">();
  if (targetCounts.hero > 0) targets.add("target_hero");
  if (targetCounts.monster > 0) targets.add("target_monster");
  if (!formOnly && !selfTarget) {
    if ((active as HeroSkillCardView & { readonly target?: string }).target === "Special") {
      // Boss Special：目标语义在 Boss 能力卡，不读 stats 行 target 图标（R38–R39）。
    } else if (printedTargets.kind === "hero_or_monster") {
      if (target.side !== "hero" && target.side !== "monster") {
        return refuse(skill, combat, "目标阵营与技能的目标图标不一致");
      }
      if (
        target.side === "monster" &&
        ignoresGuard.targetLines === 0 &&
        combat.guardedEnemyOmitted === true
      ) {
        return refuse(
          skill,
          combat,
          "不以友方为目标的技能必须把有 Guard 的敌人选为目标之一，这次没有选中（规则书第 21 页，R-024）",
        );
      }
    } else if (targets.size !== 1) {
      return refuse(
        skill,
        combat,
        targets.size === 0
          ? "stats_line 没有已命名的 target_hero 或 target_monster"
          : "stats_line 同时有 target_hero 和 target_monster",
      );
    } else {
      const expectedSide = targets.has("target_hero") ? "hero" : "monster";
      if (target.side !== expectedSide) {
        return refuse(skill, combat, "目标阵营与技能的目标图标不一致");
      }
      if (
        expectedSide !== sourceSide &&
        ignoresGuard.targetLines === 0 &&
        combat.guardedEnemyOmitted === true
      ) {
        return refuse(
          skill,
          combat,
          "不以友方为目标的技能必须把有 Guard 的敌人选为目标之一，这次没有选中（规则书第 21 页，R-024）",
        );
      }
    }
  }
  if (selfTarget) {
    const actor = combat.actor;
    if (actor === undefined) {
      return refuse(skill, combat, "技能目标写的是 Self，但没有使用者（规则书第 19 页）");
    }
    if (target.side !== sourceSide || target.id !== actor.id) {
      return refuse(skill, combat, "技能目标写的是 Self，只能结算使用者自己（规则书第 19 页）");
    }
    if (target.wounds !== actor.wounds) {
      return refuse(skill, combat, "自身目标的伤口要和使用者是同一份（规则书第 19 页）");
    }
    if (
      target.stress !== undefined &&
      actor.stress !== undefined &&
      target.stress !== actor.stress
    ) {
      return refuse(skill, combat, "自身目标的压力要和使用者是同一份（规则书第 19 页）");
    }
  }

  const critThreshold = formOnly ? null : threshold(active, "Crit");
  const accThreshold = formOnly ? null : threshold(active, "Acc");
  // 只有位移、没有伤害数字的技能可以不印 Crit。不把缺的阈值当成 0。
  // 有伤害、治疗或压力时，Crit 仍然必须是非负整数。
  if (!formOnly && effect !== null && critThreshold === null) {
    return refuse(skill, combat, "Crit 标签没有非负整数阈值");
  }
  if (
    !formOnly &&
    !support &&
    !selfTarget &&
    accThreshold === null &&
    !(statuses.target.length && active.printed_labels.length === 0)
  ) {
    return refuse(skill, combat, "Acc 标签没有非负整数阈值");
  }
  const needsAmount = effect === "damage" || effect === "heal";
  const critAmount = needsAmount ? amountBesideLabel(active, "Crit") : null;
  const hitAmount = needsAmount ? amountBesideLabel(active, "Acc") : null;
  if (!selfTarget && needsAmount && critAmount === null) {
    return refuse(skill, combat, "Crit 旁边没有恰好一个非负整数");
  }
  if (!selfTarget && needsAmount && hitAmount === null) {
    return refuse(skill, combat, "Acc 旁边没有恰好一个非负整数");
  }
  if ((stress.self !== 0 || paired.stress !== 0) && combat.actor?.stress === undefined) {
    return refuse(skill, combat, "自身效果要改压力，但没有使用者的压力（规则书第 20 页）");
  }
  if (!emptyArea && stress.target !== 0 && target.stress === undefined) {
    return refuse(skill, combat, "目标效果要改压力，但目标没有压力（规则书第 20 页）");
  }
  if ((selfHeal.amount > 0 || paired.heal > 0) && combat.actor === undefined) {
    return refuse(skill, combat, "自身效果要治疗，但没有使用者的伤口（规则书第 20 页）");
  }
  if (selfWound.lineCount && combat.actor === undefined)
    return refuse(skill, combat, "自身创伤缺少使用者");
  if (selfBleed.lineCount > 0 && combat.actor === undefined) {
    return refuse(skill, combat, "自身效果要移除流血，但没有使用者（规则书第 20 页）");
  }
  if (removal.actorLines > 0 && combat.actor === undefined) {
    return refuse(skill, combat, "自身效果要移除流血和腐蚀，但没有使用者（规则书第 20 页）");
  }
  if (shuffles.self !== null && combat.actor === undefined) {
    return refuse(skill, combat, "自身效果要位移，但没有使用者（规则书第 21 页）");
  }
  if (formChange.form !== null && combat.actor === undefined) {
    return refuse(skill, combat, "自身效果要切换形态，但没有使用者（规则书第 38 页）");
  }

  // 规则书第 19 页：有 Acc 时先看暴击（不减 Dodge），再看命中阈值 Acc − Dodge。
  // 第 21 页：每一堆已有的 Buff 只把暴击阈值 +1。目标是敌人时，每一堆 Debuff 再 +1
  // （R-016），每一堆 Mark 把命中阈值 +1（R-019）。友方目标这两种都不加。
  // 第 25 页：目标区域更低时，命中阈值再 +1（R-022，友方也加）。不改暴击，不加伤害。
  // 第 29 页、R-002：光照 0–4 把暴击阈值再 +1。光照恰好 5 不加暴击。
  // 光照恰好 5 且目标是英雄时，命中阈值再减 1（英雄 Dodge +1）。
  // 光照恰好 0 且目标是怪物时，命中阈值再减 1（怪物 Dodge +1）。英雄 Acc 不加：
  // 怪物 Acc +1 只在怪物攻击时有。
  // 光照 2–0 的承受压力事件额外 +1，不递归触发；减压力不触发。
  // 印刷的加压力 numeric 为 null 时，不先当成一次压力事件。
  // 没有 Acc 的技能不掷骰。变身，自身一行里已经对上的治疗和压力，自身一行
  // 「Self Remove」加已命名的流血，以及配给效果框的「Remove」加流血和腐蚀，
  // outcome 留空。只有位移、卡面没有 Crit 时只分命中和落空，不暴击。
  // 不读这张卡印的增益、减益、标记回合数，也不读卡面光照 +1 / -1 / +2。
  const buffStacks = combat.actor?.buffStacks ?? 0;
  const enemyDebuffStacks = target.side !== sourceSide ? (target.debuffStacks ?? 0) : 0;
  const enemyMarkStacks = target.side !== sourceSide ? (target.markStacks ?? 0) : 0;
  const lowerAreaAcc = combat.targetAreaLower === true ? 1 : 0;
  const lightCrit = combat.light !== undefined && combat.light <= 4 ? 1 : 0;
  const lightHeroDodge = combat.light === 5 && target.side === "hero" ? 1 : 0;
  const lightMonsterDodge = combat.light === 0 && target.side === "monster" ? 1 : 0;
  // R-002：光照 0 的怪物 Acc +1，与双方 Crit +1 分开。
  const lightMonsterAcc = combat.light === 0 && sourceSide === "monster" ? 1 : 0;
  let outcome: "crit" | "hit" | "miss" | null = null;
  const hitThreshold =
    accThreshold === null
      ? null
      : accThreshold +
        (combat.trinketModifiers?.accuracy ?? 0) +
        enemyMarkStacks +
        lowerAreaAcc -
        target.dodge -
        lightHeroDodge -
        lightMonsterDodge +
        lightMonsterAcc;
  if (!emptyArea && !formOnly && critThreshold !== null && hitThreshold !== null) {
    if (
      roll <=
      critThreshold +
        buffStacks +
        enemyDebuffStacks +
        lightCrit +
        (combat.trinketModifiers?.crit ?? 0)
    )
      outcome = "crit";
    else if (roll <= hitThreshold) outcome = "hit";
    else outcome = "miss";
  } else if (!emptyArea && !formOnly && hitThreshold !== null) {
    outcome = roll <= hitThreshold ? "hit" : "miss";
  }

  const trinketDefence =
    combat.trinketScope && sourceSide !== target.side && target.side === "hero"
      ? defenceTrinketReaction(combat.trinketScope, target.id, roll, hitThreshold, outcome)
      : { outcome, halve: false, statuses: [] };
  outcome = trinketDefence.outcome;
  let wounds = target.wounds;
  let printedAmount: number | null = null;
  let damageDealt: number | null = null;
  let riposteDamage: number | null = null;
  let actorWounds = combat.actor === undefined ? null : combat.actor.wounds;
  const healthEffects: SkillHealthEffect[] = [];
  const changeStress = (
    hero: PassiveHolder & { readonly id: string },
    value: number,
    delta: number,
    light = combat.effectLight ?? combat.light ?? 5,
    key = "self",
  ): number => {
    const changed = passiveStress(hero, delta, light);
    if (changed.wounds.length) {
      healthEffects.push({
        entityId: hero.id,
        side: "hero",
        source: "passiveStress",
        passiveKey: key,
        ...(value + changed.amount >= 10 ? { pressureBoundary: true } : {}),
        effect: { type: "wounds", amounts: changed.wounds },
      });
    }
    return clampStress(value + changed.amount);
  };
  if (
    !combat.ownEffectsApplied &&
    sourceSide === "hero" &&
    combat.actor &&
    (outcome !== null || (emptyArea && hitThreshold !== null))
  ) {
    if (roll === 10 && hasQuirk(combat.actor, "Bad Gambler")) {
      const amount = passiveLevel(combat.actor);
      if (actorWounds !== null) actorWounds += amount;
      healthEffects.push({
        entityId: combat.actor.id,
        side: "hero",
        source: "selfWound",
        rollPassive: true,
        effect: { type: "wounds", amounts: [amount] },
      });
    }
  }

  const dealtCrit = sourceSide === "hero" && outcome === "crit";
  const receivedCrit = outcome === "crit" && effect === "damage" && target.side === "hero";
  let actorStress = combat.actor?.stress === undefined ? null : combat.actor.stress;
  if (
    !combat.ownEffectsApplied &&
    sourceSide === "hero" &&
    combat.actor &&
    roll === 1 &&
    outcome !== null &&
    actorStress !== null &&
    hasQuirk(combat.actor, "Skilled Gambler")
  )
    actorStress = changeStress(combat.actor, actorStress, -1);
  let targetStress = target.stress === undefined ? null : target.stress;
  let besideActorStress = copyHeroes(
    combat.heroesBesideActor === undefined ? null : [...combat.heroesBesideActor],
  );
  let untargetedBesideTargetStress = copyHeroes(
    combat.untargetedHeroesBesideTarget === undefined
      ? null
      : [...combat.untargetedHeroesBesideTarget],
  );
  const lightDelta =
    (combat.ownEffectsApplied ? 0 : statuses.selfLight) +
    (emptyArea || outcome === "miss" ? 0 : statuses.targetLight + (support?.light ?? 0));
  const pressureLight =
    (combat.effectLight ?? combat.light) === undefined
      ? undefined
      : Math.max(0, Math.min(5, (combat.effectLight ?? combat.light)! + lightDelta));

  // 规则书第 20 页：自身效果在伤害、治疗和目标效果之前，落空也生效。
  // 没有 Acc 时不掷骰，这一行的治疗和压力仍然生效。
  if (
    !combat.ownEffectsApplied &&
    (stress.self !== 0 || paired.stress !== 0) &&
    actorStress !== null
  ) {
    actorStress = changeStress(combat.actor!, actorStress, stress.self + paired.stress);
  }
  if (
    !combat.ownEffectsApplied &&
    (selfHeal.amount > 0 || paired.heal > 0) &&
    actorWounds !== null
  ) {
    const amount = passiveHeal(combat.actor!, selfHeal.amount + paired.heal);
    actorWounds = Math.max(0, actorWounds - amount);
    healthEffects.push({
      entityId: combat.actor!.id,
      side: sourceSide,
      source: "selfHeal",
      ...(combat.trinketHealingMetadata || combat.trinketScope
        ? { rawHealing: selfHeal.amount + paired.heal }
        : {}),
      effect: { type: "heal", amount },
    });
  }
  if (!combat.ownEffectsApplied && selfWound.lineCount && actorWounds !== null) {
    actorWounds += selfWound.amount;
    healthEffects.push({
      entityId: combat.actor!.id,
      side: sourceSide,
      source: "selfWound",
      effect: { type: "wounds", amounts: [selfWound.amount] },
    });
  }
  // 自身「Remove Bleed」不看命中。没有 Acc 时也清。和增益写在同一行的不算。
  // 换行后配给自身标记的「Remove Bleed、Blight」同样不看命中，两种都清。
  const actorBleedCleared =
    !combat.ownEffectsApplied &&
    (selfBleed.lineCount === 1 || removal.actorLines > 0 || statuses.selfRemove);
  const actorBlightCleared =
    !combat.ownEffectsApplied && (removal.actorLines > 0 || statuses.selfRemove);
  const own: SkillEffectsResolution = {
    resolution: {
      ...refuse(skill, combat, ""),
      status: "resolved",
      reason: null,
      actorWounds,
      actorStress,
      actorBleedCleared,
      actorBlightCleared,
      actorForm: formChange.form,
      actorStatusEffects: statuses.self,
      actorLightDelta: statuses.selfLight,
    },
    healthEffects: [...healthEffects],
  };

  if (allies?.ok && allies.heroes && active.verified_allies_stress !== undefined)
    besideActorStress = combat.allies!.map((hero) => ({
      ...hero,
      stress: changeStress(
        hero,
        hero.stress,
        active.verified_allies_stress!,
        pressureLight,
        "transformAllies",
      ),
    }));
  if ((effect === "damage" || effect === "heal") && outcome !== null && outcome !== "miss") {
    const amount = outcome === "crit" ? critAmount : hitAmount;
    if (amount === null) {
      return refuse(
        skill,
        combat,
        outcome === "crit" ? "Crit 旁边没有恰好一个非负整数" : "Acc 旁边没有恰好一个非负整数",
      );
    }
    printedAmount = amount;
    if (effect === "heal") {
      const healed = passiveHeal(target, amount);
      wounds = Math.max(0, wounds - healed);
      healthEffects.push({
        entityId: target.id,
        side: target.side,
        source: "targetHeal",
        ...(combat.trinketHealingMetadata || combat.trinketScope ? { rawHealing: amount } : {}),
        effect: { type: "heal", amount: healed },
      });
      // Self 的治疗落在使用者身上。上面已经要求两份伤口一开始相同。
      if (selfTarget && actorWounds !== null) actorWounds = wounds;
    } else {
      // 明确复核的条件伤害先加一次，再减半；Mark 堆数影响 Acc，不倍增 +2。
      // 其他类型修正 / Hard Skinned 缺值仍不加。
      let baseDamage =
        amount +
        (combat.trinketModifiers?.damage ?? 0) +
        bonuses.reduce((total, bonus) => {
          if (target.side === sourceSide) return total;
          const matched =
            bonus.condition === "marked"
              ? (target.markStacks ?? 0) > 0
              : bonus.condition === "stunned"
                ? target.statusStacks!.some((stack) => stack.kind === "stun")
                : bonus.condition === "blighted"
                  ? target.statusStacks!.some((stack) => stack.kind === "blight")
                  : target.side === "monster" &&
                    target.monsterTypeTags?.includes(
                      bonus.condition === "human"
                        ? "Human"
                        : bonus.condition === "eldritch"
                          ? "Eldritch"
                          : "Unholy",
                    );
          return total + (matched ? bonus.amount : 0);
        }, 0);
      if (!Number.isSafeInteger(baseDamage))
        return refuse(skill, combat, "条件伤害总量超出安全整数范围");
      // 护腕反面取消伤害总量；命中、暴击及其它目标效果仍按原结果处理（R26）。
      if (combat.trinketModifiers?.dealNoDamage) baseDamage = 0;
      const skipProtection = ignoresProtection.targetLines > 0;
      const damage = resolveAttackDamage(
        target,
        baseDamage,
        outcome === "crit",
        target.protection === true && !skipProtection,
        trinketDefence.halve,
      );
      const { beforeProtection } = damage;
      damageDealt = damage.damageDealt;
      if (damageDealt >= 1) {
        const additional = target.side === "hero" ? passiveDamageWounds(target) : [];
        wounds += damageDealt + additional.reduce((sum, n) => sum + n, 0);
        healthEffects.push({
          entityId: target.id,
          side: target.side,
          source: "attack",
          ...(outcome === "crit" && target.side === "hero" ? { critical: true } : {}),
          effect: { type: "wounds", amounts: [damageDealt, ...additional] },
        });
        if (target.riposte === true && actorWounds !== null) {
          // 反弹量用 Protection 之前的伤害。攻击者的 Protection / Riposte 不用。
          riposteDamage = halfUp(beforeProtection);
          const additional = sourceSide === "hero" ? passiveDamageWounds(combat.actor!) : [];
          actorWounds += riposteDamage + additional.reduce((sum, n) => sum + n, 0);
          healthEffects.push({
            entityId: combat.actor!.id,
            side: sourceSide,
            source: "riposte",
            effect: { type: "wounds", amounts: [riposteDamage, ...additional] },
          });
        }
      }
    }
  }

  // 目标效果只对命中或暴击的目标生效。落空不改目标压力，也不移除状态。
  if (support && !emptyArea) {
    const healed = passiveHeal(target, support.heal);
    wounds = Math.max(0, wounds - healed);
    targetStress = changeStress(
      target,
      targetStress!,
      support.stress,
      pressureLight,
      "targetSupport",
    );
    healthEffects.push({
      entityId: target.id,
      side: target.side,
      source: "targetHeal",
      ...(combat.trinketHealingMetadata || combat.trinketScope
        ? { rawHealing: support!.heal }
        : {}),
      effect: { type: "heal", amount: healed },
    });
  }
  if (outcome !== "miss" && stress.target !== 0 && targetStress !== null) {
    targetStress = changeStress(target, targetStress, stress.target, pressureLight, "targetStress");
  }
  if (outcome !== "miss" && extraStress && targetStress !== null) {
    targetStress = changeStress(
      target,
      targetStress,
      extraStress.amount,
      pressureLight,
      "targetExtraStress",
    );
  }
  const conditionsCleared =
    !emptyArea && outcome !== "miss" && (removal.targetLines > 0 || statuses.targetRemove);
  const actorStunMarkCleared =
    rallyingFlare !== undefined && outcome !== null && !combat.ownEffectsApplied;
  const targetStunMarkCleared =
    rallyingFlare !== undefined && !emptyArea && outcome !== "miss" && target.side === "hero";

  const targetDead =
    target.side === "monster" && target.life !== undefined && wounds >= target.life;

  if (dealtCrit && actorStress !== null) actorStress = changeStress(combat.actor!, actorStress, -1);
  if (dealtCrit && besideActorStress !== null) {
    besideActorStress = besideActorStress.map((hero) => ({
      ...hero,
      stress: changeStress(hero, hero.stress, -1),
    }));
  }
  if (targetStress !== null) {
    let delta = 0;
    if (dealtCrit && combat.targetInActorArea === true) delta -= 1;
    // R-002：承受暴击是已确认的压力事件，低光照额外 +1，不递归触发。
    if (receivedCrit)
      targetStress = changeStress(
        target,
        targetStress,
        criticalStress(target, (damageDealt ?? 0) > 0),
        pressureLight,
        "critTaken",
      );
    targetStress = changeStress(target, targetStress, delta, pressureLight);
  }
  if (receivedCrit && untargetedBesideTargetStress !== null) {
    untargetedBesideTargetStress = untargetedBesideTargetStress.map((hero) => ({
      ...hero,
      stress: changeStress(hero, hero.stress, 1, pressureLight, "critNearby"),
    }));
  }
  // 使用者就是目标。打出暴击的 −1 已经在 actor 上，不再给「同区域其他英雄」加一次。
  if (selfTarget && actorStress !== null && combat.target.stress !== undefined) {
    targetStress = actorStress;
  }

  return {
    skillId: skill.id,
    targetId: target.id,
    status: "resolved",
    reason: null,
    outcome,
    effect,
    printedAmount,
    damageDealt,
    riposteDamage,
    wounds,
    actorWounds,
    targetDead,
    ...(trinketDefence.statuses.length
      ? { targetTrinketStatusEffects: trinketDefence.statuses }
      : {}),
    targetBleedCleared: conditionsCleared,
    targetBlightCleared: conditionsCleared,
    actorBleedCleared,
    actorBlightCleared,
    actorShuffle: combat.ownEffectsApplied ? null : shuffles.self,
    targetShuffle:
      emptyArea || outcome === "miss" ? null : resistedTargetShuffle(shuffles.target, combat),
    targetProtectionIgnored:
      !emptyArea && outcome !== "miss" && effect === "damage" && ignoresProtection.targetLines > 0,
    actorStunMarkCleared,
    targetStunMarkCleared,
    actorForm: combat.ownEffectsApplied ? null : formChange.form,
    actorStress,
    targetStress,
    besideActorStress,
    untargetedBesideTargetStress,
    skipped: skippedEffects(
      active,
      keys,
      stress.lineCount +
        selfHeal.lineCount +
        selfWound.lineCount +
        paired.lineCount +
        removal.lineCount +
        selfBleed.lineCount +
        shuffles.lineCount +
        ignoresProtection.targetLines +
        ignoresGuard.targetLines +
        formChange.lineCount +
        statuses.lineCount +
        bonuses.length +
        (rallyingFlare ? 1 : 0) +
        (extraStress ? 1 : 0) +
        (active.verified_target_header ? 1 : 0) +
        (support ? 2 : 0),
    ),
    ...(statuses.lineCount || support
      ? {
          actorStatusEffects: combat.ownEffectsApplied ? [] : statuses.self,
          targetStatusEffects: emptyArea || outcome === "miss" ? [] : statuses.target,
          actorLightDelta: combat.ownEffectsApplied ? 0 : statuses.selfLight,
          targetLightDelta:
            emptyArea || outcome === "miss" ? 0 : statuses.targetLight + (support?.light ?? 0),
        }
      : {}),
    ...(includeHealthEffects ? { healthEffects, own } : {}),
  };
}
