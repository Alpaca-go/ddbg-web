declare module "virtual:battle-data" {
  import type { BattleArea, HeroSkillCardView, MonsterCardView } from "@ddbg/engine";
  export const battleData: {
    readonly tileName: string;
    readonly areas: readonly BattleArea[];
    readonly skills: readonly (HeroSkillCardView & {
      readonly name: string;
      readonly level: number;
    })[];
    readonly monsters: readonly (MonsterCardView & { readonly name: string })[];
    readonly heroStats: readonly {
      readonly id: string;
      readonly name: string;
      readonly life: number;
      readonly dodge: number;
      readonly speed: number;
      readonly attributesVerified: boolean;
    }[];
  };
}
