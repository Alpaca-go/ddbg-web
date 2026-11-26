import type { RawFile } from "../../shared/extract/raw";
import { ROOM_FRONT } from "./room";
const approvedRoomLines = [
  "{icon:f2d3273b1d} 12—Collector Room",
  "{icon:d18c59a65d}",
  "{icon:700c7def3e} 12",
  "{icon:d9c7603861}",
  "{icon:38668d05ef}",
  "{icon:67c08f463c} {icon:71cd10f39d}",
  "{icon:d9c7603861}",
  "{icon:6cc69f00ff}",
  "{icon:4cd99e2a5c}",
  "{icon:0591dde355}",
  "{icon:6cc69f00ff}",
  "{icon:6cc69f00ff}",
  "{icon:812394dcdd}",
  "{icon:7e288c22e5} ! {icon:7e288c22e5} ! {icon:7e288c22e5} !",
  "{icon:7992756c4a}",
  "{icon:d4d6e375b6} {icon:90da148d08}",
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
  "{icon:b33a662094} {icon:bfdc8aa323} {icon:b33a662094}",
  "{icon:700c7def3e} 12",
  "{icon:b33a662094}",
  "{icon:b33a662094}",
  "{icon:293f170eab}",
  "{icon:7ab26866fc} {icon:1a71d94723}",
  "{icon:b609dfb7d1}",
  "{icon:b33a662094} {icon:b33a662094}",
  "{icon:b609dfb7d1}",
  "{icon:61819484ab}",
  "{icon:b33a662094}",
  "{icon:b33a662094}",
  "{icon:643d396fef}",
  "{icon:8787ebb1b2}",
  "{icon:61819484ab}",
  "{icon:b609dfb7d1}",
  "{icon:3c26a2a89f} {icon:c95cdba266}",
  "{icon:61819484ab}",
  "{icon:61819484ab}",
  "{icon:b609dfb7d1}",
  "{icon:f9f205b9e1} {icon:6c5de8d976} ! {icon:f9f205b9e1} {icon:6c5de8d976} ! {icon:f9f205b9e1} {icon:6c5de8d976} !",
  "{icon:1f26dc63eb}",
  "{icon:39d6ddf024} {icon:7b8c742c86}",
];
export function assertCollectorTileLabels(raw: RawFile): void {
  const face = raw.cards.find((c) => c.id === "dungeon_tile:p007")?.faces.back;
  if (
    !face ||
    JSON.stringify(face.lines.map((l) => l.text)) !== JSON.stringify(approvedTileLines) ||
    ["f9f205b9e1", "6c5de8d976"].some(
      (id) => face.icons.filter((i) => i.iconId === id).length !== 3,
    )
  )
    throw new Error("R-168：收藏家三宝箱、叹号与印刷编号漂移");
}
