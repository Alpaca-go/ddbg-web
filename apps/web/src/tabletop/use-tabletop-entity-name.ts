import { useCallback } from "react";
import { monsterCardName } from "./resolve-monster-skill-display";
import type { TabletopHeroState, TabletopMonsterState } from "./tabletop-types";

export function useTabletopEntityName(
  heroes: readonly TabletopHeroState[],
  monsters: readonly TabletopMonsterState[],
) {
  return useCallback(
    (id: string) => {
      const hero = heroes.find((h) => h.id === id);
      if (hero && !hero.isEmpty) return hero.hero;
      const monster = monsters.find((m) => m.id === id);
      if (monster) return monster.name;
      if (id.startsWith("monster_medium:")) return monsterCardName(id);
      return id;
    },
    [heroes, monsters],
  );
}
