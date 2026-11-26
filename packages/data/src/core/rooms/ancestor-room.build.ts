import type { RawFile } from "../../shared/extract/raw";
import { ROOM_FRONT } from "./room";
const approvedRoomLines = [
  "{icon:51a56b9bb3} 12—Ancestor Room",
  "{icon:4da7b87bf8}",
  "{icon:3b95c5fc7a}",
  "{icon:6cc69f00ff} {icon:e0c8d4381a} 12",
  "{icon:4cd99e2a5c} {icon:812394dcdd}",
  "{icon:7992756c4a}",
  "{icon:ec5b6362c8}",
  "{icon:d176185d66}",
  "{icon:0591dde355}",
  "{icon:3b95c5fc7a}",
  "{icon:812394dcdd}",
  "{icon:5867540e37}",
  "{icon:38668d05ef}",
  "{icon:d6bd70c31a} {icon:90da148d08}",
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
