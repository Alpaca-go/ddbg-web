import { hagIInitialDeployment } from "./hag-i-projection";
import { hagHigherContext } from "./hag-higher";

/** W4／R-268：共用实体房间，战斗卡始终取真实等级，不改 I 级投影。 */
export function hagDeploymentContext(level: 1 | 2 | 3) {
  const deployment = hagIInitialDeployment();
  const script = `boss:weald:hag:${level}` as const;
  const description = `boss_ability:weald:p0${12 + level}`;
  if (level === 1) return { script, description, deployment, card: deployment.monsters[0]!.id };
  const context = hagHigherContext(level);
  return {
    script,
    description,
    card: context.hagId,
    deployment: {
      ...deployment,
      monsters: context.catalog,
      entities: deployment.entities.map((entity, index) => ({
        ...entity,
        monsterCardId: context.catalog[index]!.id,
        life: context.catalog[index]!.life,
        dodge: context.catalog[index]!.dodge!,
        innateProtection: context.catalog[index]!.innateProtection!,
        protection: context.catalog[index]!.innateProtection!,
      })),
    },
  };
}
