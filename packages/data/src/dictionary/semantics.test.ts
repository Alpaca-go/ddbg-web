import { describe, expect, it } from "vitest";
import dictionary from "../../dictionary/icon-dictionary-v1.8.json";
import semantics from "../../dictionary/icon-semantics-v1.json";

const sourceById = new Map(dictionary.icons.map((icon) => [icon.iconId, icon]));
const aliasOwner = new Map<string, string>();

describe("icon-semantics-v1", () => {
  it("每个语义 key 唯一，alias 都能回指同一 key", () => {
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
  });

  it("生成文件与词典 1.8 的 key 覆盖一致", () => {
    const expected = new Set(
      dictionary.icons
        .map((icon) => icon.key)
        .filter((key) => !key.startsWith("unknown_") && !key.startsWith("pending_")),
    );
    expect(new Set(semantics.keys.map((entry) => entry.key))).toEqual(expected);
  });
});
