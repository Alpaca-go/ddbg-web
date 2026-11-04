import geometry from "../../../data/normalized/corebox/room_tile_geometry.json";
import { templarsRoomSchema } from "../../../data/src/normalize/templars-room";
import { roomCatalogSchema } from "../../../data/src/room";
import { createBattleState, rejectBattleCommand } from "../battle";
import type { BattleEntity } from "../battle";
import type { ApplyResult, GameState } from "../command";
import { roomTileBattleAreas } from "../battle-monster-movement";
import { skillBelongsToFormalHero } from "../formal-roster-catalog";
import { ownedHeroSkills, questHeroSkillCount } from "../hero-loadout";
import { statusProjection } from "../status";
import { createLootState } from "../loot";
import { readDarkestBossEncounter } from "./darkest-content";
import { DARKEST_TEMPLARS_SCRIPT_ID } from "./darkest-mid-boss-scripts";
import {
  TEMPLAR_IMPALER_MONSTER_CARD_ID,
  TEMPLAR_WARLORD_MONSTER_CARD_ID,
} from "./darkest-templars-skills-acc";
import type { StoredDarkestBossEncounterPlan } from "./darkest-mid-boss-runtime";
import type { MonsterCardView } from "../monster-skill";

const ROOM_CARD_ID = "room:p022";
const TILE_ID = "room_tile:p013:front";

function readMonsterDodge(card: MonsterCardView & { readonly dodge?: number }): number | undefined {
  if (Number.isSafeInteger(card.dodge) && card.dodge! >= 0) return card.dodge!;
  const printed = card.header_unlabeled_numbers?.find(
    (entry) => entry.anchor.type === "beside_icon" && entry.anchor.inside_icon?.key === "dodge",
  )?.numeric;
  return Number.isSafeInteger(printed) && printed! >= 0 ? printed! : undefined;
}

