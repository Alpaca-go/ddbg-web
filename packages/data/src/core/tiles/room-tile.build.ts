import { printIcon, printSourceIcon } from "../../shared/print-icons";
import { assertFanaticTileLabels } from "../rooms/fanatic-room.build";
import { approvedFanaticRoom } from "../rooms/fanatic-room";
import { assertCollectorTileLabels } from "../rooms/collector-room.build";
import { approvedCollectorRoom } from "../rooms/collector-room";
import { assertProphetTileLabels } from "../rooms/prophet-room.build";
import { approvedProphetRoom } from "../rooms/prophet-room";
import { approvedNecromancerRoom } from "../rooms/necromancer-room";
import { approvedAncestorRoom } from "../rooms/ancestor-room";
import { assertMammothCystTileLabels } from "../rooms/mammoth-cyst-room.build";
import { approvedMammothCystRoom } from "../rooms/mammoth-cyst-room";
import { assertShufflingHorrorTileLabels } from "../rooms/shuffling-horror-room.build";
import { approvedShufflingHorrorRoom } from "../rooms/shuffling-horror-room";
import { assertTemplarsRoomTileLabels } from "../rooms/templars-room.build";
import { approvedTemplarsRoom } from "../rooms/templars-room";
import { approvedTempleOfTheChosen } from "../rooms/temple-of-the-chosen.build";
import { approvedEvilEye, assertEvilEyeTileLabels } from "../rooms/evil-eye.build";
import { approvedTeleporters } from "../rooms/teleporters.build";
import { approvedEldritchPowerChamber } from "../rooms/eldritch-power-chamber.build";
import { approvedToxicChamber } from "../rooms/toxic-chamber.build";
import { approvedEldritchVault } from "../rooms/eldritch-vault.build";
import { approvedHallOfAscension } from "../rooms/hall-of-ascension.build";
import type { RawFile } from "../../shared/extract/raw";
import { approvedTortureChamber } from "../rooms/torture-chamber.build";
import { approvedExtraRuinsTiles } from "./approved-ruins-tiles.build";
import { approvedPoolOfRebirth } from "../rooms/pool-of-rebirth.build";
import {
  roomTileGeometryFileSchema,
  ritualChamberSchema,
  type RoomTileGeometryFile,
} from "./room-tile";

/** Kyries 2026-10-10 批准核对表，E-F 黑墙不相邻（R-054）；只有这一面。 */
export const approvedRoomTileGeometry = ritualChamberSchema.parse({
  id: "room_tile:ruins:01",
  roomId: "room:ruins:01",
  location: "ruins",
  number: 1,
  rawId: "dungeon_tile:p001",
  name: "Ritual Chamber",
  source: { file: "DD_COREBOX_TILES_FRONT.pdf", page: 1, face: "front" },
  ruling: "R-054",
  geometryVerified: true,
  usable: true,
  deployment: {
    ruling: "R-055",
    printReview: "verified",
    heroes: { aggressive: "H", ranged: "H", defensive: "C", support: "C" },
    monsters: { aggressive: "J", defensive: "D", support: "D", ranged: "F" },
    lootAreas: ["C", "H"],
    markers: [
      {
        areaId: "C",
        iconId: printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:25"),
        semantic: "hero_support_start",
        status: "confirmed",
      },
      {
        areaId: "D",
        iconId: printIcon("stance_support_monster_slot", 216),
        semantic: "monster_support_start",
        status: "confirmed",
      },
      {
        areaId: "C",
        iconId: printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:3"),
        semantic: "cornered",
        status: "confirmed",
      },
      {
        areaId: "H",
        iconId: printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:3"),
        semantic: "cornered",
        status: "confirmed",
      },
    ],
  },
  areas: [
    { id: "A", capacity: 4, elevation: "normal" },
    { id: "B", capacity: 3, elevation: "normal" },
    { id: "C", capacity: 3, elevation: "normal" },
    { id: "D", capacity: 3, elevation: "normal" },
    { id: "E", capacity: 3, elevation: "normal" },
    { id: "F", capacity: 2, elevation: "high" },
    { id: "G", capacity: 3, elevation: "normal" },
    { id: "H", capacity: 2, elevation: "normal" },
    { id: "I", capacity: 3, elevation: "normal" },
    { id: "J", capacity: 2, elevation: "normal" },
  ],
  edges: [
    ...[
      ["A", "B"],
      ["A", "D"],
      ["A", "E"],
      ["B", "C"],
      ["C", "E"],
      ["C", "G"],
      ["D", "E"],
      ["D", "H"],
      ["G", "J"],
      ["H", "I"],
      ["I", "J"],
    ].map(([from, to]) => ({ from, to, cornerOnly: false, blocked: false })),
    { from: "E", to: "F", cornerOnly: false, blocked: true },
    ...[
      ["D", "I"],
      ["E", "G"],
      ["G", "I"],
    ].map(([from, to]) => ({ from, to, cornerOnly: true, blocked: false })),
  ],
  unresolvedMarkers: [],
});

/** 不解析颜色 / 图标计数 / footer；未获批 raw 页不输出几何。 */
export function buildRoomTileGeometry(raw: RawFile): RoomTileGeometryFile {
  assertProphetTileLabels(raw);
  assertCollectorTileLabels(raw);
  assertFanaticTileLabels(raw);
  assertEvilEyeTileLabels(raw);
  assertTemplarsRoomTileLabels(raw);
  assertShufflingHorrorTileLabels(raw);
  assertMammothCystTileLabels(raw);
  const tiles = [
    approvedRoomTileGeometry,
    approvedTortureChamber,
    ...approvedExtraRuinsTiles,
    approvedPoolOfRebirth,
    approvedHallOfAscension,
    approvedEldritchVault,
    approvedToxicChamber,
    approvedEldritchPowerChamber,
    approvedTeleporters,
    approvedEvilEye,
    approvedTempleOfTheChosen,
    approvedTemplarsRoom,
    approvedShufflingHorrorRoom,
    approvedMammothCystRoom,
    approvedAncestorRoom,
    approvedNecromancerRoom,
    approvedProphetRoom,
    approvedCollectorRoom,
    approvedFanaticRoom,
  ];
  for (const tile of tiles) {
    const matches = raw.cards.filter((card) => card.id === tile.rawId);
    const card = matches[0];
    const face = card?.faces[tile.source.face];
    if (
      raw.category !== "dungeon_tile" ||
      raw.kind !== "sheet" ||
      matches.length !== 1 ||
      !card ||
      card.source_set !== "base" ||
      card.pages.length !== 1 ||
      card.pages[0] !== tile.source.page ||
      !face ||
      face.file !== tile.source.file ||
      face.page !== tile.source.page ||
      !face.spans.some((span) => span.t === ("number" in tile ? String(tile.number) : "1"))
    )
      throw new Error("获批 Room Tile 的 raw ID / 来源 / 页码 / 编号漂移，拒绝生成");
    for (const marker of [
      ...tile.unresolvedMarkers,
      ...(tile.deployment?.markers ?? []),
      ...("specialRegions" in tile ? tile.specialRegions : []),
    ]) {
      if (!face.icons.some((icon) => icon.iconId === marker.iconId))
        throw new Error("未确认标记在来源页缺失，拒绝生成");
    }
  }
  return roomTileGeometryFileSchema.parse({
    schema: "ddbg-room-tile-geometry-v0",
    category: "room_tile_geometry",
    tiles,
  });
}
