/**
 * R-053（2026-10-08，Kyries）：核心盒美德与折磨名单。
 * 卡面没有印 Virtue / Affliction。对不上名单的名字不猜测。
 * 规则书第 28 页另把 Focused 标为 Virtue、Selfish 标为 Affliction。
 * 字段用 affliction，不用中文「折磨」。
 */
const VIRTUE = ["Stalwart", "Courageous", "Focused", "Powerful", "Vigorous"] as const;

const AFFLICTION = ["Fearful", "Selfish", "Masochistic", "Hopeless", "Irrational"] as const;

export type VirtueRole = "virtue" | "affliction";

function compactName(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

const BY_NAME = new Map<string, VirtueRole>();
for (const name of VIRTUE) BY_NAME.set(compactName(name), "virtue");
for (const name of AFFLICTION) BY_NAME.set(compactName(name), "affliction");

export function virtueRole(printedName: string): VirtueRole | null {
  return BY_NAME.get(compactName(printedName)) ?? null;
}
