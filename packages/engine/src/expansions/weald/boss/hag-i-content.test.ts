import { describe, expect, it } from "vitest";
import { WEALD_HAG_I_CONTENT, hagIApprovedBattleAreas } from "./hag-i-content";
import { findWealdRoomTile } from "../room-catalog";

describe("R-254 Hag I 生产几何投影", () => {
  it("角点和黑墙不形成相邻，剩余共边双向连通", () => {
    const areas = hagIApprovedBattleAreas();
    const adjacent = (id: string) => areas.find((a) => a.id === id)!.adjacent;
    for (const [a, b] of [
      ["B", "F"],
      ["E", "K"],
      ["H", "J"],
      ["E", "G"],
    ]) {
      expect(adjacent(a!)).not.toContain(b);
      expect(adjacent(b!)).not.toContain(a);
    }
    for (const [a, b] of [
      ["C", "F"],
      ["D", "G"],
    ]) {
      expect(adjacent(a!)).toContain(b);
      expect(adjacent(b!)).toContain(a);
    }
    expect(areas.reduce((sum, a) => sum + a.adjacent.length, 0)).toBe(34);
    expect(areas.every((a) => a.elevation === "normal" && a.capacity! > 0 && !a.zeroCapacity)).toBe(
      true,
    );
  });

  it("怪物部署区域独立于英雄区域，投影不改目录且普通目录没有 Boss 房", () => {
    const before = structuredClone(WEALD_HAG_I_CONTENT);
    const areas = hagIApprovedBattleAreas();
    const { setup, tile } = WEALD_HAG_I_CONTENT;
    expect(tile.deployment.monsters[setup.hagStance]).toBe("B");
    expect(tile.deployment.monsters[setup.cauldronStance]).toBe("F");
    expect(tile.deployment.heroes[setup.cauldronStance]).toBe("J");
    expect(areas.find((a) => a.id === "F")?.capacity).toBe(3);
    expect(WEALD_HAG_I_CONTENT).toEqual(before);
    expect(findWealdRoomTile("room:weald:p010")).toBeUndefined();
  });
});
