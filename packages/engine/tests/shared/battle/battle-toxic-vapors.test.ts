import { expect, it } from "vitest";
import { approvedToxicChamber as tile } from "../../../../data/src/core/rooms/toxic-chamber.build";
import rooms from "../../../../data/normalized/corebox/room.json";
import catalog from "../../../../data/normalized/corebox/room_tile_geometry.json";
import { selectRoomTile } from "../../../../data/src/core/rooms/room-tile-selection.build";
import { heroStandingAccuracyModifier } from "../../../src/shared/battle/battle-area-accuracy";
import { roomTileBattleAreas } from "../../../src/shared/battle/battle-monster-movement";
import { readRoomTile } from "../../../src/shared/core/room-tile-selection";

it("R-157：Toxic Chamber 参战闸门与 Toxic Vapors 区域投影", () => {
  expect(tile.usable).toBe(true);
  expect(
    selectRoomTile(
      rooms.cards.find((c) => c.id === "room:darkest:04"),
      catalog,
    ).status,
  ).toBe("matched");
  const areas = roomTileBattleAreas(tile);
  expect(
    areas
      .filter((a) => a.toxicVapors)
      .map((a) => a.id)
      .sort(),
  ).toEqual(["A", "B", "C", "E"]);
  expect(readRoomTile(rooms.cards.find((c) => c.id === "room:darkest:04")).status).toBe("matched");
  expect(heroStandingAccuracyModifier(areas.find((a) => a.id === "A"))).toBe(-3);
  expect(heroStandingAccuracyModifier(areas.find((a) => a.id === "F"))).toBe(0);
});

it("R-157：mergeHeroAccuracyModifiers 在 Toxic Vapors 叠加 Acc −3", () => {
  const areas = roomTileBattleAreas(tile);
  const toxic = areas.find((a) => a.id === "A")!;
  expect(heroStandingAccuracyModifier(toxic)).toBe(-3);
  expect(heroStandingAccuracyModifier(areas.find((a) => a.id === "F"))).toBe(0);
});
