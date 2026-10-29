import { isInvokingMonster } from "@ddbg/engine";
import type { BattleState } from "@ddbg/engine";

// 只呈现引擎的当前阶段，不推断合法目标、规则数值或额外行动。
const pendingSteps: Record<
  NonNullable<BattleState["pending"]>["type"],
  { readonly label: string; readonly hint: string }
> = {
  necromancerSummon: {
    label: "等待召唤挤占选择",
    hint: "选择下方角色与最近可用区域，完成 Bone Rabble 召唤。",
  },
  trinketReward: {
    label: "等待饰品获得选择",
    hint: "选择接收者、转交或弃牌，继续原入牌；不会重抽或重复扣行动。",
  },
  invokerMove: {
    label: "等待召唤室移动选择",
    hint: "选择最接近红星的合法落点，替代整个怪物第2步。",
  },
  invokerDisplace: {
    label: "等待召唤室挤出选择",
    hint: "选择一名角色及其相邻去处，完成向红星移动。",
  },
  conditionReplace: {
    label: "等待怪癖替换选择",
    hint: "选择一张已有正面怪癖，换上新抽到的负面怪癖。",
  },
  smallDisplace: {
    label: "等待 Small 挤占选择",
    hint: "选择一只 Small 及其有空间的相邻区域，完成当前英雄回合。",
  },
  startingProvision: {
    label: "等待开局补给选择",
    hint: "为 Wild 补给选择一面；全部选择完成后开始战斗。",
  },
  turnStartProvision: {
    label: "回合开始前补给窗口",
    hint: "可先免费使用补给，再点「结算回合开始效果」继续。",
  },
  lootReward: {
    label: "等待宝箱奖励选择",
    hint: "完成下方宝箱奖励选择，领取本次奖励。",
  },
  resolveProvision: {
    label: "等待意志卡补给选择",
    hint: "按下方意志卡提示选择补给，完成本次触发效果。",
  },
  shuffleDirection: {
    label: "等待推拉方向选择",
    hint: "选择推或拉，再继续位移结算。",
  },
  shuffleReduction: {
    label: "等待 Balanced 位移选择",
    hint: "由持有 Balanced 的英雄选择保持距离或少移 1，再继续本次位移。",
  },
  shuffleArea: {
    label: "等待位移区域选择",
    hint: "选择下方可用区域，继续本次位移；不重新掷骰。",
  },
  monsterMove: {
    label: "等待怪物移动区域选择",
    hint: "选择怪物要前往的区域，再继续当前怪物回合。",
  },
  monsterDisplace: {
    label: "等待怪物挤占选择",
    hint: "选择被挤出的角色及其去处，再继续当前怪物回合。",
  },
};

export function battleStep(battle: BattleState): { readonly label: string; readonly hint: string } {
  if (battle.pending) return pendingSteps[battle.pending.type];
  if (battle.shuffleIntents.length)
    return { label: "等待位移结算", hint: "点击「结算位移」，完成本次技能后继续回合。" };
  const turn = battle.encounter?.turn;
  if (!turn) return { label: "准备战斗", hint: "确认布置与种子后，点击「开始战斗」。" };
  if (turn.type === "awaitingInitiative")
    return { label: "等待先攻", hint: "点击「抽取先攻」，确定下一位行动角色。" };
  if (turn.type === "hero")
    return turn.mustMove
      ? { label: "必须移动离开", hint: "当前区域没有足够空间；下一行动必须移动离开。" }
      : { label: "英雄行动", hint: "在行动面板选择移动、交互、换姿态或使用技能。" };
  if (turn.type === "monster") {
    if (isInvokingMonster(battle, turn.actorId))
      return {
        label: "The Invokers移动",
        hint: "点击「按 The Invokers 移动」，替代选招、目标与攻击。",
      };
    if (!battle.monsterAction)
      return { label: "怪物选招", hint: "点击「怪物选招与选目标」，确定本回合的技能和目标。" };
    return battle.monsterAction.positioned
      ? { label: "怪物攻击", hint: "可先免费使用补给，再点「结算怪物技能」。" }
      : { label: "怪物移动", hint: "点击「怪物移动到射程」，完成本回合的定位。" };
  }
  return { label: "单场结束", hint: "本场已停止；选择测试布置后点击「重新布置」开始新的一场。" };
}
