import geometry from "../../../data/normalized/corebox/room_tile_geometry.json";
import { collectorRoomSchema } from "../../../data/src/normalize/collector-room";
import { prophetRoomSchema } from "../../../data/src/normalize/prophet-room";
import { roomCatalogSchema } from "../../../data/src/room";
import { createBattleState, rejectBattleCommand } from "../battle";
import type { BattleEntity } from "../battle";
import type { ApplyResult, GameState } from "../command";
import { roomTileBattleAreas } from "../battle-monster-movement";
import { skillBelongsToFormalHero } from "../formal-roster-catalog";
import { ownedHeroSkills, questHeroSkillCount } from "../hero-loadout";
import { statusProjection } from "../status";
import { createLootState } from "../loot";
import { getBossScript } from "./registry";
import { resolveBossScriptIdForQuest } from "./quest-bridge";
import {
  PROPHET_I_SCRIPT_ID,
  PROPHET_I_COMBAT_MONSTER_CARD_ID,
  PROPHET_I_DESCRIPTION_ABILITY_CARD_ID,
} from "./prophet-i";

import {
  COLLECTOR_I_SCRIPT_ID,
  COLLECTOR_I_COMBAT_MONSTER_CARD_ID,
  COLLECTOR_I_DESCRIPTION_ABILITY_CARD_ID,
  collectorCollectedCardIds,
} from "./collector-i";

function buildHeroEntities(
  state: GameState,
  refuse: (message: string) => ApplyResult,
  areas: Record<NonNullable<BattleEntity["stance"]>, string>,
  bossName: string,
): BattleEntity[] | ApplyResult {
  const d = state.dungeon!;
  const { heroStats: stats, skills } = d.battleCatalog!;
  const heroes: BattleEntity[] = [];
  for (const hero of d.heroes) {
    const stat = stats.find((entry) => entry.id === hero.heroStatId);
    const selected = hero.skillIds?.map((id) => skills.find((skill) => skill.id === id));
    const slots = questHeroSkillCount(hero);
    if (
      !stat ||
      !stat.attributesVerified ||
      ![1, 2, 3].includes(stat.level) ||
      hero.level !== stat.level ||
      (hero.heroLevel !== undefined && hero.heroLevel !== stat.level) ||
      hero.life !== stat.life ||
      !hero.stance ||
      hero.dead ||
      hero.wounds === undefined ||
      !selected ||
      selected.length !== slots ||
      new Set(hero.skillIds).size !== slots ||
      selected.some(
        (skill) =>
          !skill ||
          !skillBelongsToFormalHero(stat.name ?? "", skill) ||
          ![1, 2, 3].includes(skill.level) ||
          skill.verification.unverified,
      ) ||
      !ownedHeroSkills(hero, d.battleCatalog!)
    )
      return refuse(`${hero.id} 缺少获批属性或有效装备技能，不能部署 ${bossName}（R-048、R-051）`);
    heroes.push({
      ...hero.combat,
      diseaseId: hero.diseaseId ?? null,
      quirkIds: hero.quirkIds ?? [],
      ...(hero.deathReason ? { deathReason: hero.deathReason } : {}),
      id: hero.id,
      side: "hero",
      hero: stat.name,
      heroStatId: stat.id,
      heroLevel: stat.level,
      life: stat.life,
      skillIds: hero.skillIds!,
      stance: hero.stance,
      areaId: areas[hero.stance],
      wounds: hero.wounds,
      stress: hero.stress,
      dodge: stat.dodge,
      dead: false,
      guard: hero.combat?.guard ?? false,
      bleed: hero.combat?.bleed ?? [],
      blight: hero.combat?.blight ?? [],
      ...(hero.statusStacks
        ? {
            statusStacks: hero.statusStacks,
            ...statusProjection(hero.statusStacks, hero.combat?.innateProtection),
          }
        : {}),
      ...(hero.resolveTested === undefined ? {} : { resolveTested: hero.resolveTested }),
      ...(hero.resolveCardId === undefined ? {} : { resolveCardId: hero.resolveCardId }),
    });
  }
  return heroes;
}

