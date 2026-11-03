import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import geometry from "../../normalized/corebox/room_tile_geometry.json";
import rooms from "../../normalized/corebox/room.json";
import { rawFileSchema } from "../extract/raw";
import {
  approvedToxicChamber as tile,
  toxicChamberSchema,
  assertToxicChamberEffectSource,
} from "./toxic-chamber";
import { buildRoomTileGeometry } from "./room-tile";
import { selectRoomTile } from "./room-tile-selection";

const raw = (name: string) =>
  rawFileSchema.parse(
    JSON.parse(
      readFileSync(new URL(`../../extract/corebox/raw/${name}.json`, import.meta.url), "utf8"),
    ),
  );

it("R-157：BACK p10独立面、10区容量/高地、修正D/F部署与四个宝箱", () => {
  const source = raw("dungeon_tile");
  const before = structuredClone(source);
  expect(buildRoomTileGeometry(source)).toEqual(geometry);
  expect(source).toEqual(before);
  expect(tile.source).toEqual({ file: "DD_COREBOX_TILES_BACK.pdf", page: 10, face: "back" });
  expect(tile.areas.map((a) => a.capacity)).toEqual([2, 4, 2, 4, 2, 2, 4, 2, 3, 2]);
  expect(tile.areas.filter((a) => a.elevation === "high").map((a) => a.id)).toEqual(["F"]);
  expect(tile.edges.filter((e) => !e.cornerOnly).map((e) => e.from + "-" + e.to)).toEqual([
    "A-B",
    "A-D",
    "B-C",
    "C-G",
    "D-H",
    "E-F",
    "F-I",
    "G-J",
    "H-I",
    "I-J",
  ]);
  expect(tile.edges.filter((e) => e.cornerOnly).map((e) => e.from + "-" + e.to)).toEqual([
    "B-D",
    "B-G",
    "D-I",
    "G-I",
  ]);
  expect(tile.edges.some((e) => e.blocked)).toBe(false);
  expect(tile.deployment.heroes).toEqual({
    aggressive: "J",
    defensive: "H",
    ranged: "J",
    support: "H",
  });
  expect(tile.deployment.monsters).toEqual({
    aggressive: "D",
    defensive: "G",
    ranged: "F",
    support: "F",
  });
  expect(
    tile.deployment.markers
      .filter((m) => m.semantic.startsWith("monster_"))
      .map((m) => [m.areaId, m.semantic]),
  ).toEqual([
    ["D", "monster_aggressive_start"],
    ["G", "monster_defensive_start"],
    ["F", "monster_ranged_start"],
    ["F", "monster_support_start"],
  ]);
  expect(tile.deployment.lootAreas).toEqual(["B", "B", "E", "E"]);
  expect(tile.specialRegions.map((r) => r.areaId)).toEqual(["A", "B", "C", "E"]);
});

it("R-157：Toxic Vapors 就绪后 selectRoomTile 返回 matched；几何漂移仍拒绝", () => {
  expect(tile.usable).toBe(true);
  expect(tile.specialRegions.every((r) => r.runtimeReady)).toBe(true);
  expect(
    selectRoomTile(
      rooms.cards.find((c) => c.id === "room:p017"),
      geometry,
    ),
  ).toMatchObject({ status: "matched" });
  for (const patch of [
    { areas: tile.areas.map((a) => (a.id === "E" ? { ...a, capacity: 4 } : a)) },
    { edges: tile.edges.slice(1) },
    {
      deployment: {
        ...tile.deployment,
        monsters: { ...tile.deployment.monsters, aggressive: "F", support: "D" },
      },
    },
    { deployment: { ...tile.deployment, lootAreas: ["B", "E"] } },
    { specialRegions: tile.specialRegions.slice(1) },
    { source: { ...tile.source, face: "front" } },
    { deployment: { ...tile.deployment, heroes: { ...tile.deployment.heroes, support: "E" } } },
  ])
    expect(toxicChamberSchema.safeParse({ ...tile, ...patch }).success).toBe(false);
});

it("Room p17来源、星标、卡文漂移拒绝", () => {
  const source = raw("room");
  expect(() => assertToxicChamberEffectSource(source)).not.toThrow();
  for (const kind of ["page", "file", "text", "star", "identity"] as const) {
    const changed = structuredClone(source);
    const card = changed.cards.find((c) => c.id === "room:p017")!;
    const face = card.faces.front;
    if (kind === "page") face.page = 16;
    if (kind === "file") face.file = "wrong.pdf";
    if (kind === "text") face.lines.at(-1)!.text += " changed";
    if (kind === "star") face.icons = face.icons.filter((i) => i.iconId !== "a74b9dc080");
    if (kind === "identity") card.id = "room:p016";
    expect(() => assertToxicChamberEffectSource(changed)).toThrow();
  }
});

it("Tile p10来源、编号、部署或星标缺失时拒绝生成", () => {
  for (const kind of ["page", "file", "number", "star", "deployment"] as const) {
    const changed = raw("dungeon_tile");
    const face = changed.cards.find((c) => c.id === "dungeon_tile:p010")!.faces.back!;
    if (kind === "page") face.page = 9;
    if (kind === "file") face.file = "wrong.pdf";
    if (kind === "number") face.spans = face.spans.filter((s) => s.t !== "4");
    if (kind === "star") face.icons = face.icons.filter((i) => i.iconId !== "4591aebebd");
    if (kind === "deployment") face.icons = face.icons.filter((i) => i.iconId !== "39d6ddf024");
    expect(() => buildRoomTileGeometry(changed)).toThrow();
  }
});
