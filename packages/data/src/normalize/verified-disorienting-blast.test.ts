import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "./write";
import { attachVerifiedHeroStatuses } from "./verified-hero-statuses";
const cards = loadNormalizedCorebox().hero_skill.cards;
const id = "hero_skill:p145";

it("Disorienting Blast I保留原始两行与Nt null，限定目标续行黄金注解，高等级由独立注解覆盖", () => {
  const card = cards.find((c) => c.id === id)!;
  expect(card.verified_status_effects).toEqual([
    {
      lineIndex: 1,
      segmentIndex: 0,
      scopeLineIndex: 0,
      scope: "target",
      kind: "stun",
      duration: 1,
    },
  ]);
  expect(
    card.effect_lines.map((line) =>
      line
        .map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
        .join("")
        .replace(/\s+/g, " ")
        .trim(),
    ),
  ).toEqual(["{target_effects} {shuffle} Push 2 or Pull 2", "{stun} 1t"]);
  expect(card.unlabeled_numbers.find((n) => n.text === "1t")?.numeric).toBeNull();
  for (const p of [146, 147])
    expect(cards.find((c) => c.pages[0] === p)!.verified_status_effects).toBeDefined();
  const before = structuredClone(cards);
  expect(attachVerifiedHeroStatuses(cards)).toEqual(cards);
  expect(cards).toEqual(before);
});

it("身份、完整位移行/状态续行、方向距离与图标命名漂移均拒绝；缺卡/重复卡不补注解", () => {
  for (const field of [
    "hero",
    "back",
    "name",
    "page",
    "level",
    "copies",
    "extra",
    "push",
    "pull",
    "duration",
    "marker",
    "shuffle",
    "stun",
  ] as const) {
    const changed = structuredClone(cards),
      c = changed.find((c) => c.id === id)!;
    if (field === "hero") c.hero = "VESTAL";
    if (field === "back" && "back_name" in c) c.back_name = "Other";
    if (field === "name") c.name = "Other";
    if (field === "page") c.pages = [999];
    if (field === "level") c.level = 2;
    if (field === "copies") c.copies = 2;
    if (field === "extra") c.effect_lines.push(c.effect_lines[1]!);
    if (field === "push" || field === "pull")
      c.effect_lines[0] = c.effect_lines[0]!.map((s) =>
        s.type === "text"
          ? { ...s, text: s.text.replace(field === "push" ? "Push 2" : "Pull 2", "Push 9") }
          : s,
      );
    if (field === "duration") c.effect_lines[1]![1] = { type: "text", text: " 2t" };
    if (["marker", "shuffle", "stun"].includes(field)) {
      const s = c.effect_lines[field === "stun" ? 1 : 0]![field === "shuffle" ? 2 : 0]!;
      if (s.type === "icon") s.icon.naming = "unverified";
    }
    expect(() => attachVerifiedHeroStatuses(changed), field).toThrow();
  }
  expect(() => attachVerifiedHeroStatuses(cards.filter((c) => c.id !== id))).toThrow(/唯一/);
  expect(() => attachVerifiedHeroStatuses([...cards, cards.find((c) => c.id === id)!])).toThrow(
    /唯一/,
  );
});
