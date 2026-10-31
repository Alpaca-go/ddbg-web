import type { ApplyResult, GameState } from "../command";
import {
  createBattleState,
  rejectBattleCommand,
  type BattleArea,
  type BattleEntity,
  type BattleState,
} from "../battle";
import { createLootState } from "../loot";
import type { SkillStance } from "../hero-skill";
import type { SkillTargetSide } from "../hero-skill";
import type { MonsterCardView } from "../monster-skill";
import { skillBelongsToFormalHero } from "../formal-roster-catalog";
import { heroSkillSlotCount } from "../hero-loadout";
import { ownedHeroSkills } from "../hero-loadout";
import { statusProjection } from "../status";
import type { SpawnPlacement } from "../spawn";
import { readDarkestBossEncounter } from "./darkest-content";
import { readBossCombatEntry } from "./combat-entry";
import { resolveEncounterBossScriptId } from "./encounter-rules";
import { getBossScript } from "./registry";
import {
  darkestBossDeploymentMatchesPlan,
  type StoredDarkestBossEncounterPlan,
} from "./darkest-mid-boss-runtime";
import {
  DARKEST_MAMMOTH_CYST_SCRIPT_ID,
  DARKEST_SHUFFLING_HORROR_SCRIPT_ID,
  DARKEST_TEMPLARS_SCRIPT_ID,
  readDarkestMidBossRequiredCombatCardIds,
} from "./darkest-mid-boss-scripts";

const MID_BOSS_SCRIPT_IDS = new Set([
  DARKEST_SHUFFLING_HORROR_SCRIPT_ID,
  DARKEST_TEMPLARS_SCRIPT_ID,
  DARKEST_MAMMOTH_CYST_SCRIPT_ID,
]);

const SKELETON_STANCE_AREAS = {
  hero: {
    aggressive: "darkest-mid-boss-hero-aggressive",
    defensive: "darkest-mid-boss-hero-defensive",
    ranged: "darkest-mid-boss-hero-ranged",
    support: "darkest-mid-boss-hero-support",
  },
  monster: {
    aggressive: "darkest-mid-boss-aggressive",
    defensive: "darkest-mid-boss-defensive",
    ranged: "darkest-mid-boss-ranged",
    support: "darkest-mid-boss-support",
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
  encounter: NonNullable<ReturnType<typeof readDarkestBossEncounter>>,
  refuse: (message: string) => ApplyResult,
): BattleEntity | ApplyResult {
  const card = monsters.find((entry) => entry.id === spawn.cardId) as
    | (MonsterCardView & { readonly dodge?: number; readonly life?: number })
    | undefined;
  if (!card || !("skills" in card) || card.life === undefined)
    return refuse(`${spawn.cardId} 缺少 Life 或战斗目录条目，不能伪造 Boss 部署（R-048）`);
  if (encounter.combatReady)
    return refuse(`${spawn.cardId} 的完整战斗字段尚未批准，combatReady 仍为 false（R-048）`);
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

function buildHeroEntities(state: GameState, refuse: (message: string) => ApplyResult): BattleEntity[] | ApplyResult {
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
      return refuse(`${hero.id} 缺少获批属性或有效装备技能，不能进入最暗 Boss 战（R-048、R-051）`);
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

function roomLabel(plan: StoredDarkestBossEncounterPlan): string {
  if (plan.roomCardId === "room:p023") return "Shuffling Horror Room";
  if (plan.roomCardId === "room:p022") return "Templars Room";
  if (plan.roomCardId === "room:p024") return "Mammoth Cyst Room";
  return plan.roomCardId;
}

/** R36/R-048：bossDeployment 已记录 → inBattle 占位 BattleState；须再显式 startBattle 洗先攻。 */
export function deployDarkestMidBoss(state: GameState): ApplyResult {
  const d = state.dungeon;
  const plan = d?.darkest?.bossEncounterPlan;
  const deployment = d?.darkest?.bossDeployment;
  const refuse = (message: string) => rejectBattleCommand(state, message);
  if (
    !d?.darkest ||
    !plan ||
    !deployment ||
    !darkestBossDeploymentMatchesPlan(d, plan) ||
    deployment.roomId !== d.position ||
    d.pending ||
    d.phase !== "awaitingRoom" ||
    state.battle ||
    !d.battleCatalog ||
    d.heroes.length !== 4 ||
    d.heroes.some((hero) => hero.dead) ||
    d.roomCards?.active?.roomId !== d.position ||
    d.roomCards.active.cardId !== plan.roomCardId
  )
    return refuse("须在已记录最暗 Boss 部署的目标房 awaitingRoom 执行 deployDarkestMidBoss（R36）");
  const encounter = readDarkestBossEncounter(plan.questId);
  if (!encounter) return refuse("最暗 Boss 内容目录缺失（R36）");
  const monsters = d.battleCatalog.monsters;
  const spawned: BattleEntity[] = [];
  for (const placement of [...deployment.monsters, ...deployment.supportMonsters]) {
    const entity = spawnDeployedMonster(placement, monsters, encounter, refuse);
    if ("events" in entity) return entity;
    spawned.push(entity);
  }
  const heroes = buildHeroEntities(state, refuse);
  if (!Array.isArray(heroes)) return heroes;
  const geometryNote =
    "专属 Room Tile 几何与印刷部署仍 hold；使用 darkest-mid-boss-* 占位区域（R-048）";
  try {
    const battle = createBattleState(state.seed, {
      roomName: roomLabel(plan),
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
              blockedReason: `${deployment.blockedReason}；已 deployDarkestMidBoss，等待 startBattle（combatReady: false）`,
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
          message: `${geometryNote}；已登记 ${plan.resolvedScriptId} 实体，等待 startBattle，不宣称 Boss 技能已可玩（R36、R-048）`,
        },
      ],
    };
  } catch (error) {
    return refuse(`最暗 Boss 开战交接无效：${error instanceof Error ? error.message : String(error)}`);
  }
}

/** combatEntry.printedInitiativeCards 仅计 actors；支持怪仍各占 1 张实体先攻。 */
export function expandDarkestMidBossInitiativeDeckSides(
  deck: readonly SkillTargetSide[],
  battle: BattleState,
  state: GameState,
): SkillTargetSide[] {
  const scriptId = resolveEncounterBossScriptId(state);
  if (!scriptId || !(MID_BOSS_SCRIPT_IDS as ReadonlySet<string>).has(scriptId)) return [...deck];
  const script = getBossScript(scriptId);
  const entry = script ? readBossCombatEntry(script) : undefined;
  if (!entry) return [...deck];
  const questId = state.dungeon?.darkest?.bossEncounterPlan?.questId;
  if (!questId) return [...deck];
  const actorIds = new Set(readDarkestMidBossRequiredCombatCardIds(questId));
  const actorMonsterSides = battle.entities.filter(
    (entity) =>
      entity.side === "monster" &&
      !entity.dead &&
      entity.monsterCardId &&
      actorIds.has(entity.monsterCardId),
  ).length;
  const extra = entry.printedInitiativeCards - actorMonsterSides;
  if (extra <= 0) return [...deck];
  return [...deck, ...Array.from({ length: extra }, (): SkillTargetSide => "monster")];
}

export function darkestMidBossCombatActive(state: GameState): boolean {
  const d = state.dungeon;
  if (!d?.darkest?.bossDeployment || d.phase !== "inBattle" || !state.battle) return false;
  const plan = d.darkest.bossEncounterPlan;
  return plan !== undefined && darkestBossDeploymentMatchesPlan(d, plan);
}
