import { readPounderRuntimeContext } from "./pounder-runtime-context";
import { rejectBattleCommand, type BattleEntity } from "../../shared/battle/battle";
import type { ApplyResult, GameState } from "../../shared/core/command";
import { finishTurn } from "../../shared/dungeon/encounter";
import { insertMonsterInitiative } from "../../core/bosses/monster-initiative";
import { resolveWealdSummonAreaPlacement } from "../monster-summon";
import { createPounderIEntity } from "./pounder-i-projection";
import { planPounderIReinforcements } from "./pounder-i-combat-plans";

const stances = ["aggressive", "defensive", "ranged", "support"] as const;
/** R31：沿用核心召唤实体模型，读取真实核心卡，不抽取或改写任务探索牌堆。 */
function summonEntity(
  state: GameState,
  cardId: string,
  id: string,
  stance: (typeof stances)[number],
): BattleEntity {
  const context = readPounderRuntimeContext(state)!;
  const fusilier = context.companion;
  if (cardId === context.matchmanCardId) {
    const face = context.faces[1];
    return {
      ...createPounderIEntity("matchman", id, stance),
      monsterCardId: face.rawId,
      life: face.life,
      dodge: face.dodge,
    };
  }
  if (cardId !== context.companionCardId) throw new Error("Pounder 未核准的增援卡");
  const dodge = fusilier.header_unlabeled_numbers?.find(
    (n) => n.anchor.type === "beside_icon" && n.anchor.inside_icon?.key === "dodge",
  )?.numeric;
  if (fusilier.verification.unverified || !Number.isSafeInteger(dodge) || dodge! < 0)
    throw new Error("Pounder I 增援缺少核准 Fusilier Dodge");
  return {
    id,
    side: "monster",
    hero: null,
    monsterCardId: cardId,
    life: fusilier.life,
    dodge: dodge!,
    wounds: 0,
    areaId: "",
    stance,
    stanceSlots: context.companionSize as 1 | 2,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
    statusStacks: [],
  };
}

