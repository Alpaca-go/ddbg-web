import { printLine, printSourceIcon } from "../../shared/print-icons";
import type { RawFile } from "../../shared/extract/raw";
import { ROOM_FRONT } from "./room";
const approvedRoomLines = [
  printLine("{print:location@131} 11—Mammoth Cyst Room"),
  printLine("{print:occupancy_pips@350}"),
  printLine("{print:occupancy_pips@79}"),
  printLine("{print:occupancy_pips@152}"),
  printLine("{print:decor@121} 11"),
  printLine("{print:needs_review} 3-4"),
  printLine("{print:needs_review} 1-2"),
  printLine("{print:needs_review} 5-6"),
  printLine("{print:occupancy_pips@46}"),
  printLine("{print:occupancy_pips@46}"),
  printLine("{print:occupancy_pips@204}"),
  printLine("{print:start_monster_any@259} {print:start_monster_support@242}"),
  printLine("{extract:corebox/raw/room.json:room:p024:front:20}"),
  printLine("{extract:corebox/raw/room.json:room:p024:front:21}"),
  printLine("{extract:corebox/raw/room.json:room:p024:front:20}"),
  printLine("{print:needs_review} 9-10"),
  printLine("{print:needs_review} 7-8"),
  printLine("{print:occupancy_pips@124}"),
  printLine("{print:occupancy_pips@124}"),
  printLine("{print:start_monster_aggressive@107} {print:start_any_defensive}"),
  printLine("{extract:corebox/raw/room.json:room:p024:front:29}"),
  printLine(
    "{extract:corebox/raw/room.json:room:p001:front:16} {print:start_hero_defensive@220} {print:start_hero_ranged@88} {print:start_hero_aggressive@184}",
  ),
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
    face.icons.filter(
      (i) =>
        i.iconId === printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p014:front:11"),
    ).length !== 5 ||
    ["1-2", "3-4", "5-6", "7-8", "9-10"].some(
      (label) =>
        !face.lines.some(
          (l) =>
            l.text ===
            printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p014:front:11} ") +
              label,
        ),
    )
  )
    throw new Error("R-164：Mammoth Cyst Room五个紫星或编号漂移");
}
