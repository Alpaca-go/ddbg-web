import type { ApplyResult, GameState } from "../command";
import {
  createBattleState,
  rejectBattleCommand,
  type BattleArea,
  type BattleEntity,
  type BattleState,
} from "../battle";
import { roomTileBattleAreas } from "../battle-monster-movement";
import { createLootState } from "../loot";
import type { SkillStance } from "../hero-skill";
import type { MonsterCardView } from "../monster-skill";
import { skillBelongsToFormalHero } from "../formal-roster-catalog";
import { heroSkillSlotCount } from "../hero-loadout";
import { ownedHeroSkills } from "../hero-loadout";
import { statusProjection } from "../status";
import { readFinalFormSequence } from "./final-form-sequence";
import {
  isAncestor1ReflectionMonsterCardId,
  withAncestor1ReflectionsGuardState,
} from "./ancestor1-reflections-guard";
import { readFinalBattlePlanAfterDarkestVictory } from "./darkest-content";
import {
  appendAbsoluteNothingnessSupportEntities,
} from "./ancestor2-absolute-nothingness";
import roomCatalog from "../../../data/normalized/corebox/room_tile_geometry.json";
import roomCards from "../../../data/normalized/corebox/room.json";
import { roomFileSchema } from "../../../data/src/room";
import { roomTileGeometryFileSchema } from "../../../data/src/normalize/room-tile";

/** Ancestor Room（room:p025）板块几何与印刷部署未获批；占位区域不绑定 ancestorGlory 或已批 map（R-048）。 */
const SKELETON_STANCE_AREAS = {
  hero: {
    aggressive: "final-hero-aggressive",
    defensive: "final-hero-defensive",
    ranged: "final-hero-ranged",
    support: "final-hero-support",
  },
  monster: {
    aggressive: "final-monster-aggressive",
    defensive: "final-monster-defensive",
    ranged: "final-monster-ranged",
    support: "final-monster-support",
  },
} as const;

/** 与 `deployFinalBattleForm` 占位几何一致；Ancestor Room 未批时 Summon 等同使用（R-048）。 */
export const FINAL_BATTLE_MONSTER_STANCE_AREAS = SKELETON_STANCE_AREAS.monster;

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

function stanceSlots(card: MonsterCardView): 1 | 2 {
  return card.id.startsWith("monster_large:") ? 2 : 1;
}

function readApprovedAncestorRoomAreas(): BattleArea[] | undefined {
  const cards = roomFileSchema.parse(roomCards).cards;
  const card = cards.find((entry) => entry.id === "room:p025");
  const catalog = roomTileGeometryFileSchema.parse(roomCatalog);
  if (!card) return undefined;
  const matches = catalog.tiles.filter(
    (tile) =>
      tile.roomId === card.id &&
      tile.location === card.location &&
      tile.number === card.number &&
      tile.geometryVerified &&
      tile.deployment?.printReview === "verified" &&
      !tile.unresolvedMarkers.length &&
      tile.usable,
  );
  if (matches.length !== 1) return undefined;
  return [...roomTileBattleAreas(matches[0]!)];
}

