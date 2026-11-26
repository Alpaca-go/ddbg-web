import type { RawFile } from "../../shared/extract/raw";
import { ROOM_FRONT } from "./room";

export function assertTemplarsRoomTileLabels(raw: RawFile): void {
  const face = raw.cards.find((c) => c.id === "dungeon_tile:p013")?.faces.front;
  if (
    !face ||
    face.icons.filter((i) => i.iconId === "6e67687564").length !== 5 ||
    ["1-2", "3-4", "5-6", "7-8", "9-10"].some((label) => !face.spans.some((s) => s.t === label))
  )
    throw new Error("R-162：五个尖刺星标或印刷编号漂移");
}

export const templarsRoomEffectLines = [
  "{icon:62d166a84f} Spikes: Heroes {icon:8c4c3c2ec2} or ending their",
  "move here take {icon:0453c84dbc} 5 and Bleed 3 {icon:784ec4fe7a} 3t.",
] as const;

export function assertTemplarsRoomEffectSource(rooms: RawFile): void {
  const cards = rooms.cards.filter((c) => c.id === "room:p022");
  const card = cards[0];
  if (
    rooms.category !== "room" ||
    cards.length !== 1 ||
    card?.source_set !== "base" ||
    card.faces.front.file !== ROOM_FRONT ||
    card.faces.front.page !== 22 ||
    JSON.stringify(card.faces.front.lines.slice(-2).map((l) => l.text)) !==
      JSON.stringify(templarsRoomEffectLines) ||
    ["62d166a84f", "8c4c3c2ec2", "0453c84dbc", "784ec4fe7a"].some(
      (id) => !card.faces.front.icons.some((i) => i.iconId === id),
    )
  )
    throw new Error("Templars Room Room p22来源或效果行漂移（R-162）");
}
