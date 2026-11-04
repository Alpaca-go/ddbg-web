import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import geometry from "../../normalized/corebox/room_tile_geometry.json";
import rooms from "../../normalized/corebox/room.json";
import { rawFileSchema } from "../extract/raw";
import {
  approvedCollectorRoom as tile,
  collectorRoomSchema,
  assertCollectorRoomSource,
} from "./collector-room";
import { buildRoomTileGeometry } from "./room-tile";
import { selectRoomTile } from "./room-tile-selection";

const raw = (name: string) =>
  rawFileSchema.parse(
    JSON.parse(
      readFileSync(new URL(`../../extract/corebox/raw/${name}.json`, import.meta.url), "utf8"),
    ),
  );

it("R-168：八区与三独立宝箱可确定性生成，保持Boss准入关闭", () => {
  const source = raw("dungeon_tile"),
    before = structuredClone(source);
  expect(buildRoomTileGeometry(source)).toEqual(geometry);
  expect(source).toEqual(before);
  expect(tile.source).toEqual({ file: "DD_COREBOX_TILES_BACK.pdf", page: 7, face: "back" });
  expect(tile.areas.map((a) => a.capacity)).toEqual([2, 3, 3, 2, 2, 2, 2, 3]);
  expect(tile.areas.every((a) => a.elevation === "normal")).toBe(true);
  expect(tile.deployment.heroes).toEqual({
    aggressive: "H",
    defensive: "B",
    ranged: "B",
    support: "H",
  });
  expect(tile.deployment.monsters).toEqual({
    aggressive: "C",
    defensive: "G",
    ranged: "E",
    support: "A",
  });
  expect(tile.edges.filter((e) => !e.cornerOnly).map((e) => e.from + "-" + e.to)).toEqual(
    "A-C B-D C-D C-E C-G E-F G-H".split(" "),
  );
  expect(tile.edges.filter((e) => e.cornerOnly).map((e) => e.from + "-" + e.to)).toEqual(
    "B-C C-F C-H".split(" "),
  );
  expect(tile.edges.some((e) => e.blocked)).toBe(false);
  expect(tile.deployment.lootAreas).toEqual(["F", "F", "F"]);
  expect(tile.printedLoot).toMatchObject({
    areaId: "F",
    count: 3,
    printedOverlay: "!",
    runtimeReady: true,
  });
  expect(tile.specialRegions).toEqual([]);
  expect(
    selectRoomTile(
      rooms.cards.find((c) => c.id === "room:p012"),
      geometry,
    ),
  ).toMatchObject({ status: "refused" });
});

it("拒绝共享边改角点、C-H误通行、怪物姿态、容量及准入漂移", () => {
  for (const patch of [
    { usable: true },
    { printedLoot: { ...tile.printedLoot, count: 1 } },
    { printedLoot: { ...tile.printedLoot, printedOverlay: "" } },
    { deployment: { ...tile.deployment, lootAreas: ["F"] } },
    { source: { ...tile.source, face: "front" } },
    { areas: tile.areas.map((a) => (a.id === "F" ? { ...a, capacity: 3 } : a)) },
    { areas: tile.areas.map((a) => ({ ...a, elevation: "high" })) },
    ...[
      ["C", "G"],
      ["E", "F"],
    ].map(([from, to]) => ({
      edges: tile.edges.map((e) =>
        e.from === from && e.to === to ? { ...e, cornerOnly: true } : e,
      ),
    })),
    {
      edges: tile.edges.map((e) =>
        e.from === "C" && e.to === "H" ? { ...e, cornerOnly: false } : e,
      ),
    },
    { deployment: { ...tile.deployment, heroes: { ...tile.deployment.heroes, support: "B" } } },
    { deployment: { ...tile.deployment, monsters: { ...tile.deployment.monsters, ranged: "A" } } },
    { deployment: { ...tile.deployment, lootAreas: ["A"] } },
    { specialRegions: [{ areaId: "E", effect: "invented" }] },
  ])
    expect(collectorRoomSchema.safeParse({ ...tile, ...patch }).success).toBe(false);
});

it("Room p12来源与无额外卡文记录漂移拒绝", () => {
  expect(() => assertCollectorRoomSource(raw("room"))).not.toThrow();
  for (const kind of ["page", "file", "identity", "text"]) {
    const source = raw("room"),
      card = source.cards.find((c) => c.id === "room:p012")!;
    if (kind === "page") card.faces.front.page = 24;
    if (kind === "file") card.faces.front.file = "wrong.pdf";
    if (kind === "identity") card.id = "room:p024";
    if (kind === "text") card.faces.front.lines.at(-1)!.text += " changed";
    expect(() => assertCollectorRoomSource(source)).toThrow();
  }
});

it("Tile BACK p7来源、编号、三宝箱与八姿态图标缺失拒绝", () => {
  for (const kind of [
    "page",
    "file",
    "number",
    "f9f205b9e1",
    "6c5de8d976",
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
      face = source.cards.find((c) => c.id === "dungeon_tile:p007")!.faces.back!;
    if (kind === "page") face.page = 5;
    else if (kind === "file") face.file = "wrong.pdf";
    else if (kind === "number") face.spans = face.spans.filter((s) => s.t !== "12");
    else face.icons = face.icons.filter((i) => i.iconId !== kind);
    expect(() => buildRoomTileGeometry(source)).toThrow();
  }
});

it("拒绝单个宝箱或叹号丢失，不能合并三个标记", () => {
  for (const iconId of ["f9f205b9e1", "6c5de8d976"]) {
    const source = raw("dungeon_tile");
    const face = source.cards.find((c) => c.id === "dungeon_tile:p007")!.faces.back!;
    const index = face.icons.findIndex((i) => i.iconId === iconId);
    face.icons.splice(index, 1);
    expect(() => buildRoomTileGeometry(source)).toThrow();
  }
});
