import { printLine, printSourceIcon } from "../../shared/print-icons";
import type { RawFile } from "../../shared/extract/raw";
import { ROOM_FRONT } from "./room";
const approvedRoomLines = [
  printLine("{print:location@67} 11—Prophet Room"),
  printLine("{print:occupancy_pips@486}"),
  printLine("{print:occupancy_pips@79}"),
  printLine("{print:occupancy_pips@79}"),
  printLine("{print:occupancy_limit} 11"),
  printLine("{print:area_d10_marker@232} 4"),
  printLine("{print:area_d10_marker@232} 3"),
  printLine("{print:start_hero_aggressive@218}"),
  printLine("{print:occupancy_pips@79}"),
  printLine("{print:occupancy_pips@192}"),
  printLine("{print:area_d10_marker@232} 1-2"),
  printLine("{print:occupancy_pips@343}"),
  printLine("{print:area_d10_marker@232} 6"),
  printLine("{extract:corebox/raw/room.json:room:p011:front:16}"),
  printLine("{print:area_d10_marker@232} 5"),
  printLine("{print:occupancy_pips@79}"),
  printLine("{extract:corebox/raw/room.json:room:p011:front:19}"),
  printLine("{print:area_d10_marker@232} 7-8"),
  printLine("{print:occupancy_pips@343}"),
  printLine("{print:area_d10_marker@232} 10"),
  printLine("{print:area_d10_marker@232} 9"),
  printLine("{extract:corebox/raw/room.json:room:p011:front:23} {print:start_any_defensive}"),
  "BOSS",
];
export function assertProphetRoomSource(rooms: RawFile): void {
  const cards = rooms.cards.filter((c) => c.id === "room:p011");
  const card = cards[0];
  if (
    rooms.category !== "room" ||
    cards.length !== 1 ||
    card?.source_set !== "base" ||
    card.faces.front.file !== ROOM_FRONT ||
    card.faces.front.page !== 11 ||
    JSON.stringify(card.faces.front.lines.map((l) => l.text)) !== JSON.stringify(approvedRoomLines)
  )
    throw new Error("R-167：Prophet Room p11来源或无额外卡文记录漂移");
}
const approvedTileLines = [
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:5} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:7} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:5}",
  ),
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:5} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:7} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:5}",
  ),
  printLine("{print:occupancy_limit} 11"),
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:7} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:7} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:5} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:16}",
  ),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p006:front:14} 4"),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p006:front:14} 3"),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:54}"),
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:24} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:24}",
  ),
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:16} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:16}",
  ),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:7}"),
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:16} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:5}",
  ),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p006:front:14} 1-2"),
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:24} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:24}",
  ),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:7}"),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p006:front:14} 6"),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:55}"),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p006:front:14} 5"),
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:5} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:7} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:5}",
  ),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:25}"),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p006:front:14} 7-8"),
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:24} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:24}",
  ),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:16}"),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p006:front:14} 10"),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p006:front:14} 9"),
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:53} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:26}",
  ),
];
export function assertProphetTileLabels(raw: RawFile): void {
  const face = raw.cards.find((c) => c.id === "dungeon_tile:p006")?.faces.front;
  if (
    !face ||
    JSON.stringify(face.lines.map((l) => l.text)) !== JSON.stringify(approvedTileLines) ||
    face.icons.filter(
      (i) =>
        i.iconId === printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p006:front:14"),
    ).length !== 8
  )
    throw new Error("R-167：先知橙色标记与印刷编号漂移");
}
