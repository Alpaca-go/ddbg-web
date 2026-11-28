import type { RawFile } from "../../shared/extract/raw";
import {
  WARRENS_ROOM_BACK,
  WARRENS_ROOM_FRONT,
  warrensRoomFileSchema,
  type WarrensNormalRoomCard,
} from "./room";

const PENDING = "Q-WARRENS-01：Warrens 普通房间效果待印核（图标词典未接通前不猜）";

const EXPECTED_NAMES = [
  "Putrid Cellar",
  "The Sewage",
  "Infected Storage",
  "Experiment Deposit",
  "Dumped Shinies",
  "Rusted Armory",
  "Swinery",
  "The Gutter",
  "Foul Throne",
] as const;

function stripIcons(line: string) {
  return line.replace(/\{icon:[^}]+\}/g, "").trim();
}

function parsePrintedName(lines: readonly string[], page: number): string {
  const cleaned = lines.map(stripIcons).filter((line) => line.length > 0);
  const titleLine =
    cleaned.find((line) => new RegExp(`^${page}\\s*[—–-]`).test(line)) ??
    cleaned.find((line) => /[—–-]/.test(line)) ??
    cleaned[0];
  if (!titleLine) throw new Error(`Warrens 房间 p${page} 无法从印刷行解析名称`);
  const name = titleLine.replace(/^\d+\s*[—–-]\s*/, "").trim();
  if (!name) throw new Error(`Warrens 房间 p${page} 名称片段为空`);
  return name;
}

function verifiedEffect(page: number) {
  if (page !== 1) return null;
  return {
    ruling: "R-001" as const,
    summary:
      "Infectious Mucus：英雄回合结束须弃 1 份 Provision（Warrens 规则书普通房文案；不含 Stygian「and suffer +1」）",
    runtimeReady: false as const,
    effectAreaBinding: "partial" as const,
  };
}

function assertRoomFace(
  raw: RawFile,
  page: number,
): { readonly lines: readonly string[]; readonly page: number } {
  const card = raw.cards.find((entry) => entry.faces.front.page === page);
  if (!card) throw new Error(`raw 缺少 Warrens 房间 p${page}`);
  const front = card.faces.front;
  const back = card.faces.back;
  if (
    front.file !== WARRENS_ROOM_FRONT ||
    back?.file !== WARRENS_ROOM_BACK ||
    back.page !== front.page ||
    card.copies !== 1 ||
    card.id !== `room:warrens:p${String(front.page).padStart(3, "0")}`
  )
    throw new Error(`Warrens 房间 p${page} 来源、页码或 ID 不一致`);
  const plain = front.lines.map((line) => stripIcons(line.text)).filter((line) => line.length > 0);
  if (plain.some((line) => line === "BOSS"))
    throw new Error(`Warrens p${page} 为 Boss 房，本刀不接入`);
  return {
    lines: front.lines.map((line) => line.text),
    page: front.page,
  };
}

/** 九张 Warrens 普通房间：raw 可含 p10–p12 Boss，但 normalized 仅输出 p1–p9。 */
export function buildWarrensRooms(raw: RawFile) {
  if (raw.category !== "room" || raw.cards.length < 9)
    throw new Error("需要完整 Warrens Room raw（至少含普通房 p1–p9）");
  const cards: WarrensNormalRoomCard[] = Array.from({ length: 9 }, (_, index) => {
    const page = index + 1;
    const { lines } = assertRoomFace(raw, page);
    const name = parsePrintedName(lines, page);
    if (name !== EXPECTED_NAMES[index])
      throw new Error(
        `Warrens 房间 p${page} 名称「${name}」与核准表「${EXPECTED_NAMES[index]}」不一致`,
      );
    return {
      id: `room:warrens:${String(page).padStart(2, "0")}`,
      name,
      copies: 1 as const,
      location: "warrens" as const,
      number: page,
      boss: false as const,
      printedLines: [...lines],
      source: {
        front: WARRENS_ROOM_FRONT,
        back: WARRENS_ROOM_BACK,
        page,
      },
      verifiedEffect: verifiedEffect(page),
      pendingReview: page === 1 ? [] : [PENDING],
    };
  });
  return warrensRoomFileSchema.parse({ schema: "ddbg-warrens-room-v0", cards });
}
