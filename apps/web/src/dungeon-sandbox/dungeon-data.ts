import rawLayouts from "../../../../packages/data/normalized/corebox/dungeon_layouts.json";
import { dungeonLayoutFileSchema } from "../../../../packages/data/src/core/tiles/dungeon-layout";
import rawCurios from "../../../../packages/data/normalized/corebox/curio.json";
import { curioFileSchema } from "../../../../packages/data/src/core/curios/curio";

import rawRooms from "../../../../packages/data/normalized/corebox/room.json";
import { roomFileSchema } from "../../../../packages/data/src/core/rooms/room";
import rawMonsterPool from "../../../../packages/data/normalized/corebox/monster_pool.json";
import { monsterPoolFileSchema } from "../../../../packages/data/src/core/monsters/monster-pool";
import rawTrinkets from "../../../../packages/data/normalized/corebox/trinket.json";
import { normalizedTrinketFileSchema } from "../../../../packages/data/src/shared/schema";

export const coreRooms = roomFileSchema.parse(rawRooms).cards;
export const coreMonsterPool = monsterPoolFileSchema.parse(rawMonsterPool).cards;
export const coreTrinkets = normalizedTrinketFileSchema.parse(rawTrinkets).cards;
export const layouts = dungeonLayoutFileSchema.parse(rawLayouts).layouts;
export const curios = curioFileSchema.parse(rawCurios).cards;
