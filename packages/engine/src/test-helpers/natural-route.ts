import type { DungeonState } from "../dungeon";

/** 测试决策：只读实际图的连接与行进记录，不读取未揭示房间内容或消耗 RNG。 */
export function nextNaturalRoute(
  d: Pick<DungeonState, "layout" | "position" | "visited" | "traversedCorridors">,
): { readonly to: string; readonly backtrack: boolean } | null {
  const visited = new Set(d.visited ?? [d.position]);
  const reached = new Set([d.position]);
  const paths = [{ node: d.position, path: [] as string[] }];
  for (const { node, path } of paths) {
    const adjacent = d.layout.edges
      .flatMap(([a, b]) => (a === node ? [b] : b === node ? [a] : []))
      .map((id) => d.layout.nodes.find((n) => n.id === id)!)
      .filter((n) => n && n.kind !== "unresolved")
      // 仅作固定玩家偏好；连接完全来自 edges，不由坐标推导。
      .sort((a, b) => a.y - b.y || b.x - a.x || a.id.localeCompare(b.id));
    for (const next of adjacent) {
      if (reached.has(next.id)) continue;
      if (!visited.has(next.id) && next.kind !== "start") {
        const to = path[0] ?? next.id;
        return { to, backtrack: visited.has(to) };
      }
      // 访问过节点不代表从当前节点走过这条边，不能借未走的环边返回。
      if (
        !d.traversedCorridors?.some(
          ([a, b]) => (a === node && b === next.id) || (b === node && a === next.id),
        )
      )
        continue;
      reached.add(next.id);
      paths.push({ node: next.id, path: [...path, next.id] });
    }
  }
  return null;
}
