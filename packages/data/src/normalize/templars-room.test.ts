import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import geometry from "../../normalized/corebox/room_tile_geometry.json";
import rooms from "../../normalized/corebox/room.json";
import { rawFileSchema } from "../extract/raw";
import {
  approvedTemplarsRoom as tile,
  templarsRoomSchema,
  assertTemplarsRoomEffectSource,
} from "./templars-room";
import { buildRoomTileGeometry } from "./room-tile";
import { selectRoomTile } from "./room-tile-selection";

const raw = (name: string) =>
  rawFileSchema.parse(
    JSON.parse(
      readFileSync(new URL(`../../extract/corebox/raw/${name}.json`, import.meta.url), "utf8"),
    ),
  );

it("R-162：生成十四区、五个尖刺编号及修正后的八姿态部署，不开放Boss参战", () => {
  const source = raw("dungeon_tile");
  const before = structuredClone(source);
  expect(buildRoomTileGeometry(source)).toEqual(geometry);
  expect(source).toEqual(before);
  expect(tile.source).toEqual({ file: "DD_COREBOX_TILES_FRONT.pdf", page: 13, face: "front" });
  expect(tile.areas.map((a) => a.capacity)).toEqual([2, 1, 2, 4, 1, 4, 2, 1, 3, 4, 1, 4, 2, 1]);
  expect(tile.areas.every((a) => a.elevation === "normal")).toBe(true);
  expect(tile.deployment.heroes).toEqual({
    aggressive: "I",
    defensive: "F",
    ranged: "G",
    support: "F",
  });
  expect(tile.deployment.monsters).toEqual({
    aggressive: "M",
    defensive: "M",
    ranged: "C",
    support: "C",
  });
  expect(tile.deployment.lootAreas).toEqual([]);
  expect(tile.specialRegions.map((r) => [r.areaId, r.printedRange])).toEqual([
    ["B", "1-2"],
    ["E", "3-4"],
    ["H", "5-6"],
    ["K", "7-8"],
    ["N", "9-10"],
  ]);
  expect(tile.edges.filter((e) => !e.cornerOnly).map((e) => e.from + "-" + e.to)).toEqual(
    "A-B A-C A-F B-C B-F C-D C-F D-E D-G D-I E-I F-G F-H F-J G-H G-I H-L I-L J-K L-M L-N M-N".split(
      " ",
    ),
  );
  expect(tile.edges.filter((e) => e.cornerOnly).map((e) => e.from + "-" + e.to)).toEqual([
    "C-G",
    "D-F",
    "E-G",
    "F-L",
  ]);
  expect(tile.edges.some((e) => e.blocked)).toBe(false);
  expect(
    selectRoomTile(
      rooms.cards.find((c) => c.id === "room:p022"),
      geometry,
    ),
  ).toMatchObject({ status: "refused" });
});

it("拒绝旧部署、尖刺编号/区域、容量、连接与提前开放漂移", () => {
  for (const patch of [
    { usable: true },
    {
      deployment: {
        ...tile.deployment,
        heroes: { ...tile.deployment.heroes, aggressive: "G", ranged: "I" },
      },
    },
    {
      deployment: {
        ...tile.deployment,
        monsters: { ...tile.deployment.monsters, aggressive: "C", ranged: "M" },
      },
    },
    { specialRegions: tile.specialRegions.slice(1) },
    {
      specialRegions: tile.specialRegions.map((r, i) =>
        i === 0 ? { ...r, runtimeReady: false } : r,
      ),
    },
    { specialRegions: tile.specialRegions.map((r) => ({ ...r, printedRange: "1-10" })) },
    { areas: tile.areas.map((a) => (a.id === "B" ? { ...a, capacity: 2 } : a)) },
    { edges: tile.edges.slice(1) },
    { edges: tile.edges.map((e) => ({ ...e, cornerOnly: false })) },
    { deployment: { ...tile.deployment, lootAreas: ["F"] } },
  ])
    expect(templarsRoomSchema.safeParse({ ...tile, ...patch }).success).toBe(false);
});

it("Room p22来源、卡文及关键图标缺失拒绝", () => {
  expect(() => assertTemplarsRoomEffectSource(raw("room"))).not.toThrow();
  for (const kind of [
    "page",
    "file",
    "text",
    "62d166a84f",
    "8c4c3c2ec2",
    "0453c84dbc",
    "784ec4fe7a",
  ]) {
    const source = raw("room");
    const face = source.cards.find((c) => c.id === "room:p022")!.faces.front;
    if (kind === "page") face.page = 21;
    else if (kind === "file") face.file = "wrong.pdf";
    else if (kind === "text") face.lines.at(-1)!.text += " changed";
    else face.icons = face.icons.filter((i) => i.iconId !== kind);
    expect(() => assertTemplarsRoomEffectSource(source)).toThrow();
  }
});

it("Tile p13来源、编号、五星数量与八姿态图标缺失拒绝", () => {
  for (const kind of ["page", "file", "number", "star", "deployment"]) {
    const source = raw("dungeon_tile");
    const face = source.cards.find((c) => c.id === "dungeon_tile:p013")!.faces.front;
    if (kind === "page") face.page = 12;
    if (kind === "file") face.file = "wrong.pdf";
    if (kind === "number") face.spans = face.spans.filter((s) => s.t !== "9");
    if (kind === "star")
      face.icons.splice(
        face.icons.findIndex((i) => i.iconId === "6e67687564"),
        1,
      );
    if (kind === "deployment") face.icons = face.icons.filter((i) => i.iconId !== "643d396fef");
    expect(() => buildRoomTileGeometry(source)).toThrow();
  }
});
