import type { RawFile } from "../../shared/extract/raw";
import { ROOM_FRONT } from "./room";
const approvedRoomLines = [
  "{icon:2e22db7a98} 13—Fanatic Room",
  "{icon:4da7b87bf8}",
  "{icon:e5687383fd}",
  "{icon:812394dcdd}",
  "{icon:700c7def3e} 13",
  "{icon:324b070464}",
  "{icon:ec5b6362c8}",
  "{icon:089f2d63e3}",
  "{icon:9a6a3eaf3c}",
  "{icon:1dbb20856f} {icon:71cd10f39d}",
  "{icon:d18c59a65d}",
  "{icon:9990256f37} {icon:ba026d4b74}",
  "{icon:d18c59a65d}",
  "{icon:d6bd70c31a} {icon:90da148d08}",
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
  "{icon:bfdc8aa323} {icon:b33a662094} {icon:bfdc8aa323} {icon:98ecd549c4}",
  "{icon:b33a662094} {icon:bfdc8aa323} {icon:b33a662094}",
  "{icon:bfdc8aa323} {icon:bfdc8aa323} {icon:b33a662094}",
  "{icon:700c7def3e} 13",
  "{icon:1a71d94723}",
  "{icon:39d6ddf024}",
  "{icon:bfdc8aa323} {icon:b33a662094}",
  "{icon:bfdc8aa323} {icon:bfdc8aa323}",
  "{icon:bfdc8aa323} {icon:b609dfb7d1}",
  "{icon:bfdc8aa323} {icon:61819484ab}",
  "{icon:8787ebb1b2} {icon:1f26dc63eb}",
  "{icon:b609dfb7d1} {icon:b609dfb7d1}",
  "{icon:61819484ab}",
  "{icon:643d396fef} {icon:293f170eab}",
  "{icon:bfdc8aa323} {icon:b33a662094}",
  "{icon:bfdc8aa323} {icon:bfdc8aa323}",
  "{icon:b33a662094} {icon:b33a662094}",
  "{icon:bfdc8aa323}",
  "{icon:b33a662094}",
  "{icon:3f806f0181}",
  "{icon:7ab26866fc} {icon:7b8c742c86}",
];
export function assertFanaticTileLabels(raw: RawFile): void {
  const face = raw.cards.find((c) => c.id === "dungeon_tile:p007")?.faces.front;
  if (
    !face ||
    JSON.stringify(face.lines.map((l) => l.text)) !== JSON.stringify(approvedTileLines) ||
    !face.icons.some((i) => i.iconId === "98ecd549c4")
  )
    throw new Error("R-169：狂热者高地、部署与印刷编号漂移");
}
