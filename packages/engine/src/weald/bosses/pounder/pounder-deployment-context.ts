import { pounderIInitialDeployment } from "./pounder-i-projection";
import { pounderContextForLevel } from "./pounder-runtime-context";
/** R-268：共用12号板块，只放本级Pounder，增援在回合窗口处理。 */
export function pounderDeploymentContext(level: 1 | 2 | 3) {
  const context = pounderContextForLevel(level);
  const initial = pounderIInitialDeployment();
  if (level === 1) return { ...context, deployment: initial };
  const face = context.catalog[0]!;
  return {
    ...context,
    deployment: {
      ...initial,
      monsters: [...context.catalog, context.companion],
      entities: initial.entities.map((e) => ({
        ...e,
        monsterCardId: face.id,
        life: face.life,
        dodge: face.dodge!,
        innateProtection: face.innateProtection!,
        protection: face.innateProtection!,
      })),
    },
  };
}
