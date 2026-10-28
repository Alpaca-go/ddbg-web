import { describe, expect, it } from "vitest";
import file from "../normalized/corebox/corridor_layout_bindings.json";
import {
  corridorBindingKey,
  corridorLayoutBindingFileSchema,
  resolveCorridorLayoutBinding,
} from "./corridor-layout-bindings";

describe("corridor_layout_bindings", () => {
  const parsed = corridorLayoutBindingFileSchema.parse(file);

  it("当前无批准绑定，resolve 返回 pending", () => {
    expect(parsed.review).toBe("pending");
    expect(parsed.bindings).toEqual([]);
    const edge = resolveCorridorLayoutBinding(parsed, "quest_map:p001", "D", "G");
    expect(edge.status).toBe("pending");
    expect(corridorBindingKey("G", "D")).toBe(corridorBindingKey("D", "G"));
  });
});
