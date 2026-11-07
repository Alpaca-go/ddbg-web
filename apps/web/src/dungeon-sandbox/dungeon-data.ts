import rawLayouts from "../../../../packages/data/normalized/corebox/dungeon_layouts.json";
import { dungeonLayoutFileSchema } from "../../../../packages/data/src/dungeon-layout";
import rawCurios from "../../../../packages/data/normalized/corebox/curio.json";
import { curioFileSchema } from "../../../../packages/data/src/curio";

export const layouts = dungeonLayoutFileSchema.parse(rawLayouts).layouts;
export const curios = curioFileSchema.parse(rawCurios).cards;
