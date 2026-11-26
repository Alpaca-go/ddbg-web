import type { RawFile } from "../../shared/extract/raw";
import { ROOM_FRONT } from "./room";
const approvedRoomLines = [
  "{icon:2e22db7a98} 11—Prophet Room",
  "{icon:464b07fec1}",
  "{icon:d18c59a65d}",
  "{icon:d18c59a65d}",
  "{icon:700c7def3e} 11",
  "{icon:096ea91bb9} 4",
  "{icon:096ea91bb9} 3",
  "{icon:3b32f5de34}",
  "{icon:d18c59a65d}",
  "{icon:9a6a3eaf3c}",
  "{icon:096ea91bb9} 1-2",
  "{icon:d176185d66}",
  "{icon:096ea91bb9} 6",
  "{icon:d2e64ecf2f}",
  "{icon:096ea91bb9} 5",
  "{icon:d18c59a65d}",
  "{icon:56f5edfaf7}",
  "{icon:096ea91bb9} 7-8",
  "{icon:d176185d66}",
  "{icon:096ea91bb9} 10",
  "{icon:096ea91bb9} 9",
  "{icon:d6bd70c31a} {icon:71cd10f39d}",
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
  "{icon:b33a662094} {icon:bfdc8aa323} {icon:b33a662094}",
  "{icon:b33a662094} {icon:bfdc8aa323} {icon:b33a662094}",
  "{icon:700c7def3e} 11",
  "{icon:bfdc8aa323} {icon:bfdc8aa323} {icon:b33a662094} {icon:b609dfb7d1}",
  "{icon:99be282315} 4",
  "{icon:99be282315} 3",
  "{icon:7b8c742c86}",
  "{icon:61819484ab} {icon:61819484ab}",
  "{icon:b609dfb7d1} {icon:b609dfb7d1}",
  "{icon:bfdc8aa323}",
  "{icon:b609dfb7d1} {icon:b33a662094}",
  "{icon:99be282315} 1-2",
  "{icon:61819484ab} {icon:61819484ab}",
  "{icon:bfdc8aa323}",
  "{icon:99be282315} 6",
  "{icon:8787ebb1b2}",
  "{icon:99be282315} 5",
  "{icon:b33a662094} {icon:bfdc8aa323} {icon:b33a662094}",
  "{icon:39d6ddf024}",
  "{icon:99be282315} 7-8",
  "{icon:61819484ab} {icon:61819484ab}",
  "{icon:b609dfb7d1}",
  "{icon:99be282315} 10",
  "{icon:99be282315} 9",
  "{icon:7ab26866fc} {icon:1a71d94723}",
];
export function assertProphetTileLabels(raw: RawFile): void {
  const face = raw.cards.find((c) => c.id === "dungeon_tile:p006")?.faces.front;
  if (
    !face ||
    JSON.stringify(face.lines.map((l) => l.text)) !== JSON.stringify(approvedTileLines) ||
    face.icons.filter((i) => i.iconId === "99be282315").length !== 8
  )
    throw new Error("R-167：先知橙色标记与印刷编号漂移");
}
