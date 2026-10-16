import type { DungeonState } from "./dungeon";
import type { GameEvent } from "./command";
import { applyPassiveHero } from "./passive-runtime";
import type { PassiveInput } from "./passive-runtime";
import { readHeroPassiveDefence } from "./battle-skill-status";

export function triggerDungeonPassive(
  dungeon: DungeonState,
  seed: number,
  ids: readonly string[],
  trigger: PassiveInput,
  options: { readonly omitStress?: boolean } = {},
):
  | { status: "refused"; reason: string }
  | { status: "resolved"; dungeon: DungeonState; events: readonly GameEvent[] } {
  let next = dungeon;
  const events: GameEvent[] = [];
  for (const id of ids) {
    const hero = next.heroes.find((h) => h.id === id);
    if (!hero) return { status: "refused", reason: "地牢被动接收者不存在" };
    const defence = next.battleCatalog
      ? readHeroPassiveDefence(next.battleCatalog, hero)
      : undefined;
    const stacks = hero.statusStacks ?? hero.combat?.statusStacks;
    const applied = applyPassiveHero(
      { ...hero, ...(stacks ? { statusStacks: stacks } : {}) },
      trigger,
      seed,
      next.cursor,
      next.pressureSource === "hamletScout" ? 5 : (next.explorationSetup?.light ?? 5),
      next.explorationSetup?.provisions,
      defence,
      options,
    );
    if (applied.status === "refused") return applied;
    next = {
      ...next,
      cursor: applied.cursor,
      heroes: next.heroes.map((h) => (h.id === id ? applied.hero : h)),
      ...(next.explorationSetup
        ? { explorationSetup: { ...next.explorationSetup, provisions: applied.provisions } }
        : {}),
    };
    events.push(...applied.events);
  }
  return { status: "resolved", dungeon: next, events };
}
