import { approvedHeroStats } from "../../data/src/normalize/hero-stat";
import type { ApplyResult, GameEvent, GameState } from "./command";
import { resolveAttackDamage } from "./attack-damage";
import { completeDungeonHazard } from "./dungeon-exploration";
import { triggerDungeonPassive } from "./dungeon-passive";
import type { PassiveInput } from "./passive-runtime";
import { criticalStress, hasQuirk, passiveDamageWounds } from "./passive";
import { createRng, rollD10 } from "./rng";
import { statusProjection, statusStackProblem } from "./status";

/** 官方 R14 / R27，R-003 / R-026 / R-031；环境攻击只结算掷探索骰的英雄。 */
export function resolveDungeonTrap(state: GameState, rollId: string, heroId: string): ApplyResult {
  const refuse = (message: string): ApplyResult => ({
    state,
    events: [{ type: "commandRefused", message }],
  });
  const d = state.dungeon!;
  const hero = d.heroes.find((h) => h.id === heroId);
  const stat = d.battleCatalog?.heroStats.find((s) => s.id === hero?.heroStatId);
  const approved = approvedHeroStats.find((s) => `${s.rawId}:${s.face}` === stat?.id);
  const config = d.explorationSetup;
  const stacks = hero?.statusStacks ?? hero?.combat?.statusStacks ?? [];
  if (
    !hero ||
    hero.dead ||
    !stat?.attributesVerified ||
    !approved ||
    hero.attributesVerified !== true ||
    hero.life !== approved.life ||
    hero.level !== approved.level ||
    stat.life !== approved.life ||
    stat.name !== approved.name ||
    stat.level !== approved.level ||
    stat.dodge !== approved.dodge ||
    !Number.isSafeInteger(hero.wounds) ||
    hero.wounds! < 0 ||
    hero.wounds! > hero.life ||
    !Number.isSafeInteger(hero.stress) ||
    hero.stress < 0 ||
    hero.stress > 10 ||
    !config ||
    !Number.isInteger(config.dungeonLevel) ||
    config.dungeonLevel < 1 ||
    config.dungeonLevel > 3 ||
    !Number.isInteger(config.light) ||
    config.light < 0 ||
    config.light > 5 ||
    !Number.isSafeInteger(state.seed) ||
    !Number.isSafeInteger(d.cursor) ||
    d.cursor < 0 ||
    d.cursor === Number.MAX_SAFE_INTEGER ||
    statusStackProblem(stacks)
  )
    return refuse(
      "陷阱攻击需要获批英雄身份、HL / Life / Dodge、有效生命 / 状态、DL / 光照及 RNG（R-048）",
    );
  const rng = createRng(state.seed);
  for (let i = 0; i < d.cursor; i++) rng.next();
  const roll = rollD10(rng);
  const dodge =
    stat.dodge +
    Number(config.light === 5) +
    2 * Number(hasQuirk(hero, "Quick Reflexes")) -
    2 * Number(hasQuirk(hero, "Slow Reflexes"));
  const critical = roll <= 2;
  const hit = critical || roll <= 8 - dodge;
  let changed = { ...d, cursor: d.cursor + 1 };
  const events: GameEvent[] = [];
  const apply = (input: PassiveInput): string | null => {
    const result = triggerDungeonPassive(changed, state.seed, [heroId], input, {
      omitStress: critical && (input === "damageTaken" || input === "criticalDamage"),
    });
    if (result.status === "refused") return result.reason;
    changed = result.dungeon;
    events.push(
      ...result.events.map((event) =>
        event.type === "heroHealthResolved" && typeof input !== "string" && input.woundAmounts
          ? { ...event, message: "陷阱伤害与同批追加伤口、死门已结算（R14、R-026、R29）" }
          : event,
      ),
    );
    return null;
  };
  const rollProblem = roll === 1 ? apply("rolledOne") : roll === 10 ? apply("rolledTen") : null;
  if (rollProblem) return refuse(rollProblem);
  let damage = 0;
  const cancelled = changed.heroes.find((h) => h.id === heroId)!.dead;
  if (!cancelled && hit) {
    const protection = statusProjection(
      stacks,
      hero.innateProtection ?? hero.combat?.innateProtection,
    ).protection;
    damage = resolveAttackDamage(
      hero,
      (critical ? 4 : 2) * config.dungeonLevel,
      critical,
      protection,
    ).damageDealt;
    const triggers: PassiveInput[] = [
      ...(damage > 0
        ? [
            {
              type: "stress" as const,
              amount: 0,
              woundAmounts: [damage, ...passiveDamageWounds(hero)],
            },
            "damageTaken" as const,
            ...(critical ? ["criticalDamage" as const] : []),
          ]
        : []),
      ...(critical ? [{ type: "stress" as const, amount: criticalStress(hero, damage > 0) }] : []),
    ];
    for (const trigger of triggers) {
      const problem = apply(trigger);
      if (problem) return refuse(problem);
    }
  } else if (!cancelled && hasQuirk(hero, "Evasive")) {
    const problem = apply({ type: "stress", amount: -1 });
    if (problem) return refuse(problem);
  }
  const result = completeDungeonHazard(
    state,
    changed,
    rollId,
    `${heroId} Trap：d10=${roll}，Acc 8 − Dodge ${dodge}，Crit 2；${cancelled ? "英雄死亡，攻击中止" : hit ? `${critical ? "暴击" : "命中"}，${damage} 伤害${critical ? "、暴击基础压力1（追加压力按R-069合并）" : ""}` : "闪避"}（DL ${config.dungeonLevel}，R-003 / R-031）`,
  );
  return { ...result, events: [...events, ...result.events] };
}
