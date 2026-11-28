import { z } from "zod";
import { locationCurioPool, curioPoolSchemaForLocation } from "../core/curios/curio-pool";
import type { CurioCard } from "../core/curios/curio";
import {
  monsterPoolCatalogSchema,
  ruinsMonsterPool,
  type MonsterPoolCard,
} from "../core/monsters/monster-pool";
import { normalizeContentPacks, type ContentPackId } from "../shared/content-packs";
import {
  buildCoveLevelOneMonsterInstances,
  coveLevelOneMonsterInstancesSchema,
} from "./monsters/monster-pool";
import { coveExpeditionRoomPool, coveExpeditionRoomPoolSchema } from "./rooms/room-pool";
import type { CoveRoomCard } from "./rooms/room";

/** CoveQuestSources 子集：仅 I 级普通地点牌堆登记所需字段。 */
export type CoveLocationDeckSources = {
  readonly medium: unknown;
  readonly curios: readonly CurioCard[];
  readonly rooms: readonly CoveRoomCard[];
};

const monsterInstanceSchema = z.strictObject({
  instanceId: z.string().min(1),
  cardId: z.string().min(1),
  edge: z.enum(["front", "back"]),
  stanceSlots: z.union([z.literal(1), z.literal(2)]),
  verified: z.literal(true),
});

const coveLevelOneLocationDecksSchema = z
  .strictObject({
    location: z.literal("cove"),
    level: z.literal(1),
    monsters: z.strictObject({
      common: z.array(monsterInstanceSchema).min(1),
      local: coveLevelOneMonsterInstancesSchema,
    }),
    curios: z.array(z.custom<CurioCard>()),
    rooms: coveExpeditionRoomPoolSchema,
  })
  .superRefine((decks, ctx) => {
    const curioSchema = curioPoolSchemaForLocation("cove");
    const curio = curioSchema.safeParse(decks.curios);
    if (!curio.success)
      ctx.addIssue({ code: "custom", message: "Cove 奇物必须完整包含 8 张通用和 16 张当地卡" });
    if (new Set(decks.monsters.local.map((entry) => entry.instanceId)).size !== 17)
      ctx.addIssue({ code: "custom", message: "Cove 当地怪物实体数不符" });
  });

export type CoveLevelOneLocationDecks = z.infer<typeof coveLevelOneLocationDecksSchema>;

/**
 * 核心 R9–R10、C1：按内容包与可信来源登记 Cove I 级地点牌堆构成。
 * 不洗牌、不接入出征／存档；II／III 与 Boss 召唤物不在本入口推算。
 */
export function buildCoveLevelOneLocationDecks(input: {
  readonly contentPacks: readonly ContentPackId[];
  readonly coreMonsterPool: readonly MonsterPoolCard[];
  readonly coreCurios: readonly CurioCard[];
  readonly cove: CoveLocationDeckSources;
}): CoveLevelOneLocationDecks {
  if (!normalizeContentPacks(input.contentPacks).includes("cove"))
    throw new Error("Cove 内容包未启用");
  const core = monsterPoolCatalogSchema.parse(input.coreMonsterPool);
  const commonCombatIds = new Set(
    core
      .filter((card) => card.location === "common" && card.level === 1)
      .map((card) => card.combatCardId),
  );
  const common = ruinsMonsterPool(core, 1).filter((card) => commonCombatIds.has(card.cardId));
  if (
    common.some((card) => !commonCombatIds.has(card.cardId)) ||
    [...commonCombatIds].some((id) => !common.some((card) => card.cardId === id)) ||
    new Set(common.map((c) => c.instanceId)).size !== common.length
  )
    throw new Error("Cove 通用战斗来源缺失或重复");
  const local = buildCoveLevelOneMonsterInstances(input.cove.medium);
  const curios = locationCurioPool(input.coreCurios, {
    location: "cove",
    cards: input.cove.curios,
  });
  const rooms = coveExpeditionRoomPool(input.cove.rooms);
  return coveLevelOneLocationDecksSchema.parse({
    location: "cove",
    level: 1,
    monsters: { common, local },
    curios,
    rooms,
  });
}
