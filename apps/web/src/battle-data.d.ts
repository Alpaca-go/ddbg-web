declare module "virtual:battle-data" {
  import type {
    BattleArea,
    HeroSkillCardView,
    MonsterCardView,
    MonsterSkillView,
    ResolveCard,
  } from "@ddbg/engine";
  export const battleData: {
    readonly conditions: import("@ddbg/engine").ConditionPool;
    readonly tileName: string;
    readonly resolveCards: readonly ResolveCard[];
    readonly deployment: {
      readonly heroes: Readonly<Record<import("@ddbg/engine").SkillStance, string>>;
      readonly monsters: Readonly<Record<import("@ddbg/engine").SkillStance, string>>;
      readonly lootAreas: readonly string[];
    };
    readonly areas: readonly BattleArea[];
    readonly skills: readonly (HeroSkillCardView & {
      readonly name: string;
      readonly level: number;
    })[];
    readonly monsters: readonly (Omit<MonsterCardView, "skills"> & {
      readonly name: string;
      readonly level: number;
      readonly skills: readonly (MonsterSkillView & { readonly name: string })[];
      readonly dodge: number;
      readonly spawnEdge: "front" | "back";
      readonly stanceSlots: 1 | 2;
      readonly copies: number;
    })[];
    readonly heroStats: readonly {
      readonly id: string;
      readonly name: string;
      readonly life: number;
      readonly dodge: number;
      readonly speed: number;
      readonly attributesVerified: boolean;
      readonly verified_condition_defence?: import("../../../packages/data/src/normalize/hero-stat").HeroConditionDefence;
      readonly level: number;
    }[];
  };
}
