import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import geometry from "../../normalized/corebox/room_tile_geometry.json";
import rooms from "../../normalized/corebox/room.json";
import { rawFileSchema } from "../extract/raw";
import { approvedEvilEye as tile, evilEyeSchema, assertEvilEyeEffectSource } from "./evil-eye";
import { buildRoomTileGeometry } from "./room-tile";
import { selectRoomTile } from "./room-tile-selection";

const raw = (name: string) =>
  rawFileSchema.parse(
    JSON.parse(
      readFileSync(new URL(`../../extract/corebox/raw/${name}.json`, import.meta.url), "utf8"),
    ),
  );

it("R-160：FRONT p12九区、部署与印刷A/B星标可确定性生成", () => {
  const source = raw("dungeon_tile");
  const before = structuredClone(source);
  expect(buildRoomTileGeometry(source)).toEqual(geometry);
  expect(source).toEqual(before);
  expect(tile.source).toEqual({ file: "DD_COREBOX_TILES_FRONT.pdf", page: 12, face: "front" });
  expect(tile.areas.map((a) => a.capacity)).toEqual([2, 3, 4, 2, 3, 3, 4, 4, 2]);
  expect(tile.areas.every((a) => a.elevation === "normal")).toBe(true);
  expect(tile.edges.filter((e) => !e.cornerOnly).map((e) => e.from + "-" + e.to)).toEqual([
    "A-B",
    "A-D",
    "B-C",
    "B-E",
    "C-F",
    "D-E",
    "D-G",
    "E-F",
    "E-H",
    "F-I",
    "G-H",
    "H-I",
  ]);
  expect(tile.edges.filter((e) => e.cornerOnly).map((e) => e.from + "-" + e.to)).toEqual([
    "A-E",
    "B-D",
    "B-F",
    "C-E",
    "D-H",
    "E-G",
    "E-I",
    "F-H",
  ]);
  expect(tile.edges.some((e) => e.blocked)).toBe(false);
  expect(Object.values(tile.deployment.heroes)).toEqual(["G", "G", "G", "G"]);
  expect(Object.values(tile.deployment.monsters)).toEqual(["C", "C", "C", "C"]);
  expect(tile.deployment.lootAreas).toEqual(["A", "I"]);
  expect(tile.specialRegions.map((r) => [r.areaId, r.printedLabel, r.effect])).toEqual([
    ["E", "A", "evilGaze"],
    ["A", "B", "staringEyes"],
    ["D", "B", "staringEyes"],
    ["H", "B", "staringEyes"],
    ["I", "B", "staringEyes"],
  ]);
  expect(tile.specialRegions[0]!.printedText).toContain("Negative Quirk");
  expect(tile.specialRegions[0]!.printedText).toContain("{icon:9d58d3d431} -5.");
  expect(tile.specialRegions[1]!.printedText).toContain("{icon:9d58d3d431} +2.");
});

it("运行时开放橙星效果交互；容量、部署、边和来源漂移拒绝", () => {
  expect(tile.specialRegions[0]).toMatchObject({
    areaId: "E",
    printedLabel: "A",
    effect: "evilGaze",
    status: "confirmed",
    runtimeReady: true,
  });
  expect(
    selectRoomTile(
      rooms.cards.find((c) => c.id === "room:p020"),
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
    {
      specialRegions: tile.specialRegions.map((r) =>
        r.areaId === "E" ? { ...r, printedLabel: "B", effect: "staringEyes" } : r,
      ),
    },
    {
      specialRegions: tile.specialRegions.map((r) =>
        r.areaId === "A" ? { ...r, areaId: "B" } : r,
      ),
    },
    { source: { ...tile.source, face: "back" } },
    { deployment: { ...tile.deployment, heroes: { ...tile.deployment.heroes, support: "A" } } },
  ])
    expect(evilEyeSchema.safeParse({ ...tile, ...patch }).success).toBe(false);
});

it("Room p20来源、星标、卡文漂移拒绝", () => {
  const source = raw("room");
  expect(() => assertEvilEyeEffectSource(source)).not.toThrow();
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
    const card = changed.cards.find((c) => c.id === "room:p020")!;
    const face = card.faces.front;
    if (kind === "page") face.page = 16;
    if (kind === "file") face.file = "wrong.pdf";
    if (kind === "text") face.lines.at(-1)!.text += " changed";
    if (kind === "star") face.icons = face.icons.filter((i) => i.iconId !== "62d166a84f");
    if (kind === "secondStar")
      face.icons.splice(
        face.icons.findIndex((i) => i.iconId === "62d166a84f"),
        1,
      );
    if (kind === "stress") face.icons = face.icons.filter((i) => i.iconId !== "9d58d3d431");
    if (kind === "identity") card.id = "room:p016";
    expect(() => assertEvilEyeEffectSource(changed)).toThrow();
  }
});

it("Tile p12来源、编号、部署或星标缺失时拒绝生成", () => {
  for (const kind of ["page", "file", "number", "star", "deployment"] as const) {
    const changed = raw("dungeon_tile");
    const face = changed.cards.find((c) => c.id === "dungeon_tile:p012")!.faces.front;
    if (kind === "page") face.page = 9;
    if (kind === "file") face.file = "wrong.pdf";
    if (kind === "number") face.spans = face.spans.filter((s) => s.t !== "7");
    if (kind === "star") face.icons = face.icons.filter((i) => i.iconId !== "4591aebebd");
    if (kind === "deployment") face.icons = face.icons.filter((i) => i.iconId !== "39d6ddf024");
    expect(() => buildRoomTileGeometry(changed)).toThrow();
  }
});

it("印刷星标字母或数量漂移拒绝，定位B区不冒充印刷B效果", () => {
  const changed = raw("dungeon_tile");
  const face = changed.cards.find((c) => c.id === "dungeon_tile:p012")!.faces.front;
  const line = face.lines.find((l) => l.text.includes("{icon:4591aebebd} A"))!;
  line.text = line.text.replace(" A", " B");
  expect(() => buildRoomTileGeometry(changed)).toThrow("星标来源漂移");
  expect(tile.specialRegions.map((r) => r.areaId)).not.toContain("B");
});
