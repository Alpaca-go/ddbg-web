import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import roomFile from "../../normalized/corebox/room.json";
import geometryFile from "../../normalized/corebox/room_tile_geometry.json";
import { rawFileSchema } from "../extract/raw";
import { buildRoomTileGeometry, roomTileGeometryFileSchema } from "./room-tile";
import {
  approvedPoolOfRebirth,
  poolOfRebirthSchema,
  assertPoolOfRebirthEffectSource,
} from "./pool-of-rebirth";
import { selectRoomTile } from "./room-tile-selection";

const raw = rawFileSchema.parse(
  JSON.parse(
    readFileSync(new URL("../../extract/corebox/raw/dungeon_tile.json", import.meta.url), "utf8"),
  ),
);
it("R-144：独立最暗编号1、12区容量/高地、14通路/9角点及八姿态部署", () => {
  const before = structuredClone(raw);
  const built = buildRoomTileGeometry(raw);
  expect(built).toEqual(roomTileGeometryFileSchema.parse(geometryFile));
  const tile = built.tiles.find((t) => t.roomId === "room:p014")!;
  expect(tile).toEqual(approvedPoolOfRebirth);
  expect(tile.areas.map((a) => a.capacity)).toEqual([2, 3, 2, 2, 2, 6, 2, 3, 3, 2, 3, 3]);
  expect(tile.areas.filter((a) => a.elevation === "high").map((a) => a.id)).toEqual(["G"]);
  expect(
    tile.edges.filter((e) => !e.cornerOnly && !e.blocked).map((e) => `${e.from}-${e.to}`),
  ).toEqual([
    "A-D",
    "B-C",
    "B-F",
    "C-G",
    "D-E",
    "D-H",
    "E-F",
    "F-G",
    "F-H",
    "F-I",
    "H-J",
    "I-K",
    "I-L",
    "K-L",
  ]);
  expect(tile.edges.filter((e) => e.cornerOnly).map((e) => `${e.from}-${e.to}`)).toEqual([
    "A-E",
    "B-E",
    "B-G",
    "C-F",
    "D-F",
    "E-H",
    "F-J",
    "F-K",
    "G-I",
  ]);
  expect(tile.deployment?.heroes).toEqual({
    aggressive: "L",
    defensive: "J",
    ranged: "C",
    support: "A",
  });
  expect(tile.deployment?.monsters).toEqual({
    aggressive: "E",
    defensive: "K",
    ranged: "G",
    support: "I",
  });
  expect(tile.deployment?.markers).toHaveLength(8);
  expect(raw).toEqual(before);
});

it("星形绑定对应Room效果行，区域与整房效果完整开放", () => {
  expect(approvedPoolOfRebirth.unresolvedMarkers).toEqual([]);
  expect(approvedPoolOfRebirth.effectSource.page).toBe(14);
  expect(approvedPoolOfRebirth.specialRegions[0]).toMatchObject({
    areaId: "F",
    effect: "poolOfRebirth",
    runtimeReady: true,
  });
  expect(approvedPoolOfRebirth.specialRegions[0]!.printedText).toContain(
    "{icon:731f6665d0} 3 per Negative Quirk.",
  );
  expect(approvedPoolOfRebirth.specialRoomEffect.printedText).toContain("to revive a dead Hero");
  expect(approvedPoolOfRebirth.specialRoomEffect.runtimeReady).toBe(true);
  const room = roomFile.cards.find((r) => r.id === "room:p014")!;
  expect(selectRoomTile(room, geometryFile)).toMatchObject({
    status: "matched",
    tile: { roomId: "room:p014" },
  });
  expect(geometryFile.tiles.filter((t) => t.usable)).toHaveLength(16);
});

it("不允许改变容量、边、部署、未确认标记或绕过usable停点", () => {
  for (const patch of [
    { usable: false },
    { specialRegions: [] },
    { effectSource: { ...approvedPoolOfRebirth.effectSource, page: 9 } },
    { areas: approvedPoolOfRebirth.areas.map((a) => (a.id === "F" ? { ...a, capacity: 4 } : a)) },
    { edges: approvedPoolOfRebirth.edges.slice(1) },
    {
      edges: [
        ...approvedPoolOfRebirth.edges,
        { from: "A", to: "B", blocked: false, cornerOnly: false },
      ],
    },
    {
      deployment: {
        ...approvedPoolOfRebirth.deployment,
        heroes: { ...approvedPoolOfRebirth.deployment.heroes, aggressive: "F" },
      },
    },
    { source: { file: "DD_COREBOX_TILES_BACK.pdf", page: 9, face: "back" } },
    { location: "ruins" },
    { roomId: "room:p001" },
  ])
    expect(poolOfRebirthSchema.safeParse({ ...approvedPoolOfRebirth, ...patch }).success).toBe(
      false,
    );
});

it("效果必须来自相同房间卡p14，拒绝错页、文字和图标漂移", () => {
  const rooms = rawFileSchema.parse(
    JSON.parse(
      readFileSync(new URL("../../extract/corebox/raw/room.json", import.meta.url), "utf8"),
    ),
  );
  expect(() => assertPoolOfRebirthEffectSource(rooms)).not.toThrow();
  for (const mutate of [
    (card: (typeof rooms.cards)[number]) => {
      card.faces.front.page = 9;
    },
    (card: (typeof rooms.cards)[number]) => {
      card.faces.front.file = "wrong.pdf";
    },
    (card: (typeof rooms.cards)[number]) => {
      card.faces.front.icons = card.faces.front.icons.filter(
        (icon) => icon.iconId !== "731f6665d0",
      );
    },
    (card: (typeof rooms.cards)[number]) => {
      card.faces.front.lines.at(-5)!.text =
        "{icon:9b00e692ba} +1 and {icon:8d4bbe5e11} 3 per Negative Quirk.";
    },
    (card: (typeof rooms.cards)[number]) => {
      card.faces.front.lines.at(-5)!.text += " changed";
    },
    (card: (typeof rooms.cards)[number]) => {
      card.id = "room:p009";
    },
  ]) {
    const changed = structuredClone(rooms);
    mutate(changed.cards.find((c) => c.id === "room:p014")!);
    expect(() => assertPoolOfRebirthEffectSource(changed)).toThrow("效果行漂移");
  }
});

it("当前raw来源、编号或部署/星形标记缺失时拒绝生成", () => {
  for (const mutate of [
    (card: (typeof raw.cards)[number]) => {
      card.faces.front.file = "wrong.pdf";
    },
    (card: (typeof raw.cards)[number]) => {
      card.faces.front.page = 1;
    },
    (card: (typeof raw.cards)[number]) => {
      card.faces.front.spans = card.faces.front.spans.filter((s) => s.t !== "1");
    },
    (card: (typeof raw.cards)[number]) => {
      card.faces.front.icons = card.faces.front.icons.filter((i) => i.iconId !== "4591aebebd");
    },
    (card: (typeof raw.cards)[number]) => {
      card.faces.front.icons = card.faces.front.icons.filter((i) => i.iconId !== "7b8c742c86");
    },
  ]) {
    const changed = structuredClone(raw);
    mutate(changed.cards.find((c) => c.id === "dungeon_tile:p009")!);
    expect(() => buildRoomTileGeometry(changed)).toThrow();
  }
});
