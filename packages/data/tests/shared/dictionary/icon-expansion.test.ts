import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it, vi } from "vitest";
import { defineHeroModule } from "../../../src/core/heroes/annotations/patch-helpers";
import { matchesCoreTrinketPrint } from "../../../src/core/trinkets/core-trinket-bindings";
import { loadIconDictionary } from "../../../src/shared/dictionary/load";
import { createIconLookup } from "../../../src/shared/icons";
import { printIcon } from "../../../src/shared/print-icons";
import { DATA_ROOT } from "../../../src/shared/write-files";
import * as write from "../../../src/write";

const fixture = vi.hoisted(() => ({
  rangeId: "1".repeat(10),
  bleedId: "2".repeat(10),
}));

vi.mock("../../../dictionary/print-icon-additions.json", async (importOriginal) => {
  const { default: dictionary } = await import("../../../dictionary/icon-dictionary-v1.8.json");
  const { default: additions } = await importOriginal<{
    default: typeof import("../../../dictionary/print-icon-additions.json");
  }>();
  const entries = [
    { key: "range", iconId: fixture.rangeId },
    { key: "bleed", iconId: fixture.bleedId },
  ].map(({ key, iconId }, index) => ({
    ...dictionary.icons.find((icon) => icon.key === key && icon.status === "confirmed")!,
    iconId,
    rank: dictionary.icons.length + additions.length + index + 1,
    placeholder: `{icon:${iconId}}`,
  }));
  return { default: [...additions, ...entries] };
});

vi.mock("../../../dictionary/print-icon-index.json", async (importOriginal) => {
  const { default: index } = await importOriginal<{
    default: typeof import("../../../dictionary/print-icon-index.json");
  }>();
  const { default: additions } = await import("../../../dictionary/print-icon-additions.json");
  const { iconEntrySchema } = await import("../../../src/shared/dictionary/schema");
  const [range, bleed] = iconEntrySchema.array().parse(additions).slice(-2);
  return {
    default: {
      ...index,
      labels: {
        ...index.labels,
        range: [...index.labels.range, [range!.rank, range!.iconId]],
        bleed: [...index.labels.bleed, [bleed!.rank, bleed!.iconId]],
      },
    },
  };
});

it("R-048：追加射程和流血的印刷变体，旧目录逐字节一致", () => {
  const output = mkdtempSync(path.join(tmpdir(), "ddbg-icon-expansion-"));
  try {
    const coreDir = path.join(output, "corebox");
    const wealdDir = path.join(output, "extension/weald");
    write.writeNormalizedCorebox(coreDir);
    write.writeNormalizedWealdCurios(wealdDir);
    write.writeNormalizedWealdHigherQuests(wealdDir);
    write.writeNormalizedWealdLevelOneMonsters(wealdDir);
    write.writeNormalizedWealdLevelOneQuestCards(wealdDir);
    write.writeNormalizedWealdRooms(wealdDir);
    write.writeNormalizedWealdStygianRooms(wealdDir);

    for (const group of ["corebox", "extension/weald"]) {
      for (const name of readdirSync(path.join(output, group))) {
        expect(readFileSync(path.join(output, group, name), "utf8"), name).toBe(
          readFileSync(path.join(DATA_ROOT, "normalized", group, name), "utf8"),
        );
      }
    }
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
});

it("英雄语义核对接受新射程，饰品精确印刷核对保留旧流血变体", () => {
  const dictionary = loadIconDictionary();
  const lookup = createIconLookup(dictionary);
  expect(lookup.resolve(fixture.bleedId)).toMatchObject({ key: "bleed", naming: "confirmed" });
  expect(printIcon("bleed", dictionary.icons.at(-1)!.rank)).toBe(fixture.bleedId);
  expect(printIcon("bleed", 213)).not.toBe(fixture.bleedId);

  const core = write.loadNormalizedCorebox();
  const charm = core.trinket.cards.find((card) => card.id === "trinket:p003")!;
  expect(matchesCoreTrinketPrint(charm, "trinket:p003")).toBe(true);
  const changedCharm = {
    ...charm,
    upright_half: {
      ...charm.upright_half,
      effect_lines: charm.upright_half.effect_lines.map((line) =>
        line.map((segment) =>
          segment.type === "icon" && segment.icon.key === "bleed"
            ? { ...segment, icon: lookup.resolve(fixture.bleedId) }
            : segment,
        ),
      ),
    },
  };
  expect(matchesCoreTrinketPrint(changedCharm, "trinket:p003")).toBe(false);

  const bellow = core.hero_skill.cards.find(
    (card) => card.name === "Bellow" && card.level === 1 && card.hero === "MAN-AT-ARMS",
  )!;
  const segment = { type: "icon", icon: lookup.resolve(fixture.rangeId) } as const;
  const card = { ...bellow, stats_line: [segment], effect_lines: [] };
  const apply = (variantRank?: number) =>
    defineHeroModule({
      id: "h12",
      hero: "MAN-AT-ARMS",
      entries: {},
      fixes: [
        {
          id: card.id,
          name: card.name,
          page: card.pages[0]!,
          level: 1,
          expectedEffects: [],
          expectedStats: "{range}",
          stats: [
            {
              line: "stats",
              segment: 0,
              expectKey: "range",
              ...(variantRank === undefined ? {} : { variantRank }),
            },
          ],
        },
      ],
    }).apply;
  expect(apply()([card])[0]?.stats_line).toEqual([segment]);
  expect(() => apply(2)([card])).toThrow(/印刷行图标漂移/);
});
