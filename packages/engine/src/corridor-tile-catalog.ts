import catalog from "../../data/normalized/corebox/corridor_tile_geometry.json";
import bindings from "../../data/normalized/corebox/corridor_layout_bindings.json";
import {
  corridorLayoutBindingFileSchema,
  resolveCorridorLayoutBinding,
  type CorridorLayoutBinding,
} from "../../data/src/corridor-layout-bindings";
import { corridorTileGeometryFileSchema } from "../../data/src/normalize/corridor-tile";

const parsedCatalog = corridorTileGeometryFileSchema.parse(catalog);
const parsedBindings = corridorLayoutBindingFileSchema.parse(bindings);

const byId = new Map(parsedCatalog.tiles.map((tile) => [tile.id, tile]));

export function readCorridorTileCatalog() {
  return parsedCatalog;
}

export function lookupCorridorTile(corridorTileId: string) {
  return byId.get(corridorTileId);
}

export function resolveQuestMapEdgeCorridor(
  layoutId: string,
  from: string,
  to: string,
): CorridorLayoutBinding {
  return resolveCorridorLayoutBinding(parsedBindings, layoutId, from, to);
}

export type { CorridorLayoutBinding };
