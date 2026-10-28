import rawLayouts from "../../../../packages/data/normalized/corebox/dungeon_layouts.json";
import rawCorridorCatalog from "../../../../packages/data/normalized/corebox/corridor_tile_geometry.json";
import { dungeonLayoutFileSchema } from "../../../../packages/data/src/dungeon-layout";
import { corridorTileGeometryFileSchema } from "../../../../packages/data/src/normalize/corridor-tile";
import rawCurios from "../../../../packages/data/normalized/corebox/curio.json";
import { curioFileSchema } from "../../../../packages/data/src/curio";

export const layouts = dungeonLayoutFileSchema.parse(rawLayouts).layouts;
export const corridorTileCatalog = corridorTileGeometryFileSchema.parse(rawCorridorCatalog);
export const curios = curioFileSchema.parse(rawCurios).cards;
