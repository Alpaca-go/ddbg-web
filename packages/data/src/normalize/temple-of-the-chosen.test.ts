import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import geometry from "../../normalized/corebox/room_tile_geometry.json";
import rooms from "../../normalized/corebox/room.json";
import { rawFileSchema } from "../extract/raw";
import {
  approvedTempleOfTheChosen as tile,
  templeOfTheChosenSchema,
  assertTempleOfTheChosenEffectSource,
} from "./temple-of-the-chosen";
import { buildRoomTileGeometry } from "./room-tile";
import { selectRoomTile } from "./room-tile-selection";

const raw = (name: string) =>
  rawFileSchema.parse(
    JSON.parse(
      readFileSync(new URL(`../../extract/corebox/raw/${name}.json`, import.meta.url), "utf8"),
    ),
  );

it("R-161：BACK p12完整几何、A高地、八姿态部署和两个独立宝箱可确定性生成", () => {
  const source = raw("dungeon_tile");
  const before = structuredClone(source);
  expect(buildRoomTileGeometry(source)).toEqual(geometry);
  expect(source).toEqual(before);
  expect(tile.source).toEqual({ file: "DD_COREBOX_TILES_BACK.pdf", page: 12, face: "back" });
  expect(tile.areas.map((a) => a.capacity)).toEqual([4, 4, 3, 4, 3, 4, 4, 3]);
  expect(
    tile.areas.filter((a) => a.elevation !== "normal").map((a) => [a.id, a.elevation]),
  ).toEqual([["A", "high"]]);
  expect(tile.edges.filter((e) => !e.cornerOnly).map((e) => e.from + "-" + e.to)).toEqual([
    "A-B",
    "A-C",
    "A-D",
    "B-C",
    "B-F",
    "C-D",
    "C-E",
    "D-H",
    "E-G",
    "F-G",
    "G-H",
  ]);
  expect(tile.edges.filter((e) => e.cornerOnly).map((e) => e.from + "-" + e.to)).toEqual([
    "B-E",
    "D-E",
    "E-F",
    "E-H",
  ]);
  expect(tile.edges.some((e) => e.blocked)).toBe(false);
  expect(tile.deployment.heroes).toEqual({
    aggressive: "F",
    defensive: "F",
    ranged: "F",
    support: "F",
  });
  expect(tile.deployment.monsters).toEqual({
    aggressive: "E",
    defensive: "G",
    ranged: "C",
    support: "A",
  });
  expect(tile.deployment.lootAreas).toEqual(["E", "E"]);
  expect(tile.specialRegions.map((r) => r.areaId)).toEqual(["A"]);
  expect(tile.specialRegions[0]!.printedText).toContain("Monsters {icon:731f6665d0} 5");
  expect(tile.specialRegions[0]!.printedText).toContain(
    "additional {icon:9b00e692ba} +1 / Negative Quirk.",
  );
});

it("运行时开放橙星效果交互；容量、部署、边和来源漂移拒绝", () => {
  expect(tile.specialRegions[0]).toMatchObject({
    areaId: "A",
    effect: "riteOfTheChosen",
    status: "confirmed",
    runtimeReady: true,
  });
  expect(
    selectRoomTile(
      rooms.cards.find((c) => c.id === "room:p021"),
      geometry,
    ),
  ).toMatchObject({ status: "matched" });
  for (const patch of [
    { usable: false },
    { specialRegions: [{ ...tile.specialRegions[0], runtimeReady: false }] },
    { areas: tile.areas.map((a) => (a.id === "E" ? { ...a, capacity: 4 } : a)) },
    { edges: tile.edges.slice(1) },
    { areas: tile.areas.map((a) => (a.id === "A" ? { ...a, elevation: "normal" } : a)) },
    {
      edges: tile.edges.map((e) =>
        e.from === "B" && e.to === "E" ? { ...e, cornerOnly: false } : e,
      ),
    },
    {
      deployment: {
        ...tile.deployment,
        monsters: { ...tile.deployment.monsters, aggressive: "F", support: "D" },
      },
    },
    { deployment: { ...tile.deployment, lootAreas: ["E"] } },
    { specialRegions: tile.specialRegions.slice(1) },
    { source: { ...tile.source, face: "front" } },
    { deployment: { ...tile.deployment, heroes: { ...tile.deployment.heroes, support: "E" } } },
  ])
    expect(templeOfTheChosenSchema.safeParse({ ...tile, ...patch }).success).toBe(false);
});

it("Room p21来源、星标、卡文漂移拒绝", () => {
  const source = raw("room");
  expect(() => assertTempleOfTheChosenEffectSource(source)).not.toThrow();
  for (const kind of [
    "page",
    "file",
    "text",
    "star",
    "heal",
    "stress",
    "extraStress",
    "identity",
  ] as const) {
    const changed = structuredClone(source);
    const card = changed.cards.find((c) => c.id === "room:p021")!;
    const face = card.faces.front;
    if (kind === "page") face.page = 16;
    if (kind === "file") face.file = "wrong.pdf";
    if (kind === "text") face.lines.at(-1)!.text += " changed";
    if (kind === "star") face.icons = face.icons.filter((i) => i.iconId !== "62d166a84f");
    if (kind === "heal") face.icons = face.icons.filter((i) => i.iconId !== "731f6665d0");
    if (kind === "stress") face.icons = face.icons.filter((i) => i.iconId !== "df38279161");
    if (kind === "extraStress") face.icons = face.icons.filter((i) => i.iconId !== "9b00e692ba");
    if (kind === "identity") card.id = "room:p016";
    expect(() => assertTempleOfTheChosenEffectSource(changed)).toThrow();
  }
});

it("Tile p12来源、编号、部署或星标缺失时拒绝生成", () => {
  for (const kind of ["page", "file", "number", "star", "deployment"] as const) {
    const changed = raw("dungeon_tile");
    const face = changed.cards.find((c) => c.id === "dungeon_tile:p012")!.faces.back!;
    if (kind === "page") face.page = 9;
    if (kind === "file") face.file = "wrong.pdf";
    if (kind === "number") face.spans = face.spans.filter((s) => s.t !== "8");
    if (kind === "star") face.icons = face.icons.filter((i) => i.iconId !== "4591aebebd");
    if (kind === "deployment") face.icons = face.icons.filter((i) => i.iconId !== "39d6ddf024");
    expect(() => buildRoomTileGeometry(changed)).toThrow();
  }
});
