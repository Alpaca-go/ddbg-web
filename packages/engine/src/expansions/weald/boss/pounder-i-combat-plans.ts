import type { BattleEntity } from "../../../battle";
import { WEALD_POUNDER_I_CONTENT as content } from "./pounder-i-content";

type Participant = Pick<BattleEntity, "id" | "side" | "dead" | "areaId" | "monsterCardId">;
const pounderCardId = content.faces[0].rawId;
const matchmanCardId = content.faces[1].rawId;
const composition = content.abilities.reinforcements;

function livingMonsters(entities: readonly Participant[]) {
  if (new Set(entities.map((e) => e.id)).size !== entities.length)
    throw new Error("Pounder 战斗实体 ID 重复");
  return entities.filter((e) => e.side === "monster" && !e.dead);
}

function uniquePounder(entities: readonly Participant[]) {
  const pounders = entities.filter((e) => e.monsterCardId === pounderCardId);
  if (pounders.length > 1) throw new Error("Pounder I 战斗不能包含多个活体 Pounder");
  return pounders[0];
}

/** R-258：调用方在能力窗口传入真实场上实体；只规划缺额，不分配卡牌或区域。 */
export function planPounderIReinforcements(entities: readonly Participant[]) {
  const living = livingMonsters(entities);
  const pounder = uniquePounder(living);
  if (!pounder) return { kind: "none", reason: "pounderAbsent" } as const;
  if (living.some((e) => e.monsterCardId === matchmanCardId))
    return { kind: "none", reason: "matchmanPresent" } as const;
  const fusiliers = living.filter((e) => e.monsterCardId === composition.fusilierCardId).length;
  return {
    kind: "reinforcements",
    sourceId: pounder.id,
    additions: [
      { cardId: matchmanCardId, count: composition.matchmen },
      { cardId: composition.fusilierCardId, count: Math.max(0, composition.fusiliers - fusiliers) },
    ].filter((entry) => entry.count > 0),
  } as const;
}

/** R-258：Fire in the Hole! 无命中掷骰；只授予炮击触发，炮击本身仍走普通目标/命中流程。 */
export function planPounderIFireInTheHole(entities: readonly Participant[], actorId: string) {
  const living = livingMonsters(entities);
  const actor = living.find((e) => e.id === actorId);
  if (!actor || actor.monsterCardId !== matchmanCardId)
    throw new Error("Fire in the Hole! 需要存活的 I 级 Matchman");
  const pounder = uniquePounder(living);
  if (!pounder) return { kind: "none", reason: "pounderAbsent" } as const;
  if (!actor.areaId || !pounder.areaId) throw new Error("炮击触发缺少实际区域");
  if (actor.areaId !== pounder.areaId) return { kind: "none", reason: "differentArea" } as const;
  return {
    kind: "triggerSkill",
    sourceId: actor.id,
    actorId: pounder.id,
    cardId: pounderCardId,
    slot: content.faces[0].skill.slot,
  } as const;
}
