import { distance, rejectBattleCommand } from "../battle";
import type { BattleEntity, BattleState } from "../battle";
import type { ApplyResult, GameState, MonsterSkillResolvedEvent } from "../command";
import { recordMonsterSkill } from "../encounter";
import { createRng } from "../rng";
import { resolveEncounterBossScriptId } from "./encounter-rules";
import { getBossScript } from "./registry";
import { runBossHook } from "./hooks";
import {
  NECROMANCER_I_COMBAT_MONSTER_CARD_ID,
  NECROMANCER_I_SCRIPT_ID,
  NECROMANCER_I_SUMMON_MONSTER_CARD_ID,
} from "./necromancer-i";
import {
  NECROMANCER_II_COMBAT_MONSTER_CARD_ID,
  NECROMANCER_II_SCRIPT_ID,
  NECROMANCER_II_SUMMON_MONSTER_CARD_ID,
} from "./necromancer-ii";

const STANCES = ["aggressive", "defensive", "ranged", "support"] as const;

/** 两等级独立核实的卡引用；不从等级或同名卡推导。 */
function necromancerCombat(state: GameState) {
  const id = resolveEncounterBossScriptId(state);
  if (id === NECROMANCER_I_SCRIPT_ID)
    return {
      id,
      card: NECROMANCER_I_COMBAT_MONSTER_CARD_ID,
      summon: NECROMANCER_I_SUMMON_MONSTER_CARD_ID,
      summonName: "Bone Rabble",
    };
  if (id === NECROMANCER_II_SCRIPT_ID)
    return {
      id,
      card: NECROMANCER_II_COMBAT_MONSTER_CARD_ID,
      summon: NECROMANCER_II_SUMMON_MONSTER_CARD_ID,
      summonName: "Bone Soldier",
    };
  return undefined;
}

/** R38：移出伴战怪物，保留日志身份与原伤口；不冒充攻击伤害或永久移出怪物池。 */
export function clearNecromancerICompanions(result: ApplyResult, ids: readonly string[]) {
  const battle = result.state.battle!;
  const boss = necromancerCombat(result.state);
  if (
    !boss ||
    !battle.entities.some(
      (e) => e.side === "monster" && e.monsterCardId === boss.card && e.dead && ids.includes(e.id),
    )
  )
    return { result, ids };
  const companions = battle.entities.filter((e) => e.side === "monster" && !e.dead);
  return {
    ids: [...ids, ...companions.map((e) => e.id)],
    result: {
      ...result,
      state: {
        ...result.state,
        battle: {
          ...battle,
          entities: battle.entities.map((e) => (companions.includes(e) ? { ...e, dead: true } : e)),
        },
      },
      events: [
        ...result.events,
        {
          type: "dungeonUpdated" as const,
          message: `${getBossScript(boss.id)!.displayName} 被击败：移出其余怪物（R38）`,
        },
      ],
    },
  };
}

