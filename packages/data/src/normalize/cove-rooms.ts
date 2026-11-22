import type { RawFile } from "../extract/raw";
import {
  COVE_ROOM_BACK,
  COVE_ROOM_FRONT,
  coveRoomFileSchema,
  type CoveRoomCard,
} from "../cove-room";

const PENDING = "Q-186：Cove 普通房间效果待 Kyries 逐卡核准";
const BOSS_PENDING = "Cove Boss 房留待专属 Boss 刀核准；不得进入普通房间牌堆";

function stripIcons(line: string) {
  return line.replace(/\{icon:[^}]+\}/g, "").trim();
}

function parsePrintedName(lines: readonly string[], page: number): string {
  const cleaned = lines.map(stripIcons).filter((line) => line.length > 0);
  const titleLine =
    cleaned.find((line) => new RegExp(`^${page}\\s*[—–-]`).test(line)) ??
    cleaned.find((line) => /[—–-]/.test(line)) ??
    cleaned[0];
  if (!titleLine) throw new Error(`Cove 房间 p${page} 无法从印刷行解析名称`);
  const name = titleLine.replace(/^\d+\s*[—–-]\s*/, "").trim();
  if (!name) throw new Error(`Cove 房间 p${page} 名称片段为空`);
  return name;
}

function assertRoomFace(
  raw: RawFile,
  page: number,
): { readonly lines: readonly string[]; readonly page: number } {
  const card = raw.cards.find((entry) => entry.faces.front.page === page);
  if (!card) throw new Error(`raw 缺少 Cove 房间 p${page}`);
  const front = card.faces.front;
  const back = card.faces.back;
  if (
    front.file !== COVE_ROOM_FRONT ||
    back?.file !== COVE_ROOM_BACK ||
    back.page !== front.page ||
    card.copies !== 1 ||
    card.id !== `room:cove:p${String(front.page).padStart(3, "0")}`
  )
    throw new Error(`Cove 房间 p${page} 来源、页码或 ID 不一致`);
  return { lines: front.lines.map((line) => line.text), page: front.page };
}

/** 十二张 Cove 房间：p1–p9 普通、p10–p12 Boss。 */
export function buildCoveRooms(raw: RawFile) {
  if (raw.category !== "room" || raw.cards.length !== 12)
    throw new Error("需要完整 Cove Room raw（12 面）");
  const cards: CoveRoomCard[] = Array.from({ length: 12 }, (_, index) => {
    const page = index + 1;
    const { lines } = assertRoomFace(raw, page);
    const name = parsePrintedName(lines, page);
    const base = {
      id: `room:cove:${String(page).padStart(2, "0")}`,
      name,
      copies: 1 as const,
      location: "cove" as const,
      number: page,
      printedLines: [...lines],
      source: { front: COVE_ROOM_FRONT, back: COVE_ROOM_BACK, page } as const,
    };
    if (page <= 9)
      return {
        ...base,
        boss: false as const,
        pendingReview: [PENDING],
      };
    const plain = lines.map(stripIcons).filter((line) => line.length > 0);
    if (!plain.some((line) => line === "BOSS"))
      throw new Error(`Cove p${page} 缺少印刷 BOSS 标签，不能归类为 Boss 房`);
    return {
      ...base,
      boss: true as const,
      poolEligible: false as const,
      classificationEvidence: [
        `印刷正文含独立一行「BOSS」（FRONT p${page}）`,
        `标题解析为「${name}」（p${page} 破折号标题行）`,
      ],
      pendingReview: [BOSS_PENDING],
    };
  });
  return coveRoomFileSchema.parse({ schema: "ddbg-cove-room-v0", cards });
}
