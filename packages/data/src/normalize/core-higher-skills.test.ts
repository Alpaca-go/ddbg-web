import { expect, it } from "vitest";
import { attachCoreHigherSkills } from "./core-higher-skills";
import { loadNormalizedCorebox } from "./write";

const card = loadNormalizedCorebox().hero_skill.cards.find((c) => c.id === "hero_skill:p110")!;
it("higher skills reject name, level, duration, and icon approval drift", () => {
  for (const patch of [
    { name: "Other" },
    { level: 3 },
    { verification: { unverified: true, reasons: [] } },
  ])
    expect(() => attachCoreHigherSkills([{ ...card, ...patch }])).toThrow();
  const changed = structuredClone(card);
  const duration = changed.effect_lines[0]!.find(
    (s) => s.type === "text" && s.text.includes("3t"),
  )!;
  if (duration.type === "text") duration.text = duration.text.replace("3t", "4t");
  expect(() => attachCoreHigherSkills([changed])).toThrow();
  const unknown = structuredClone(card);
  const icon = unknown.effect_lines[0]!.find((s) => s.type === "icon")!;
  if (icon.type === "icon") icon.icon.naming = "unverified";
  expect(() => attachCoreHigherSkills([unknown])).toThrow();
});
