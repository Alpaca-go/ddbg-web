import { readFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { rawFileSchema } from "../extract/raw";
import { questCardsSchema, readQuestCard } from "../quest-cards";
import { buildQuestCards } from "./quest-cards";
import { loadNormalizedCorebox } from "./write";

const raw = rawFileSchema.parse(
  JSON.parse(
    readFileSync(new URL("../../extract/corebox/raw/quest.json", import.meta.url), "utf8"),
  ),
);
const built = buildQuestCards(raw);
const target = new URL("../../normalized/corebox/quest_cards.json", import.meta.url);
if (process.env.WRITE_QUEST_CARDS === "1")
  writeFileSync(target, `${JSON.stringify(built, null, 1)}\n`);

it("十九张任务卡与出征定义核对后可再生，通用Boss任务没有印刷等级", () => {
  expect(loadNormalizedCorebox().quest_cards).toEqual(built);
  expect(JSON.parse(readFileSync(target, "utf8"))).toEqual(built);
  expect(built.cards.map((c) => c.level)).toEqual([
    ...Array(5).fill(1),
    ...Array(5).fill(2),
    ...Array(8).fill(3),
    null,
  ]);
  expect(readQuestCard(built, "quest:p019")).toMatchObject({
    name: "Face the Threat!",
    restPoints: 12,
    level: null,
  });
  expect(readQuestCard(built, "quest:p001")?.specialRuleLines).toEqual([]);
  expect(readQuestCard(built, "quest:p004")?.specialRuleLines.join(" ")).toContain(
    "{icon:700c7def3e}",
  );
  expect(readQuestCard(built, "quest:p999")).toBeUndefined();
  for (const c of built.cards)
    expect(c.printedLines).toEqual(
      raw.cards.find((r) => r.id === c.id)!.faces.front.lines.map((l) => l.text),
    );
  const copy = readQuestCard(built, "quest:p004")!;
  copy.specialRuleLines.length = 0;
  expect(readQuestCard(built, copy.id)?.specialRuleLines.length).toBeGreaterThan(0);
});

it("拒绝缺卡、重复、标题/点数/等级漂移、来源页码错误与损坏段落", () => {
  for (const mutation of [
    "missing",
    "duplicate",
    "title",
    "points",
    "level",
    "page",
    "file",
    "xp",
  ] as const) {
    const bad = structuredClone(raw),
      card = bad.cards[0]!;
    if (mutation === "missing") bad.cards.pop();
    if (mutation === "duplicate") bad.cards[1] = structuredClone(card);
    if (mutation === "title") card.faces.front.lines[1]!.text = "8 Wrong Name";
    if (mutation === "points") card.faces.front.lines[1]!.text = "9 Scout Ahead";
    if (mutation === "level") card.faces.front.lines[0]!.text = "{icon:96c024d2c6} III";
    if (mutation === "page") card.faces.back!.page = 2;
    if (mutation === "file") card.faces.front.file = "other.pdf";
    if (mutation === "xp")
      card.faces.front.lines = card.faces.front.lines.filter((l) => l.text !== "XP");
    expect(() => buildQuestCards(bad), mutation).toThrow();
  }
  const altered = structuredClone(built);
  altered.cards[3]!.specialRuleLines = [];
  expect(questCardsSchema.safeParse(altered).success).toBe(false);
});
