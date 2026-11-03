import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import geometry from "../../normalized/corebox/room_tile_geometry.json";
import rooms from "../../normalized/corebox/room.json";
import { rawFileSchema } from "../extract/raw";
import {
  approvedAncestorRoom as tile,
  ancestorRoomSchema,
  assertAncestorRoomSource,
} from "./ancestor-room";
import { buildRoomTileGeometry } from "./room-tile";
import { selectRoomTile } from "./room-tile-selection";

const raw = (name: string) =>
  rawFileSchema.parse(
    JSON.parse(
      readFileSync(new URL(`../../extract/corebox/raw/${name}.json`, import.meta.url), "utf8"),
    ),
  );

it("R-165：十一普通区与八姿态可确定性生成，保持最终战准入关闭", () => {
  const source = raw("dungeon_tile"),
    before = structuredClone(source);
  expect(buildRoomTileGeometry(source)).toEqual(geometry);
  expect(source).toEqual(before);
  expect(tile.source).toEqual({ file: "DD_COREBOX_TILES_BACK.pdf", page: 14, face: "back" });
  expect(tile.areas.map((a) => a.capacity)).toEqual([3, 4, 2, 3, 3, 3, 3, 3, 2, 4, 3]);
  expect(tile.areas.every((a) => a.elevation === "normal")).toBe(true);
  expect(tile.deployment.heroes).toEqual({
    aggressive: "K",
    defensive: "I",
    ranged: "K",
    support: "C",
  });
  expect(tile.deployment.monsters).toEqual({
    aggressive: "E",
    defensive: "B",
    ranged: "A",
    support: "J",
  });
  expect(tile.edges.filter((e) => !e.cornerOnly).map((e) => e.from + "-" + e.to)).toEqual(
    "A-B A-D B-C B-E B-F C-F D-E D-G E-F E-G E-H F-H G-I G-J H-J H-K I-J J-K".split(" "),
  );
  expect(tile.edges.filter((e) => e.cornerOnly).map((e) => e.from + "-" + e.to)).toEqual([
    "B-D",
    "E-J",
  ]);
  expect(tile.edges.some((e) => e.blocked)).toBe(false);
  expect(tile.deployment.lootAreas).toEqual([]);
  expect(tile.specialRegions).toEqual([]);
  expect(
    selectRoomTile(
      rooms.cards.find((c) => c.id === "room:p025"),
      geometry,
    ),
  ).toMatchObject({ status: "refused" });
});

it("拒绝共享边改角点、E-J误通行、部署、容量及准入漂移", () => {
  for (const patch of [
    { usable: true },
    { source: { ...tile.source, face: "front" } },
    { areas: tile.areas.map((a) => (a.id === "J" ? { ...a, capacity: 3 } : a)) },
    { areas: tile.areas.map((a) => ({ ...a, elevation: "high" })) },
    ...[
      ["D", "E"],
      ["H", "J"],
    ].map(([from, to]) => ({
      edges: tile.edges.map((e) =>
        e.from === from && e.to === to ? { ...e, cornerOnly: true } : e,
      ),
    })),
    {
      edges: tile.edges.map((e) =>
        e.from === "E" && e.to === "J" ? { ...e, cornerOnly: false } : e,
      ),
    },
    { deployment: { ...tile.deployment, heroes: { ...tile.deployment.heroes, support: "B" } } },
    { deployment: { ...tile.deployment, monsters: { ...tile.deployment.monsters, ranged: "G" } } },
    { deployment: { ...tile.deployment, lootAreas: ["A"] } },
    { specialRegions: [{ areaId: "E", effect: "invented" }] },
  ])
    expect(ancestorRoomSchema.safeParse({ ...tile, ...patch }).success).toBe(false);
});

it("Room p25来源与无额外卡文记录漂移拒绝", () => {
  expect(() => assertAncestorRoomSource(raw("room"))).not.toThrow();
  for (const kind of ["page", "file", "identity", "text"]) {
    const source = raw("room"),
      card = source.cards.find((c) => c.id === "room:p025")!;
    if (kind === "page") card.faces.front.page = 24;
    if (kind === "file") card.faces.front.file = "wrong.pdf";
    if (kind === "identity") card.id = "room:p024";
    if (kind === "text") card.faces.front.lines.at(-1)!.text += " changed";
    expect(() => assertAncestorRoomSource(source)).toThrow();
  }
});

it("Tile BACK p14来源、编号与八姿态图标缺失拒绝", () => {
  for (const kind of [
    "page",
    "file",
    "number",
    "39d6ddf024",
    "293f170eab",
    "643d396fef",
    "7b8c742c86",
    "8787ebb1b2",
    "1f26dc63eb",
    "7ab26866fc",
    "1a71d94723",
  ]) {
    const source = raw("dungeon_tile"),
      face = source.cards.find((c) => c.id === "dungeon_tile:p014")!.faces.back!;
    if (kind === "page") face.page = 13;
    else if (kind === "file") face.file = "wrong.pdf";
    else if (kind === "number") face.spans = face.spans.filter((s) => s.t !== "12");
    else face.icons = face.icons.filter((i) => i.iconId !== kind);
    expect(() => buildRoomTileGeometry(source)).toThrow();
  }
});
