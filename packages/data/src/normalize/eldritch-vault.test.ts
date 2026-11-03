import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import geometry from "../../normalized/corebox/room_tile_geometry.json";
import rooms from "../../normalized/corebox/room.json";
import { rawFileSchema } from "../extract/raw";
import {
  approvedEldritchVault as tile,
  eldritchVaultSchema,
  assertEldritchVaultEffectSource,
} from "./eldritch-vault";
import { buildRoomTileGeometry } from "./room-tile";
import { selectRoomTile } from "./room-tile-selection";

const raw = (name: string) =>
  rawFileSchema.parse(
    JSON.parse(
      readFileSync(new URL(`../../extract/corebox/raw/${name}.json`, import.meta.url), "utf8"),
    ),
  );

it("R-156：独立FRONT p10可再生，保留9区容量、5处高地、八姿态部署和8条通路", () => {
  const source = raw("dungeon_tile");
  const before = structuredClone(source);
  expect(buildRoomTileGeometry(source)).toEqual(geometry);
  expect(source).toEqual(before);
  expect(tile.areas.map((a) => a.capacity)).toEqual([4, 2, 4, 2, 2, 4, 2, 2, 4]);
  expect(tile.areas.filter((a) => a.elevation === "high").map((a) => a.id)).toEqual([
    "B",
    "D",
    "E",
    "G",
    "H",
  ]);
  expect(tile.edges.map((e) => `${e.from}-${e.to}`)).toEqual([
    "A-B",
    "B-E",
    "C-D",
    "D-E",
    "E-G",
    "E-H",
    "F-G",
    "H-I",
  ]);
  expect(tile.edges.some((e) => e.blocked || e.cornerOnly)).toBe(false);
  expect(tile.deployment.heroes).toEqual({
    aggressive: "C",
    defensive: "F",
    ranged: "I",
    support: "A",
  });
  expect(tile.deployment.monsters).toEqual({
    aggressive: "H",
    defensive: "B",
    ranged: "D",
    support: "G",
  });
  expect(tile.deployment.lootAreas).toEqual([]);
  expect(tile.deployment.markers).toHaveLength(8);
});

it("几何获批不开放饰品交互；容量、部署、边和来源漂移拒绝", () => {
  expect(tile.specialRegions[0]).toMatchObject({
    areaId: "E",
    effect: "eldritchVaultTrinkets",
    status: "confirmed",
    runtimeReady: false,
  });
  expect(
    selectRoomTile(
      rooms.cards.find((c) => c.id === "room:p016"),
      geometry,
    ),
  ).toMatchObject({ status: "refused" });
  for (const patch of [
    { usable: true },
    { specialRegions: [{ ...tile.specialRegions[0], runtimeReady: true }] },
    { areas: tile.areas.map((a) => (a.id === "E" ? { ...a, capacity: 4 } : a)) },
    { edges: tile.edges.slice(1) },
    { source: { ...tile.source, face: "back" } },
    { deployment: { ...tile.deployment, heroes: { ...tile.deployment.heroes, support: "E" } } },
  ])
    expect(eldritchVaultSchema.safeParse({ ...tile, ...patch }).success).toBe(false);
});

it("Room p16来源、星标、压力图标与卡文漂移拒绝", () => {
  const source = raw("room");
  expect(() => assertEldritchVaultEffectSource(source)).not.toThrow();
  for (const kind of ["page", "file", "text", "stress", "star", "identity"] as const) {
    const changed = structuredClone(source);
    const card = changed.cards.find((c) => c.id === "room:p016")!;
    const face = card.faces.front;
    if (kind === "page") face.page = 15;
    if (kind === "file") face.file = "wrong.pdf";
    if (kind === "text") face.lines.at(-1)!.text += " changed";
    if (kind === "stress") face.icons = face.icons.filter((i) => i.iconId !== "df38279161");
    if (kind === "star") face.icons = face.icons.filter((i) => i.iconId !== "0fd119772a");
    if (kind === "identity") card.id = "room:p015";
    expect(() => assertEldritchVaultEffectSource(changed)).toThrow();
  }
});

it("Tile p10来源、编号、部署或星标缺失时拒绝生成", () => {
  for (const kind of ["page", "file", "number", "star", "deployment"] as const) {
    const changed = raw("dungeon_tile");
    const face = changed.cards.find((c) => c.id === "dungeon_tile:p010")!.faces.front;
    if (kind === "page") face.page = 9;
    if (kind === "file") face.file = "wrong.pdf";
    if (kind === "number") face.spans = face.spans.filter((s) => s.t !== "3");
    if (kind === "star") face.icons = face.icons.filter((i) => i.iconId !== "0d13b745be");
    if (kind === "deployment") face.icons = face.icons.filter((i) => i.iconId !== "39d6ddf024");
    expect(() => buildRoomTileGeometry(changed)).toThrow();
  }
});
