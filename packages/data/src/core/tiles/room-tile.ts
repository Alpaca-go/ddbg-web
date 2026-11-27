import { printIcon, printSourceIcon } from "../../shared/print-icons";
import { fanaticRoomSchema } from "../rooms/fanatic-room";
import { collectorRoomSchema } from "../rooms/collector-room";
import { prophetRoomSchema } from "../rooms/prophet-room";
import { necromancerRoomSchema } from "../rooms/necromancer-room";
import { ancestorRoomSchema } from "../rooms/ancestor-room";
import { mammothCystRoomSchema } from "../rooms/mammoth-cyst-room";
import { shufflingHorrorRoomSchema } from "../rooms/shuffling-horror-room";
import { templarsRoomSchema } from "../rooms/templars-room";
import { templeOfTheChosenSchema } from "../rooms/temple-of-the-chosen.build";
import { evilEyeSchema } from "../rooms/evil-eye.build";
import { teleportersSchema } from "../rooms/teleporters.build";
import { eldritchPowerChamberSchema } from "../rooms/eldritch-power-chamber.build";
import { toxicChamberSchema } from "../rooms/toxic-chamber.build";
import { eldritchVaultSchema } from "../rooms/eldritch-vault.build";
import { hallOfAscensionSchema } from "../rooms/hall-of-ascension.build";
import { z } from "zod";
import { iconIdSchema } from "../../shared/extract/common";
import { tortureChamberSchema } from "../rooms/torture-chamber.build";
import { approvedExtraRuinsTileSchema } from "./approved-ruins-tiles.build";
import { poolOfRebirthSchema } from "../rooms/pool-of-rebirth.build";

/** 几何数据不是可用卡池；未命名图标只保留 ID，不补含义或数值（R-048）。 */
export const ritualChamberSchema = z
  .strictObject({
    id: z.literal("room_tile:ruins:01"),
    roomId: z.literal("room:ruins:01"),
    location: z.literal("ruins"),
    number: z.literal(1),
    rawId: z.string().min(1),
    name: z.string().min(1),
    source: z.strictObject({
      file: z.string().min(1),
      page: z.int().positive(),
      face: z.literal("front"),
    }),
    ruling: z.literal("R-054"),
    geometryVerified: z.literal(true),
    usable: z.boolean(),
    deployment: z
      .strictObject({
        ruling: z.literal("R-055"),
        printReview: z.enum(["pending", "verified"]),
        heroes: z.strictObject({
          aggressive: z.literal("H"),
          ranged: z.literal("H"),
          defensive: z.literal("C"),
          support: z.literal("C"),
        }),
        monsters: z.strictObject({
          aggressive: z.literal("J"),
          defensive: z.literal("D"),
          support: z.literal("D"),
          ranged: z.literal("F"),
        }),
        lootAreas: z.tuple([z.literal("C"), z.literal("H")]),
        markers: z
          .array(
            z.strictObject({
              areaId: z.string().min(1),
              iconId: iconIdSchema,
              semantic: z.enum(["hero_support_start", "monster_support_start", "cornered"]),
              status: z.enum(["provisional", "confirmed"]),
            }),
          )
          .length(4),
      })
      .optional(),
    areas: z
      .array(
        z.strictObject({
          id: z.string().min(1),
          capacity: z.int().nonnegative(),
          elevation: z.enum(["low", "normal", "high"]),
        }),
      )
      .min(1),
    edges: z.array(
      z.strictObject({
        from: z.string().min(1),
        to: z.string().min(1),
        cornerOnly: z.boolean(),
        blocked: z.boolean(),
      }),
    ),
    unresolvedMarkers: z.array(
      z.strictObject({ areaId: z.string().min(1), iconId: iconIdSchema, semantic: z.null() }),
    ),
  })
  .superRefine((tile, ctx) => {
    const ids = new Set(tile.areas.map((area) => area.id));
    const pairs = new Set<string>();
    if (ids.size !== tile.areas.length) ctx.addIssue({ code: "custom", message: "区域 ID 重复" });
    for (const edge of tile.edges) {
      const key = JSON.stringify([edge.from, edge.to].sort());
      if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to || pairs.has(key))
        ctx.addIssue({ code: "custom", message: "边必须引用不同的已知区域，且不能重复" });
      pairs.add(key);
    }
    if (tile.unresolvedMarkers.some((marker) => !ids.has(marker.areaId)))
      ctx.addIssue({ code: "custom", message: "标记引用未知区域" });
    const approved = Boolean(
      tile.deployment?.printReview === "verified" &&
      tile.deployment.markers.every((marker) => marker.status === "confirmed") &&
      tile.unresolvedMarkers.length === 0,
    );
    if (tile.usable !== approved)
      ctx.addIssue({ code: "custom", message: "usable 必须与完整印刷复核 / 标记确认一致" });
    if (tile.deployment?.markers.some((marker) => !ids.has(marker.areaId)))
      ctx.addIssue({ code: "custom", message: "部署标记引用未知区域" });
    const placements = new Set([
      `C:${printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:25")}:hero_support_start`,
      `D:${printIcon("stance_support_monster_slot", 216)}:monster_support_start`,
      `C:${printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:3")}:cornered`,
      `H:${printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:3")}:cornered`,
    ]);
    if (
      tile.deployment &&
      (new Set(
        tile.deployment.markers.map(
          (marker) => `${marker.areaId}:${marker.iconId}:${marker.semantic}`,
        ),
      ).size !== 4 ||
        tile.deployment.markers.some(
          (marker) => !placements.has(`${marker.areaId}:${marker.iconId}:${marker.semantic}`),
        ))
    )
      ctx.addIssue({ code: "custom", message: "R-055 标记限定放置漂移" });
  });

export const roomTileGeometrySchema = z.union([
  ritualChamberSchema,
  tortureChamberSchema,
  approvedExtraRuinsTileSchema,
  poolOfRebirthSchema,
  hallOfAscensionSchema,
  eldritchVaultSchema,
  toxicChamberSchema,
  eldritchPowerChamberSchema,
  teleportersSchema,
  evilEyeSchema,
  templeOfTheChosenSchema,
  templarsRoomSchema,
  shufflingHorrorRoomSchema,
  mammothCystRoomSchema,
  ancestorRoomSchema,
  necromancerRoomSchema,
  prophetRoomSchema,
  collectorRoomSchema,
  fanaticRoomSchema,
]);

export const roomTileGeometryFileSchema = z
  .strictObject({
    schema: z.literal("ddbg-room-tile-geometry-v0"),
    category: z.literal("room_tile_geometry"),
    tiles: z.array(roomTileGeometrySchema),
  })
  .superRefine((file, ctx) => {
    if (
      new Set(file.tiles.map((tile) => tile.id)).size !== file.tiles.length ||
      new Set(file.tiles.map((tile) => `${tile.rawId}:${tile.source.face}`)).size !==
        file.tiles.length
    )
      ctx.addIssue({ code: "custom", message: "板块 ID / raw 同面重复" });
  });

export type RoomTileGeometryFile = z.infer<typeof roomTileGeometryFileSchema>;
