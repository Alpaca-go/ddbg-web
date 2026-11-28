import { expect, it } from "vitest";
import { rawFileSchema } from "../../../src/shared/extract/raw";
import { loadNormalizedWarrensBossRooms } from "../../../src/warrens/write";
import { warrensBossRoomFileSchema } from "../../../src/warrens/rooms/room";
import roomRaw from "../../../extract/extension/warrens/raw/room.json";

it("Boss 房 normalized 仅含 room:warrens:10–12，且与印刷 BOSS 标签一致", () => {
  rawFileSchema.parse(roomRaw);
  const built = loadNormalizedWarrensBossRooms();
  const file = warrensBossRoomFileSchema.parse(built);
  expect(file.cards.map((c) => c.id)).toEqual([
    "room:warrens:10",
    "room:warrens:11",
    "room:warrens:12",
  ]);
  expect(file.cards.every((c) => c.poolEligible === false)).toBe(true);
  expect(file.cards[0]?.verifiedEffect?.pendingQuestions).toContain("Q-WARRENS-26");
  expect(file.cards[2]?.verifiedEffect?.pendingQuestions).toContain("Q-WARRENS-28");
});