function continueReinforcements(
  state: GameState,
  actorId: string,
  remaining: readonly string[],
  optionId?: string,
): ApplyResult {
  const original = state;
  let next = state;
  for (let index = 0; index < remaining.length; index++) {
    const battle = next.battle!;
    const context = readPounderRuntimeContext(next);
    if (!context) return rejectBattleCommand(original, "Pounder 增援上下文或等级不符");
    const cardId = remaining[index]!;
    const size = cardId === context.companionCardId ? context.companionSize : 1;
    const occupied = new Set<number>();
    for (const entity of battle.entities.filter((e) => e.side === "monster" && !e.dead)) {
      const start = stances.indexOf(entity.stance!);
      if (start < 0 || !entity.stanceSlots || start + entity.stanceSlots > 4)
        return rejectBattleCommand(original, "Pounder 增援需要核准怪物姿态占位");
      for (let i = start; i < start + entity.stanceSlots; i++) {
        if (occupied.has(i)) return rejectBattleCommand(original, "Pounder 增援拒绝重叠姿态占位");
        occupied.add(i);
      }
    }
    const stance = stances.find(
      (_, i) =>
        i + size <= 4 &&
        Array.from({ length: size }, (_, n) => i + n).every((slot) => !occupied.has(slot)),
    );
    if (!stance) break; // R31：满轨召唤无效，不耗洗入先攻的 RNG。
    const areaId = battle.monsterStanceAreas?.[stance];
    if (!areaId) return rejectBattleCommand(original, "Pounder 增援缺少姿态对应区域");
    const area = battle.areas.find((a) => a.id === areaId);
    const occupants = battle.entities.filter((e) => !e.dead && e.areaId === areaId);
    const width = (e: BattleEntity) => (e.side === "hero" ? 1 : (e.stanceSlots ?? 1));
    const used = occupants.reduce((sum, e) => sum + width(e), 0);
    if (
      !next.chainCrowding &&
      size === 2 &&
      area?.capacity !== undefined &&
      used + size > area.capacity &&
      !occupants.some((e) => used - width(e) + size <= area.capacity!)
    )
      return rejectBattleCommand(
        original,
        "Q-189：单次挤占后仍无空间的后续规则未定义；技术停点，不判定召唤失败",
      );
    const placement = resolveWealdSummonAreaPlacement(
      next,
      areaId,
      size,
      index === 0 ? optionId : undefined,
    );
    if ("status" in placement) {
      if (placement.status === "invalid") continue;
      if (placement.status === "refused") return rejectBattleCommand(original, placement.message);
      const choice = {
        id: `pounder-reinforcements:${battle.choiceCursor}`,
        prompt: "增援区域已满：选择角色与最近可用区域（R-034）",
        options: placement.options,
      };
      return {
        state: {
          ...next,
          battle: {
            ...battle,
            choiceCursor: battle.choiceCursor + 1,
            pending: {
              type: "pounderReinforcements",
              actorId,
              remaining: remaining.slice(index),
              choice,
            },
          },
        },
        events: [],
        pendingChoice: choice,
      };
    }
    if (
      area?.capacity !== undefined &&
      placement.battle.entities
        .filter((e) => !e.dead && e.areaId === areaId)
        .reduce((sum, e) => sum + width(e), 0) +
        size >
        area.capacity
    )
      return rejectBattleCommand(
        original,
        "Q-189：单次挤占后仍无空间的后续规则未定义；技术停点，不判定召唤失败",
      );
    const entity = summonEntity(
      next,
      cardId,
      `pounder-summon:${cardId}:${battle.choiceCursor}`,
      stance,
    );
    if (battle.entities.some((e) => e.id === entity.id))
      return rejectBattleCommand(original, "Pounder 增援实体 ID 冲突");
    const cards = [...context.catalog, context.companion];
    next = insertMonsterInitiative({
      ...next,
      battle: {
        ...placement.battle,
        pending: null,
        choiceCursor: battle.choiceCursor + 1,
        entities: [...placement.battle.entities, { ...entity, areaId }],
        monsters: [
          ...(battle.monsters ?? []),
          ...cards.filter((c) => !battle.monsters?.some((old) => old.id === c.id)),
        ],
      },
    });
  }
  return finishTurn({ ...next, battle: { ...next.battle!, pending: null } }, actorId, [
    {
      type: "dungeonUpdated",
      message: "Pounder I 增援完成；成功召唤逐只洗入先攻（R-258、R31、R-034）",
    },
  ]);
}

export function applyPounderIReinforcements(state: GameState, actorId: string): ApplyResult {
  const b = state.battle;
  const context = readPounderRuntimeContext(state);
  if (
    !b?.encounter ||
    b.pending ||
    b.monsterAction ||
    b.shuffleIntents.length ||
    b.encounter.turn.type !== "monster" ||
    b.encounter.turn.actorId !== actorId ||
    !context ||
    !state.dungeon?.pounderHamletThreats
  )
    return rejectBattleCommand(state, "Pounder I 增援需要显式新版本、I级 Boss 战及当前本体回合");
  const plan = planPounderIReinforcements(b.entities, context);
  if (plan.kind !== "reinforcements" || plan.sourceId !== actorId)
    return rejectBattleCommand(state, "R-258：只有活体 Pounder 且 Matchman 缺席时才能增援");
  return continueReinforcements(
    state,
    actorId,
    plan.additions.flatMap((a) => Array<string>(a.count).fill(a.cardId)),
  );
}

export function choosePounderIReinforcements(state: GameState, optionId: string): ApplyResult {
  const pending = state.battle?.pending;
  if (
    pending?.type !== "pounderReinforcements" ||
    !pending.choice.options.some((o) => o.id === optionId)
  )
    return rejectBattleCommand(state, "没有对应的 Pounder 增援挤占选项");
  return continueReinforcements(state, pending.actorId, pending.remaining, optionId);
}
