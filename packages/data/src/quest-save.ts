import { z } from "zod";
import { basicQuests, type BasicQuestId } from "./basic-quests";

const id = z.string().min(1);
const actor = { actorId: id };
const shuffle = z.enum(["push", "pull"]);
const noPayload = z.strictObject({
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
  z.strictObject({
    type: z.enum(["setDungeonStances", "setHamletStances"]),
    heroIds: z
      .array(id)
      .length(4)
      .refine((ids) => new Set(ids).size === 4),
  }),
  z.strictObject({ type: z.literal("visitGuild"), ...actor }),
  z.strictObject({
    type: z.literal("setEquippedSkills"),
    ...actor,
    skillIds: z.array(id).min(3).max(5),
  }),
  z.strictObject({ type: z.literal("visitBlacksmith"), ...actor, skillId: id }),
  z.strictObject({ type: z.literal("visitNomadWagon"), ...actor }),
  z.strictObject({
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
  z.strictObject({
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
  z.strictObject({
    type: z.literal("useHamletSkill"),
    ...actor,
    skill: z.enum(["experimentalVapours", "darkRitual"]),
    targetId: id,
  }),
  z.strictObject({
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
  z.strictObject({
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
  z.strictObject({ type: z.literal("moveHero"), ...actor, path: z.array(id).min(1) }),
  z.strictObject({
    type: z.literal("changeStance"),
    ...actor,
    direction: z.enum(["forward", "backward"]),
  }),
  z.strictObject({ type: z.literal("resolveChoice"), choiceId: id, optionId: id }),
  z.strictObject({ type: z.literal("ping"), message: z.string() }),
  z.strictObject({
    type: z.literal("useProvision"),
    provisionId: id,
    targetId: id,
    effect: z.enum(["heal", "clearBleed", "clearBlight", "reduceStress", "raiseLight"]),
  }),
  z.strictObject({ type: z.literal("setupForwardCamp"), provisionId: id }),
  z.strictObject({ type: z.literal("playHeroSkillEmptyArea"), ...actor, skillId: id, areaId: id }),
  z.strictObject({
    type: z.literal("playHeroSkill"),
    ...actor,
    targetId: id,
    skillId: id,
    face: z.enum(["front", "back"]).optional(),
    shuffleChoice: shuffle.optional(),
  }),
  z.strictObject({
    type: z.literal("playHeroSkillTargets"),
    ...actor,
    skillId: id,
    targetIds: z.array(id).min(1),
    shuffleChoice: shuffle.optional(),
  }),
  z.strictObject({
    type: z.literal("playMonsterSkill"),
    ...actor,
    targetId: id,
    skillSlot: z.int().positive(),
    shuffleChoice: shuffle.optional(),
    shuffleChoices: z.record(id, shuffle).optional(),
  }),
]);
const phase3QuestIds = basicQuests.filter((q) => q.level === 1).map((q) => q.id) as [
  BasicQuestId,
  ...BasicQuestId[],
];

export const questStartSchema = z.strictObject({
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
