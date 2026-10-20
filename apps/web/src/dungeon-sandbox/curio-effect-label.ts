import type { CurioEffect } from "../../../../packages/data/src/curio";

export function curioEffectLabel(effect: CurioEffect) {
  if (effect.type === "gold") return `金币 +${effect.amount}`;
  if (effect.type === "stress") return `压力 +${effect.amount}`;
  if (effect.type === "status")
    return `${{ bleed: "流血", blight: "腐蚀", buff: "增益", debuff: "减益" }[effect.kind]}${effect.amount ? ` ${effect.amount}` : ""}，${effect.duration} 回合`;
  if (effect.type === "drawDisease") return "获得一张疾病";
  if (effect.type === "drawQuirk")
    return `抽一张${effect.polarity === "positive" ? "正面" : "负面"}怪癖`;
  if (effect.type === "drawTrinket") return "抽一张饰品卡";
  return "掷一颗补给骰";
}