/** 接在技能目标效果结算之后、回合结束之前；每次技能只执行一个印刷召唤原语。 */
export function continueNecromancerISummon(
  result: ApplyResult,
  resolved: MonsterSkillResolvedEvent,
  casualtyIds: readonly string[],
  displacement?: string,
): ApplyResult | null {
  const { summonTargetAreaId: areaId, ...continued } = resolved;
  if (!areaId) return null;
  const state = result.state;
  const battle = state.battle!;
  const actor = battle.entities.find((e) => e.id === resolved.actorId);
  const boss = necromancerCombat(state);
  if (!boss || actor?.monsterCardId !== boss.card)
    return rejectBattleCommand(state, "Necromancer 召唤缺少对应 Boss 遭遇（R-048）");
  if (actor.dead) return recordMonsterSkill(result, continued, casualtyIds);
  const script = getBossScript(boss.id)!;
  const plan = runBossHook(script, "summon", {
    scriptId: boss.id,
    purpose: "skill",
    skillSlot: resolved.skillSlot,
  });
  if (
    plan.status !== "ok" ||
    plan.value.summonMonsterCardId !== boss.summon ||
    plan.value.miniaturePlacement !== "targetArea"
  )
    return rejectBattleCommand(state, "Necromancer 召唤声明未核实（R-048）");
  const living = battle.entities.filter((e) => !e.dead);
  const occupied = new Set<number>();
  for (const monster of living.filter((e) => e.side === "monster")) {
    const position = STANCES.indexOf(monster.stance!);
    if (
      position < 0 ||
      ![1, 2].includes(monster.stanceSlots!) ||
      position + monster.stanceSlots! > 4
    )
      return rejectBattleCommand(state, "召唤缺少已核实怪物姿态 / 占格（R-048）");
    for (let i = position; i < position + monster.stanceSlots!; i++) occupied.add(i);
  }
  const stance = STANCES.find((_, index) => !occupied.has(index));
  // R31 / p004：满轨召唤无效，不耗 RNG、不洗先攻。
  if (!stance)
    return recordMonsterSkill(
      {
        ...result,
        events: [
          ...result.events,
          {
            type: "dungeonUpdated",
            message: `${script.displayName}：姿态轨已满，召唤无效（R31）`,
          },
        ],
      },
      continued,
      casualtyIds,
    );
  const card =
    battle.monsters?.find((c) => c.id === plan.value.summonMonsterCardId) ??
    state.dungeon?.battleCatalog?.monsters.find((c) => c.id === plan.value.summonMonsterCardId);
  // 召唤物 Dodge 来自已确认 dodge 图标，不补默认 0。
  const dodge = (card as typeof card & { dodge?: number })?.dodge;
  const printedDodge = (
    card as typeof card & {
      header_unlabeled_numbers?: readonly {
        numeric: number | null;
        anchor: { inside_icon?: { key: string | null; naming: string } | null };
      }[];
    }
  )?.header_unlabeled_numbers?.filter(
    (n) =>
      n.anchor.inside_icon?.key === "dodge" &&
      ["confirmed", "confirmed_rulebook"].includes(n.anchor.inside_icon.naming),
  );
  const verifiedDodge = dodge ?? (printedDodge?.length === 1 ? printedDodge[0]!.numeric : null);
  if (
    !card ||
    card.verification.unverified ||
    !Number.isSafeInteger(card.life) ||
    card.life < 1 ||
    !Number.isSafeInteger(verifiedDodge) ||
    verifiedDodge! < 0 ||
    !card.resistances ||
    card.resistances.some((i) => !["confirmed", "confirmed_rulebook"].includes(i.naming)) ||
    (boss.id === NECROMANCER_II_SCRIPT_ID &&
      (!card.immunities ||
        card.immunities.some((i) => !["confirmed", "confirmed_rulebook"].includes(i.naming))))
  )
    return rejectBattleCommand(state, "召唤缺少已核实 Bone Rabble / Bone Soldier 属性（R-048）");
  if (
    battle.areas.some((a) => !Number.isSafeInteger(a.capacity)) ||
    !battle.areas.some((a) => a.id === areaId)
  )
    return rejectBattleCommand(state, "召唤区域 / 容量未核实（R-048）");
  const width = (e: BattleEntity) => (e.side === "hero" ? 1 : e.stanceSlots!);
  const occupancy = (id: string) =>
    living.filter((e) => e.areaId === id).reduce((n, e) => n + width(e), 0);
  const space = (id: string, size: number) =>
    occupancy(id) + size <= battle.areas.find((a) => a.id === id)!.capacity!;
  let entities = battle.entities;
  if (!space(areaId, 1)) {
    const occupants = living.filter((e) => e.areaId === areaId);
    const heroes = occupants.filter((e) => e.side === "hero");
    const movers = heroes.length ? heroes : occupants;
    const options = movers.flatMap((e) => {
      const available = battle.areas
        .filter((a) => a.id !== areaId && space(a.id, width(e)))
        .map((a) => ({ id: a.id, steps: distance(battle.areas, areaId, a.id) }))
        .filter((a) => a.steps !== null);
      const nearest = Math.min(...available.map((a) => a.steps!));
      return available
        .filter((a) => a.steps === nearest)
        .map((a) => ({
          id: JSON.stringify([e.id, a.id]),
          label: `${e.id} → ${a.id}`,
        }));
    });
    if (!options.length) return rejectBattleCommand(state, "召唤挤占没有可用区域（R-034）");
    if (displacement === undefined) {
      const choice = {
        id: `necromancer-summon:${battle.choiceCursor}`,
        prompt: "召唤区域已满：选择角色与最近可用区域（R-034）",
        options,
      };
      return {
        state: {
          ...state,
          battle: {
            ...battle,
            choiceCursor: battle.choiceCursor + 1,
            pending: { type: "necromancerSummon", choice, resolved, casualtyIds },
          },
        },
        events: result.events,
        pendingChoice: choice,
      };
    }
    if (!options.some((o) => o.id === displacement))
      return rejectBattleCommand(state, "召唤挤占选择已过期");
    const [id, destination] = JSON.parse(displacement) as [string, string];
    entities = entities.map((e) => (e.id === id ? { ...e, areaId: destination } : e));
  }
  const summon: BattleEntity = {
    id: `boss:necromancer:${boss.id === NECROMANCER_I_SCRIPT_ID ? "rabble" : "soldier"}:${battle.entities.length}`,
    side: "monster",
    hero: null,
    monsterCardId: card.id,
    life: card.life,
    dodge: verifiedDodge!,
    areaId,
    stance,
    stanceSlots: 1,
    wounds: 0,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
    shuffleResist: card.resistances.some((i) => i.key === "shuffle_resist"),
  };
  const rng = createRng(state.seed);
  for (let i = 0; i < battle.rngCursor; i++) rng.next();
  const deck = [...battle.encounter!.deck];
  deck.splice(Math.floor(rng.next() * (deck.length + 1)), 0, "monster");
  const next: BattleState = {
    ...battle,
    pending: null,
    entities: [...entities, summon],
    monsters: battle.monsters?.some((c) => c.id === card.id)
      ? battle.monsters
      : [...(battle.monsters ?? []), card],
    rngCursor: battle.rngCursor + 1,
    encounter: { ...battle.encounter!, deck },
  };
  return recordMonsterSkill(
    {
      state: { ...state, battle: next },
      events: [
        ...result.events,
        {
          type: "dungeonUpdated",
          message: `${script.displayName}：${boss.summonName} 召唤到 ${areaId}，先攻洗入当前牌堆（R38、R-034）`,
        },
      ],
    },
    continued,
    casualtyIds,
  );
}

export function chooseNecromancerISummon(state: GameState, optionId: string): ApplyResult {
  const pending = state.battle?.pending;
  if (pending?.type !== "necromancerSummon") return rejectBattleCommand(state, "没有召唤待选");
  return continueNecromancerISummon(
    { state, events: [] },
    pending.resolved,
    pending.casualtyIds,
    optionId,
  )!;
}
