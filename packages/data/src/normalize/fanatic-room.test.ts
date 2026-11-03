import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import geometry from "../../normalized/corebox/room_tile_geometry.json";
import rooms from "../../normalized/corebox/room.json";
import { rawFileSchema } from "../extract/raw";
import {
  approvedFanaticRoom as tile,
  fanaticRoomSchema,
  assertFanaticRoomSource,
} from "./fanatic-room";
import { buildRoomTileGeometry } from "./room-tile";
import { selectRoomTile } from "./room-tile-selection";

const raw = (name: string) =>
  rawFileSchema.parse(
    JSON.parse(
      readFileSync(new URL(`../../extract/corebox/raw/${name}.json`, import.meta.url), "utf8"),
    ),
  );

it("R-169：九区、高地与折角可确定性生成，保持Boss准入关闭", () => {
  const source = raw("dungeon_tile"),
    before = structuredClone(source);
  expect(buildRoomTileGeometry(source)).toEqual(geometry);
  expect(source).toEqual(before);
  expect(tile.source).toEqual({ file: "DD_COREBOX_TILES_FRONT.pdf", page: 7, face: "front" });
  expect(tile.areas.map((a) => a.capacity)).toEqual([3, 3, 3, 4, 3, 4, 3, 3, 3]);
  expect(tile.areas.filter((a) => a.id !== "B").every((a) => a.elevation === "normal")).toBe(true);
  expect(tile.deployment.heroes).toEqual({
    aggressive: "H",
    defensive: "A",
    ranged: "H",
    support: "C",
  });
  expect(tile.deployment.monsters).toEqual({
    aggressive: "B",
    defensive: "B",
    ranged: "E",
    support: "E",
  });
  expect(tile.areas[1]?.elevation).toBe("high");
  expect(tile.edges.filter((e) => !e.cornerOnly).map((e) => e.from + "-" + e.to)).toEqual(
    "A-B A-D B-C B-E C-F D-E D-G E-F E-H F-I G-H H-I".split(" "),
  );
  expect(tile.edges.filter((e) => e.cornerOnly).map((e) => e.from + "-" + e.to)).toEqual(
    "B-D B-F D-H E-G E-I F-H".split(" "),
  );
  expect(tile.edges.some((e) => e.blocked)).toBe(false);
  expect(tile.deployment.lootAreas).toEqual([]);
  expect(tile.specialRegions).toEqual([]);
  expect(
    selectRoomTile(
      rooms.cards.find((c) => c.id === "room:p013"),
      geometry,
    ),
  ).toMatchObject({ status: "refused" });
});

it("拒绝共享边改角点、B-D误通行、怪物姿态、容量及准入漂移", () => {
  for (const patch of [
    { usable: true },
    { edges: [...tile.edges, { from: "A", to: "E", cornerOnly: true, blocked: false }] },
    { edges: [...tile.edges, { from: "C", to: "E", cornerOnly: false, blocked: false }] },
    { source: { ...tile.source, face: "back" } },
    { areas: tile.areas.map((a) => (a.id === "E" ? { ...a, capacity: 2 } : a)) },
    { areas: tile.areas.map((a) => ({ ...a, elevation: "high" })) },
    ...[
      ["D", "E"],
      ["F", "I"],
    ].map(([from, to]) => ({
      edges: tile.edges.map((e) =>
        e.from === from && e.to === to ? { ...e, cornerOnly: true } : e,
      ),
    })),
    {
      edges: tile.edges.map((e) =>
        e.from === "B" && e.to === "D" ? { ...e, cornerOnly: false } : e,
      ),
    },
    { deployment: { ...tile.deployment, heroes: { ...tile.deployment.heroes, support: "B" } } },
    { deployment: { ...tile.deployment, monsters: { ...tile.deployment.monsters, ranged: "G" } } },
    { deployment: { ...tile.deployment, lootAreas: ["A"] } },
    { specialRegions: [{ areaId: "E", effect: "invented" }] },
  ])
    expect(fanaticRoomSchema.safeParse({ ...tile, ...patch }).success).toBe(false);
});

it("Room p13来源与无额外卡文记录漂移拒绝", () => {
  expect(() => assertFanaticRoomSource(raw("room"))).not.toThrow();
  for (const kind of ["page", "file", "identity", "text"]) {
    const source = raw("room"),
      card = source.cards.find((c) => c.id === "room:p013")!;
    if (kind === "page") card.faces.front.page = 24;
    if (kind === "file") card.faces.front.file = "wrong.pdf";
    if (kind === "identity") card.id = "room:p024";
    if (kind === "text") card.faces.front.lines.at(-1)!.text += " changed";
    expect(() => assertFanaticRoomSource(source)).toThrow();
  }
});

it("Tile FRONT p7来源、高地与八姿态图标缺失拒绝", () => {
  for (const kind of [
    "page",
    "file",
    "number",
    "98ecd549c4",
    "293f170eab",
    "643d396fef",
    "1f26dc63eb",
    "39d6ddf024",
    "7b8c742c86",
    "8787ebb1b2",
    "7ab26866fc",
    "1a71d94723",
  ]) {
    const source = raw("dungeon_tile"),
      face = source.cards.find((c) => c.id === "dungeon_tile:p007")!.faces.front;
    if (kind === "page") face.page = 5;
    else if (kind === "file") face.file = "wrong.pdf";
    else if (kind === "number") face.spans = face.spans.filter((s) => s.t !== "13");
    else face.icons = face.icons.filter((i) => i.iconId !== kind);
    expect(() => buildRoomTileGeometry(source)).toThrow();
  }
});

it("25张具名Room均有唯一获批几何，八张Boss仍拒绝普通战斗入口", () => {
  expect(geometry.tiles).toHaveLength(25);
  expect(new Set(geometry.tiles.map((t) => t.roomId))).toEqual(
    new Set(rooms.cards.map((c) => c.id)),
  );
  expect(geometry.tiles.every((t) => t.geometryVerified)).toBe(true);
  expect(geometry.tiles.filter((t) => t.usable)).toHaveLength(13);
  const bosses = rooms.cards.filter((c) => c.boss);
  expect(bosses).toHaveLength(8);
  for (const card of bosses) {
    expect(geometry.tiles.find((t) => t.roomId === card.id)?.usable).toBe(false);
    expect(selectRoomTile(card, geometry)).toMatchObject({ status: "refused" });
  }
});
