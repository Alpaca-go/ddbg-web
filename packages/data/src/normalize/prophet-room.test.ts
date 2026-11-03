import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import geometry from "../../normalized/corebox/room_tile_geometry.json";
import rooms from "../../normalized/corebox/room.json";
import { rawFileSchema } from "../extract/raw";
import {
  approvedProphetRoom as tile,
  prophetRoomSchema,
  assertProphetRoomSource,
} from "./prophet-room";
import { buildRoomTileGeometry } from "./room-tile";
import { selectRoomTile } from "./room-tile-selection";

const raw = (name: string) =>
  rawFileSchema.parse(
    JSON.parse(
      readFileSync(new URL(`../../extract/corebox/raw/${name}.json`, import.meta.url), "utf8"),
    ),
  );

it("R-167：八区、橙色标记及短共享边可确定性生成，保持Boss准入关闭", () => {
  const source = raw("dungeon_tile"),
    before = structuredClone(source);
  expect(buildRoomTileGeometry(source)).toEqual(geometry);
  expect(source).toEqual(before);
  expect(tile.source).toEqual({ file: "DD_COREBOX_TILES_FRONT.pdf", page: 6, face: "front" });
  expect(tile.areas.map((a) => a.capacity)).toEqual([4, 3, 3, 3, 3, 4, 3, 3]);
  expect(tile.areas.every((a) => a.elevation === "normal")).toBe(true);
  expect(tile.deployment.heroes).toEqual({
    aggressive: "C",
    defensive: "H",
    ranged: "H",
    support: "D",
  });
  expect(tile.deployment.monsters).toEqual({ aggressive: "E" });
  expect(tile.edges.filter((e) => !e.cornerOnly).map((e) => e.from + "-" + e.to)).toEqual(
    "A-B A-D B-C B-E C-F D-E D-G D-H E-F E-H F-H G-H".split(" "),
  );
  expect(tile.edges.filter((e) => e.cornerOnly).map((e) => e.from + "-" + e.to)).toEqual(
    "A-E B-F C-E".split(" "),
  );
  expect(tile.edges.some((e) => e.blocked)).toBe(false);
  expect(tile.deployment.lootAreas).toEqual([]);
  expect(tile.specialRegions).toEqual([]);
  expect(tile.printedMarkers.map((m) => [m.areaId, m.printedRange])).toEqual([
    ["A", "1-2"],
    ["B", "3"],
    ["C", "4"],
    ["D", "5"],
    ["E", "6"],
    ["F", "7-8"],
    ["G", "9"],
    ["H", "10"],
  ]);
  expect(
    selectRoomTile(
      rooms.cards.find((c) => c.id === "room:p011"),
      geometry,
    ),
  ).toMatchObject({ status: "refused" });
});

it("拒绝共享边改角点、A-E误通行、补造怪物姿态、容量及准入漂移", () => {
  for (const patch of [
    { usable: true },
    { printedMarkers: tile.printedMarkers.slice(1) },
    { printedMarkers: tile.printedMarkers.map((m) => ({ ...m, printedRange: "wrong" })) },
    { source: { ...tile.source, face: "back" } },
    { areas: tile.areas.map((a) => (a.id === "E" ? { ...a, capacity: 2 } : a)) },
    { areas: tile.areas.map((a) => ({ ...a, elevation: "high" })) },
    ...[
      ["D", "H"],
      ["F", "H"],
    ].map(([from, to]) => ({
      edges: tile.edges.map((e) =>
        e.from === from && e.to === to ? { ...e, cornerOnly: true } : e,
      ),
    })),
    {
      edges: tile.edges.map((e) =>
        e.from === "A" && e.to === "E" ? { ...e, cornerOnly: false } : e,
      ),
    },
    { deployment: { ...tile.deployment, heroes: { ...tile.deployment.heroes, support: "B" } } },
    { deployment: { ...tile.deployment, monsters: { ...tile.deployment.monsters, ranged: "G" } } },
    { deployment: { ...tile.deployment, lootAreas: ["A"] } },
    { specialRegions: [{ areaId: "E", effect: "invented" }] },
  ])
    expect(prophetRoomSchema.safeParse({ ...tile, ...patch }).success).toBe(false);
});

it("Room p11来源与无额外卡文记录漂移拒绝", () => {
  expect(() => assertProphetRoomSource(raw("room"))).not.toThrow();
  for (const kind of ["page", "file", "identity", "text"]) {
    const source = raw("room"),
      card = source.cards.find((c) => c.id === "room:p011")!;
    if (kind === "page") card.faces.front.page = 24;
    if (kind === "file") card.faces.front.file = "wrong.pdf";
    if (kind === "identity") card.id = "room:p024";
    if (kind === "text") card.faces.front.lines.at(-1)!.text += " changed";
    expect(() => assertProphetRoomSource(source)).toThrow();
  }
});

it("Tile FRONT p6来源、编号与五姿态图标缺失拒绝", () => {
  for (const kind of [
    "page",
    "file",
    "number",
    "99be282315",
    "39d6ddf024",
    "7b8c742c86",
    "8787ebb1b2",
    "7ab26866fc",
    "1a71d94723",
  ]) {
    const source = raw("dungeon_tile"),
      face = source.cards.find((c) => c.id === "dungeon_tile:p006")!.faces.front;
    if (kind === "page") face.page = 5;
    else if (kind === "file") face.file = "wrong.pdf";
    else if (kind === "number") face.spans = face.spans.filter((s) => s.t !== "11");
    else face.icons = face.icons.filter((i) => i.iconId !== kind);
    expect(() => buildRoomTileGeometry(source)).toThrow();
  }
});
