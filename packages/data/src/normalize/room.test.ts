import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import normalized from "../../normalized/corebox/room.json";
import { rawFileSchema } from "../extract/raw";
import { roomFileSchema } from "../room";
import { buildRooms } from "./room";

const raw = rawFileSchema.parse(
  JSON.parse(readFileSync(new URL("../../extract/corebox/raw/room.json", import.meta.url), "utf8")),
);
it("25 张可再生，遗迹 9 / 最暗地牢 8 / Boss 8；文本图标不解释为效果", () => {
  const file = buildRooms(raw);
  expect(file).toEqual(roomFileSchema.parse(normalized));
  expect(file.cards.filter((c) => c.location === "ruins" && !c.boss)).toHaveLength(9);
  expect(file.cards.filter((c) => c.location === "darkestDungeon" && !c.boss)).toHaveLength(8);
  expect(file.cards.filter((c) => c.boss)).toHaveLength(8);
  expect(file.cards[0]!.name).toBe("Ritual Chamber");
  expect(
    file.cards.every(
      (c, i) =>
        c.printedLines.join("\n") === raw.cards[i]!.faces.front.lines.map((l) => l.text).join("\n"),
    ),
  ).toBe(true);
});
it("缺牌、重复、错地点 / Boss 分类、错来源、换编号均拒绝", () => {
  const file = buildRooms(raw);
  const changed = (fields: object) => ({
    ...file,
    cards: [{ ...file.cards[0], ...fields }, ...file.cards.slice(1)],
  });
  for (const bad of [
    { ...file, cards: file.cards.slice(1) },
    { ...file, cards: [file.cards[1], ...file.cards.slice(1)] },
    changed({ boss: true }),
    changed({ location: "darkestDungeon" }),
    changed({ number: 2 }),
  ])
    expect(roomFileSchema.safeParse(bad).success).toBe(false);
  const altered = structuredClone(raw);
  altered.cards[0]!.faces.front.file = "other.pdf";
  expect(() => buildRooms(altered)).toThrow("来源");
});
