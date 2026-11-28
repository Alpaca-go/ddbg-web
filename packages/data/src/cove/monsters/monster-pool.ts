import { z } from "zod";
import { normalizedMonsterMediumFileSchema } from "../../shared/schema";
import { COVE_LEVEL_ONE_MONSTER_IDENTITIES } from "./monsters.build";

const instanceSchema = z.strictObject({
  instanceId: z.string().regex(/^monster-deck:cove:p\d{3}$/),
  cardId: z.string().regex(/^monster_medium:cove:p\d{3}$/),
  edge: z.enum(["front", "back"]),
  stanceSlots: z.literal(1),
  /** I 级目录仅登记牌堆实体身份；Q-186 未核准，不授予战斗运行时。 */
  combatReady: z.literal(false),
});

/** R9–R10、C1：medium 六种 I 级普通怪共 17 张印刷实体，无大型映射副本。 */
export const coveLevelOneMonsterInstancesSchema = z
  .array(instanceSchema)
  .length(17)
  .superRefine((instances, ctx) => {
    if (new Set(instances.map((entry) => entry.instanceId)).size !== 17)
      ctx.addIssue({ code: "custom", message: "Cove I 级实体不可重复或截断" });
    const pages = instances
      .map((entry) => Number(entry.instanceId.slice("monster-deck:cove:p".length)))
      .sort((a, b) => a - b);
    if (pages.join(",") !== "1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17")
      ctx.addIssue({ code: "custom", message: "Cove I 级必须覆盖印刷 p001–p017 实体页" });
  });

export type CoveLevelOneMonsterInstance = z.infer<typeof instanceSchema>;

/** 从已核准身份目录构造未洗牌当地实例；不读取战斗数值或技能结算。 */
export function buildCoveLevelOneMonsterInstances(
  mediumInput: unknown,
): CoveLevelOneMonsterInstance[] {
  const medium = normalizedMonsterMediumFileSchema.parse(mediumInput);
  if (
    medium.sources.raw !== "extract/extension/cove/raw/monster_medium.json" ||
    medium.sources.parsed !== "extract/extension/cove/parsed/monster_medium.json"
  )
    throw new Error("Cove 怪物牌堆来源不符");
  const expectedIds = new Set<string>(COVE_LEVEL_ONE_MONSTER_IDENTITIES.map((entry) => entry.id));
  if (
    medium.cards.length !== COVE_LEVEL_ONE_MONSTER_IDENTITIES.length ||
    medium.cards.some((card) => !expectedIds.has(card.id))
  )
    throw new Error("Cove 怪物牌堆目录缺卡或混入未登记实体");
  const instances = medium.cards.flatMap((card) => {
    const edges = card.type_position_tags.filter((tag) => tag === "Front" || tag === "Back");
    if (edges.length !== 1 || card.copies !== card.pages.length)
      throw new Error(`Cove 抽牌卡部署身份不符：${card.id}`);
    const edge = edges[0] === "Back" ? ("back" as const) : ("front" as const);
    if (card.type_position_tags.includes("Large"))
      throw new Error(`Cove I 级普通牌堆不得登记大型映射：${card.id}`);
    return card.pages.map((page) => ({
      instanceId: `monster-deck:cove:p${String(page).padStart(3, "0")}`,
      cardId: card.id,
      edge,
      stanceSlots: 1 as const,
      combatReady: false as const,
    }));
  });
  return coveLevelOneMonsterInstancesSchema.parse(instances);
}
