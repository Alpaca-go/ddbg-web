import { readFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { rawFileSchema } from "../extract/raw";
import { readStygianRoomReplacement, stygianRoomsSchema } from "../stygian-rooms";
import { buildStygianRooms } from "./stygian-rooms";
import { buildRooms } from "./room";
import { loadNormalizedCorebox } from "./write";

function readRaw(name: string) {
  return rawFileSchema.parse(
    JSON.parse(
      readFileSync(new URL(`../../extract/corebox/raw/${name}.json`, import.meta.url), "utf8"),
    ),
  );
}
const raw = readRaw("stygian_room"),
  standard = readRaw("room");
const built = buildStygianRooms(raw, standard);
const target = new URL("../../normalized/corebox/stygian_rooms.json", import.meta.url);
if (process.env.WRITE_STYGIAN_ROOMS === "1")
  writeFileSync(target, `${JSON.stringify(built, null, 1)}\n`);

it("17张可再生，只替换九张遗迹/八张最暗非Boss房，保留正文图标", () => {
  expect(loadNormalizedCorebox().stygian_rooms).toEqual(built);
  expect(JSON.parse(readFileSync(target, "utf8"))).toEqual(built);
  expect(built.cards.filter((c) => c.location === "ruins")).toHaveLength(9);
  expect(built.cards.filter((c) => c.location === "darkestDungeon")).toHaveLength(8);
  for (const room of buildRooms(standard).cards) {
    const replacement = readStygianRoomReplacement(built, room.id);
    if (room.boss) expect(replacement).toBeUndefined();
    else
      expect(replacement).toMatchObject({
        name: room.name,
        number: room.number,
        location: room.location,
      });
  }
  for (const c of built.cards)
    expect(c.printedLines).toEqual(
      raw.cards.find((r) => r.id === c.id)!.faces.front.lines.map((l) => l.text),
    );
  const copy = readStygianRoomReplacement(built, "room:p001")!;
  copy.printedLines.length = 0;
  expect(readStygianRoomReplacement(built, "room:p001")?.printedLines.length).toBeGreaterThan(0);
});

it("拒绝缺卡、重复、错来源/双面页码/标题及错替换目标", () => {
  for (const mutation of ["missing", "duplicate", "file", "page", "title"] as const) {
    const bad = structuredClone(raw);
    if (mutation === "missing") bad.cards.pop();
    if (mutation === "duplicate") bad.cards[1] = structuredClone(bad.cards[0]!);
    if (mutation === "file") bad.cards[0]!.faces.front.file = "other.pdf";
    if (mutation === "page") bad.cards[0]!.faces.back!.page = 2;
    if (mutation === "title") bad.cards[0]!.faces.front.lines[0]!.text = "1—Wrong Room";
    expect(() => buildStygianRooms(bad, standard), mutation).toThrow();
  }
  const changed = structuredClone(built);
  changed.cards[9]!.replacesCardId = "room:p010";
  expect(stygianRoomsSchema.safeParse(changed).success).toBe(false);
  expect(
    stygianRoomsSchema.safeParse({ ...built, cards: [...built.cards, built.cards[0]] }).success,
  ).toBe(false);
});
