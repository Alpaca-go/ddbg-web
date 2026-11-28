import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cardContentPack } from "../../../src/shared/content-packs";
import { rawFileSchema } from "../../../src/shared/extract/raw";
import { stygianRoomsSchema } from "../../../src/core/rooms/stygian-rooms";
import {
  readWarrensStygianRoomReplacement,
  warrensStygianReplacementTargets,
  warrensStygianRoomsSchema,
} from "../../../src/warrens/rooms/stygian-rooms";
import { buildWarrensStygianRooms } from "../../../src/warrens/rooms/stygian-rooms.build";
import { loadNormalizedWarrensStygianRooms } from "../../../src/warrens/write";
import { wealdStygianRoomsSchema } from "../../../src/weald/rooms/stygian-rooms";

const readRaw = (file: string) =>
  rawFileSchema.parse(
    JSON.parse(
      readFileSync(
        new URL(`../../../extract/extension/warrens/raw/${file}.json`, import.meta.url),
        "utf8",
      ),
    ),
  );

const stygianRaw = readRaw("stygian_room");
const built = buildWarrensStygianRooms(stygianRaw);
const target = new URL("../../../normalized/extension/warrens/stygian_rooms.json", import.meta.url);
if (process.env.WRITE_NORMALIZED === "1")
  writeFileSync(target, `${JSON.stringify(built, null, 1)}\n`);

describe("Warrens Stygian 九张房间卡（审阅入库、包隔离）", () => {
  it("九张可再生，替换 room:warrens:01–09，保留印刷正文", () => {
    expect(loadNormalizedWarrensStygianRooms()).toEqual(built);
    expect(JSON.parse(readFileSync(target, "utf8"))).toEqual(built);
    expect(built.cards).toHaveLength(9);
    expect(built.cards.every((c) => c.location === "warrens")).toBe(true);
    expect(built.cards.every((c) => c.reviewedEffect === null)).toBe(true);
    for (const { number, name } of warrensStygianReplacementTargets) {
      const replacement = readWarrensStygianRoomReplacement(
        built,
        `room:warrens:${String(number).padStart(2, "0")}`,
      );
      expect(replacement).toMatchObject({ name, number, location: "warrens" });
    }
    for (const c of built.cards)
      expect(c.printedLines).toEqual(
        stygianRaw.cards
          .find((r) => r.faces.front.page === c.source.page)!
          .faces.front.lines.map((l) => l.text),
      );
    const four = built.cards.find((c) => c.number === 4)!;
    expect(four.pendingReview.some((line) => line.includes("Q-WARRENS-37"))).toBe(true);
    expect(four.printedLines.join(" ")).toContain("First wounded Monster");
    const one = built.cards.find((c) => c.number === 1)!;
    expect(one.printedLines.join(" ")).toContain("and suffer");
    expect(one.printedLines.join(" ")).toContain("+1.");
  });

  it("包属与 schema 隔离：不入核心或 Weald 目录", () => {
    for (const card of built.cards) expect(cardContentPack(card)).toBe("warrens");
    expect(stygianRoomsSchema.safeParse(built).success).toBe(false);
    expect(wealdStygianRoomsSchema.safeParse(built).success).toBe(false);
    expect(warrensStygianRoomsSchema.safeParse(built).success).toBe(true);
  });

  it("拒绝缺卡、重复、错来源/页码/标题", () => {
    for (const mutation of ["missing", "duplicate", "file", "page", "title"] as const) {
      const bad = structuredClone(stygianRaw);
      if (mutation === "missing") bad.cards.pop();
      if (mutation === "duplicate") bad.cards[1] = structuredClone(bad.cards[0]!);
      if (mutation === "file") bad.cards[0]!.faces.front.file = "other.pdf";
      if (mutation === "page") bad.cards[0]!.faces.back!.page = 2;
      if (mutation === "title") bad.cards[0]!.faces.front.lines[0]!.text = "1—Wrong Room";
      expect(() => buildWarrensStygianRooms(bad), mutation).toThrow();
    }
    const printed = structuredClone(stygianRaw);
    const line = printed.cards[0]!.faces.front.lines.find((l) => l.text.includes("+1"))!;
    line.text = line.text.replace("+1", "+2");
    expect(() => buildWarrensStygianRooms(printed)).toThrow(/漂移/);
    const changed = structuredClone(built);
    changed.cards[0]!.replacesCardId = "room:weald:01";
    expect(warrensStygianRoomsSchema.safeParse(changed).success).toBe(false);
  });
});
