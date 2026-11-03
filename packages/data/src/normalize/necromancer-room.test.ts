import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import geometry from "../../normalized/corebox/room_tile_geometry.json";
import rooms from "../../normalized/corebox/room.json";
import { rawFileSchema } from "../extract/raw";
import {
  approvedNecromancerRoom as tile,
  necromancerRoomSchema,
  assertNecromancerRoomSource,
} from "./necromancer-room";
import { buildRoomTileGeometry } from "./room-tile";
import { selectRoomTile } from "./room-tile-selection";

const raw = (name: string) =>
  rawFileSchema.parse(
    JSON.parse(
      readFileSync(new URL(`../../extract/corebox/raw/${name}.json`, import.meta.url), "utf8"),
    ),
  );

it("R-166：八区与E容量修正可确定性生成，保持Boss准入关闭", () => {
  const source = raw("dungeon_tile"),
    before = structuredClone(source);
  expect(buildRoomTileGeometry(source)).toEqual(geometry);
  expect(source).toEqual(before);
  expect(tile.source).toEqual({ file: "DD_COREBOX_TILES_BACK.pdf", page: 6, face: "back" });
  expect(tile.areas.map((a) => a.capacity)).toEqual([3, 4, 3, 4, 3, 2, 4, 2]);
  expect(tile.areas.slice(1).every((a) => a.elevation === "normal")).toBe(true);
  expect(tile.deployment.heroes).toEqual({
    aggressive: "G",
    defensive: "G",
    ranged: "G",
    support: "G",
  });
  expect(tile.deployment.monsters).toEqual({ aggressive: "A" });
  expect(tile.areas[0]?.elevation).toBe("high");
  expect(tile.edges.filter((e) => !e.cornerOnly).map((e) => e.from + "-" + e.to)).toEqual(
    "A-C B-C B-E B-F C-D C-E D-E D-H E-G F-G G-H".split(" "),
  );
  expect(tile.edges.filter((e) => e.cornerOnly).map((e) => e.from + "-" + e.to)).toEqual(
    "A-B A-D B-G D-G E-F E-H".split(" "),
  );
  expect(tile.edges.some((e) => e.blocked)).toBe(false);
  expect(tile.deployment.lootAreas).toEqual([]);
  expect(tile.specialRegions).toEqual([]);
  expect(
    selectRoomTile(
      rooms.cards.find((c) => c.id === "room:p010"),
      geometry,
    ),
  ).toMatchObject({ status: "refused" });
});

it("拒绝共享边改角点、E-F误通行、补造怪物姿态、容量及准入漂移", () => {
  for (const patch of [
    { usable: true },
    { source: { ...tile.source, face: "front" } },
    { areas: tile.areas.map((a) => (a.id === "E" ? { ...a, capacity: 2 } : a)) },
    { areas: tile.areas.map((a) => ({ ...a, elevation: "high" })) },
    ...[
      ["D", "E"],
      ["E", "G"],
    ].map(([from, to]) => ({
      edges: tile.edges.map((e) =>
        e.from === from && e.to === to ? { ...e, cornerOnly: true } : e,
      ),
    })),
    {
      edges: tile.edges.map((e) =>
        e.from === "E" && e.to === "F" ? { ...e, cornerOnly: false } : e,
      ),
    },
    { deployment: { ...tile.deployment, heroes: { ...tile.deployment.heroes, support: "B" } } },
    { deployment: { ...tile.deployment, monsters: { ...tile.deployment.monsters, ranged: "G" } } },
    { deployment: { ...tile.deployment, lootAreas: ["A"] } },
    { specialRegions: [{ areaId: "E", effect: "invented" }] },
  ])
    expect(necromancerRoomSchema.safeParse({ ...tile, ...patch }).success).toBe(false);
});

it("Room p10来源与无额外卡文记录漂移拒绝", () => {
  expect(() => assertNecromancerRoomSource(raw("room"))).not.toThrow();
  for (const kind of ["page", "file", "identity", "text"]) {
    const source = raw("room"),
      card = source.cards.find((c) => c.id === "room:p010")!;
    if (kind === "page") card.faces.front.page = 24;
    if (kind === "file") card.faces.front.file = "wrong.pdf";
    if (kind === "identity") card.id = "room:p024";
    if (kind === "text") card.faces.front.lines.at(-1)!.text += " changed";
    expect(() => assertNecromancerRoomSource(source)).toThrow();
  }
});

it("Tile BACK p6来源、编号与五姿态图标缺失拒绝", () => {
  for (const kind of [
    "page",
    "file",
    "number",
    "39d6ddf024",
    "7b8c742c86",
    "8787ebb1b2",
    "7ab26866fc",
    "1a71d94723",
  ]) {
    const source = raw("dungeon_tile"),
      face = source.cards.find((c) => c.id === "dungeon_tile:p006")!.faces.back!;
    if (kind === "page") face.page = 5;
    else if (kind === "file") face.file = "wrong.pdf";
    else if (kind === "number") face.spans = face.spans.filter((s) => s.t !== "10");
    else face.icons = face.icons.filter((i) => i.iconId !== kind);
    expect(() => buildRoomTileGeometry(source)).toThrow();
  }
});
