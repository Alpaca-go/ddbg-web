import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rawFileSchema } from "../../../src/shared/extract/raw";
import { warrensHigherQuestsSchema } from "../../../src/warrens/quests/higher-quests";
import { buildWarrensHigherQuests } from "../../../src/warrens/quests/higher-quests.build";
import {
  loadNormalizedWarrensHigherQuests,
  writeNormalizedWarrensHigherQuests,
} from "../../../src/warrens/write";

const read = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8")) as unknown;

if (process.env.WRITE_NORMALIZED === "1") writeNormalizedWarrensHigherQuests();

const raw = rawFileSchema.parse(read("extract/extension/warrens/raw/quest.json"));
const built = loadNormalizedWarrensHigherQuests();

describe("Warrens II／III 任务印刷目录", () => {
  it("重建结果与提交的 higher_quests.json 一致", () => {
    expect(
      warrensHigherQuestsSchema.parse(read("normalized/extension/warrens/higher_quests.json")),
    ).toEqual(built);
    expect(buildWarrensHigherQuests(raw)).toEqual(built);
  });

  it("十张全部为数据停点，无运行时", () => {
    expect(built.cards.every((c) => c.runtimeReady === false)).toBe(true);
    expect(built.cards.every((c) => c.pendingConfirmation.length > 0)).toBe(true);
  });

  it("页码 p006–p015 与 ID 对齐", () => {
    const pages = built.cards.map((c) => c.source.page).sort((a, b) => a - b);
    expect(pages).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  });
});