function buildHeroEntities(
  state: GameState,
  refuse: (message: string) => ApplyResult,
  areas: Record<NonNullable<BattleEntity["stance"]>, string>,
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
      return refuse(`${hero.id} 缺少获批属性或有效装备技能，不能部署 Templars（R-048、R-051）`);
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

function templarsPlanMatches(
  d: NonNullable<GameState["dungeon"]>,
): StoredDarkestBossEncounterPlan | undefined {
  const plan = d.darkest?.bossEncounterPlan;
  if (
    !plan ||
    plan.questId !== "quest:p017" ||
    plan.resolvedScriptId !== DARKEST_TEMPLARS_SCRIPT_ID ||
    plan.roomCardId !== ROOM_CARD_ID
  )
    return undefined;
  return plan;
}

/** R-162 / R-180：quest:p017 Templars 真实十四区部署；对标 R-178，不经占位 darkest-mid-boss-*。 */
export function deployTemplarsI(state: GameState): ApplyResult {
  const d = state.dungeon;
  const plan = d ? templarsPlanMatches(d) : undefined;
  const active = d?.roomCards?.active;
  const room = d?.rooms.find((r) => r.id === d.position);
  const refuse = (message: string) => rejectBattleCommand(state, message);
  if (
    !d?.darkest ||
    !plan ||
    state.battle ||
    d.phase !== "awaitingRoom" ||
    d.pending ||
    d.mustLeaveRoomId === d.position ||
    room?.kind !== "objective" ||
    room.cleared ||
    d.questDistribution?.questId !== "quest:p017" ||
    d.darkest.bossDeployment ||
    !Number.isSafeInteger(d.cursor) ||
    d.cursor < 0 ||
    !Number.isSafeInteger(d.decision) ||
    d.decision < 0 ||
    active?.roomId !== d.position ||
    active.cardId !== ROOM_CARD_ID ||
    active.tileId !== undefined ||
    !d.battleCatalog ||
    !d.explorationSetup ||
    d.heroes.length !== 4 ||
    d.heroes.some((hero) => hero.dead) ||
    new Set(d.heroes.map((h) => h.stance)).size !== 4
  )
    return refuse("需要已绑定 Templars 专属目标房、bossEncounterPlan 与四英雄（R-180）");
  const encounter = readDarkestBossEncounter("quest:p017");
  if (!encounter) return refuse("Templars 内容目录缺失（R-048）");
  const card = d.roomCards!.cards.find((c) => c.id === active.cardId);
  const tile = templarsRoomSchema.safeParse(geometry.tiles.find((t) => t.roomId === active.cardId));
  if (
    !roomCatalogSchema.safeParse(d.roomCards!.cards).success ||
    !card?.boss ||
    card.name !== "Templars Room" ||
    card.location !== "darkestDungeon" ||
    !tile.success ||
    tile.data.usable !== false
  )
    return refuse("Templars Room 身份或 R-162 获批几何无效（R-180）");
  const monsters = d.battleCatalog.monsters;
  const deployment = tile.data.deployment;
  const spawned: BattleEntity[] = [];
  for (const [index, actor] of encounter.actors.entries()) {
    const bossCard = monsters.find((entry) => entry.id === actor.cardId) as
      (MonsterCardView & { readonly life?: number; readonly dodge?: number }) | undefined;
    if (
      !bossCard ||
      !("skills" in bossCard) ||
      !Number.isSafeInteger(bossCard.life) ||
      bossCard.life! <= 0
    )
      return refuse(`${actor.cardId} 缺少 Life 或战斗目录条目（R-048）`);
    const dodge = readMonsterDodge(bossCard);
    if (dodge === undefined) return refuse(`${actor.cardId} 缺少已核实 Dodge（R-048）`);
    spawned.push({
      id: `darkest-mid-boss:quest:p017:${index}`,
      side: "monster",
      hero: null,
      monsterCardId: bossCard.id,
      life: bossCard.life!,
      dodge,
      areaId: deployment.monsters[actor.stance],
      stance: actor.stance,
      stanceSlots: 2,
      wounds: 0,
      skillIds: [],
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
      ...(bossCard.innateProtection === undefined
        ? {}
        : {
            innateProtection: bossCard.innateProtection,
            protection: bossCard.innateProtection,
          }),
    });
  }
  if (
    spawned.length !== 2 ||
    !spawned.some((e) => e.monsterCardId === TEMPLAR_IMPALER_MONSTER_CARD_ID && e.areaId === "M") ||
    !spawned.some((e) => e.monsterCardId === TEMPLAR_WARLORD_MONSTER_CARD_ID && e.areaId === "C")
  )
    return refuse("Templars 须按目录部署 Impaler 与 Warlord（R-162、R-180）");
  const heroes = buildHeroEntities(state, refuse, deployment.heroes);
  if (!Array.isArray(heroes)) return heroes;
  try {
    const b = createBattleState(state.seed, {
      roomName: card.name,
      heroStats: d.battleCatalog.heroStats,
      skills: d.battleCatalog.skills,
      monsters,
      entities: [...heroes, ...spawned],
      areas: roomTileBattleAreas(tile.data),
      monsterStanceAreas: deployment.monsters,
      light: d.explorationSetup.light,
      provisions: d.explorationSetup.provisions,
      resolveCards: d.resolveCards,
      ...(d.conditions ? { conditions: d.conditions } : {}),
      ...(d.trinkets ? { trinkets: d.trinkets } : {}),
      lootPool: { ...(d.lootPool ?? createLootState()), gold: d.gold },
      provisionWindows: true,
    }).battle!;
    const message =
      "Templars 已按 R-180 部署：Impaler 进攻/M、Warlord 远程/C，四英雄按 R-162 姿态区；等待显式 startBattle 洗先攻（combatReady: true）。";
    return {
      state: {
        ...state,
        dungeon: {
          ...d,
          phase: "inBattle",
          roomCards: {
            ...d.roomCards!,
            active: { ...active, tileId: TILE_ID, blockedReason: message },
          },
        },
        battle: {
          ...b,
          rngCursor: d.cursor,
          choiceCursor: d.decision,
          resolveDecks: d.resolveDecks,
        },
      },
      events: [{ type: "dungeonUpdated", message }],
    };
  } catch (error) {
    return refuse(`Templars 部署无效：${error instanceof Error ? error.message : String(error)}`);
  }
}

export function templarsProductionCombatActive(state: GameState): boolean {
  const d = state.dungeon;
  if (!d?.darkest || d.phase !== "inBattle" || !state.battle) return false;
  const active = d.roomCards?.active;
  return (
    d.questDistribution?.questId === "quest:p017" &&
    templarsPlanMatches(d) !== undefined &&
    active?.roomId === d.position &&
    active.cardId === ROOM_CARD_ID &&
    active.tileId === TILE_ID &&
    !d.darkest.bossDeployment
  );
}
