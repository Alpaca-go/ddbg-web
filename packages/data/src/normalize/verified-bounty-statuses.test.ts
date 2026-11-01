import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "./write";
import { attachVerifiedBountyStatuses } from "./verified-bounty-statuses";
import { iconDictionarySchema } from "../dictionary/schema";

const file = loadNormalizedCorebox().hero_skill,
  cards = file.cards;
const mark = cards.find((c) => c.id === "hero_skill:p046")!;
const caltrops = cards.find((c) => c.id === "hero_skill:p061")!;
const effects = (card: typeof mark) =>
  card.verified_status_effects!.map(({ scope, kind, duration, ...rest }) => [
    scope,
    kind,
    duration,
    "amount" in rest ? rest.amount : null,
  ]);
it("R-141 三张高等级卡逐卡核图，来源漂移不放行", () => {
  const bounty = cards.find((c) => c.id === "hero_skill:p044")!;
  expect(bounty.printed_labels).toContainEqual({ label: "Acc", raw: "Acc 1O", value: 10 });
  expect(bounty.unlabeled_numbers).toContainEqual({
    text: "8",
    numeric: 8,
    anchor: { type: "printed_label", label: "Acc" },
  });
  expect(effects(cards.find((c) => c.id === "hero_skill:p048")!)).toEqual([
    ["target", "mark", 3, null],
    ["target", "debuff", 3, null],
    ["self", "buff", 3, null],
  ]);
  expect(effects(cards.find((c) => c.id === "hero_skill:p063")!)).toEqual([
    ["target", "bleed", 3, 3],
    ["target", "debuff", 3, null],
  ]);
  const bad = structuredClone(cards);
  bad.find((c) => c.id === bounty.id)!.printed_labels.find((l) => l.label === "Acc")!.value = 11;
  expect(() => attachVerifiedBountyStatuses(bad)).toThrow(/R-141/);
});
it("R-089两卡完整状态黄金值；Mark射程0–2、Caltrops伤害数字不混入Bleed", () => {
  expect(effects(mark)).toEqual([
    ["target", "mark", 3, null],
    ["target", "debuff", 2, null],
    ["self", "buff", 2, null],
  ]);
  expect(effects(caltrops)).toEqual([
    ["target", "bleed", 3, 2],
    ["target", "debuff", 1, null],
  ]);
  expect(mark.verified_range).toEqual({ min: 0, max: 2, source: "print_front" });
  expect(caltrops.printed_labels.map((l) => [l.label, l.value])).toEqual([
    ["Crit", 1],
    ["Acc", 9],
  ]);
});
it("仅目标效果段修正语义，图标ID/原清单/未命名数字/全局词典保持原样", () => {
  const dictionary = iconDictionarySchema.parse(
    JSON.parse(
      readFileSync(new URL("../../dictionary/icon-dictionary-v1.8.json", import.meta.url), "utf8"),
    ),
  );
  expect(dictionary.icons.find((i) => i.iconId === "763ad8e857")!.key).toBe("buff");
  for (const c of [mark, caltrops]) {
    expect(c.front_icons.find((i) => i.iconId === "763ad8e857")!.key).toBe("buff");
    expect(
      c.effect_lines[0]!.find((s) => s.type === "icon" && s.icon.iconId === "763ad8e857"),
    ).toMatchObject({ type: "icon", icon: { key: "debuff", iconId: "763ad8e857" } });
    expect(
      c.unlabeled_numbers.filter((n) => /t$/.test(n.text)).every((n) => n.numeric === null),
    ).toBe(true);
  }
  expect(
    mark.effect_lines[1]!.find((s) => s.type === "icon" && s.icon.iconId === "d4329c2a97"),
  ).toMatchObject({ type: "icon", icon: { key: "buff" } });
});
it("生成可重复且不突变、不触碰其余五张I技能或其他卡", () => {
  const before = structuredClone(cards),
    again = attachVerifiedBountyStatuses(cards);
  expect(again).toEqual(cards);
  expect(cards).toEqual(before);
  for (const [i, c] of cards.entries())
    if (
      ![mark.id, caltrops.id, "hero_skill:p044", "hero_skill:p048", "hero_skill:p063"].includes(
        c.id,
      )
    )
      expect(again[i]).toBe(c);
  expect(file).toEqual(
    JSON.parse(
      readFileSync(new URL("../../normalized/corebox/hero_skill.json", import.meta.url), "utf8"),
    ),
  );
});
it("限定身份、印刷数值、整行、图标与射程漂移原子拒绝，缺卡/重复卡也不接受", () => {
  for (const id of [mark.id, caltrops.id])
    for (const mutate of [
      (c: typeof mark) => {
        c.name = "Wrong";
      },
      (c: typeof mark) => {
        c.hero = "VESTAL";
      },
      (c: typeof mark) => {
        c.level = 2;
      },
      (c: typeof mark) => {
        c.pages = [99];
      },
      (c: typeof mark) => {
        if ("back_level" in c) c.back_level = 2;
      },
      (c: typeof mark) => {
        c.printed_labels[0]!.value = 8;
      },
      (c: typeof mark) => {
        c.effect_lines[0]!.push({ type: "text", text: "extra" });
      },
      (c: typeof mark) => {
        const s = c.effect_lines[0]!.find(
          (s) => s.type === "icon" && s.icon.iconId === "763ad8e857",
        )!;
        if (s.type === "icon") s.icon.iconId = "0000000000";
      },
      (c: typeof mark) => {
        const s = c.effect_lines[0]!.find((s) => s.type === "icon")!;
        if (s.type === "icon") s.icon.naming = "unverified";
      },
    ]) {
      const changed = structuredClone(cards);
      mutate(changed.find((c) => c.id === id)!);
      expect(() => attachVerifiedBountyStatuses(changed)).toThrow(/R-089/);
    }
  expect(() => attachVerifiedBountyStatuses(cards.filter((c) => c.id !== mark.id))).toThrow(/唯一/);
  expect(() => attachVerifiedBountyStatuses([...cards, mark])).toThrow(/唯一/);
  const changed = structuredClone(cards),
    range = changed.find((c) => c.id === mark.id)!.unlabeled_numbers.find((n) => n.text === "0-2")!;
  range.text = "0-3";
  expect(() => attachVerifiedBountyStatuses(changed)).toThrow(/射程/);
});
