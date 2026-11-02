import type { ApplyResult, GameState } from "./command";
import {
  createBattleState,
  rejectBattleCommand,
  type BattleArea,
  type BattleEntity,
} from "./battle";
import { createLootState } from "./loot";
import type { DarkestMonsterPoolFile } from "../../data/src/darkest-monster-pool";
import type { MonsterCardView } from "./monster-skill";
import { skillBelongsToFormalHero } from "./formal-roster-catalog";
import { heroSkillSlotCount } from "./hero-loadout";
import { ownedHeroSkills } from "./hero-loadout";
import { statusProjection } from "./status";
import type { SpawnPlacement } from "./spawn";
import type { DungeonState } from "./dungeon";
import { isDarkestQuest } from "./darkest-setup";
import { darkestOrdinaryDeploymentMatches } from "./darkest-ordinary-monster-deploy";

const SKELETON_STANCE_AREAS = {
  hero: {
    aggressive: "darkest-ordinary-hero-aggressive",
    defensive: "darkest-ordinary-hero-defensive",
    ranged: "darkest-ordinary-hero-ranged",
    support: "darkest-ordinary-hero-support",
  },
  monster: {
    aggressive: "darkest-ordinary-aggressive",
    defensive: "darkest-ordinary-defensive",
    ranged: "darkest-ordinary-ranged",
    support: "darkest-ordinary-support",
  },
} as const;

function skeletonBattleAreas(): BattleArea[] {
  const ids = [
    ...new Set([
      ...Object.values(SKELETON_STANCE_AREAS.hero),
      ...Object.values(SKELETON_STANCE_AREAS.monster),
    ]),
  ];
  return ids.map((id, index) => ({
    id,
    capacity: 4,
    elevation: "normal" as const,
    adjacent: [ids[index - 1], ids[index + 1]].filter(Boolean) as string[],
  }));
}

function readMonsterDodge(card: MonsterCardView & { readonly dodge?: number }): number | undefined {
  if (Number.isSafeInteger(card.dodge) && card.dodge! >= 0) return card.dodge!;
  const printed = card.header_unlabeled_numbers?.find(
    (entry) => entry.anchor.type === "beside_icon" && entry.anchor.inside_icon?.key === "dodge",
  )?.numeric;
  return Number.isSafeInteger(printed) && printed! >= 0 ? printed! : undefined;
}

