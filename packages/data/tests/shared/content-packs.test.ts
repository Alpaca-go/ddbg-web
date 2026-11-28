import { describe, expect, it } from "vitest";
import { cardContentPack } from "../../src/shared/content-packs";

describe("内容包命名空间", () => {
  it("核心房间族 v2 归 core", () => {
    for (const id of [
      "room:ruins:01",
      "room:darkest:01",
      "room_tile:ruins:01",
      "room_tile:darkest:01",
      "stygian_room:ruins:01",
      "stygian_room:darkest:01",
    ])
      expect(cardContentPack({ id })).toBe("core");
  });

  it("Weald/Cove/Warrens 房间族归各自扩展包", () => {
    for (const id of ["room:weald:01", "room_tile:weald:01", "stygian_room:weald:01"])
      expect(cardContentPack({ id })).toBe("weald");
    for (const id of ["room:cove:01", "room_tile:cove:01", "stygian_room:cove:01"])
      expect(cardContentPack({ id })).toBe("cove");
    for (const id of ["room:warrens:01", "room_tile:warrens:01", "curio:warrens:p001"])
      expect(cardContentPack({ id })).toBe("warrens");
  });
});
