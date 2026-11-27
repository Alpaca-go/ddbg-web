import { printLine, printSourceIcon } from "../../shared/print-icons";
import type { RawFile } from "../../shared/extract/raw";
import { ROOM_FRONT } from "./room";
const approvedRoomLines = [
  printLine("{print:location@96} 12—Collector Room"),
  printLine("{print:occupancy_pips@79}"),
  printLine("{print:occupancy_limit@91} 12"),
  printLine("{extract:corebox/raw/room.json:room:p012:front:6}"),
  printLine("{print:start_monster_support@364}"),
  printLine("{print:start_hero_ranged@88} {print:start_any_defensive@132}"),
  printLine("{extract:corebox/raw/room.json:room:p012:front:6}"),
  printLine("{print:occupancy_pips@100}"),
  printLine("{print:start_monster_ranged@105}"),
  printLine("{print:start_monster_aggressive@107}"),
  printLine("{print:occupancy_pips@100}"),
  printLine("{print:occupancy_pips@100}"),
  printLine("{print:occupancy_pips@46}"),
  printLine(
    "{print:loot_token_placement@65} ! {print:loot_token_placement@65} ! {print:loot_token_placement@65} !",
  ),
  printLine("{print:start_monster_defensive@142}"),
  printLine("{print:start_hero_any@127} {print:start_hero_aggressive@184}"),
  "BOSS",
];
export function assertCollectorRoomSource(rooms: RawFile): void {
  const cards = rooms.cards.filter((c) => c.id === "room:p012");
  const card = cards[0];
  if (
    rooms.category !== "room" ||
    cards.length !== 1 ||
    card?.source_set !== "base" ||
    card.faces.front.file !== ROOM_FRONT ||
    card.faces.front.page !== 12 ||
    JSON.stringify(card.faces.front.lines.map((l) => l.text)) !== JSON.stringify(approvedRoomLines)
  )
    throw new Error("R-168：Collector Room p12来源或无额外卡文记录漂移");
}
const approvedTileLines = [
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:5} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:7} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:5}",
  ),
  printLine("{print:occupancy_limit@91} 12"),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:5}"),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:5}"),
  printLine("{print:stance_support_monster_slot@216}"),
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:53} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:26}",
  ),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:16}"),
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:5} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:5}",
  ),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:16}"),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:24}"),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:5}"),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:5}"),
  printLine("{print:stance_ranged_monster_slot@808}"),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:55}"),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:24}"),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:16}"),
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p006:back:4} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p005:back:32}",
  ),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:24}"),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:24}"),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:16}"),
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:20} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:19} ! {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:20} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:19} ! {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:20} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:19} !",
  ),
  printLine("{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:38}"),
  printLine(
    "{extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:25} {extract:corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:54}",
  ),
];
export function assertCollectorTileLabels(raw: RawFile): void {
  const face = raw.cards.find((c) => c.id === "dungeon_tile:p007")?.faces.back;
  if (
    !face ||
    JSON.stringify(face.lines.map((l) => l.text)) !== JSON.stringify(approvedTileLines) ||
    [
      printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:20"),
      printSourceIcon("corebox/raw/dungeon_tile.json:dungeon_tile:p001:front:19"),
    ].some((id) => face.icons.filter((i) => i.iconId === id).length !== 3)
  )
    throw new Error("R-168：收藏家三宝箱、叹号与印刷编号漂移");
}
