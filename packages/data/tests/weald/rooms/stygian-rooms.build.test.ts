import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cardContentPack } from "../../../src/shared/content-packs";
import { rawFileSchema } from "../../../src/shared/extract/raw";
import { stygianRoomsSchema } from "../../../src/core/rooms/stygian-rooms";
import {
  readWealdStygianRoomReplacement,
  wealdStygianRoomsSchema,
} from "../../../src/weald/rooms/stygian-rooms";
import { wealdRoomFileSchema } from "../../../src/weald/rooms/room";
import { buildWealdStygianRooms } from "../../../src/weald/rooms/stygian-rooms.build";
import { buildWealdRooms } from "../../../src/weald/rooms/rooms.build";
import { loadNormalizedCorebox } from "../../../src/shared/write";
import {
  loadNormalizedWealdStygianRooms,
  loadNormalizedWealdRooms,
} from "../../../src/shared/write-weald";

const readRaw = (file: string) =>
  rawFileSchema.parse(
    JSON.parse(
      readFileSync(
        new URL(`../../../extract/extension/weald/raw/${file}.json`, import.meta.url),
        "utf8",
      ),
    ),
  );

const stygianRaw = readRaw("stygian_room");
const standardRooms = buildWealdRooms(readRaw("room"));
const built = buildWealdStygianRooms(stygianRaw, standardRooms);
const target = new URL("../../../normalized/extension/weald/stygian_rooms.json", import.meta.url);
if (process.env.WRITE_NORMALIZED === "1")
  writeFileSync(target, `${JSON.stringify(built, null, 1)}\n`);

describe("Weald Stygian 九张房间卡（审阅入库、包隔离）", () => {
  it("九张可再生，只替换同名九张 Weald 普通房，保留印刷正文", () => {
    expect(loadNormalizedWealdStygianRooms()).toEqual(built);
    expect(JSON.parse(readFileSync(target, "utf8"))).toEqual(built);
    expect(built.cards).toHaveLength(9);
    expect(built.cards.every((c) => c.location === "weald")).toBe(true);
    for (const room of standardRooms.cards.filter((card) => !card.boss)) {
      const replacement = readWealdStygianRoomReplacement(built, room.id);
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
    const eight = built.cards.find((c) => c.number === 8)!;
    expect(eight.reviewedEffect).toMatchObject({ kind: "abyssalPuff", buffApplications: 2 });
    const nine = built.cards.find((c) => c.number === 9)!;
    expect(nine.reviewedEffect).toMatchObject({
      kind: "clearing",
      oursDebuffRemoved: true,
      oursBuffDuration: 3,
    });
    const copy = readWealdStygianRoomReplacement(built, "room:weald:01")!;
    copy.printedLines.length = 0;
    expect(readWealdStygianRoomReplacement(built, "room:weald:01")?.printedLines.length).toBe(
      stygianRaw.cards[0]!.faces.front.lines.length,
    );
  });

  it("包属与 schema 隔离：不入核心 17 张目录", () => {
    for (const card of built.cards) expect(cardContentPack(card)).toBe("weald");
    expect(wealdRoomFileSchema.safeParse(built).success).toBe(false);
    expect(stygianRoomsSchema.safeParse(built).success).toBe(false);
    expect(wealdStygianRoomsSchema.safeParse(loadNormalizedCorebox().stygian_rooms).success).toBe(
      false,
    );
    const { rooms } = loadNormalizedWealdRooms();
    expect(
      rooms.cards.every(
        (c) => !readWealdStygianRoomReplacement(built, c.id)?.id.startsWith("stygian_room:p00"),
      ),
    ).toBe(true);
  });

  it("拒绝缺卡、重复、错来源/页码/标题及错替换目标", () => {
    for (const mutation of ["missing", "duplicate", "file", "page", "title"] as const) {
      const bad = structuredClone(stygianRaw);
      if (mutation === "missing") bad.cards.pop();
      if (mutation === "duplicate") bad.cards[1] = structuredClone(bad.cards[0]!);
      if (mutation === "file") bad.cards[0]!.faces.front.file = "other.pdf";
      if (mutation === "page") bad.cards[0]!.faces.back!.page = 2;
      if (mutation === "title") bad.cards[0]!.faces.front.lines[0]!.text = "1—Wrong Room";
      expect(() => buildWealdStygianRooms(bad, standardRooms), mutation).toThrow();
    }
    const printed = structuredClone(stygianRaw);
    const line = printed.cards[0]!.faces.front.lines.find((l) => l.text.includes("3t"))!;
    line.text = line.text.replace("3t", "2t");
    expect(() => buildWealdStygianRooms(printed, standardRooms)).toThrow(/漂移/);
    const changed = structuredClone(built);
    changed.cards[0]!.replacesCardId = "room:ruins:01";
    expect(wealdStygianRoomsSchema.safeParse(changed).success).toBe(false);
    expect(
      wealdStygianRoomsSchema.safeParse({ ...built, cards: [...built.cards, built.cards[0]] })
        .success,
    ).toBe(false);
  });
});
