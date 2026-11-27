import { describe, expect, it } from "vitest";
import semantics from "../../../dictionary/icon-semantics-v1.json";
import { loadIconDictionary } from "../../../src/shared/dictionary/load";

const icons = loadIconDictionary().icons.filter(
  (icon) => !icon.key.startsWith("unknown_") && !icon.key.startsWith("pending_"),
);
const sourceById = new Map(icons.map((icon) => [icon.iconId, icon]));

describe("icon-semantics-v1", () => {
  it("每个语义 key 唯一，alias 都能回指同一 key", () => {
    const aliasOwner = new Map<string, string>();
    expect(semantics.keyCount).toBe(semantics.keys.length);
    expect(new Set(semantics.keys.map((entry) => entry.key)).size).toBe(semantics.keys.length);
    for (const entry of semantics.keys) {
      expect(entry.key.startsWith("unknown_")).toBe(false);
      expect(entry.key.startsWith("pending_")).toBe(false);
      expect(entry.nameEn).not.toBe("");
      expect(entry.aliasCount).toBe(entry.aliases.length);
      for (const iconId of entry.aliases) {
        const icon = sourceById.get(iconId);
        expect(icon, iconId).toBeDefined();
        expect(icon!.key).toBe(entry.key);
        expect(aliasOwner.has(iconId), iconId).toBe(false);
        aliasOwner.set(iconId, entry.key);
      }
      for (const variant of entry.variants) {
        expect(entry.aliases).toContain(variant.iconId);
      }
    }
    expect(aliasOwner.size).toBe(semantics.aliasCount);
    expect(new Set(aliasOwner.keys())).toEqual(new Set(sourceById.keys()));
  });

  it("生成文件覆盖旧版词典和补充映射的语义", () => {
    const expected = new Set(icons.map((icon) => icon.key));
    expect(new Set(semantics.keys.map((entry) => entry.key))).toEqual(expected);
  });
});
