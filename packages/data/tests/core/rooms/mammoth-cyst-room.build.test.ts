import { printIcon, printLine, printSourceIcon } from "../../../src/shared/print-icons";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import geometry from "../../../normalized/corebox/room_tile_geometry.json";
import rooms from "../../../normalized/corebox/room.json";
import { rawFileSchema } from "../../../src/shared/extract/raw";
import { assertMammothCystRoomSource } from "../../../src/core/rooms/mammoth-cyst-room.build";
import {
  approvedMammothCystRoom as tile,
  mammothCystRoomSchema,
} from "../../../src/core/rooms/mammoth-cyst-room";
import { buildRoomTileGeometry } from "../../../src/core/tiles/room-tile.build";
import { selectRoomTile } from "../../../src/core/rooms/room-tile-selection";

const raw = (name: string) =>
  rawFileSchema.parse(
    JSON.parse(
      readFileSync(new URL(`../../../extract/corebox/raw/${name}.json`, import.meta.url), "utf8"),
    ),
  );

it("R-164：J/L容量2、H容量5与八姿态确定性生成；紫星仅保存印刷信息", () => {
  const source = raw("dungeon_tile"),
    before = structuredClone(source);
  expect(buildRoomTileGeometry(source)).toEqual(geometry);
  expect(source).toEqual(before);
  expect(tile.source).toEqual({ file: "DD_COREBOX_TILES_FRONT.pdf", page: 14, face: "front" });
  expect(tile.areas.map((a) => a.capacity)).toEqual([2, 3, 2, 3, 4, 3, 2, 5, 2, 2, 4, 2]);
  expect(tile.areas.every((a) => a.elevation === "normal")).toBe(true);
  expect(tile.deployment.heroes).toEqual({
    aggressive: "K",
    defensive: "K",
    ranged: "K",
    support: "K",
  });
  expect(tile.deployment.monsters).toEqual({
    aggressive: "H",
    defensive: "H",
    ranged: "E",
    support: "E",
  });
  expect(tile.edges.map((e) => e.from + "-" + e.to)).toEqual(
    "A-D B-E C-F D-E D-G E-F E-H F-I G-J H-K I-L J-K K-L".split(" "),
  );
  expect(tile.edges.some((e) => e.cornerOnly || e.blocked)).toBe(false);
  expect(tile.deployment.lootAreas).toEqual([]);
  expect(tile.printedMarkers.map((m) => [m.areaId, m.printedRange])).toEqual([
    ["A", "1-2"],
    ["C", "3-4"],
    ["B", "5-6"],
    ["G", "7-8"],
    ["I", "9-10"],
  ]);
  expect(tile.printedMarkers.every((m) => m.color === "purple" && m.status === "confirmed")).toBe(
    true,
  );
  expect(tile.specialRegions).toEqual([]);
  expect(
    selectRoomTile(
      rooms.cards.find((c) => c.id === "room:p024"),
      geometry,
    ),
  ).toMatchObject({ status: "refused" });
});

it("拒绝旧J/L容量、H截断、部署、紫星编号与黑带补边漂移", () => {
  for (const patch of [
    { usable: true },
    ...["J", "L"].map((id) => ({
      areas: tile.areas.map((a) => (a.id === id ? { ...a, capacity: 3 } : a)),
    })),
    { areas: tile.areas.map((a) => (a.id === "H" ? { ...a, capacity: 4 } : a)) },
    { areas: tile.areas.map((a) => ({ ...a, elevation: "high" })) },
    { deployment: { ...tile.deployment, heroes: { ...tile.deployment.heroes, support: "H" } } },
    { deployment: { ...tile.deployment, monsters: { ...tile.deployment.monsters, ranged: "K" } } },
    { edges: [...tile.edges, { from: "G", to: "H", cornerOnly: false, blocked: false }] },
    { printedMarkers: tile.printedMarkers.slice(1) },
    { printedMarkers: tile.printedMarkers.map((m) => ({ ...m, printedRange: "1-10" })) },
    { specialRegions: [{ areaId: "A", effect: "invented" }] },
    { deployment: { ...tile.deployment, lootAreas: ["H"] } },
  ])
    expect(mammothCystRoomSchema.safeParse({ ...tile, ...patch }).success).toBe(false);
});

it("Room p24来源与无额外卡文记录漂移拒绝", () => {
  expect(() => assertMammothCystRoomSource(raw("room"))).not.toThrow();
  for (const kind of ["page", "file", "identity", "text"]) {
    const source = raw("room"),
      card = source.cards.find((c) => c.id === "room:p024")!;
    if (kind === "page") card.faces.front.page = 23;
    if (kind === "file") card.faces.front.file = "wrong.pdf";
    if (kind === "identity") card.id = "room:p023";
    if (kind === "text") card.faces.front.lines.at(-1)!.text += " changed";
    expect(() => assertMammothCystRoomSource(source)).toThrow();
  }
});

it("Tile FRONT p14来源、编号、紫星/区间与八姿态图标缺失拒绝", () => {
  for (const kind of [
    "page",
    "file",
    "number",
    "star",
    "range",
    printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:25"),
    printIcon("stance_support_monster_slot", 216),
    printIcon("stance_ranged_monster_slot", 808),
    printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:54"),
    printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:55"),
    printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:38"),
    printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:53"),
    printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:26"),
  ]) {
    const source = raw("dungeon_tile"),
      face = source.cards.find((c) => c.id === "dungeon_tile:p014")!.faces.front;
    if (kind === "page") face.page = 13;
    else if (kind === "file") face.file = "wrong.pdf";
    else if (kind === "number") face.spans = face.spans.filter((s) => s.t !== "11");
    else if (kind === "star")
      face.icons.splice(
        face.icons.findIndex(
          (i) =>
            i.iconId ===
            printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p014:front:11"),
        ),
        1,
      );
    else if (kind === "range")
      face.lines = face.lines.filter(
        (l) =>
          l.text !==
          printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p014:front:11} 7-8"),
      );
    else face.icons = face.icons.filter((i) => i.iconId !== kind);
    expect(() => buildRoomTileGeometry(source)).toThrow();
  }
});
