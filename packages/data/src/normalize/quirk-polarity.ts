/**
 * 规则书 R26–R27 的怪癖正负表，转写在规格书 §10.3。
 * 印刷名和规则书用词只做大小写、空格归一（例如 Photo Mania / Photomania）。
 * 对不上的名字不猜测。
 */
const POSITIVE = [
  "Clotter",
  "Thick Blooded",
  "Hard Noggin",
  "Skilled Gambler",
  "On Guard",
  "Hard Skinned",
  "Fast Healer",
  "Early Riser",
  "Photomania",
  "Warrior of Light",
  "Night Owl",
  "Resilient",
  "Hoarder",
  "Quick Reflexes",
  "Stress Faster",
  "Balanced",
  "Evasive",
] as const;

const NEGATIVE = [
  "Anemic",
  "Thin Blooded",
  "Bad Gambler",
  "Clumsy",
  "Fragile",
  "Off Guard",
  "Shocker",
  "Weak Grip",
  "Infirm",
  "Light Sensitive",
  "Nocturnal",
  "Night Blindness",
  "Nervous",
  "Soft",
  "Mercurial",
  "Fear of the Unknown",
  "Slow Reflexes",
  "Stress Eater",
] as const;

export type QuirkPolarity = "positive" | "negative";

function compactName(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

const BY_NAME = new Map<string, QuirkPolarity>();
for (const name of POSITIVE) BY_NAME.set(compactName(name), "positive");
for (const name of NEGATIVE) BY_NAME.set(compactName(name), "negative");

export function quirkPolarity(printedName: string): QuirkPolarity | null {
  return BY_NAME.get(compactName(printedName)) ?? null;
}
