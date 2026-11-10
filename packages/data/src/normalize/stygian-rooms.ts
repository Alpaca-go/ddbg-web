import type { RawFile } from "../extract/raw";
import {
  stygianRoomIdentity,
  stygianReviewedEffects,
  stygianRoomsSchema,
  validateStygianRoomNames,
} from "../stygian-rooms";
import { buildRooms } from "./room";

/** 保留印刷转录，并附加已核准的逐卡效果。 */
export function buildStygianRooms(raw: RawFile, standardRaw: RawFile) {
  if (raw.category !== "stygian_room" || raw.cards.length !== 17)
    throw new Error("需要完整17张Stygian房间卡");
  const file = stygianRoomsSchema.parse({
    schema: "ddbg-stygian-rooms-v1",
    cards: [...raw.cards]
      .sort((a, b) => a.faces.front.page - b.faces.front.page)
      .map((card) => {
        const front = card.faces.front,
          back = card.faces.back;
        const identity = stygianRoomIdentity(front.page);
        if (card.source_set !== "base" || card.copies !== 1 || !back || back.page !== front.page)
          throw new Error("Stygian房间来源/份数/双面页码不一致");
        const lines = front.lines.map((l) => l.text);
        const titles = lines
          .map((l) => l.replace(/\{icon:[^}]+\}/g, "").trim())
          .filter((l) => /^\d+—/.test(l));
        if (titles.length !== 1 || !titles[0]!.startsWith(`${identity.number}—`))
          throw new Error("Stygian房间标题编号不一致");
        const page = front.page;
        const reviewedEffect = stygianReviewedEffects[page];
        if (!reviewedEffect) throw new Error(`缺少已核对的 Stygian 房间效果：${card.id}`);
        const printed = lines.join(" ");
        if (
          (page === 2 &&
            !printed.includes(
              "can’t heal or be healed. Heroes ending their turn here suffer 1 {icon:d4c2a095b5} /Hero Level.",
            )) ||
          (page === 10 &&
            !printed.includes(
              "{icon:1e36d5379b} +2 and {icon:10365b3e0f} 3 per Negative Quirk. Special Room Effect: Once the Room is cleared, Heroes can suffer {icon:1e36d5379b} +4 each, to revive a dead Hero and place them in the Stagecoach.",
            )) ||
          (page === 16 &&
            (!printed.includes("take a Negative Quirk and a {icon:f50b9f6892}") ||
              !printed.includes("their turn here suffer {icon:abf095b29d} +3.")))
        )
          throw new Error(`Stygian 房间核准效果的来源文字漂移（R-227～R-229）：${card.id}`);
        return {
          id: card.id,
          name: titles[0]!.replace(/^\d+—/, "").trim(),
          copies: 1,
          ...identity,
          printedLines: lines,
          reviewedEffect,
          source: { front: front.file, back: back.file, page: front.page },
        };
      }),
  });
  validateStygianRoomNames(file, buildRooms(standardRaw));
  return file;
}
