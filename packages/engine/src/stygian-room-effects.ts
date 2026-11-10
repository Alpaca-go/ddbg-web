import rawStygianRooms from "../../data/normalized/corebox/stygian_rooms.json";
import { stygianRoomsSchema } from "../../data/src/stygian-rooms";
import { rejectBattleCommand } from "./battle";
import type { BattleArea } from "./battle";
import type { ApplyResult, GameEvent, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { endAfterCasualties, removeCasualties } from "./encounter";
import { resolveSeededHeroHealth } from "./hero-health";
import { readCampaignLevel } from "./hamlet-campaign";
import { applyBattleSkillStatuses } from "./battle-skill-status";
import { fixedDamageResolution } from "./battle-spiked-pit";
import { removeAncestorConditions } from "./battle-ancestor";

const reviewedRooms = stygianRoomsSchema.parse(rawStygianRooms).cards;

/** 保留标准卡的地图与牌池身份，仅替换实际启用的印刷卡效果。 */
export function readActiveStygianRoom(d: DungeonState) {
  if (d.mode !== "stygian" || !d.stygianRoomRules) return undefined;
  const card = reviewedRooms.find((c) => c.replacesCardId === d.roomCards?.active?.cardId);
  if (!card) return undefined;
  const kind = card.reviewedEffect.kind;
  if (
    d.stygianRoomRules === "full" ||
    kind === "unholyAura" ||
    kind === "poolOfRebirth" ||
    (d.stygianRoomRules === "r229" && kind === "evilEye")
  )
    return card;
  return undefined;
}

export function endTurnStygianArea(
  state: GameState,
  actorId: string,
  events: readonly GameEvent[],
): ApplyResult | null {
  const battle = state.battle!;
  const actor = battle.entities.find((entity) => entity.id === actorId)!;
  const area = battle.areas.find((a) => a.id === actor.areaId);
  if (!area || actor.side !== "hero" || actor.dead) return null;
  if (area.endTurnAncestorCleanse) {
    return {
      state: {
        ...state,
        battle: {
          ...battle,
          entities: battle.entities.map((e) =>
            e.id === actorId ? removeAncestorConditions(e) : e,
          ),
        },
      },
      events: [
        ...events,
        {
          type: "passiveTriggered",
          entityId: actorId,
          trigger: "ancestorGlory",
          message: "Ancestor’s Glory：英雄结束回合，移除枯萎、流血、减益、眩晕和标记（R-036）",
        },
      ],
    };
  }
  if (area.endTurnToxicBlight) {
    const statuses = applyBattleSkillStatuses(
      battle,
      battle.entities,
      "",
      [
        {
          ...fixedDamageResolution(actor, "area:toxicVapors"),
          targetStatusEffects: [{ kind: "blight", ...area.endTurnToxicBlight }],
        },
      ],
      state.seed,
      battle.rngCursor,
    );
    if (statuses.status === "refused") return rejectBattleCommand(state, statuses.reason);
    return {
      state: {
        ...state,
        battle: { ...battle, entities: statuses.entities, rngCursor: statuses.rngCursor },
      },
      events: [...events, ...statuses.events],
    };
  }
  const rate = area.endTurnWoundsPerHeroLevel;
  if (!rate) return null;
  if (!actor.heroLevel || ![1, 2, 3].includes(actor.heroLevel))
    return rejectBattleCommand(state, "Unholy Aura 需要已核实的 Hero Level 和 Life（R-227）");
  const amount = rate * actor.heroLevel;
  const result = applyStygianRoomWounds(
    { state, events },
    actorId,
    amount,
    `Unholy Aura：英雄结束回合承受 ${amount} 个伤口（R-227）`,
  );
  if (!result.state.battle!.entities.find((e) => e.id === actorId)!.dead) return result;
  const removed = removeCasualties(result, [actorId]);
  return endAfterCasualties(removed) ?? removed;
}

/** 卡面伤口直接走死门，不触发伤害修正。伤亡收尾由当前房间的顺序决定。 */
export function applyStygianRoomWounds(
  result: ApplyResult,
  actorId: string,
  amount: number,
  message: string,
): ApplyResult {
  const { state, events } = result;
  const battle = state.battle!;
  const actor = battle.entities.find((e) => e.id === actorId)!;
  if (!amount || actor.dead) return result;
  if (actor.life === undefined)
    return rejectBattleCommand(state, "房间伤口需要已核实的英雄 Life（R-048）");
  const effect = { type: "wounds" as const, amounts: [amount] };
  const health = resolveSeededHeroHealth(
    { life: actor.life, wounds: actor.wounds, dead: actor.dead },
    effect,
    state.seed,
    battle.rngCursor,
  );
  if (health.status !== "resolved") return rejectBattleCommand(state, "房间伤口无法结算（R-048）");
  return {
    state: {
      ...state,
      battle: {
        ...battle,
        rngCursor: health.rngCursor,
        entities: battle.entities.map((entity) =>
          entity.id === actorId ? { ...entity, ...health.state } : entity,
        ),
      },
    },
    events: [
      ...events,
      {
        type: "heroHealthResolved",
        entityId: actorId,
        effect,
        resolution: health,
        message,
      },
    ],
  };
}

export function stygianRoomBattleAreas(areas: readonly BattleArea[], d: DungeonState) {
  const effect = readActiveStygianRoom(d)?.reviewedEffect;
  if (!effect) return areas;
  return areas.map((area) => {
    if (effect.kind === "cornered" && area.endTurnStress === 1)
      return { ...area, endTurnStress: effect.stress };
    if (effect.kind === "healingWaters" && area.endTurnHeal)
      return {
        ...area,
        endTurnHealPerHeroLevel: effect.healPerHeroLevel,
        endTurnStress: effect.stress,
        endTurnStressName: "Healing Waters" as const,
      };
    if (effect.kind === "spikedPit") {
      if (area.circleOfPower)
        return {
          ...area,
          circleOfPowerHeal:
            effect.monsterHealPerDungeonLevel *
            (d.explorationSetup?.dungeonLevel ?? readCampaignLevel(d)),
        };
      if (area.spikedPit) return { ...area, spikedPitHeroesOnly: effect.heroesOnly };
    }
    if (effect.kind === "beaconOfLight" && area.endTurnStressName === "Stressful Darkness")
      return { ...area, endTurnStress: effect.darknessStress };
    if (effect.kind === "treasureChamber") {
      if (area.lootTheChest) return { ...area, lootTheChestStress: effect.lootStress };
      if (area.hideAndHeal) return { ...area, hideAndHealStress: effect.hideStress };
    }
    if (effect.kind === "ancestorGlory" && area.ancestorGlory) {
      const { ancestorGlory: _immunity, ...rest } = area;
      void _immunity;
      return { ...rest, endTurnAncestorCleanse: true as const };
    }
    if (effect.kind === "invokingAbyss" && area.invokingAbyss)
      return { ...area, invokingAbyssStress: effect.stress };
    if (effect.kind === "feelingThePresence" && area.feelingThePresence)
      return { ...area, feelingThePresenceStressPerNegativeQuirk: effect.stressPerNegativeQuirk };
    if (effect.kind === "hallOfAscension" && area.hallOfAscension)
      return { ...area, hallOfAscensionStress: effect.stress };
    if (effect.kind === "eldritchVault" && area.eldritchVaultTrinkets)
      return { ...area, eldritchVaultPayBeforeDraw: true as const };
    if (effect.kind === "toxicVapors" && area.toxicVapors)
      return { ...area, endTurnToxicBlight: { amount: effect.blight, duration: effect.duration } };
    if (effect.kind === "eldritchPower" && area.eldritchPower)
      return { ...area, eldritchPowerDamage: effect.damage };
    if (effect.kind === "teleporters" && area.teleporter)
      return { ...area, teleporterStress: effect.stress };
    if (effect.kind === "riteOfTheChosen" && area.riteOfTheChosen)
      return {
        ...area,
        riteOfTheChosenStygian: {
          stress: effect.stress,
          woundsPerNegativeQuirk: effect.woundsPerNegativeQuirk,
        },
      };
    if (effect.kind === "unholyAura" && area.healingForbidden)
      return { ...area, endTurnWoundsPerHeroLevel: effect.endTurnWoundsPerHeroLevel };
    if (effect.kind === "poolOfRebirth" && area.poolOfRebirth)
      return {
        ...area,
        poolOfRebirth: {
          stressPerNegativeQuirk: effect.endTurnStressPerNegativeQuirk,
          healPerNegativeQuirk: effect.endTurnHealPerNegativeQuirk,
        },
      };
    if (effect.kind === "evilEye") {
      if (area.evilGaze) return { ...area, evilGazeDisease: effect.diseaseAfterNegativeQuirk };
      if (area.staringEyes) return { ...area, staringEyesStress: effect.staringEyesStress };
    }
    return area;
  });
}
