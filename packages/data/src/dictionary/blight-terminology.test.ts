import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { iconDictionarySchema } from "./schema";

it("R-231：Blight 图标的中文统一为腐蚀，英文标识保持不变", () => {
  const dictionary = iconDictionarySchema.parse(
    JSON.parse(
      readFileSync(new URL("../../dictionary/icon-dictionary-v1.8.json", import.meta.url), "utf8"),
    ),
  );
  const icons = dictionary.icons.filter((icon) =>
    icon.meaning_en?.toLowerCase().includes("blight"),
  );
  expect(icons.length).toBeGreaterThan(0);
  for (const icon of icons) expect(icon.meaning_zh).toContain("腐蚀");
});
