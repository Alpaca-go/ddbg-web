import type { BattleEntity } from "../../../shared/battle/battle";
import { caretakerBuilding } from "../../../shared/hamlet/hamlet-event";
import { addStatusStack, type StatusStack } from "../../../shared/core/status";
import { WEALD_POUNDER_I_CONTENT as content } from "./pounder-i-content";

/** 命令接线层负责威胁权限及原子回滚；这里不读注册表、不隐式消耗 RNG。 */
export function resolvePounderIRangedEntry(
  input: {
    readonly side: BattleEntity["side"];
    readonly dead: boolean;
    readonly previousStance: BattleEntity["stance"] | undefined;
    readonly stance: BattleEntity["stance"];
    readonly statusStacks: readonly StatusStack[];
  },
  threat: { buffDuration: number; riposteDuration: number } = content.abilities.threats.dungeon,
) {
  if (
    input.dead ||
    input.side !== "monster" ||
    input.stance !== "ranged" ||
    input.previousStance === "ranged"
  )
    return { status: "resolved" as const, stacks: input.statusStacks };
  let stacks = input.statusStacks;
  for (const effect of [
    { kind: "buff" as const, duration: threat.buffDuration },
    { kind: "riposte" as const, duration: threat.riposteDuration },
  ]) {
    const result = addStatusStack(stacks, effect, "self", { resistances: [], immunities: [] });
    if (result.status === "refused") return result;
    stacks = result.stacks;
  }
  return { status: "resolved" as const, stacks };
}

type Building = NonNullable<ReturnType<typeof caretakerBuilding>>;
type BombardmentBuilding = { readonly level: 1 | 2 | 3; readonly heroId: string | null };
export type PounderBombardmentOutcome =
  | {
      readonly effect: "none";
      readonly building: Building;
      readonly reason: "caretaker" | "minimumLevel";
    }
  | {
      readonly effect: "damageHero";
      readonly building: Building;
      readonly heroId: string;
      readonly damage: number;
    }
  | { readonly effect: "downgradeBuilding"; readonly building: Building; readonly level: 1 | 2 };

/** 已掷 d10 的日末结算计划；英雄伤害、死亡待选与占用清除由后续命令适配器消费。 */
export function resolvePounderIBombardment(
  roll: number,
  caretaker: Building | null,
  buildings: Readonly<Record<Building, BombardmentBuilding>>,
  damage: number = content.abilities.threats.hamlet.heroDamage,
): PounderBombardmentOutcome {
  if (!Number.isInteger(roll) || roll < 1 || roll > 10)
    throw new Error("Pounder 轰炸需要合法 d10，不重掷或补默认值");
  const building = caretakerBuilding(roll)!;
  const target = buildings[building];
  if (!target || ![1, 2, 3].includes(target.level) || (target.heroId !== null && !target.heroId))
    throw new Error("Pounder 轰炸缺建筑等级或英雄占用记录");
  if (building === caretaker) return { effect: "none", building, reason: "caretaker" };
  if (target.heroId !== null)
    return {
      effect: "damageHero",
      building,
      heroId: target.heroId,
      damage,
    };
  if (target.level === 1) return { effect: "none", building, reason: "minimumLevel" };
  return { effect: "downgradeBuilding", building, level: target.level === 3 ? 2 : 1 };
}
