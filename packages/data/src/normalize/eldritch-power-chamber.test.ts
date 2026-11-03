import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import geometry from "../../normalized/corebox/room_tile_geometry.json";
import rooms from "../../normalized/corebox/room.json";
import { rawFileSchema } from "../extract/raw";
import {
  approvedEldritchPowerChamber as tile,
  eldritchPowerChamberSchema,
  assertEldritchPowerChamberEffectSource,
} from "./eldritch-power-chamber";
import { buildRoomTileGeometry } from "./room-tile";
import { selectRoomTile } from "./room-tile-selection";

const raw = (name: string) =>
  rawFileSchema.parse(
    JSON.parse(
      readFileSync(new URL(`../../extract/corebox/raw/${name}.json`, import.meta.url), "utf8"),
    ),
  );

it("R-158：FRONT p11完整几何与八姿态部署可确定性生成", () => {
  const source = raw("dungeon_tile");
  const before = structuredClone(source);
  expect(buildRoomTileGeometry(source)).toEqual(geometry);
  expect(source).toEqual(before);
  expect(tile.source).toEqual({ file: "DD_COREBOX_TILES_FRONT.pdf", page: 11, face: "front" });
  expect(tile.areas.map((a) => a.capacity)).toEqual([2, 3, 4, 3, 3, 4, 4, 3]);
  expect(tile.areas.every((a) => a.elevation === "normal")).toBe(true);
  expect(tile.edges.filter((e) => !e.cornerOnly).map((e) => e.from + "-" + e.to)).toEqual([
    "A-B",
    "A-D",
    "B-C",
    "B-E",
    "C-E",
    "C-F",
    "D-E",
    "D-G",
    "E-F",
    "F-H",
    "G-H",
  ]);
  expect(tile.edges.filter((e) => e.cornerOnly).map((e) => e.from + "-" + e.to)).toEqual([
    "A-E",
    "B-D",
  ]);
  expect(tile.edges.some((e) => e.blocked)).toBe(false);
  expect(tile.deployment.heroes).toEqual({
    aggressive: "G",
    defensive: "G",
    ranged: "C",
    support: "C",
  });
  expect(tile.deployment.monsters).toEqual({
    aggressive: "E",
    defensive: "E",
    ranged: "A",
    support: "F",
  });
  expect(tile.deployment.lootAreas).toEqual(["A", "A"]);
  expect(tile.specialRegions.map((r) => r.areaId)).toEqual(["C"]);
  expect(tile.specialRegions[0]!.printedText).toContain("Heroes take {icon:8d4bbe5e11} 5 each.");
});

it("R-158：完整运行时开放参战；容量、部署、边和来源漂移拒绝", () => {
  expect(tile.usable).toBe(true);
  expect(tile.specialRegions[0]).toMatchObject({
    areaId: "C",
    effect: "eldritchPower",
    status: "confirmed",
    runtimeReady: true,
  });
  expect(
    selectRoomTile(
      rooms.cards.find((c) => c.id === "room:p018"),
      geometry,
    ),
  ).toMatchObject({ status: "matched" });
  for (const patch of [
    { usable: false },
    { specialRegions: [{ ...tile.specialRegions[0], runtimeReady: false }] },
    { areas: tile.areas.map((a) => (a.id === "E" ? { ...a, capacity: 4 } : a)) },
    { edges: tile.edges.slice(1) },
    {
      deployment: {
        ...tile.deployment,
        monsters: { ...tile.deployment.monsters, aggressive: "F", support: "D" },
      },
    },
    { deployment: { ...tile.deployment, lootAreas: ["A"] } },
    { specialRegions: tile.specialRegions.slice(1) },
    { source: { ...tile.source, face: "back" } },
    { deployment: { ...tile.deployment, heroes: { ...tile.deployment.heroes, support: "E" } } },
  ])
    expect(eldritchPowerChamberSchema.safeParse({ ...tile, ...patch }).success).toBe(false);
});

it("Room p18来源、星标、卡文漂移拒绝", () => {
  const source = raw("room");
  expect(() => assertEldritchPowerChamberEffectSource(source)).not.toThrow();
  for (const kind of ["page", "file", "text", "star", "identity"] as const) {
    const changed = structuredClone(source);
    const card = changed.cards.find((c) => c.id === "room:p018")!;
    const face = card.faces.front;
    if (kind === "page") face.page = 16;
    if (kind === "file") face.file = "wrong.pdf";
    if (kind === "text") face.lines.at(-1)!.text += " changed";
    if (kind === "star") face.icons = face.icons.filter((i) => i.iconId !== "a74b9dc080");
    if (kind === "identity") card.id = "room:p016";
    expect(() => assertEldritchPowerChamberEffectSource(changed)).toThrow();
  }
});

it("Tile p11来源、编号、部署或星标缺失时拒绝生成", () => {
  for (const kind of ["page", "file", "number", "star", "deployment"] as const) {
    const changed = raw("dungeon_tile");
    const face = changed.cards.find((c) => c.id === "dungeon_tile:p011")!.faces.front;
    if (kind === "page") face.page = 9;
    if (kind === "file") face.file = "wrong.pdf";
    if (kind === "number") face.spans = face.spans.filter((s) => s.t !== "5");
    if (kind === "star") face.icons = face.icons.filter((i) => i.iconId !== "4591aebebd");
    if (kind === "deployment") face.icons = face.icons.filter((i) => i.iconId !== "39d6ddf024");
    expect(() => buildRoomTileGeometry(changed)).toThrow();
  }
});
