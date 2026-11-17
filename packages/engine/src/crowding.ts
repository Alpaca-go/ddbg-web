import type { BattleArea, BattleEntity } from "./battle";

const stances = ["aggressive", "defensive", "ranged", "support"];
const width = (e: BattleEntity) => (e.side === "hero" ? 1 : (e.stanceSlots ?? 1));
export type CrowdingPlan = { entities: readonly BattleEntity[]; rolls: number };
/** R-271：在副本中预演；失败不提交位置。整组挤出共用一次邻区排名。 */
export function planCrowding(
  areas: readonly BattleArea[],
  entities: readonly BattleEntity[],
  areaId: string,
  incoming: number,
  random: (offset: number) => number,
  immovable: (e: BattleEntity) => boolean = () => false,
  allowsEntry: (e: BattleEntity, area: string) => boolean = () => true,
): CrowdingPlan | null {
  function visit(
    current: readonly BattleEntity[],
    id: string,
    load: number,
    trail: readonly string[],
    offset = 0,
  ): CrowdingPlan | null {
    const area = areas.find((a) => a.id === id);
    if (!area || area.capacity === undefined || area.capacity < load || trail.includes(id))
      return null;
    const occupants = current.filter((e) => !e.dead && e.areaId === id);
    let excess = occupants.reduce((n, e) => n + width(e), 0) + load - area.capacity;
    if (excess <= 0) return { entities: current, rolls: 0 };
    const ordered = [...occupants].sort(
      (a, b) =>
        Number(a.side !== "hero") - Number(b.side !== "hero") ||
        stances.indexOf(a.stance!) - stances.indexOf(b.stance!) ||
        a.id.localeCompare(b.id),
    );
    const movers: BattleEntity[] = [];
    for (const e of ordered) {
      if (excess <= 0) break;
      if (immovable(e)) return null;
      movers.push(e);
      excess -= width(e);
    }
    if (excess > 0) return null;
    const candidates = area.adjacent
      .filter((next) => ![...trail, id].includes(next) && movers.every((e) => allowsEntry(e, next)))
      .map((next) => {
        const target = areas.find((a) => a.id === next);
        const residents = current.filter((e) => !e.dead && e.areaId === next);
        return {
          id: next,
          count: residents.length,
          free: (target?.capacity ?? 0) - residents.reduce((n, e) => n + width(e), 0),
        };
      })
      .sort((a, b) => a.count - b.count || b.free - a.free || a.id.localeCompare(b.id));
    while (candidates.length) {
      const best = candidates[0]!;
      const tied = candidates.filter((c) => c.count === best.count && c.free === best.free);
      const possible = tied.flatMap((c) => {
        const rest = visit(
          current,
          c.id,
          movers.reduce((n, e) => n + width(e), 0),
          [...trail, id],
          offset + Number(tied.length > 1),
        );
        return rest
          ? [
              {
                ...rest,
                entities: rest.entities.map((e) =>
                  movers.some((m) => m.id === e.id) ? { ...e, areaId: c.id } : e,
                ),
              },
            ]
          : [];
      });
      if (possible.length) {
        const chosen =
          tied.length > 1 ? possible[Math.floor(random(offset) * possible.length)]! : possible[0]!;
        return { ...chosen, rolls: chosen.rolls + Number(tied.length > 1) };
      }
      candidates.splice(0, tied.length);
    }
    return null;
  }
  return visit(entities, areaId, incoming, []);
}
