import { expect, it } from "vitest";
import corePool from "../../../../data/normalized/corebox/monster_pool.json";
import raw from "../../../../data/extract/extension/weald/raw/monster_medium.json";
import printed from "../../../../data/normalized/extension/weald/pounder_i.json";
import { wealdPounderContentSchema } from "../../../../data/src/weald/bosses/pounder/weald-pounder";
import { wealdRoomTileSchema } from "../../../../data/src/weald/rooms/weald-room";
import { findWealdRoomTile } from "../../../src/weald/room-catalog";
import { resolveScriptIdForDescriptionCard } from "../../../src/core/bosses/threat-description-catalog";
import {
  WEALD_POUNDER_I_CONTENT as content,
  pounderIApprovedBattleAreas,
  pounderIFusilierSource,
} from "../../../src/weald/bosses/pounder-i-content";

it("R-258 核准属性与实际卡面页码对应，不把 Dodge 当 Speed", () => {
  expect(content.faces.map((f) => [f.rawId, f.life, f.speed, f.dodge, f.innateProtection])).toEqual(
    [
      ["monster_medium:weald:p020", 55, 0, 0, true],
      ["monster_medium:weald:p023", 7, 1, 2, false],
    ],
  );
  for (const face of content.faces) {
    const card = raw.cards.find((c) => c.id === face.rawId)!;
    expect(card.faces.front.file).toBe(content.sources.combatFront);
    expect(card.faces.front.page).toBe(Number(face.rawId.slice(-3)));
    expect(card.copies).toBe(1);
  }
  expect(content.faces[0].types).toEqual([]);
  expect(content.faces[0].skill).toMatchObject({ accuracy: 9, damage: 9, onHitStress: 2 });
  expect(content.faces[1].skill).toMatchObject({
    accuracy: null,
    damage: null,
    requiresSameArea: true,
  });
});

it("十二区只将16对共边投影为双向相邻，角点与墙不通行", () => {
  const before = structuredClone(content);
  const areas = pounderIApprovedBattleAreas();
  const adjacent = (id: string) => areas.find((a) => a.id === id)!.adjacent;
  expect(areas).toHaveLength(12);
  expect(areas.reduce((n, a) => n + a.adjacent.length, 0)).toBe(32);
  for (const pair of ["AE", "BF", "CE", "EH", "GK", "DE", "EG"]) {
    expect(adjacent(pair[0]!)).not.toContain(pair[1]);
    expect(adjacent(pair[1]!)).not.toContain(pair[0]);
  }
  expect(adjacent("I")).toEqual(["E", "H", "J", "K"]);
  expect(areas.find((a) => a.id === "I")?.capacity).toBe(2);
  expect(areas.every((a) => a.elevation === "normal" && !a.zeroCapacity)).toBe(true);
  expect(content).toEqual(before);
});

it("Fusilier 来自完整核心I级通用目录，保留三实体页且不修改来源", () => {
  const before = structuredClone(corePool.cards);
  expect(pounderIFusilierSource(corePool.cards)).toMatchObject({
    combatCardId: "monster_medium:p027",
    level: 1,
    location: "common",
    pages: [27, 28, 29],
  });
  expect(corePool.cards).toEqual(before);
  expect(() =>
    pounderIFusilierSource(corePool.cards.filter((c) => c.id !== "monster_medium:p027")),
  ).toThrow();
});

it("独立Boss数据不放入普通房间，不提升Pounder注册或运行资格", () => {
  expect(content.combatReady).toBe(false);
  expect(content.tile.usable).toBe(false);
  expect(findWealdRoomTile(content.tile.roomId)).toBeUndefined();
  expect(wealdRoomTileSchema.safeParse(content.tile).success).toBe(false);
  expect(
    resolveScriptIdForDescriptionCard(content.abilities.descriptionCardId, ["core", "weald"]),
  ).toBeUndefined();
});

it.each(["identity", "selection", "unknownArea", "reverseEdge", "terrain", "ready"])(
  "拒绝 %s 漂移，保留独立数据边界",
  (kind) => {
    const bad = structuredClone(printed);
    if (kind === "identity") bad.faces[0]!.rawId = bad.faces[1]!.rawId;
    if (kind === "selection") bad.faces[0]!.selection = "skill1AllStances";
    if (kind === "unknownArea") bad.tile.deployment.monsters.support = "unknown";
    if (kind === "reverseEdge") {
      const edge = bad.tile.edges[0]!;
      bad.tile.edges.push({ ...edge, from: edge.to, to: edge.from });
    }
    if (kind === "terrain") bad.tile.areas[0]!.elevation = "high";
    if (kind === "ready") bad.combatReady = true;
    expect(wealdPounderContentSchema.safeParse(bad).success).toBe(false);
  },
);
