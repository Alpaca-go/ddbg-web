import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import geometry from "../../normalized/corebox/room_tile_geometry.json";
import rooms from "../../normalized/corebox/room.json";
import { rawFileSchema } from "../extract/raw";
import {
  approvedHallOfAscension,
  hallOfAscensionSchema,
  assertHallOfAscensionEffectSource,
} from "./hall-of-ascension";
import { buildRoomTileGeometry } from "./room-tile";
import { selectRoomTile } from "./room-tile-selection";

const loadRaw = (name: string) =>
  rawFileSchema.parse(
    JSON.parse(
      readFileSync(new URL(`../../extract/corebox/raw/${name}.json`, import.meta.url), "utf8"),
    ),
  );

it("R-153：BACK p9独立面可再生，L容量3，两处高地及三个宝箱保留", () => {
  const raw = loadRaw("dungeon_tile");
  const before = structuredClone(raw);
  expect(buildRoomTileGeometry(raw)).toEqual(geometry);
  expect(raw).toEqual(before);
  expect(approvedHallOfAscension.areas.map((a) => a.capacity)).toEqual([
    2, 2, 2, 4, 2, 2, 2, 2, 2, 3, 2, 3,
  ]);
  expect(
    approvedHallOfAscension.areas.filter((a) => a.elevation === "high").map((a) => a.id),
  ).toEqual(["E", "K"]);
  expect(approvedHallOfAscension.deployment.lootAreas).toEqual(["A", "C", "C"]);
  expect(approvedHallOfAscension.edges.filter((e) => !e.cornerOnly)).toHaveLength(13);
  expect(
    approvedHallOfAscension.edges.filter((e) => e.cornerOnly).map((e) => `${e.from}-${e.to}`),
  ).toEqual(["F-H", "G-J", "H-L"]);
});

it("升级运行时未开放，不能仅凭获批几何进入战斗", () => {
  expect(
    selectRoomTile(
      rooms.cards.find((c) => c.id === "room:p015"),
      geometry,
    ).status,
  ).toBe("refused");
  for (const patch of [
    { usable: true },
    { areas: approvedHallOfAscension.areas.map((a) => (a.id === "L" ? { ...a, capacity: 4 } : a)) },
    { edges: approvedHallOfAscension.edges.slice(1) },
    { deployment: { ...approvedHallOfAscension.deployment, lootAreas: ["A", "C"] } },
    { specialRegions: [] },
    { source: { ...approvedHallOfAscension.source, face: "front" } },
  ])
    expect(hallOfAscensionSchema.safeParse({ ...approvedHallOfAscension, ...patch }).success).toBe(
      false,
    );
});

it("B区效果绑定Room p15截图对应卡文；来源、压力图标或文字漂移拒绝生成", () => {
  const raw = loadRaw("room");
  expect(() => assertHallOfAscensionEffectSource(raw)).not.toThrow();
  expect(approvedHallOfAscension.specialRegions[0]).toMatchObject({
    areaId: "B",
    runtimeReady: false,
    status: "confirmed",
  });
  for (const kind of ["page", "text", "icon"] as const) {
    const changed = structuredClone(raw);
    const face = changed.cards.find((c) => c.id === "room:p015")!.faces.front;
    if (kind === "page") face.page = 14;
    if (kind === "text") face.lines.at(-1)!.text += " changed";
    if (kind === "icon") face.icons = face.icons.filter((i) => i.iconId !== "9b00e692ba");
    expect(() => assertHallOfAscensionEffectSource(changed)).toThrow();
  }
});
