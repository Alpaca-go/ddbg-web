import geometry from "../../../data/normalized/corebox/room_tile_geometry.json";
import { fanaticRoomSchema } from "../../../data/src/normalize/fanatic-room";
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
import { RUINS_COMBAT_LEVELS } from "./ruins-combat-levels";

const ROMAN = { 1: "I", 2: "II", 3: "III" } as const;

function buildHeroEntities(
  state: GameState,
  refuse: (message: string) => ApplyResult,
  areas: Record<NonNullable<BattleEntity["stance"]>, string>,
  label: string,
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
      return refuse(`${hero.id} 缺少获批属性或有效装备技能，不能部署 ${label}（R-048、R-051）`);
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

export function deployFanaticI(state: GameState): ApplyResult {
  return deployFanatic(state, 1);
}
export function deployFanaticII(state: GameState): ApplyResult {
  return deployFanatic(state, 2);
}
export function deployFanaticIII(state: GameState): ApplyResult {
  return deployFanatic(state, 3);
}

function deployFanatic(state: GameState, level: 1 | 2 | 3): ApplyResult {
  const row = RUINS_COMBAT_LEVELS.fanatic[(level - 1) as 0 | 1 | 2];
  const scriptId = row.script;
  const descriptionId = row.description;
  const bossCardId = row.card;
  const pyreCardId = row.pyre;
  const bossName = `Fanatic ${ROMAN[level]}`;
  const ruling = level === 1 ? "R-178" : "R-136 / R-169 几何 / R-178 模式";
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
    d.campaignLevel !== level ||
    d.questDistribution?.questId !== "quest:p019" ||
    d.activeBossThreatScriptId !== scriptId ||
    d.imminentThreatDescriptionCardId !== descriptionId ||
    plan?.questId !== "quest:p019" ||
    plan.resolvedScriptId !== scriptId ||
    plan.roomPlacement !== "edgeRoomsR30" ||
    active?.roomId !== d.position ||
    active.cardId !== "room:p013" ||
    active.tileId !== undefined ||
    !d.battleCatalog ||
    !d.explorationSetup ||
    d.explorationSetup.dungeonLevel !== level ||
    d.heroes.length !== 4 ||
    new Set(d.heroes.map((h) => h.stance)).size !== 4
  )
    return refuse(`需要已绑定 ${bossName} 专属目标房、真实出征计划和四英雄（${ruling}）`);
  const id = resolveBossScriptIdForQuest("quest:p019", d);
  const entry = id ? getBossScript(id)?.combatEntry : undefined;
  if (
    id !== scriptId ||
    !entry ||
    (Object.keys(entry) as (keyof typeof entry)[]).some((k) => entry[k] !== plan.combatEntry[k])
  )
    return refuse(`${bossName} 出征战斗卡与实际威胁不一致（R30、R39、${ruling}）`);
  const card = d.roomCards!.cards.find((c) => c.id === active.cardId);
  const tile = fanaticRoomSchema.safeParse(geometry.tiles.find((t) => t.roomId === active.cardId));
  if (
    !roomCatalogSchema.safeParse(d.roomCards!.cards).success ||
    !card?.boss ||
    card.name !== "Fanatic Room" ||
    card.location !== "ruins" ||
    !tile.success
  )
    return refuse("Fanatic Room 身份或获批几何无效（R-169、R-178）");
  const monsters = d.battleCatalog.monsters;
  const boss = monsters.find((c) => c.id === bossCardId);
  const pyre = monsters.find((c) => c.id === pyreCardId);
  if (
    !boss ||
    !pyre ||
    boss.verification.unverified ||
    pyre.verification.unverified ||
    !Number.isSafeInteger(boss.life) ||
    boss.life! <= 0 ||
    !Number.isSafeInteger(pyre.life) ||
    pyre.life! <= 0
  )
    return refuse(`缺少 ${bossName} 或 Pyre 真实战斗卡（R39、R-048）`);
  const dodge = boss.header_unlabeled_numbers?.find(
    (n) => n.anchor.type === "beside_icon" && n.anchor.inside_icon?.key === "dodge",
  )?.numeric;
  if (!Number.isSafeInteger(dodge) || dodge! < 0)
    return refuse(`${bossName} 缺少已核实 Dodge（R-048）`);
  const heroes = buildHeroEntities(state, refuse, tile.data.deployment.heroes, bossName);
  if (!Array.isArray(heroes)) return heroes;
  const deployment = tile.data.deployment;
  try {
    const b = createBattleState(state.seed, {
      roomName: card.name,
      heroStats: d.battleCatalog.heroStats,
      skills: d.battleCatalog.skills,
      monsters,
      entities: [
        ...heroes,
        {
          id: `boss:fanatic:${level}`,
          side: "monster",
          hero: null,
          monsterCardId: boss.id,
          life: boss.life!,
          dodge: dodge!,
          stance: "aggressive",
          stanceSlots: 2,
          shuffleResist: (boss.resistances ?? []).some((icon) => icon.key === "shuffle_resist"),
          areaId: deployment.monsters.aggressive,
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
    const message = `${bossName} 已按 ${ruling} 部署：Boss 进攻姿态/B，四英雄按 R-169 姿态区部署；Pyre 由 startBattle 写入远程/E；等待显式 startBattle 洗先攻。`;
    return {
      state: {
        ...state,
        dungeon: {
          ...d,
          phase: "inBattle",
          roomCards: {
            ...d.roomCards!,
            active: { ...active, tileId: tile.data.id, blockedReason: message },
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
  } catch (e) {
    return refuse(`${bossName} 部署无效：` + (e instanceof Error ? e.message : String(e)));
  }
}
