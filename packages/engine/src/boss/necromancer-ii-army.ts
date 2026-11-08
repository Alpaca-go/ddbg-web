import type { DungeonState } from "../dungeon";
import type { SpawnCard } from "../spawn";
import { readActiveBossThreatScript } from "./threat-passive-runtime";
import { runBossHook } from "./hooks";
import type { ApplyResult, GameState } from "../command";
import type { BattleEntity } from "../battle";
import { rejectBattleCommand } from "../battle";
import type { MonsterCardView } from "../monster-skill";
import { NECROMANCER_II_COMBAT_MONSTER_CARD_ID } from "./necromancer-ii";

const STANCES = ["aggressive", "defensive", "ranged", "support"] as const;

function readMonsterDodge(card: MonsterCardView & { readonly dodge?: number }): number | undefined {
  if (Number.isSafeInteger(card.dodge) && card.dodge! >= 0) return card.dodge!;
  const printed = card.header_unlabeled_numbers?.find(
    (entry) => entry.anchor.type === "beside_icon" && entry.anchor.inside_icon?.key === "dodge",
  )?.numeric;
  return Number.isSafeInteger(printed) && printed! >= 0 ? printed! : undefined;
}

function firstBattleMonster(d: DungeonState): string | undefined {
  if (d.necromancerIIArmyUsed) return undefined;
  const script = readActiveBossThreatScript(d);
  if (!script) return undefined;
  const effect = runBossHook(script, "threatPassiveDungeon", {
    scriptId: script.id,
    side: "dungeon",
  });
  return effect.status === "ok" && effect.effect === "firstBattleBoneCaptain"
    ? effect.monsterCardId
    : undefined;
}

/** p005 / R16–17：指定怪物先生成，再沿原牌序填满四姿态；不复制卡、不额外掷骰。 */
export function firstBattleThreatDeck(
  d: DungeonState,
  deck: readonly SpawnCard[],
):
  | { status: "ok"; deck: readonly SpawnCard[]; forced: boolean }
  | { status: "refused"; reason: string } {
  const cardId = firstBattleMonster(d);
  if (!cardId) return { status: "ok", deck, forced: false };
  const matches = deck.filter((card) => card.cardId === cardId);
  if (matches.length !== 1)
    return {
      status: "refused",
      reason: "Army of the Dead 缺唯一 Bone Captain 真实牌池实例，未部署（R-048）",
    };
  return {
    status: "ok",
    deck: [matches[0]!, ...deck.filter((card) => card !== matches[0])],
    forced: true,
  };
}

/** 只在实际进入首场战斗成功后消费，部署失败 / 缺字段重试均不消费。 */
export function firstBattleThreatEntry(
  d: DungeonState,
): { status: "ok"; dungeon: DungeonState } | { status: "refused"; reason: string } {
  const cardId = firstBattleMonster(d);
  if (!cardId) return { status: "ok", dungeon: d };
  const first = d.monsterPool?.active?.monsters[0];
  if (!first || first.cardId !== cardId || first.stance !== "aggressive" || first.stanceSlots !== 2)
    return {
      status: "refused",
      reason: "Army of the Dead 首场未先生成 Bone Captain，保持部署（R-048）",
    };
  return { status: "ok", dungeon: { ...d, necromancerIIArmyUsed: true } };
}

/**
 * Q-154 / R-204：首战即 Necromancer II Boss 战时，Army of the Dead 的 Bone Captain
 * 加入该场：取第一个可用的 2 格姿态位（Boss 通常占 aggressive，因此落 defensive），
 * 区域用已获批的 monsterStanceAreas；startRound 会按存活实体自动多洗入 1 张怪卡。
 */
export function applyNecromancerIIArmyBattleStart(state: GameState): ApplyResult {
  const d = state.dungeon;
  const b = state.battle;
  if (!d || !b || d.necromancerIIArmyUsed) return { state, events: [] };
  const bossInPlay = b.entities.some(
    (entity) => entity.monsterCardId === NECROMANCER_II_COMBAT_MONSTER_CARD_ID && !entity.dead,
  );
  if (!bossInPlay) return { state, events: [] };
  const cardId = "monster_large:p001";
  const card = b.monsters?.find((entry) => entry.id === cardId) as
    (MonsterCardView & { readonly dodge?: number }) | undefined;
  if (!card)
    return rejectBattleCommand(state, "Army of the Dead：Bone Captain 战斗目录缺失（R-048）");
  const dodge = readMonsterDodge(card);
  if (dodge === undefined)
    return rejectBattleCommand(state, "Army of the Dead：Bone Captain 缺少已核实 Dodge（R-048）");
  const living = b.entities.filter((entity) => entity.side === "monster" && !entity.dead);
  const occupied = new Set<number>();
  for (const entity of living) {
    const position = STANCES.indexOf(entity.stance!);
    for (let slot = position; slot < position + (entity.stanceSlots ?? 1); slot += 1)
      occupied.add(slot);
  }
  const stance = STANCES.find(
    (_, index) => index + 2 <= STANCES.length && !occupied.has(index) && !occupied.has(index + 1),
  );
  if (!stance)
    return rejectBattleCommand(state, "Army of the Dead：首场 Boss 战没有 2 格姿态位（R-048）");
  const areaId = b.monsterStanceAreas?.[stance] ?? living[0]?.areaId;
  if (!areaId)
    return rejectBattleCommand(state, "Army of the Dead：Bone Captain 缺少已核实区域（R-048）");
  const entity: BattleEntity = {
    id: `necromancer-army:${cardId}`,
    side: "monster",
    hero: null,
    monsterCardId: cardId,
    life: (card as { readonly life?: number }).life!,
    dodge,
    areaId,
    stance,
    stanceSlots: 2,
    wounds: 0,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
    ...(card.innateProtection === undefined
      ? {}
      : { innateProtection: card.innateProtection, protection: card.innateProtection }),
  };
  return {
    state: {
      ...state,
      dungeon: { ...d, necromancerIIArmyUsed: true },
      battle: { ...b, entities: [...b.entities, entity] },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: `Army of the Dead：Bone Captain 加入首场 Boss 战（${stance}、2 格；先攻 +1 张怪卡；Q-154）`,
      },
    ],
  };
}
