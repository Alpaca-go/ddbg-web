import { printLine } from "../../shared/print-icons";
import type { RawFile } from "../../shared/extract/raw";
import { ROOM_FRONT } from "./room";
const approvedRoomLines = [
  printLine("{print:location@131} 12—Ancestor Room"),
  printLine("{extract:corebox/raw/room.json:room:p013:front:5}"),
  printLine("{print:occupancy_pips@204}"),
  printLine("{print:occupancy_pips@100} {print:decor@121} 12"),
  printLine("{print:start_monster_ranged@105} {print:occupancy_pips@46}"),
  printLine("{print:start_monster_defensive@142}"),
  printLine("{print:start_hero_support@306}"),
  printLine("{print:occupancy_pips@343}"),
  printLine("{print:start_monster_aggressive@107}"),
  printLine("{print:occupancy_pips@204}"),
  printLine("{print:occupancy_pips@46}"),
  printLine("{print:start_hero_defensive@221}"),
  printLine("{print:start_monster_support@364}"),
  printLine("{extract:corebox/raw/room.json:room:p011:front:23} {print:start_hero_aggressive@184}"),
  "BOSS",
];
export function assertAncestorRoomSource(rooms: RawFile): void {
  const cards = rooms.cards.filter((c) => c.id === "room:p025");
  const card = cards[0];
  if (
    rooms.category !== "room" ||
    cards.length !== 1 ||
    card?.source_set !== "base" ||
    card.faces.front.file !== ROOM_FRONT ||
    card.faces.front.page !== 25 ||
    JSON.stringify(card.faces.front.lines.map((l) => l.text)) !== JSON.stringify(approvedRoomLines)
  )
    throw new Error("R-165：Ancestor Room p25来源或无额外卡文记录漂移");
}