function spawnFormMonsters(
  form: NonNullable<ReturnType<typeof readFinalFormSequence>>["current"],
  monsters: readonly MonsterCardView[],
  refuse: (message: string) => ApplyResult,
): BattleEntity[] | ApplyResult {
  if (!form) return refuse("当前最终战形态缺失（R36）");
  const spawned: BattleEntity[] = [];
  const spawnOne = (
    cardId: string,
    stance: SkillStance,
    id: string,
  ): ApplyResult | BattleEntity => {
    const card = monsters.find((entry) => entry.id === cardId) as
      (MonsterCardView & { readonly dodge?: number }) | undefined;
    if (!card || !("skills" in card) || card.life === undefined)
      return refuse(`${cardId} 缺少 Life 或战斗目录条目，不能伪造 Boss 部署（R-048）`);
    if (form.combatReady)
      return refuse(`${cardId} 的完整战斗字段尚未批准，combatReady 仍为 false（R-048）`);
    const dodge = readMonsterDodge(card);
    if (dodge === undefined) return refuse(`${cardId} 缺少已核实 Dodge，保留 hold（R-048）`);
    const reflectionsGuard = form.id === "ancestor1" && isAncestor1ReflectionMonsterCardId(card.id);
    return {
      id,
      side: "monster",
      hero: null,
      monsterCardId: card.id,
      life: card.life,
      dodge,
      areaId: SKELETON_STANCE_AREAS.monster[stance!],
      stance,
      stanceSlots: stanceSlots(card),
      wounds: 0,
      skillIds: [],
      guard: reflectionsGuard,
      dead: false,
      bleed: [],
      blight: [],
      ...(reflectionsGuard ? { statusStacks: [] as const } : {}),
      ...(card.innateProtection === undefined
        ? {}
        : { innateProtection: card.innateProtection, protection: card.innateProtection }),
    };
  };
  const actor = spawnOne(form.actor.cardId, form.actor.stance, `final-${form.id}-actor`);
  if ("events" in actor) return actor;
  spawned.push(actor);
  const usedStances = new Set<SkillStance>([form.actor.stance]);
  const fallbackStances: SkillStance[] = ["defensive", "ranged", "support", "aggressive"];
  for (const [index, cardId] of form.supportCardIds.entries()) {
    const stance =
      fallbackStances.find((entry) => !usedStances.has(entry)) ??
      fallbackStances[index % fallbackStances.length]!;
    usedStances.add(stance);
    const support = spawnOne(cardId, stance, `final-${form.id}-support-${index}`);
    if ("events" in support) return support;
    spawned.push(support);
  }
  return spawned;
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
      return refuse(`${hero.id} 缺少获批属性或有效装备技能，不能进入最终战（R-048、R-051）`);
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

/** R36/R-048：awaitingDeployment → fighting；Ancestor Room 几何 hold 时用占位区域与 Boss 骨架实体。 */
export function deployFinalBattleForm(state: GameState): ApplyResult {
  const d = state.dungeon;
  const sequence = readFinalFormSequence(state);
  const refuse = (message: string) => rejectBattleCommand(state, message);
  if (
    !d ||
    d.pending ||
    d.deathTrinketChoice ||
    d.finalBattleProvisions !== "ready" ||
    !sequence?.current ||
    sequence.progress.status !== "awaitingDeployment" ||
    !readFinalBattlePlanAfterDarkestVictory(d) ||
    !d.battleCatalog ||
    d.heroes.length !== 4 ||
    d.heroes.some((hero) => hero.dead)
  )
    return refuse("须在完成最终战补给与形态流程后，于 awaitingDeployment 部署当前形态（R36）");
  if (state.battle && sequence.progress.completedForms.length === 0)
    return refuse("首形态开战前不能保留其它战斗沙盒（R36）");
  const approvedAreas = readApprovedAncestorRoomAreas();
  const areas = approvedAreas ?? skeletonBattleAreas();
  const geometryNote = approvedAreas
    ? "Ancestor Room 已批几何"
    : "Ancestor Room（room:p025）几何与印刷部署仍 hold；使用占位区域，不写入 ancestorGlory（R-048）";
  let monsters: readonly MonsterCardView[] = d.battleCatalog.monsters;
  const spawnedResult = spawnFormMonsters(sequence.current, monsters, refuse);
  if (!Array.isArray(spawnedResult)) return spawnedResult;
  let spawnedMonsters: BattleEntity[] = [...spawnedResult];
  let nothingnessDeployMessage = "";
  if (sequence.current.id === "ancestor2") {
    const draftBattle: BattleState = {
      entities: spawnedMonsters,
      areas,
      skills: d.battleCatalog.skills,
      monsters,
      light: d.explorationSetup?.light ?? 4,
      heroStats: d.battleCatalog.heroStats,
      rngCursor: 0,
      choiceCursor: state.battle?.choiceCursor ?? d.decision,
      monsterAction: null,
      pending: null,
      shuffleIntents: [],
      shuffleContinuation: null,
    };
    const appended = appendAbsoluteNothingnessSupportEntities(draftBattle);
    monsters = appended.monsters;
    spawnedMonsters = appended.entities.filter((entity) => entity.side === "monster");
    if (appended.placed.length)
      nothingnessDeployMessage = `；Absolute Nothingness ${appended.placed.length}/3（${appended.placed.join("、")}；boss_ability:p035）`;
  }

  if (!state.battle) {
    const heroes = buildHeroEntities(state, refuse);
    if (!Array.isArray(heroes)) return heroes;
    try {
      const battle = createBattleState(state.seed, {
        roomName: "Ancestor Room",
        ...(d.trinkets ? { trinkets: d.trinkets } : {}),
        ...(d.conditions ? { conditions: d.conditions } : {}),
        heroStats: d.battleCatalog.heroStats,
        entities: [...heroes, ...spawnedMonsters],
        skills: d.battleCatalog.skills,
        monsters,
        areas,
        light: d.explorationSetup?.light ?? 4,
        provisions: d.explorationSetup?.provisions ?? [],
        resolveCards: d.resolveCards,
        lootPool: { ...(d.lootPool ?? createLootState()), gold: d.gold },
        provisionWindows: true,
      }).battle!;
      return {
        state: withAncestor1ReflectionsGuardState({
          ...state,
          dungeon: {
            ...d,
            phase: "inBattle",
            finalFormSequence: { ...sequence.progress, status: "fighting" },
          },
          battle: {
            ...battle,
            rngCursor: d.cursor,
            choiceCursor: d.decision,
            resolveDecks: d.resolveDecks,
          },
        }),
        events: [
          {
            type: "dungeonUpdated",
            message: `${geometryNote}；已登记 ${sequence.current.id} Boss 实体${nothingnessDeployMessage}，等待 startBattle，不宣称形态技能已可玩（R36、R-048）`,
          },
        ],
      };
    } catch (error) {
      return refuse(
        `最终战开战交接无效：${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const heroes = state.battle.entities.filter((entity) => entity.side === "hero");
  if (heroes.length !== 4 || heroes.some((entity) => entity.dead))
    return refuse("形态间续战须保留四名存活英雄，不休息、不回村（R-035）");
  const {
    encounter: _encounter,
    pending: _pending,
    shuffleIntents: _shuffles,
    ...battleBase
  } = state.battle;
  void _encounter;
  void _pending;
  void _shuffles;
  return {
    state: withAncestor1ReflectionsGuardState({
      ...state,
      dungeon: {
        ...d,
        phase: "inBattle",
        finalFormSequence: { ...sequence.progress, status: "fighting" },
      },
      battle: {
        ...battleBase,
        monsters,
        areas,
        entities: [...heroes, ...spawnedMonsters],
        pending: null,
        shuffleIntents: [],
      },
    }),
    events: [
      {
        type: "dungeonUpdated",
        message: `${geometryNote}；同一 BattleState 续接 ${sequence.current.id}${nothingnessDeployMessage}，清除上一形态怪物并等待 startBattle（R-035、R-048）`,
      },
    ],
  };
}
