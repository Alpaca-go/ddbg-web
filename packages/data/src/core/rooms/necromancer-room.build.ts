import type { RawFile } from "../../shared/extract/raw";
import { ROOM_FRONT } from "./room";
const approvedRoomLines = [
  "{icon:f2d3273b1d} 10—Necromancer Room",
  "{icon:e5687383fd}",
  "{icon:700c7def3e} 10",
  "{icon:1ec04dbd9e}",
  "{icon:7fb9964d4f}",
  "{icon:9a6a3eaf3c}",
  "{icon:d18c59a65d}",
  "{icon:6cc69f00ff}",
  "{icon:089f2d63e3}",
  "{icon:6cc69f00ff}",
  "{icon:d4d6e375b6} {icon:67c08f463c} {icon:44d632b1cc} {icon:e128e21432}",
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
