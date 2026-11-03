import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import geometry from "../../normalized/corebox/room_tile_geometry.json";
import rooms from "../../normalized/corebox/room.json";
import { rawFileSchema } from "../extract/raw";
import {
  approvedShufflingHorrorRoom as tile,
  shufflingHorrorRoomSchema,
  assertShufflingHorrorRoomSource,
} from "./shuffling-horror-room";
import { buildRoomTileGeometry } from "./room-tile";
import { selectRoomTile } from "./room-tile-selection";

const raw = (name: string) =>
  rawFileSchema.parse(
    JSON.parse(
      readFileSync(new URL(`../../extract/corebox/raw/${name}.json`, import.meta.url), "utf8"),
    ),
  );

it("R-163：BACK p13九区、两高地及八姿态确定性生成，不改变输入或开放Boss", () => {
  const source = raw("dungeon_tile");
  const before = structuredClone(source);
  expect(buildRoomTileGeometry(source)).toEqual(geometry);
  expect(source).toEqual(before);
  expect(tile.source).toEqual({ file: "DD_COREBOX_TILES_BACK.pdf", page: 13, face: "back" });
  expect(tile.areas.map((a) => a.capacity)).toEqual([2, 3, 2, 3, 3, 3, 3, 3, 3]);
  expect(tile.areas.filter((a) => a.elevation === "high").map((a) => a.id)).toEqual(["A", "C"]);
  expect(tile.deployment.heroes).toEqual({
    aggressive: "G",
    defensive: "I",
    ranged: "I",
    support: "B",
  });
  expect(tile.deployment.monsters).toEqual({
    aggressive: "H",
    defensive: "H",
    ranged: "D",
    support: "C",
  });
  expect(tile.edges.filter((e) => !e.cornerOnly).map((e) => e.from + "-" + e.to)).toEqual(
    "A-D B-E C-F D-E D-G E-F F-I G-H H-I".split(" "),
  );
  expect(tile.edges.filter((e) => e.cornerOnly).map((e) => e.from + "-" + e.to)).toEqual([
    "B-D",
    "B-F",
    "D-H",
    "F-H",
  ]);
  expect(tile.edges.some((e) => e.blocked)).toBe(false);
  expect(tile.specialRegions).toEqual([]);
  expect(tile.deployment.lootAreas).toEqual([]);
  expect(
    selectRoomTile(
      rooms.cards.find((c) => c.id === "room:p023"),
      geometry,
    ),
  ).toMatchObject({ status: "refused" });
});

it("拒绝高地、容量、部署、黑带通路或准入漂移", () => {
  for (const patch of [
    { usable: true },
    { source: { ...tile.source, face: "front" } },
    { areas: tile.areas.map((a) => (a.id === "A" ? { ...a, elevation: "normal" } : a)) },
    { areas: tile.areas.map((a) => (a.id === "E" ? { ...a, capacity: 4 } : a)) },
    { edges: [...tile.edges, { from: "E", to: "H", cornerOnly: false, blocked: false }] },
    { edges: tile.edges.map((e) => ({ ...e, cornerOnly: false })) },
    { deployment: { ...tile.deployment, heroes: { ...tile.deployment.heroes, support: "C" } } },
    { deployment: { ...tile.deployment, monsters: { ...tile.deployment.monsters, ranged: "G" } } },
    { deployment: { ...tile.deployment, lootAreas: ["A"] } },
    { specialRegions: [{ areaId: "E", effect: "invented" }] },
  ])
    expect(shufflingHorrorRoomSchema.safeParse({ ...tile, ...patch }).success).toBe(false);
});

it("Room p23来源、无额外卡文记录漂移拒绝", () => {
  expect(() => assertShufflingHorrorRoomSource(raw("room"))).not.toThrow();
  for (const kind of ["page", "file", "identity", "text"]) {
    const source = raw("room");
    const card = source.cards.find((c) => c.id === "room:p023")!;
    if (kind === "page") card.faces.front.page = 22;
    if (kind === "file") card.faces.front.file = "wrong.pdf";
    if (kind === "identity") card.id = "room:p022";
    if (kind === "text") card.faces.front.lines.at(-1)!.text += " changed";
    expect(() => assertShufflingHorrorRoomSource(source)).toThrow();
  }
});

it("Tile BACK p13来源、编号、高地或部署图标缺失拒绝", () => {
  for (const kind of [
    "page",
    "file",
    "number",
    "high",
    "39d6ddf024",
    "293f170eab",
    "643d396fef",
    "7b8c742c86",
    "8787ebb1b2",
    "1f26dc63eb",
    "7ab26866fc",
    "1a71d94723",
  ]) {
    const source = raw("dungeon_tile");
    const face = source.cards.find((c) => c.id === "dungeon_tile:p013")!.faces.back!;
    if (kind === "page") face.page = 12;
    else if (kind === "file") face.file = "wrong.pdf";
    else if (kind === "number") face.spans = face.spans.filter((s) => s.t !== "10");
    else if (kind === "high")
      face.icons.splice(
        face.icons.findIndex((i) => i.iconId === "78197bdba8"),
        1,
      );
    else face.icons = face.icons.filter((i) => i.iconId !== kind);
    expect(() => buildRoomTileGeometry(source)).toThrow();
  }
});
