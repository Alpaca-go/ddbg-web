import { printLine, printSourceIcon } from "../../shared/print-icons";
import type { RawFile } from "../../shared/extract/raw";
import { ROOM_FRONT } from "./room";
const approvedRoomLines = [
  printLine("{print:location@131} 10—Shuffling Horror Room"),
  printLine("{print:occupancy_pips@46}"),
  printLine("{print:decor@125} {print:decor@121} 10"),
  printLine("{extract:corebox/raw/room.json:room:p023:front:5} {print:decor@239}"),
  printLine("{extract:corebox/raw/room.json:room:p011:front:19}"),
  printLine("{print:start_monster_support@477}"),
  printLine("{print:occupancy_pips@79}"),
  printLine("{print:occupancy_pips@46}"),
  printLine("{print:occupancy_pips@46}"),
  printLine("{print:start_monster_ranged@105}"),
  printLine("{print:occupancy_pips@46}"),
  printLine("{print:start_hero_aggressive@218}"),
  printLine("{print:start_monster_aggressive@107} {print:start_any_defensive@132}"),
  printLine("{print:start_hero_ranged@88} {print:start_any_defensive@132}"),
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
  if (
    !face ||
    face.icons.filter(
      (i) =>
        i.iconId === printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:30"),
    ).length !== 2
  )
    throw new Error("R-163：Shuffling Horror Room两个高地图标漂移");
}