function spawnDeployedMonster(
  spawn: SpawnPlacement,
  monsters: readonly MonsterCardView[],
  pool: DarkestMonsterPoolFile,
  refuse: (message: string) => ApplyResult,
): BattleEntity | ApplyResult {
  const card = monsters.find((entry) => entry.id === spawn.cardId) as
    (MonsterCardView & { readonly dodge?: number; readonly life?: number }) | undefined;
  if (!card || !("skills" in card) || card.life === undefined)
    return refuse(`${spawn.cardId} 缺少 Life 或战斗目录条目，不能伪造最暗普通部署（R-048）`);
  const poolCard = pool.cards.find((entry) => entry.combatCardId === spawn.cardId);
  if (poolCard?.battleReady)
    return refuse(`${spawn.cardId} 的完整战斗字段尚未批准，battleReady 仍为 false（R-048）`);
  const dodge = readMonsterDodge(card);
  if (dodge === undefined) return refuse(`${spawn.cardId} 缺少已核实 Dodge，保留 hold（R-048）`);
  return {
    id: spawn.instanceId,
    side: "monster",
    hero: null,
    monsterCardId: card.id,
    life: card.life,
    dodge,
    areaId: spawn.areaId,
    stance: spawn.stance,
    stanceSlots: spawn.stanceSlots,
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
}

function buildHeroEntities(
  state: GameState,
  refuse: (message: string) => ApplyResult,
): BattleEntity[] | ApplyResult {
  const d = state.dungeon!;
  const { heroStats: stats, skills, monsters: _monsters } = d.battleCatalog!;
  void _monsters;
  const heroes: BattleEntity[] = [];
  for (const hero of d.heroes) {
    const stat = stats.find((entry) => entry.id === hero.heroStatId);
    const selected = hero.skillIds?.map((id) => skills.find((skill) => skill.id === id));
    const slots = heroSkillSlotCount(stat?.level ?? 0);
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
      return refuse(`${hero.id} 缺少获批属性或有效装备技能，不能进入最暗普通遭遇（R-048、R-051）`);
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
      areaId: SKELETON_STANCE_AREAS.hero[hero.stance],
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

function roomLabel(d: DungeonState): string {
  const cardId = d.roomCards?.active?.cardId;
  const card = d.roomCards?.cards.find((entry) => entry.id === cardId);
  return card?.name ?? d.position;
}

/** R36/R-048：ordinaryDeployment 已记录 → inBattle 占位 BattleState；须再显式 startBattle 洗先攻。 */
export function deployDarkestOrdinaryEncounter(state: GameState): ApplyResult {
  const d = state.dungeon;
  const deployment = d?.darkest?.ordinaryDeployment;
  const refuse = (message: string) => rejectBattleCommand(state, message);
  const room = d?.rooms.find((entry) => entry.id === d.position);
  if (
    !d?.darkest ||
    !deployment ||
    !darkestOrdinaryDeploymentMatches(d) ||
    !isDarkestQuest(d.questDistribution?.questId) ||
    room?.kind === "objective" ||
    d.darkest.bossDeployment?.roomId === d.position ||
    d.pending ||
    d.phase !== "awaitingRoom" ||
    state.battle ||
    !d.battleCatalog ||
    d.heroes.length !== 4 ||
    d.heroes.some((hero) => hero.dead) ||
    d.roomCards?.active?.roomId !== d.position
  )
    return refuse(
      "须在已记录最暗普通 26 牌堆部署的非目标房 awaitingRoom 执行 deployDarkestOrdinaryEncounter（R36）",
    );
  const monsters = d.battleCatalog.monsters;
  const pool = d.darkest.monsterPool;
  const spawned: BattleEntity[] = [];
  for (const placement of deployment.monsters) {
    const entity = spawnDeployedMonster(placement, monsters, pool, refuse);
    if ("events" in entity) return entity;
    spawned.push(entity);
  }
  const heroes = buildHeroEntities(state, refuse);
  if (!Array.isArray(heroes)) return heroes;
  const geometryNote =
    "专属 Room Tile 几何与 Speed/选招仍 hold；使用 darkest-ordinary-* 占位区域（R-048）";
  try {
    const battle = createBattleState(state.seed, {
      roomName: roomLabel(d),
      ...(d.trinkets ? { trinkets: d.trinkets } : {}),
      ...(d.conditions ? { conditions: d.conditions } : {}),
      heroStats: d.battleCatalog.heroStats,
      entities: [...heroes, ...spawned],
      skills: d.battleCatalog.skills,
      monsters,
      areas: skeletonBattleAreas(),
      light: d.explorationSetup?.light ?? 4,
      provisions: d.explorationSetup?.provisions ?? [],
      resolveCards: d.resolveCards,
      lootPool: { ...(d.lootPool ?? createLootState()), gold: d.gold },
      provisionWindows: true,
    }).battle!;
    return {
      state: {
        ...state,
        dungeon: {
          ...d,
          phase: "inBattle",
          roomCards: {
            ...d.roomCards!,
            active: {
              ...d.roomCards!.active!,
              blockedReason: `${deployment.blockedReason}；已 deployDarkestOrdinaryEncounter，等待 startBattle（battleReady: false）`,
            },
          },
        },
        battle: {
          ...battle,
          rngCursor: d.cursor,
          choiceCursor: d.decision,
          resolveDecks: d.resolveDecks,
        },
      },
      events: [
        {
          type: "dungeonUpdated",
          message: `${geometryNote}；已登记 ${spawned.length} 枚最暗普通怪物实体，等待 startBattle，不宣称技能已可玩（R36、R-048）`,
        },
      ],
    };
  } catch (error) {
    return refuse(
      `最暗普通遭遇开战交接无效：${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function darkestOrdinaryCombatActive(state: GameState): boolean {
  const d = state.dungeon;
  if (!d?.darkest?.ordinaryDeployment || d.phase !== "inBattle" || !state.battle) return false;
  return darkestOrdinaryDeploymentMatches(d);
}
