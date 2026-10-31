import { CORE_TRINKET_IDS } from "./core-trinket-bindings";
import { z } from "zod";
import { basicQuests, type BasicQuestId } from "./basic-quests";
import { HERO_SKILL_TRINKET_IDS } from "./hero-skill-trinkets";

const commandObject = <S extends z.ZodRawShape>(shape: S) =>
  z.strictObject({ ...shape, allTrinkets: z.literal(true).optional() });
const id = z.string().min(1);
const actor = { actorId: id };
const shuffle = z.enum(["push", "pull"]);
const trinketWindow = z
  .union([
    z.literal(true),
    z
      .array(z.enum(HERO_SKILL_TRINKET_IDS))
      .min(1)
      .max(HERO_SKILL_TRINKET_IDS.length)
      .refine((ids) => new Set(ids).size === ids.length),
  ])
  .optional();
const noPayload = commandObject({
  type: z.enum([
    "rollDungeonProvisions",
    "prepareReplacementHero",
    "joinPreparedReplacements",
    "restDungeon",
    "summarizeDungeonQuest",
    "startDungeonBattle",
    "finishDungeonBattle",
    "beginReturnToHamlet",
    "finishReturnToHamlet",
    "drawHamletEvent",
    "offerNextQuest",
    "rollHamletCaretaker",
    "leaveDungeon",
    "scoutDungeon",
    "beginDungeonExploration",
    "beginDungeonBacktrack",
    "rollDungeonExploration",
    "resolveDungeonCurio",
    "prepareDungeonBattle",
    "prepareDungeonMonsters",
    "resolveDungeonRoom",
    "resolveDungeonPressure",
    "startBattle",
    "drawInitiative",
    "resolveShuffles",
  ]),
});
/** 存档仅允许公开命令的完整参数，不接受状态注入或额外字段。 */
export const savedCommandSchema = z.union([
  commandObject({ type: z.literal("useCoreTrinket"), ...actor, cardId: z.enum(CORE_TRINKET_IDS) }),
  commandObject({
    type: z.enum(["setDungeonStances", "setHamletStances"]),
    heroIds: z
      .array(id)
      .length(4)
      .refine((ids) => new Set(ids).size === 4),
  }),
  commandObject({ type: z.literal("visitGuild"), ...actor }),
  commandObject({
    type: z.literal("setEquippedSkills"),
    ...actor,
    skillIds: z.array(id).min(3).max(5),
  }),
  commandObject({ type: z.literal("visitBlacksmith"), ...actor, skillId: id }),
  commandObject({ type: z.literal("visitNomadWagon"), ...actor }),
  commandObject({
    type: z.literal("upgradeHamletBuilding"),
    building: z.enum([
      "abbey",
      "tavern",
      "sanitarium",
      "survivalist",
      "stagecoach",
      "blacksmith",
      "nomadWagon",
    ]),
  }),
  commandObject({
    type: z.literal("visitHamletBuilding"),
    ...actor,
    serviceId: z.enum([
      "tavern3",
      "tavern6",
      "tavern9",
      "heal5",
      "heal10",
      "heal7",
      "heal14",
      "heal9",
      "heal18",
      "cureDisease",
      "removeQuirks",
      "abbeyPositiveQuirk",
      "survivalist1",
      "survivalist2",
      "survivalist3",
      "tavernHeal5",
      "tavernHeal10",
      "tavernCureDisease",
      "abbeyStress3",
      "abbeyStress6",
      "graveyardVirtue",
      "graveyardGuard",
    ]),
    quirkIds: z.array(id).max(2),
  }),
  commandObject({
    type: z.literal("useHamletSkill"),
    ...actor,
    skill: z.enum(["experimentalVapours", "darkRitual"]),
    targetId: id,
  }),
  commandObject({
    type: z.literal("useHamletSkill"),
    ...actor,
    skill: z.enum([
      "intimidate",
      "sharpenSpear",
      "zealousSpeech",
      "pray",
      "chant",
      "scoutAhead",
      "pilfer",
    ]),
  }),
  noPayload,
  commandObject({
    type: z.enum([
      "lootTreasureChest",
      "hideAndHeal",
      "interactLoot",
      "finishMonsterTurn",
      "prepareMonsterAction",
      "moveMonsterToRange",
    ]),
    ...actor,
  }),
  commandObject({ type: z.literal("moveHero"), ...actor, path: z.array(id) }),
  commandObject({
    type: z.literal("changeStance"),
    ...actor,
    direction: z.enum(["forward", "backward"]),
  }),
  commandObject({
    type: z.literal("resolveChoice"),
    choiceId: id,
    optionId: id,
    bossEdgeRooms: z.boolean().optional(),
  }),
  commandObject({ type: z.literal("ping"), message: z.string() }),
  commandObject({
    type: z.literal("useTrinket"),
    ...actor,
    cardId: z.enum([
      "trinket:p025",
      "trinket:p015",
      "trinket:p017",
      "trinket:p018",
      "trinket:p027",
      "trinket:p028",
      "trinket:p030",
      "trinket:p035",
      "trinket:p036",
      "trinket:p037",
      "trinket:p038",
    ]),
  }),
  commandObject({
    type: z.literal("useProvision"),
    provisionId: id,
    targetId: id,
    effect: z.enum(["heal", "clearBleed", "clearBlight", "reduceStress", "raiseLight"]),
  }),
  commandObject({ type: z.literal("setupForwardCamp"), provisionId: id }),
  commandObject({ type: z.literal("playHeroSkillEmptyArea"), ...actor, skillId: id, areaId: id }),
  commandObject({
    type: z.literal("playHeroSkill"),
    damageStoneWindow: z.literal(true).optional(),
    trinketWindow,
    ...actor,
    targetId: id,
    skillId: id,
    face: z.enum(["front", "back"]).optional(),
    shuffleChoice: shuffle.optional(),
  }),
  commandObject({
    type: z.literal("playHeroSkillTargets"),
    damageStoneWindow: z.literal(true).optional(),
    trinketWindow,
    ...actor,
    skillId: id,
    targetIds: z.array(id).min(1),
    shuffleChoice: shuffle.optional(),
  }),
  commandObject({
    type: z.literal("playMonsterSkill"),
    damageStoneWindow: z.literal(true).optional(),
    ...actor,
    targetId: id,
    skillSlot: z.int().positive(),
    shuffleChoice: shuffle.optional(),
    shuffleChoices: z.record(id, shuffle).optional(),
  }),
]);
const phase3QuestIds = basicQuests
  .filter((q) => q.level === 1 || q.expeditionRegion === "darkestDungeon" || q.id === "quest:p019")
  .map((q) => q.id) as [BasicQuestId, ...BasicQuestId[]];

export const questStartSchema = z.strictObject({
  bossEdgeRooms: z.boolean().optional(),
  seed: z.int().min(0).max(0xffffffff),
  questId: z.enum(phase3QuestIds),
  mode: z.enum(["standard", "radiant"]),
  party: z
    .array(
      z.strictObject({
        heroStatId: id,
        stance: z.enum(["aggressive", "defensive", "ranged", "support"]),
        skillIds: z.array(id).length(3),
      }),
    )
    .length(4),
});
export const questSaveSchema = z.strictObject({
  format: z.literal("ddbg-core-quest"),
  version: z.literal(1),
  rulesVersion: z.literal("core-quest-2026-10-14"),
  start: questStartSchema,
  commands: z.array(savedCommandSchema).max(10000),
  // 只用作回放一致性校验；读档状态始终由受校验命令重建，不信任快照。
  snapshot: z.json(),
});
export type QuestStart = z.infer<typeof questStartSchema>;
export type QuestSave = z.infer<typeof questSaveSchema>;
