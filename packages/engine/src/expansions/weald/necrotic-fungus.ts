import type { BattleEntity, BattleSetup, BattleState } from "../../battle";
import type { WealdRoomTile } from "../../../../data/src/weald-room";

export const NECROTIC_FUNGUS_MONSTER_CARD_ID = "weald:necrotic-fungus";

export const NECROTIC_FUNGUS_MONSTER_CARD: NonNullable<BattleSetup["monsters"]>[number] = {
  id: NECROTIC_FUNGUS_MONSTER_CARD_ID,
  life: 1,
  dodge: 0,
  verification: { unverified: false },
  skills: [],
  /** 仅满足无类型加成技能的 R-048 校验；不代表真菌被归类为 Unholy 怪物（W-04）。 */
  type_position_tags: ["Unholy"],
  stanceGroups: [{ stances: ["aggressive", "defensive", "ranged", "support"], skill: 1 }],
};

export function isNecroticFungusEntity(entity: BattleEntity | undefined): boolean {
  return entity?.necroticFungus === true;
}

export function livingNecroticFungus(battle: BattleState): readonly BattleEntity[] {
  return battle.entities.filter((e) => !e.dead && isNecroticFungusEntity(e));
}

export function necroticFungusBlocksHealing(battle: BattleState): boolean {
  return battle.wealdMechanics === true && livingNecroticFungus(battle).length > 0;
}

export function isLivingCombatMonster(entity: BattleEntity): boolean {
  return entity.side === "monster" && !entity.dead && !isNecroticFungusEntity(entity);
}

/** 仅使用目录已核准的 necroticFungusAreas；无标记房间不放真菌。 */
export function necroticFungusEntitiesForTile(
  tile: Pick<WealdRoomTile, "id" | "necroticFungusAreas">,
): BattleEntity[] {
  return tile.necroticFungusAreas.map((areaId, index) => ({
    id: `necrotic-fungus:${tile.id}:${areaId}:${index}`,
    side: "monster" as const,
    hero: null,
    areaId,
    stance: (["aggressive", "defensive", "ranged", "support"] as const)[index % 4]!,
    stanceSlots: 1 as const,
    monsterCardId: NECROTIC_FUNGUS_MONSTER_CARD_ID,
    necroticFungus: true as const,
    life: 1,
    wounds: 0,
    dodge: 0,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  }));
}
