import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cardContentPack } from "../../../src/shared/content-packs";
import { rawFileSchema } from "../../../src/shared/extract/raw";
import { stygianRoomsSchema } from "../../../src/core/rooms/stygian-rooms";
import {
  coveStygianRoomsSchema,
  readCoveStygianRoomReplacement,
} from "../../../src/cove/rooms/stygian-rooms";
import { coveRoomFileSchema } from "../../../src/cove/rooms/room";
import { buildCoveStygianRooms } from "../../../src/cove/rooms/stygian-rooms.build";
import { buildCoveRooms } from "../../../src/cove/rooms/room.build";
import { loadNormalizedCoveStygianRooms, loadNormalizedCoveRooms } from "../../../src/cove/write";
import { wealdStygianRoomsSchema } from "../../../src/weald/rooms/stygian-rooms";

const readRaw = (file: string) =>
  rawFileSchema.parse(
    JSON.parse(
      readFileSync(
        new URL(`../../../extract/extension/cove/raw/${file}.json`, import.meta.url),
        "utf8",
      ),
    ),
  );

const stygianRaw = readRaw("stygian_room");
const standardRooms = buildCoveRooms(readRaw("room"));
const built = buildCoveStygianRooms(stygianRaw, standardRooms);
const target = new URL("../../../normalized/extension/cove/stygian_rooms.json", import.meta.url);
if (process.env.WRITE_NORMALIZED === "1")
  writeFileSync(target, `${JSON.stringify(built, null, 1)}\n`);

describe("Cove Stygian 九张房间卡（印刷目录、包隔离）", () => {
  it("九张可再生，只替换同名九张 Cove 普通房，source.back 为 null", () => {
    expect(loadNormalizedCoveStygianRooms()).toEqual(built);
    expect(JSON.parse(readFileSync(target, "utf8"))).toEqual(built);
    expect(built.cards).toHaveLength(9);
    expect(built.cards.every((c) => c.location === "cove")).toBe(true);
    expect(built.cards.every((c) => c.source.back === null)).toBe(true);
    expect(built.cards.every((c) => c.expeditionRoomPoolEligible === false)).toBe(true);
    for (const room of standardRooms.cards.filter((card) => !card.boss)) {
      const replacement = readCoveStygianRoomReplacement(built, room.id);
      expect(replacement).toMatchObject({
        name: room.name,
        number: room.number,
        location: room.location,
      });
    }
    for (const c of built.cards)
      expect(c.printedLines).toEqual(
        stygianRaw.cards
          .find((r) => r.faces.front.page === c.source.page)!
          .faces.front.lines.map((l) => l.text),
      );
  });

  it("包属与 schema 隔离：不入核心/Weald Stygian 或普通房间目录", () => {
    for (const card of built.cards) {
      expect(cardContentPack(card)).toBe("cove");
      expect(card.pendingReview[0]).toContain("Q-186");
    }
    expect(coveRoomFileSchema.safeParse(built).success).toBe(false);
    expect(stygianRoomsSchema.safeParse(built).success).toBe(false);
    expect(wealdStygianRoomsSchema.safeParse(built).success).toBe(false);
    const rooms = loadNormalizedCoveRooms();
    expect(rooms.cards.filter((c) => !c.boss)).toHaveLength(9);
    for (const room of rooms.cards.filter((c) => !c.boss)) {
      expect(readCoveStygianRoomReplacement(built, room.id)?.replacesCardId).toBe(room.id);
    }
  });

  it("拒绝缺卡、重复、错来源/页码/标题及错替换目标", () => {
    for (const mutation of ["missing", "duplicate", "file", "page", "title"] as const) {
      const bad = structuredClone(stygianRaw);
      if (mutation === "missing") bad.cards.pop();
      if (mutation === "duplicate") bad.cards[1] = structuredClone(bad.cards[0]!);
      if (mutation === "file") bad.cards[0]!.faces.front.file = "other.pdf";
      if (mutation === "page") bad.cards[0]!.faces.front.page = 2;
      if (mutation === "title") bad.cards[0]!.faces.front.lines[0]!.text = "1—Wrong Room";
      expect(() => buildCoveStygianRooms(bad, standardRooms), mutation).toThrow();
    }
    const changed = structuredClone(built);
    changed.cards[0]!.replacesCardId = "room:cove:10";
    expect(coveStygianRoomsSchema.safeParse(changed).success).toBe(false);
  });
});
