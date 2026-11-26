import type { RawFile } from "../../shared/extract/raw";
import { ROOM_FRONT } from "./room";
const approvedRoomLines = [
  "{icon:51a56b9bb3} 11—Mammoth Cyst Room",
  "{icon:03f929fe29}",
  "{icon:d18c59a65d}",
  "{icon:92c5f40988}",
  "{icon:e0c8d4381a} 11",
  "{icon:9b1134d0b0} 3-4",
  "{icon:9b1134d0b0} 1-2",
  "{icon:9b1134d0b0} 5-6",
  "{icon:812394dcdd}",
  "{icon:812394dcdd}",
  "{icon:3b95c5fc7a}",
  "{icon:9990256f37} {icon:8368f94a97}",
  "{icon:4901fef081}",
  "{icon:e05de4a155}",
  "{icon:4901fef081}",
  "{icon:9b1134d0b0} 9-10",
  "{icon:9b1134d0b0} 7-8",
  "{icon:255187b044}",
  "{icon:255187b044}",
  "{icon:0591dde355} {icon:71cd10f39d}",
  "{icon:71bf6c0f18}",
  "{icon:fef75233ed} {icon:544755f56d} {icon:67c08f463c} {icon:90da148d08}",
  "BOSS",
];
export function assertMammothCystRoomSource(rooms: RawFile): void {
  const cards = rooms.cards.filter((c) => c.id === "room:p024");
  const card = cards[0];
  if (
    rooms.category !== "room" ||
    cards.length !== 1 ||
    card?.source_set !== "base" ||
    card.faces.front.file !== ROOM_FRONT ||
    card.faces.front.page !== 24 ||
    JSON.stringify(card.faces.front.lines.map((l) => l.text)) !== JSON.stringify(approvedRoomLines)
  )
    throw new Error("R-164：Mammoth Cyst Room p24来源或无额外卡文记录漂移");
}
export function assertMammothCystTileLabels(raw: RawFile): void {
  const face = raw.cards.find((c) => c.id === "dungeon_tile:p014")?.faces.front;
  if (
    !face ||
    face.icons.filter((i) => i.iconId === "9454efcf19").length !== 5 ||
    ["1-2", "3-4", "5-6", "7-8", "9-10"].some(
      (label) => !face.lines.some((l) => l.text === "{icon:9454efcf19} " + label),
    )
  )
    throw new Error("R-164：Mammoth Cyst Room五个紫星或编号漂移");
}
