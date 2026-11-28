import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cardContentPack } from "../../../src/shared/content-packs";
import { rawFileSchema } from "../../../src/shared/extract/raw";
import { warrensRoomFileSchema } from "../../../src/warrens/rooms/room";
import { buildWarrensRooms } from "../../../src/warrens/rooms/room.build";
import {
  loadNormalizedWarrensRooms,
  writeNormalizedWarrensRooms,
} from "../../../src/warrens/write";

const read = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8")) as unknown;

if (process.env.WRITE_NORMALIZED === "1") writeNormalizedWarrensRooms();

const built = loadNormalizedWarrensRooms();

describe("Warrens 九张普通房间", () => {
  it("重建结果与提交的 normalized 文件一致", () => {
    expect(warrensRoomFileSchema.parse(read("normalized/extension/warrens/room.json"))).toEqual(
      built,
    );
  });

  it("均属 warrens 命名空间，且不含 Boss 房", () => {
    expect(built.cards).toHaveLength(9);
    for (const card of built.cards) {
      expect(cardContentPack(card)).toBe("warrens");
      expect(card.boss).toBe(false);
    }
  });

  it("Putrid Cellar 登记 Infectious Mucus 弃 1 Provision（无 +1）", () => {
    const room1 = built.cards.find((c) => c.number === 1)!;
    expect(room1.name).toBe("Putrid Cellar");
    expect(room1.verifiedEffect?.summary).toContain("Provision");
    expect(room1.printedLines.join(" ")).not.toMatch(/suffer \+1/);
    expect(room1.pendingReview).toHaveLength(0);
  });

  it("raw 含 Boss p10–p12 时构建仍只输出九张普通房", () => {
    const raw = rawFileSchema.parse(read("extract/extension/warrens/raw/room.json"));
    expect(raw.cards.length).toBeGreaterThanOrEqual(12);
    const out = buildWarrensRooms(raw);
    expect(out.cards).toHaveLength(9);
    expect(out.cards.every((c) => c.number <= 9)).toBe(true);
  });
});
