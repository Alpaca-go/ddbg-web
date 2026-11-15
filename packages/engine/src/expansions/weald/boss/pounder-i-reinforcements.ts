import corePool from "../../../../../data/normalized/corebox/monster_pool.json";
import coreMedium from "../../../../../data/normalized/corebox/monster_medium.json";
import { rejectBattleCommand, type BattleEntity } from "../../../battle";
import type { ApplyResult, GameState } from "../../../command";
import { finishTurn } from "../../../encounter";
import { insertMonsterInitiative } from "../../../boss/monster-initiative";
import { resolveEncounterBossScriptId } from "../../../boss/encounter-rules";
import type { MonsterCardView } from "../../../monster-skill";
import { resolveWealdSummonAreaPlacement } from "../monster-summon";
import { POUNDER_I_SCRIPT_ID } from "./pounder-i";
import { pounderIFusilierSource } from "./pounder-i-content";
import { buildPounderICombatCatalog, createPounderIEntity } from "./pounder-i-projection";
import { planPounderIReinforcements } from "./pounder-i-combat-plans";

const stances = ["aggressive", "defensive", "ranged", "support"] as const;
const source = pounderIFusilierSource(corePool.cards);
const fusilier = coreMedium.cards.find((c) => c.id === source.combatCardId)! as MonsterCardView;

/** R31：沿用核心召唤实体模型，读取真实核心卡，不抽取或改写任务探索牌堆。 */
function summonEntity(cardId: string, id: string, stance: (typeof stances)[number]): BattleEntity {
  if (cardId !== source.combatCardId) return createPounderIEntity("matchman", id, stance);
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
    stanceSlots: 1,
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
    const stance = stances.find((_, i) => !occupied.has(i));
    if (!stance) break; // R31：满轨召唤无效，不耗洗入先攻的 RNG。
    const areaId = battle.monsterStanceAreas?.[stance];
    if (!areaId) return rejectBattleCommand(original, "Pounder 增援缺少姿态对应区域");
    const placement = resolveWealdSummonAreaPlacement(
      next,
      areaId,
      1,
      index === 0 ? optionId : undefined,
    );
    if ("status" in placement) {
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
    const cardId = remaining[index]!;
    const entity = summonEntity(cardId, `pounder-summon:${cardId}:${battle.choiceCursor}`, stance);
    if (battle.entities.some((e) => e.id === entity.id))
      return rejectBattleCommand(original, "Pounder 增援实体 ID 冲突");
    const cards = [...buildPounderICombatCatalog(), fusilier];
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
  if (
    !b?.encounter ||
    b.pending ||
    b.monsterAction ||
    b.shuffleIntents.length ||
    b.encounter.turn.type !== "monster" ||
    b.encounter.turn.actorId !== actorId ||
    state.dungeon?.phase !== "inBattle" ||
    state.dungeon.campaignLevel !== 1 ||
    !state.dungeon.pounderHamletThreats ||
    !["standard", "radiant"].includes(state.dungeon.mode) ||
    resolveEncounterBossScriptId(state) !== POUNDER_I_SCRIPT_ID
  )
    return rejectBattleCommand(
      state,
      "Pounder I 增援需要显式新版本、I级非Stygian Boss 战及当前本体回合",
    );
  const plan = planPounderIReinforcements(b.entities);
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
