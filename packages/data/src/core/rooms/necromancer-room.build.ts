import { printLine } from "../../shared/print-icons";
import type { RawFile } from "../../shared/extract/raw";
import { ROOM_FRONT } from "./room";
const approvedRoomLines = [
  printLine("{print:location@96} 10—Necromancer Room"),
  printLine("{print:decor@420}"),
  printLine("{print:occupancy_limit} 10"),
  printLine("{extract:corebox/raw/room.json:room:p010:front:5}"),
  printLine("{print:occupancy_pips@330}"),
  printLine("{print:occupancy_pips@192}"),
  printLine("{print:occupancy_pips@79}"),
  printLine("{print:occupancy_pips@100}"),
  printLine("{print:occupancy_pips@155}"),
  printLine("{print:occupancy_pips@100}"),
  printLine(
    "{print:start_hero_any@127} {print:start_hero_ranged@88} {extract:corebox/raw/room.json:room:p010:front:15} {print:start_hero_aggressive@345}",
  ),
  "BOSS",
];
export function assertNecromancerRoomSource(rooms: RawFile): void {
  const cards = rooms.cards.filter((c) => c.id === "room:p010");
  const card = cards[0];
  if (
    rooms.category !== "room" ||
    cards.length !== 1 ||
    card?.source_set !== "base" ||
    card.faces.front.file !== ROOM_FRONT ||
    card.faces.front.page !== 10 ||
    JSON.stringify(card.faces.front.lines.map((l) => l.text)) !== JSON.stringify(approvedRoomLines)
  )
    throw new Error("R-166：Necromancer Room p10来源或无额外卡文记录漂移");
}
