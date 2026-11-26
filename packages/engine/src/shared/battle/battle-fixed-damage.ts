import type { BattleEntity } from "./battle";
import type { HeroSkillResolution } from "../../core/heroes/hero-skill";

/** 环境原语的状态视图；不是卡牌、技能骰或攻击命令，不产生反击。 */
export function fixedDamageResolution(entity: BattleEntity, skillId: string): HeroSkillResolution {
  return {
    skillId,
    targetId: entity.id,
    status: "resolved",
    reason: null,
    outcome: null,
    effect: null,
    printedAmount: null,
    damageDealt: null,
    riposteDamage: null,
    wounds: entity.wounds,
    actorWounds: null,
    targetDead: false,
    targetBleedCleared: false,
    targetBlightCleared: false,
    actorBleedCleared: false,
    actorBlightCleared: false,
    actorShuffle: null,
    targetShuffle: null,
    targetProtectionIgnored: false,
    actorStunMarkCleared: false,
    targetStunMarkCleared: false,
    actorForm: null,
    actorStress: null,
    targetStress: null,
    besideActorStress: null,
    untargetedBesideTargetStress: null,
    skipped: [],
  };
}
