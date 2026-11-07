import bindings from "../../data/normalized/corebox/corridor_layout_bindings.json";
import {
  corridorLayoutBindingFileSchema,
  resolveCorridorLayoutBinding,
  type CorridorLayoutBinding,
} from "../../data/src/corridor-layout-bindings";

/** 核心盒无走廊板块（Q-161）；只保留 QuestMap 边 → 走廊实例绑定的查询。 */
const parsedBindings = corridorLayoutBindingFileSchema.parse(bindings);

export function resolveQuestMapEdgeCorridor(
  layoutId: string,
  from: string,
  to: string,
): CorridorLayoutBinding {
  return resolveCorridorLayoutBinding(parsedBindings, layoutId, from, to);
}

export type { CorridorLayoutBinding };
