import type { RawFile } from "../../shared/extract/raw";

export function readBossAbilityFront(
  raw: RawFile,
  page: number,
  name: string,
  actions: number | "special",
  driftMessage: string,
) {
  const id = `boss_ability:p${String(page).padStart(3, "0")}`;
  const matches = raw.cards.filter((card) => card.id === id);
  const card = matches[0];
  const front = card?.faces.front;
  const lines = front?.lines.map((line) => line.text) ?? [];
  const label = `ACTIONS / Round: ${actions === "special" ? "Special" : actions}`;
  if (
    matches.length !== 1 ||
    card?.source_set !== "base" ||
    front?.page !== page ||
    !lines.includes(name) ||
    !lines.includes(label)
  )
    throw new Error(`${driftMessage}：${id}`);

  return { id, card, front, lines, textLines: lines.slice(lines.indexOf(label) + 1) };
}
