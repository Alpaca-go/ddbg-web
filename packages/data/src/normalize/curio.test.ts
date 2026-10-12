import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import normalized from "../../normalized/corebox/curio.json";
import { rawFileSchema } from "../extract/raw";
import { iconDictionarySchema } from "../dictionary/schema";
import { curioFileSchema, isNegativeCurioEffect } from "../curio";
import { buildCurios } from "./curio";

const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const raw = rawFileSchema.parse(read("../../extract/corebox/raw/curio.json"));
const dictionary = iconDictionarySchema.parse(read("../../dictionary/icon-dictionary-v1.8.json"));
it("01–24 完整手打效果逐行一致；Torch 保留正面怪癖、Buff、饰品与补给", () => {
  const expected = [
    "stress negative debuff gold10",
    "stress negative blight buff",
    "stress negative disease provision",
    "stress blight debuff gold5",
    "stress negative buff trinket",
    "negative bleed positive",
    "bleed trinket positive gold5",
    "negative disease gold10 provision",
    "stress negative bleed gold5",
    "blight gold5 positive provision",
    "stress negative bleed positive",
    "stress negative bleed trinket",
    "stress negative blight gold5",
    "stress negative blight disease",
    "negative bleed gold10 provision",
    "blight positive gold5 provision",
    "stress negative bleed disease",
    "stress negative bleed trinket",
    "stress negative bleed gold10",
    "stress negative gold10 provision",
    "stress bleed disease gold10",
    "stress negative bleed trinket",
    "stress negative bleed disease",
    "stress bleed positive trinket",
  ];
  const cards = buildCurios(raw, dictionary).cards;
  expect(
    cards.map((c) =>
      c.rows
        .map((r) => {
          const e = r.effect!;
          return e.type === "status"
            ? e.kind
            : e.type === "gold"
              ? `gold${e.amount}`
              : e.type === "drawQuirk"
                ? e.polarity
                : e.type === "drawTrinket"
                  ? "trinket"
                  : e.type === "rollProvision"
                    ? "provision"
                    : e.type === "drawDisease"
                      ? "disease"
                      : "stress";
        })
        .join(" "),
    ),
  ).toEqual(expected);
  const p5 = cards[4]!.rows.map((r) => r.effect!);
  expect(p5.filter((e) => !isNegativeCurioEffect(e)).map((e) => e.type)).toEqual([
    "status",
    "drawTrinket",
  ]);
  expect(cards[0]!.rows[1]!.effect).toEqual({ type: "drawQuirk", polarity: "negative", count: 1 });
  expect(cards[16]!.rows[3]!.effect).toEqual({ type: "drawDisease", count: 1 });
  for (const card of cards)
    for (const row of card.rows) {
      const e = row.effect!;
      if (e.type === "status")
        expect(e).toEqual(
          e.kind === "buff" || e.kind === "debuff"
            ? { type: "status", kind: e.kind, duration: 2 }
            : { type: "status", kind: e.kind, amount: 1, duration: 3 },
        );
    }
});
it("R-064：24 张全部效果行已核实且可再生，来源 / 份数 / ID 守恒，不剔除卡牌", () => {
  const file = buildCurios(raw, dictionary);
  expect(file).toEqual(curioFileSchema.parse(normalized));
  expect(file.cards.filter((c) => c.rows.every((r) => r.effect))).toHaveLength(24);
  expect(file.cards[20]!.rows.map((r) => r.effect!.type)).toEqual([
    "stress",
    "status",
    "drawDisease",
    "gold",
  ]);
  expect(file.cards.every((c, i) => c.source.page === i + 1 && c.copies === 1)).toBe(true);
  expect(curioFileSchema.safeParse({ ...file, cards: file.cards.slice(1) }).success).toBe(false);
  expect(
    curioFileSchema.safeParse({ ...file, cards: [...file.cards.slice(1), file.cards[1]] }).success,
  ).toBe(false);
});
it("获批图标退回 decor / curio_picture / 未确认或词典丢失时保留 null，不沿用旧批准", () => {
  const rejected = {
    ...dictionary,
    icons: dictionary.icons.map((i) =>
      ["3fe634e723", "85e094f269", "ae45f5bcb3", "40c4cc438c", "449d2d43ed"].includes(i.iconId)
        ? { ...i, status: "unreviewed" as const }
        : i,
    ),
  };
  const file = buildCurios(raw, rejected);
  for (const id of ["3fe634e723", "85e094f269", "ae45f5bcb3", "40c4cc438c", "449d2d43ed"])
    expect(
      file.cards
        .flatMap((c) => c.rows)
        .filter((r) => r.iconId === id)
        .every((r) => r.effect === null && r.reason?.startsWith("Q-60")),
    ).toBe(true);
});
it("退回词典、换来源、删效果图标或改印刷数值均不会沿用旧已核实效果", () => {
  const downgraded = {
    ...dictionary,
    icons: dictionary.icons.map((i) =>
      i.key === "stress" ? { ...i, status: "unreviewed" as const } : i,
    ),
  };
  expect(
    buildCurios(raw, downgraded)
      .cards.flatMap((c) => c.rows)
      .filter((r) => r.iconId === "12438e9a49")
      .every((r) => r.effect === null),
  ).toBe(true);
  const missing = structuredClone(raw);
  missing.cards[20]!.faces.front.icons = missing.cards[20]!.faces.front.icons.filter(
    (i) => i.iconId !== "be17b4ee09",
  );
  expect(() => buildCurios(missing, dictionary)).toThrow("效果图标");
  const wrongSource = structuredClone(raw);
  wrongSource.cards[0]!.faces.front.file = "wrong.pdf";
  expect(() => buildCurios(wrongSource, dictionary)).toThrow("来源");
  const changed = structuredClone(raw);
  changed.cards[20]!.faces.front.spans = changed.cards[20]!.faces.front.spans.map((s) =>
    s.t.trim() === "10" ? { ...s, t: "20" } : s,
  );
  expect(() => buildCurios(changed, dictionary)).toThrow("印刷数字");
});
