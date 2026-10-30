import type { DungeonLayout, RoomTokenKind } from "../../../data/src/dungeon-layout";
import { createRng } from "../rng";

/** R30 / spec §5.1：边缘房只有一条相连走廊；灰点仍计作该走廊的邻点。 */
export function edgeRoomNodeIds(layout: DungeonLayout): string[] {
  return layout.nodes
    .filter((n) => n.kind === "room" && layout.edges.filter((e) => e.includes(n.id)).length === 1)
    .map((n) => n.id);
}

/** 从本任务实体代币中随机取足边缘房，先混目标与边缘代币，再混其余房间。 */
export function placeFaceTheThreatRooms(
  layout: DungeonLayout,
  kinds: readonly RoomTokenKind[],
  seed: number,
  cursor: number,
): { tokens: RoomTokenKind[]; cursor: number } {
  const slots = layout.nodes.filter((n) => n.kind === "room");
  const edgeIds = new Set(edgeRoomNodeIds(layout));
  if (
    layout.review !== "confirmed" ||
    layout.unresolvedMarkers?.length ||
    layout.nodes.some((n) => n.kind === "unresolved" || n.slotKind === "boss") ||
    slots.length !== 8 ||
    kinds.length !== slots.length ||
    kinds.filter((k) => k === "objective").length !== 1 ||
    !edgeIds.size ||
    !Number.isSafeInteger(cursor) ||
    cursor < 0
  )
    throw new Error("Face the Threat 缺已确认八槽边缘图或唯一目标代币（R30 / R-048 / R-116）");
  const rng = createRng(seed);
  for (let i = 0; i < cursor; i++) rng.next();
  const shuffle = (tokens: RoomTokenKind[]) => {
    for (let i = tokens.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [tokens[i], tokens[j]] = [tokens[j]!, tokens[i]!];
      cursor++;
    }
    return tokens;
  };
  const nonObjective = shuffle(kinds.filter((k) => k !== "objective"));
  const edgeTokens = shuffle(["objective", ...nonObjective.slice(0, edgeIds.size - 1)]);
  const remaining = shuffle(nonObjective.slice(edgeIds.size - 1));
  let edgeIndex = 0,
    otherIndex = 0;
  return {
    tokens: slots.map((n) =>
      edgeIds.has(n.id) ? edgeTokens[edgeIndex++]! : remaining[otherIndex++]!,
    ),
    cursor,
  };
}