/** R-167/173：只接I级Boss真实几何部署；不开放普通房间选择或修改combatReady。 */
export function deployProphetI(state: GameState): ApplyResult {
  return deployRuinsBossI(state, false);
}

export function deployCollectorI(state: GameState): ApplyResult {
  return deployRuinsBossI(state, true);
}

function deployRuinsBossI(state: GameState, collector: boolean): ApplyResult {
  const scriptId = collector ? COLLECTOR_I_SCRIPT_ID : PROPHET_I_SCRIPT_ID;
  const descriptionId = collector
    ? COLLECTOR_I_DESCRIPTION_ABILITY_CARD_ID
    : PROPHET_I_DESCRIPTION_ABILITY_CARD_ID;
  const monsterId = collector
    ? COLLECTOR_I_COMBAT_MONSTER_CARD_ID
    : PROPHET_I_COMBAT_MONSTER_CARD_ID;
  const roomId = collector ? "room:p012" : "room:p011";
  const roomName = collector ? "Collector Room" : "Prophet Room";
  const bossName = collector ? "Collector I" : "Prophet I";
  const ruling = collector ? "R-175" : "R-173";
  const d = state.dungeon;
  const plan = d?.faceTheThreatEmbarkPlan;
  const active = d?.roomCards?.active;
  const room = d?.rooms.find((r) => r.id === d.position);
  const refuse = (message: string) => rejectBattleCommand(state, message);
  if (
    !d ||
    state.battle ||
    d.phase !== "awaitingRoom" ||
    d.pending ||
    d.mustLeaveRoomId === d.position ||
    room?.kind !== "objective" ||
    room.cleared ||
    !Number.isSafeInteger(d.cursor) ||
    d.cursor < 0 ||
    !Number.isSafeInteger(d.decision) ||
    d.decision < 0 ||
    d.monsterPool?.active ||
    !["standard", "radiant"].includes(d.mode) ||
    d.campaignLevel !== 1 ||
    d.questDistribution?.questId !== "quest:p019" ||
    d.activeBossThreatScriptId !== scriptId ||
    d.imminentThreatDescriptionCardId !== descriptionId ||
    plan?.questId !== "quest:p019" ||
    plan.resolvedScriptId !== scriptId ||
    plan.roomPlacement !== "edgeRoomsR30" ||
    active?.roomId !== d.position ||
    active.cardId !== roomId ||
    active.tileId !== undefined ||
    !d.battleCatalog ||
    !d.explorationSetup ||
    d.heroes.length !== 4 ||
    new Set(d.heroes.map((h) => h.stance)).size !== 4
  )
    return refuse(`需要已绑定${bossName}专属目标房、真实出征计划和四英雄（${ruling}）`);
  const id = resolveBossScriptIdForQuest("quest:p019", d);
  const entry = id ? getBossScript(id)?.combatEntry : undefined;
  if (
    id !== scriptId ||
    !entry ||
    (Object.keys(entry) as (keyof typeof entry)[]).some((k) => entry[k] !== plan.combatEntry[k])
  )
    return refuse(`${bossName}出征战斗卡与实际威胁不一致（R30、${ruling}）`);
  const card = d.roomCards!.cards.find((c) => c.id === active.cardId);
  const rawTile = geometry.tiles.find((t) => t.roomId === active.cardId);
  const collectorTile = collector ? collectorRoomSchema.safeParse(rawTile).data : undefined;
  const prophetTile = collector ? undefined : prophetRoomSchema.safeParse(rawTile).data;
  const tile = collectorTile ?? prophetTile;
  if (
    !roomCatalogSchema.safeParse(d.roomCards!.cards).success ||
    !card?.boss ||
    card.name !== roomName ||
    card.location !== "ruins" ||
    !tile
  )
    return refuse(`${roomName}身份或获批几何无效（${collector ? "R-168/175" : "R-167/173"}）`);
  const monsters = d.battleCatalog.monsters;
  const boss = monsters.find((c) => c.id === monsterId);
  if (!boss || !Number.isSafeInteger(boss.life) || boss.life! <= 0)
    return refuse(`缺少${bossName}真实战斗卡（${collector ? "R39" : "R38"}、R-048）`);
  const dodge = boss.header_unlabeled_numbers?.find(
    (n) => n.anchor.type === "beside_icon" && n.anchor.inside_icon?.key === "dodge",
  )?.numeric;
  if (!Number.isSafeInteger(dodge) || dodge! < 0)
    return refuse(`${bossName}缺少已核实Dodge（R-048）`);
  if (
    collector &&
    (boss.verification.unverified ||
      collectorCollectedCardIds().some(
        (id) =>
          !monsters.some(
            (c) =>
              c.id === id &&
              !c.verification.unverified &&
              Number.isSafeInteger(c.life) &&
              c.life! > 0,
          ),
      ))
  )
    return refuse("Collector I 或 Collected 缺少获批战斗卡（R39、R-048）");
  const heroes = buildHeroEntities(state, refuse, tile.deployment.heroes, bossName);
  if (!Array.isArray(heroes)) return heroes;
  try {
    const b = createBattleState(state.seed, {
      roomName: card.name,
      heroStats: d.battleCatalog.heroStats,
      skills: d.battleCatalog.skills,
      monsters,
      entities: [
        ...heroes,
        {
          id: collector ? "boss:collector:1" : "boss:prophet:1",
          side: "monster",
          hero: null,
          monsterCardId: boss.id,
          life: boss.life!,
          dodge: dodge!,
          stance: "aggressive",
          stanceSlots: 1,
          areaId: tile.deployment.monsters.aggressive,
          wounds: 0,
          skillIds: [],
          guard: false,
          dead: false,
          bleed: [],
          blight: [],
          ...(boss.innateProtection === undefined
            ? {}
            : { innateProtection: boss.innateProtection, protection: boss.innateProtection }),
        },
      ],
      areas: roomTileBattleAreas(tile),
      light: d.explorationSetup.light,
      provisions: d.explorationSetup.provisions,
      resolveCards: d.resolveCards,
      ...(d.conditions ? { conditions: d.conditions } : {}),
      ...(d.trinkets ? { trinkets: d.trinkets } : {}),
      lootPool: { ...(d.lootPool ?? createLootState()), gold: d.gold },
      provisionWindows: true,
    }).battle!;
    const message = collector
      ? "Collector I已按R-175部署，等待开始战斗。"
      : "Prophet I已按R-173部署：Boss进攻姿态/E，英雄按姿态部署C/D/H；等待显式startBattle洗先攻。完整Boss准入与combatReady停点保持。";
    return {
      state: {
        ...state,
        dungeon: {
          ...d,
          phase: "inBattle",
          roomCards: {
            ...d.roomCards!,
            active: { ...active, tileId: tile.id, blockedReason: message },
          },
        },
        battle: {
          ...b,
          ...(collectorTile
            ? {
                collectorRoomLootAreaId: collectorTile.printedLoot.areaId,
                collectorCollectedStanceAreas: collectorTile.deployment.monsters,
              }
            : {
                prophetRoomD10AreaTable: prophetTile!.printedMarkers.map((m) => ({
                  marker: m.printedRange,
                  areaId: m.areaId,
                })),
              }),
          rngCursor: d.cursor,
          choiceCursor: d.decision,
          resolveDecks: d.resolveDecks,
        },
      },
      events: [{ type: "dungeonUpdated", message }],
    };
  } catch (e) {
    return refuse(`${bossName}部署无效：` + (e instanceof Error ? e.message : String(e)));
  }
}
