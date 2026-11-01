import { readQuestCard, type QuestCards } from "./quest-cards";

export type QuestMonsterPlan = {
  readonly questId: string;
  readonly roomKind: "objective";
  readonly monsterName: "Bone Bearer" | "Bone Captain";
  /** null 表示卡面没有指定等级，交由战役规则决定。 */
  readonly printedMonsterLevel: 3 | null;
  readonly lifeBonus: number;
  readonly dodgeBonus: number;
  readonly source: { readonly file: string; readonly page: number };
  readonly combatReady: boolean;
};

/** QUEST p9/p13 明文生成要求；不推断额外生成/替换、牌堆去向或部署顺序。 */
export function readQuestMonsterPlan(
  file: QuestCards,
  questId: string,
): QuestMonsterPlan | undefined {
  const card = readQuestCard(file, questId);
  if (!card || !["quest:p009", "quest:p013"].includes(questId)) return undefined;
  const bearer = questId === "quest:p009";
  const expected = bearer
    ? ["In Objective Rooms, spawn", "1 Bone Bearer (Level III)"]
    : ["In Objective Room spawn", "a Bone Captain who has", "+20 Life and +2 Dodge"];
  if (
    card.name !== (bearer ? "Break Them" : "They Are Back") ||
    card.level !== (bearer ? 2 : 3) ||
    JSON.stringify(card.specialRuleLines) !== JSON.stringify(expected)
  )
    throw new Error("任务指定怪物文字与生成计划不符，需重新核对 QUEST p9/p13（R-048）");
  return {
    questId,
    roomKind: "objective",
    monsterName: bearer ? "Bone Bearer" : "Bone Captain",
    printedMonsterLevel: bearer ? 3 : null,
    lifeBonus: bearer ? 0 : 20,
    dodgeBonus: bearer ? 0 : 2,
    source: { file: card.source.front, page: card.source.page },
    combatReady: true,
  };
}
