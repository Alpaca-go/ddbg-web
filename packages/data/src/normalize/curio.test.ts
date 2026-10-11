import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import normalized from "../../normalized/corebox/curio.json";
import { rawFileSchema } from "../extract/raw";
import { iconDictionarySchema } from "../dictionary/schema";
import { curioFileSchema } from "../curio";
import { buildCurios } from "./curio";

const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const raw = rawFileSchema.parse(read("../../extract/corebox/raw/curio.json"));
const dictionary = iconDictionarySchema.parse(read("../../dictionary/icon-dictionary-v1.8.json"));
it("24 张逐页转录可再生，来源 / 份数 / ID 守恒；只 p21 全行已核实，不剔除其余卡", () => {
  const file = buildCurios(raw, dictionary);
  expect(file).toEqual(curioFileSchema.parse(normalized));
  expect(file.cards.filter((c) => c.rows.every((r) => r.effect))).toHaveLength(1);
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
it("效果栏的 decor / curio_picture / 未收录图标保留 null；不凭外观命名怪癖 / 饰品 / 补给", () => {
  const file = buildCurios(raw, dictionary);
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
