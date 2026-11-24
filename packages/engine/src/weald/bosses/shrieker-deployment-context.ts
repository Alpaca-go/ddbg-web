import { shriekerContextForLevel } from "./shrieker-runtime-context";
import { shriekerIInitialDeployment } from "./shrieker-i-deployment";
export function shriekerDeploymentContext(level: 1 | 2 | 3) {
  const c = shriekerContextForLevel(level),
    initial = shriekerIInitialDeployment();
  return {
    ...c,
    entry: {
      descriptionAbilityCardId: c.abilities.descriptionCardId,
      combatAbilityCardId: c.abilities.combatCardId,
      combatMonsterCardId: c.faces[0].rawId,
      printedInitiativeCards: 3,
      printedActionsPerRound: 3,
    },
    deployment:
      level === 1
        ? initial
        : {
            ...initial,
            entities: initial.entities.map((e, i) => ({
              ...e,
              monsterCardId: c.faces[i]!.rawId,
              life: c.faces[i]!.life,
              dodge: c.faces[i]!.dodge,
            })),
          },
  };
}
