import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import geometry from "../../normalized/corebox/room_tile_geometry.json";
import rooms from "../../normalized/corebox/room.json";
import { rawFileSchema } from "../extract/raw";
import {
  approvedTeleporters as tile,
  teleportersSchema,
  assertTeleportersEffectSource,
} from "./teleporters";
import { buildRoomTileGeometry } from "./room-tile";
import { selectRoomTile } from "./room-tile-selection";

const raw = (name: string) =>
  rawFileSchema.parse(
    JSON.parse(
      readFileSync(new URL(`../../extract/corebox/raw/${name}.json`, import.meta.url), "utf8"),
    ),
  );

it("R-159：BACK p11独立面、四组实体连接与四个橙星可确定性生成", () => {
  const source = raw("dungeon_tile");
  const before = structuredClone(source);
  expect(buildRoomTileGeometry(source)).toEqual(geometry);
  expect(source).toEqual(before);
  expect(tile.source).toEqual({ file: "DD_COREBOX_TILES_BACK.pdf", page: 11, face: "back" });
  expect(tile.areas.map((a) => a.capacity)).toEqual([3, 2, 3, 2, 2, 3, 2, 3]);
  expect(tile.areas.every((a) => a.elevation === "normal")).toBe(true);
  expect(tile.edges.map((e) => [e.from + "-" + e.to, e.cornerOnly, e.blocked])).toEqual([
    ["A-D", false, false],
    ["B-C", false, false],
    ["E-H", false, false],
    ["F-G", false, false],
  ]);
  expect(tile.deployment.heroes).toEqual({
    aggressive: "G",
    defensive: "D",
    ranged: "B",
    support: "E",
  });
  expect(tile.deployment.monsters).toEqual({
    aggressive: "A",
    defensive: "F",
    ranged: "H",
    support: "C",
  });
  expect(tile.deployment.lootAreas).toEqual(["C", "F"]);
  expect(tile.specialRegions.map((r) => r.areaId)).toEqual(["A", "C", "F", "H"]);
  expect(
    tile.specialRegions.every(
      (r) =>
        r.printedText.includes("Characters can move and attack") &&
        r.printedText.includes("{icon:df38279161} +1."),
    ),
  ).toBe(true);
});

it("几何获批不开放橙星效果交互；容量、部署、边和来源漂移拒绝", () => {
  expect(tile.specialRegions[0]).toMatchObject({
    areaId: "A",
    effect: "teleporters",
    status: "confirmed",
    runtimeReady: false,
  });
  expect(
    selectRoomTile(
      rooms.cards.find((c) => c.id === "room:p019"),
      geometry,
    ),
  ).toMatchObject({ status: "refused" });
  for (const patch of [
    { usable: true },
    { specialRegions: [{ ...tile.specialRegions[0], runtimeReady: true }] },
    { areas: tile.areas.map((a) => (a.id === "E" ? { ...a, capacity: 4 } : a)) },
    { edges: tile.edges.slice(1) },
    {
      deployment: {
        ...tile.deployment,
        monsters: { ...tile.deployment.monsters, aggressive: "F", support: "D" },
      },
    },
    { deployment: { ...tile.deployment, lootAreas: ["C"] } },
    { specialRegions: tile.specialRegions.slice(1) },
    { source: { ...tile.source, face: "front" } },
    { deployment: { ...tile.deployment, heroes: { ...tile.deployment.heroes, support: "A" } } },
  ])
    expect(teleportersSchema.safeParse({ ...tile, ...patch }).success).toBe(false);
});

it("Room p19来源、星标、卡文漂移拒绝", () => {
  const source = raw("room");
  expect(() => assertTeleportersEffectSource(source)).not.toThrow();
  for (const kind of [
    "page",
    "file",
    "text",
    "star",
    "secondStar",
    "stress",
    "identity",
  ] as const) {
    const changed = structuredClone(source);
    const card = changed.cards.find((c) => c.id === "room:p019")!;
    const face = card.faces.front;
    if (kind === "page") face.page = 16;
    if (kind === "file") face.file = "wrong.pdf";
    if (kind === "text") face.lines.at(-1)!.text += " changed";
    if (kind === "star") face.icons = face.icons.filter((i) => i.iconId !== "f9fbe7ebd2");
    if (kind === "secondStar") face.icons = face.icons.filter((i) => i.iconId !== "340d4a530a");
    if (kind === "stress") face.icons = face.icons.filter((i) => i.iconId !== "df38279161");
    if (kind === "identity") card.id = "room:p016";
    expect(() => assertTeleportersEffectSource(changed)).toThrow();
  }
});

it("Tile p11来源、编号、部署或星标缺失时拒绝生成", () => {
  for (const kind of ["page", "file", "number", "star", "deployment"] as const) {
    const changed = raw("dungeon_tile");
    const face = changed.cards.find((c) => c.id === "dungeon_tile:p011")!.faces.back!;
    if (kind === "page") face.page = 9;
    if (kind === "file") face.file = "wrong.pdf";
    if (kind === "number") face.spans = face.spans.filter((s) => s.t !== "6");
    if (kind === "star") face.icons = face.icons.filter((i) => i.iconId !== "4591aebebd");
    if (kind === "deployment") face.icons = face.icons.filter((i) => i.iconId !== "39d6ddf024");
    expect(() => buildRoomTileGeometry(changed)).toThrow();
  }
});
