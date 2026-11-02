import type { ApplyResult, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import type { TrinketPool } from "./trinket-acquisition";

/** 死亡时的历史记录，不是当前共享牌持有者；仅供R-147/R-148重生池复活。 */
export type FallenHero = {
  readonly hero: DungeonState["heroes"][number];
  readonly trinkets: TrinketPool["held"];
};

export function captureFallenHeroes(result: ApplyResult): ApplyResult {
  const { state } = result,
    d = state.dungeon;
  if (!d || result.events.some((e) => e.type === "commandRefused")) return result;
  const captured = d.fallenHeroes ?? [];
  const additions: FallenHero[] = [];
  for (const hero of d.heroes) {
    const entity = state.battle?.entities.find((e) => e.side === "hero" && e.id === hero.id);
    if (!(entity?.dead ?? hero.dead) || captured.some((entry) => entry.hero.id === hero.id))
      continue;
    const snapshot = entity
      ? {
          ...hero,
          combat: entity,
          wounds: entity.wounds,
          stress: entity.stress ?? hero.stress,
          ...(entity.stance ? { stance: entity.stance } : {}),
          dead: true,
          resolveTested: entity.resolveTested,
          resolveCardId: entity.resolveCardId ?? undefined,
          diseaseId: entity.diseaseId ?? null,
          quirkIds: entity.quirkIds ?? [],
          statusStacks: entity.statusStacks ?? [],
          ...(entity.deathReason ? { deathReason: entity.deathReason } : {}),
        }
      : hero;
    const trinkets =
      (state.battle?.trinkets ?? d.trinkets)?.held.filter((h) => h.heroId === hero.id) ?? [];
    additions.push(structuredClone({ hero: snapshot, trinkets }));
  }
  if (!additions.length) return result;
  return {
    ...result,
    state: { ...state, dungeon: { ...d, fallenHeroes: [...captured, ...additions] } },
  };
}

/** 旧快照只补缺少的档案，唯一来源是已验证种子/命令的重放；已有字段不可修复。 */
export function upgradeFallenHeroSnapshot(snapshot: unknown, restored: GameState): unknown {
  if (!snapshot || typeof snapshot !== "object" || !restored.dungeon?.fallenHeroes?.length)
    return snapshot;
  const old = snapshot as { readonly dungeon?: unknown };
  if (!old.dungeon || typeof old.dungeon !== "object" || "fallenHeroes" in old.dungeon)
    return snapshot;
  return { ...old, dungeon: { ...old.dungeon, fallenHeroes: restored.dungeon.fallenHeroes } };
}
