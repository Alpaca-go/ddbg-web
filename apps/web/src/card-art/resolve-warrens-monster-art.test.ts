import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import printMap from "./warrens-monster-print-art-map.json";
import {
  cachedPrintWarrensMonsterUrl,
  lookupPrintWarrensMonsterFace,
} from "./resolve-warrens-monster-art";

const medium = JSON.parse(
  readFileSync(
    resolve(
      import.meta.dirname,
      "../../../../packages/data/normalized/extension/warrens/monster_medium.json",
    ),
    "utf8",
  ),
);
const large = JSON.parse(
  readFileSync(
    resolve(
      import.meta.dirname,
      "../../../../packages/data/normalized/extension/warrens/monster_large.json",
    ),
    "utf8",
  ),
);

describe("Warrens print monster art map", () => {
  it("maps normalized Warrens monsters to FRONT/BACK pngRel", () => {
    const normIds = [...medium.cards, ...large.cards].map((c: { id: string }) => c.id);
    expect(printMap.schema).toBe("ddbg.print-warrens-monster-art-map.v1");
    expect(printMap.cards.length).toBe(normIds.length * 2);
    for (const id of normIds) {
      const front = lookupPrintWarrensMonsterFace(id, "front");
      const back = lookupPrintWarrensMonsterFace(id, "back");
      expect(front?.pngRel).toMatch(/^png\/.+_FRONT\.pdf_p\d{3}\.png$/);
      expect(back?.pngRel).toMatch(/^png\/.+_BACK\.pdf_p\d{3}\.png$/);
      expect(cachedPrintWarrensMonsterUrl(front!)).toContain(front!.pngRel);
    }
  });
});
