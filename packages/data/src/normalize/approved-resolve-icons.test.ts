import { describe, expect, it } from "vitest";
import { approvedResolveLookup } from "./approved-resolve-icons";
import { createIconLookup } from "./icons";
import { iconDictionarySchema } from "../dictionary/schema";
import { readFileSync } from "node:fs";

const dictionary = iconDictionarySchema.parse(
  JSON.parse(
    readFileSync(new URL("../../dictionary/icon-dictionary-v1.8.json", import.meta.url), "utf8"),
  ),
);
describe("R-056 卡面限定批准", () => {
  it("批准不扩散奇癖 / 其他卡，箭头不是角色标记，数值保持 null", () => {
    const base = createIconLookup(dictionary);
    for (const id of ["2c1824ea21", "d42d7955d3"]) {
      expect(approvedResolveLookup("virtue_affliction:p008", base).resolve(id)).toMatchObject({
        key: "wound",
        naming: "confirmed",
        approval: "R-056",
        value: null,
      });
      expect(approvedResolveLookup("quirk:p032", base).resolve(id)).toEqual(base.resolve(id));
      expect(base.resolve(id)).toMatchObject({
        naming: "confirmed",
        key: "wound",
        meaning_zh: "创伤",
      });
    }
    expect(
      approvedResolveLookup("virtue_affliction:p010", base).resolve("5a4fbf9781"),
    ).toMatchObject({ key: "result_table_arrow", kind: "marker", approval: "R-056" });
    expect(approvedResolveLookup("virtue_affliction:p008", base).resolve("5a4fbf9781")).toEqual(
      base.resolve("5a4fbf9781"),
    );
  });
});
