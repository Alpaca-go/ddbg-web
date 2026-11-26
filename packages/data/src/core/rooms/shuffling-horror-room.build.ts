import type { RawFile } from "../../shared/extract/raw";
import { ROOM_FRONT } from "./room";
const approvedRoomLines = [
  "{icon:51a56b9bb3} 10—Shuffling Horror Room",
  "{icon:812394dcdd}",
  "{icon:9723c561c8} {icon:e0c8d4381a} 10",
  "{icon:102bef3eff} {icon:61b5b2809b}",
  "{icon:56f5edfaf7}",
  "{icon:3c35c71d73}",
  "{icon:d18c59a65d}",
  "{icon:812394dcdd}",
  "{icon:812394dcdd}",
  "{icon:4cd99e2a5c}",
  "{icon:812394dcdd}",
  "{icon:3b32f5de34}",
  "{icon:0591dde355} {icon:71cd10f39d}",
  "{icon:67c08f463c} {icon:71cd10f39d}",
  "BOSS",
];
export function assertShufflingHorrorRoomSource(rooms: RawFile): void {
  const cards = rooms.cards.filter((c) => c.id === "room:p023");
  const card = cards[0];
  if (
    rooms.category !== "room" ||
    cards.length !== 1 ||
    card?.source_set !== "base" ||
    card.faces.front.file !== ROOM_FRONT ||
    card.faces.front.page !== 23 ||
    JSON.stringify(card.faces.front.lines.map((l) => l.text)) !== JSON.stringify(approvedRoomLines)
  )
    throw new Error("R-163：Shuffling Horror Room p23来源或无额外卡文记录漂移");
}
export function assertShufflingHorrorTileLabels(raw: RawFile): void {
  const face = raw.cards.find((c) => c.id === "dungeon_tile:p013")?.faces.back;
  if (!face || face.icons.filter((i) => i.iconId === "78197bdba8").length !== 2)
    throw new Error("R-163：Shuffling Horror Room两个高地图标漂移");
}
