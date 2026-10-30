import type { ApplyResult } from "../command";
import type { BattleEntity } from "../battle";
import { rejectBattleCommand } from "../battle";
import { higherRuinsThreat } from "./higher-ruins-threat";
import { createRng } from "../rng";

/** 本聊天确认：清除伤口/条件，同卡重新生成；对应姿态区，无空间忽略，洗入先攻。 */
export function applyNecromancerIIIReanimation(
  result: ApplyResult,
  casualties: readonly BattleEntity[],
): ApplyResult {
  const b = result.state.battle!;
  if (
    b.reanimationUsed ||
    higherRuinsThreat(result.state.dungeon, "dungeon")?.kind !== "reanimation" ||
    b.entities.some((e) => e.monsterCardId === "monster_medium:p091" && e.dead)
  )
    return result;
  const dead = casualties.find((e) => e.side === "monster" && e.stanceSlots === 1);
  if (!dead) return result;
  const card = b.monsters?.find((c) => c.id === dead.monsterCardId);
  if (
    !card ||
    card.verification.unverified ||
    !Number.isSafeInteger(card.life) ||
    card.life < 1 ||
    !card.resistances ||
    !card.immunities
  )
    return rejectBattleCommand(result.state, "Reanimation 缺完整怪物属性（R-048）");
  const stances = ["aggressive", "defensive", "ranged", "support"] as const;
  const occupied = new Set<number>();
  for (const e of b.entities.filter((e) => e.side === "monster" && !e.dead)) {
    const pos = stances.indexOf(e.stance!);
    if (pos < 0 || ![1, 2].includes(e.stanceSlots!))
      return rejectBattleCommand(result.state, "Reanimation 缺姿态/占格");
    for (let n = 0; n < e.stanceSlots!; n++) occupied.add(pos + n);
  }
  const stance = stances.find((_, n) => !occupied.has(n));
  const areaId = stance && b.monsterStanceAreas?.[stance];
  if (stance && !areaId)
    return rejectBattleCommand(result.state, "Reanimation 缺显式姿态区域绑定（R-048）");
  const area = b.areas.find((a) => a.id === areaId);
  if (stance && (!area || !Number.isSafeInteger(area.capacity)))
    return rejectBattleCommand(result.state, "Reanimation 区域容量未核实");
  const occupiedArea = b.entities
    .filter((e) => !e.dead && e.areaId === areaId)
    .reduce((n, e) => n + (e.side === "hero" ? 1 : e.stanceSlots!), 0);
  if (!stance || occupiedArea + 1 > area!.capacity!)
    return {
      ...result,
      state: { ...result.state, battle: { ...b, reanimationUsed: true } },
      events: [
        ...result.events,
        { type: "dungeonUpdated", message: "Reanimation：无空间，忽略本场首次复活" },
      ],
    };
  const entity: BattleEntity = {
    id: `reanimated:${dead.id}:${b.entities.length}`,
    side: "monster",
    hero: null,
    monsterCardId: card.id,
    life: card.life,
    dodge: dead.dodge,
    areaId: areaId!,
    stance,
    stanceSlots: 1,
    skillIds: [],
    wounds: 0,
    dead: false,
    guard: false,
    bleed: [],
    blight: [],
    statusStacks: [],
    shuffleResist: card.resistances.some((i) => i.key === "shuffle_resist"),
    ...(card.innateProtection ? { innateProtection: true, protection: true } : {}),
  };
  const rng = createRng(result.state.seed);
  for (let n = 0; n < b.rngCursor; n++) rng.next();
  const deck = [...b.encounter!.deck];
  deck.splice(Math.floor(rng.next() * (deck.length + 1)), 0, "monster");
  return {
    ...result,
    state: {
      ...result.state,
      battle: {
        ...b,
        reanimationUsed: true,
        entities: [...b.entities, entity],
        rngCursor: b.rngCursor + 1,
        encounter: { ...b.encounter!, deck },
      },
    },
    events: [
      ...result.events,
      {
        type: "dungeonUpdated",
        message: `Reanimation：${dead.id} 同卡重新生成到 ${areaId}；清除伤口/条件并洗入先攻`,
      },
    ],
  };
}
