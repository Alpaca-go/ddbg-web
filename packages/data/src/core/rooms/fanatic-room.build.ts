import { printLine, printSourceIcon } from "../../shared/print-icons";
import type { RawFile } from "../../shared/extract/raw";
import { ROOM_FRONT } from "./room";
const approvedRoomLines = [
  printLine("{print:location@67} 13—Fanatic Room"),
  printLine("{extract:corebox/raw/room.json:room:p013:front:5}"),
  printLine("{print:decor@420}"),
  printLine("{print:occupancy_pips@46}"),
  printLine("{print:occupancy_limit} 13"),
  printLine("{print:start_hero_defensive@474}"),
  printLine("{print:start_hero_support@306}"),
  printLine("{print:occupancy_pips@155}"),
  printLine("{print:occupancy_pips@192}"),
  printLine("{print:start_monster_aggressive@453} {print:start_any_defensive}"),
  printLine("{print:occupancy_pips@79}"),
  printLine("{print:start_monster_any@259} {print:start_monster_support@340}"),
  printLine("{print:occupancy_pips@79}"),
  printLine("{extract:corebox/raw/room.json:room:p011:front:23} {print:start_hero_aggressive@184}"),
  "BOSS",
];
export function assertFanaticRoomSource(rooms: RawFile): void {
  const cards = rooms.cards.filter((c) => c.id === "room:p013");
  const card = cards[0];
  if (
    rooms.category !== "room" ||
    cards.length !== 1 ||
    card?.source_set !== "base" ||
    card.faces.front.file !== ROOM_FRONT ||
    card.faces.front.page !== 13 ||
    JSON.stringify(card.faces.front.lines.map((l) => l.text)) !== JSON.stringify(approvedRoomLines)
  )
    throw new Error("R-169：Fanatic Room p13来源或无额外卡文记录漂移");
}
const approvedTileLines = [
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:7} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:5} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:7} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p007:front:0}",
  ),
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:5} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:7} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:5}",
  ),
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:7} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:7} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:5}",
  ),
  printLine("{print:occupancy_limit} 13"),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:26}"),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:25}"),
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:7} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:5}",
  ),
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:7} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:7}",
  ),
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:7} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:16}",
  ),
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:7} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:24}",
  ),
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:55} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:38}",
  ),
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:16} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:16}",
  ),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:24}"),
  printLine("{print:stance_ranged_monster_slot@808} {print:stance_support_monster_slot@216}"),
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:7} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:5}",
  ),
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:7} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:7}",
  ),
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:5} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:5}",
  ),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:7}"),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:5}"),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p004:front:36}"),
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:53} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:54}",
  ),
];
export function assertFanaticTileLabels(raw: RawFile): void {
  const face = raw.cards.find((c) => c.id === "dungeon_tile:p007")?.faces.front;
  if (
    !face ||
    JSON.stringify(face.lines.map((l) => l.text)) !== JSON.stringify(approvedTileLines) ||
    !face.icons.some(
      (i) =>
        i.iconId === printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p007:front:0"),
    )
  )
    throw new Error("R-169：狂热者高地、部署与印刷编号漂移");
}
