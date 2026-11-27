import { printIcon, printSourceIcon } from "../../../src/shared/print-icons";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import geometry from "../../../normalized/corebox/room_tile_geometry.json";
import rooms from "../../../normalized/corebox/room.json";
import { rawFileSchema } from "../../../src/shared/extract/raw";
import { assertShufflingHorrorRoomSource } from "../../../src/core/rooms/shuffling-horror-room.build";
import {
  approvedShufflingHorrorRoom as tile,
  shufflingHorrorRoomSchema,
} from "../../../src/core/rooms/shuffling-horror-room";
import { buildRoomTileGeometry } from "../../../src/core/tiles/room-tile.build";
import { selectRoomTile } from "../../../src/core/rooms/room-tile-selection";

const raw = (name: string) =>
  rawFileSchema.parse(
    JSON.parse(
      readFileSync(new URL(`../../../extract/corebox/raw/${name}.json`, import.meta.url), "utf8"),
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
    printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:25"),
    printIcon("stance_support_monster_slot", 216),
    printIcon("stance_ranged_monster_slot", 808),
    printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:54"),
    printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:55"),
    printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:38"),
    printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:53"),
    printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:26"),
  ]) {
    const source = raw("dungeon_tile");
    const face = source.cards.find((c) => c.id === "dungeon_tile:p013")!.faces.back!;
    if (kind === "page") face.page = 12;
    else if (kind === "file") face.file = "wrong.pdf";
    else if (kind === "number") face.spans = face.spans.filter((s) => s.t !== "10");
    else if (kind === "high")
      face.icons.splice(
        face.icons.findIndex(
          (i) =>
            i.iconId ===
            printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:30"),
        ),
        1,
      );
    else face.icons = face.icons.filter((i) => i.iconId !== kind);
    expect(() => buildRoomTileGeometry(source)).toThrow();
  }
});
