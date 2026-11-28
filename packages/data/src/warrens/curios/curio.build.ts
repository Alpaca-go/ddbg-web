import { printIcon, printSourceIcon } from "../../shared/print-icons";
import { formatCurioPrintedRow } from "../../shared/curios/printed-row";
import type { RawFile } from "../../shared/extract/raw";
import {
  WARRENS_CURIO_BACK,
  WARRENS_CURIO_FRONT,
  warrensCurioFileSchema,
} from "../../core/curios/curio";
import type { CurioEffect } from "../../core/curios/curio";

type Row = readonly [
  iconId: string,
  printed: string,
  effect: CurioEffect | null,
  reason: string | null,
];
const pending = "Q-WARRENS-01：Warrens Curio 效果图标待印核";
const stress: CurioEffect = { type: "stress", amount: 1 };
const EFFECT_Y_MIN = 40;

const rowsByPage: readonly (readonly Row[])[] = [
  [
    [printIcon("stress", 129), "+1", stress, null],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p001:front:3"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p001:front:4"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p001:front:6"),
      "",
      null,
      pending,
    ],
  ],
  [
    [printIcon("stress", 129), "+1", stress, null],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p002:front:3"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p002:front:4"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p002:front:6"),
      "",
      null,
      pending,
    ],
  ],
  [
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p003:front:2"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p003:front:4"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p003:front:5"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p003:front:6"),
      "",
      null,
      pending,
    ],
  ],
  [
    [printIcon("stress", 129), "+1", stress, null],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p004:front:3"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p004:front:4"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p004:front:5"),
      "",
      null,
      pending,
    ],
  ],
  [
    [printIcon("stress", 129), "+1", stress, null],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p005:front:3"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p005:front:5"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p005:front:6"),
      "",
      null,
      pending,
    ],
  ],
  [
    [printIcon("stress", 129), "+1", stress, null],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p006:front:3"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p006:front:4"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p006:front:6"),
      "",
      null,
      pending,
    ],
  ],
  [
    [printIcon("stress", 129), "+1", stress, null],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p007:front:3"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p007:front:5"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p007:front:6"),
      "",
      null,
      pending,
    ],
  ],
  [
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p008:front:2"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p008:front:3"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p008:front:4"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p008:front:6"),
      "",
      null,
      pending,
    ],
  ],
  [
    [printIcon("stress", 129), "+1", stress, null],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p009:front:3"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p009:front:4"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p009:front:5"),
      "",
      null,
      pending,
    ],
  ],
  [
    [printIcon("stress", 129), "+1", stress, null],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p010:front:3"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p010:front:4"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p010:front:5"),
      "",
      null,
      pending,
    ],
  ],
  [
    [printIcon("stress", 129), "+1", stress, null],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p011:front:3"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p011:front:4"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p011:front:5"),
      "",
      null,
      pending,
    ],
  ],
  [
    [printIcon("stress", 129), "+1", stress, null],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p012:front:3"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p012:front:4"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p012:front:5"),
      "",
      null,
      pending,
    ],
  ],
  [
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p013:front:2"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p013:front:3"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p013:front:4"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p013:front:5"),
      "",
      null,
      pending,
    ],
  ],
  [
    [printIcon("stress", 129), "+1", stress, null],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p014:front:3"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p014:front:4"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p014:front:5"),
      "",
      null,
      pending,
    ],
  ],
  [
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p015:front:2"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p015:front:3"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p015:front:4"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p015:front:6"),
      "",
      null,
      pending,
    ],
  ],
  [
    [printIcon("stress", 129), "+1", stress, null],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p016:front:3"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p016:front:4"),
      "",
      null,
      pending,
    ],
    [
      printSourceIcon("extension/warrens/raw/curio.json:curio:warrens:p016:front:5"),
      "",
      null,
      pending,
    ],
  ],
];

const NAMES = [
  "Bone Altar",
  "Bone Altar",
  "Dinner Cart",
  "Dinner Cart",
  "Makeshift Dining Table",
  "Makeshift Dining Table",
  "Moonshine Barrel",
  "Moonshine Barrel",
  "Occult Scrawlings",
  "Pile of Bones",
  "Pile of Bones",
  "Pile of Scrolls",
  "Rack of Blades",
  "Rack of Blades",
  "Sacrificial Stone",
  "Sacrificial Stone",
] as const;

function effectIcons(rawCard: RawFile["cards"][number]) {
  return rawCard.faces.front.icons
    .filter((icon) => !icon.decor && icon.bbox[1] >= EFFECT_Y_MIN)
    .sort((a, b) => a.bbox[1] - b.bbox[1] || a.bbox[0] - b.bbox[0]);
}

export function buildWarrensCurios(raw: RawFile) {
  if (raw.category !== "curio" || raw.cards.length !== 16 || raw.n_copies_total !== 16)
    throw new Error("需要完整 Warrens Curio raw（16 面）");
  const cards = raw.cards.map((card) => {
    const front = card.faces.front;
    const page = front.page;
    const icons = effectIcons(card);
    const name = NAMES[page - 1]!;
    const titleText = front.lines.map((line) => line.text.replace(/\{icon:[^}]+\}/g, "")).join(" ");
    const back = card.faces.back;
    if (
      front.file !== WARRENS_CURIO_FRONT ||
      back?.file !== WARRENS_CURIO_BACK ||
      back.page !== front.page ||
      card.source_set !== "extension" ||
      card.copies !== 1 ||
      JSON.stringify(card.pages) !== `[${page}]` ||
      !titleText.includes(name.split(" ")[0]!) ||
      !rowsByPage[page - 1]
    )
      throw new Error(`Warrens Curio 来源或身份不符：${card.id}`);
    const expected = rowsByPage[page - 1]!;
    if (
      icons.length !== expected.length ||
      icons.some((icon, index) => icon.iconId !== expected[index]![0])
    )
      throw new Error(`Warrens Curio 效果图标顺序漂移：${card.id}`);
    return {
      id: card.id,
      name,
      copies: 1 as const,
      text: front.lines
        .filter((line) => line.bbox[1] >= 16 && line.bbox[1] < 42)
        .map((line) => line.text.replace(/\{icon:[^}]+\}/g, ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
      source: { front: WARRENS_CURIO_FRONT, back: WARRENS_CURIO_BACK, page },
      rows: expected.map(([iconId, printed, effect, reason]) => ({
        iconId,
        printed: formatCurioPrintedRow(printed, iconId),
        effect,
        reason,
      })),
    };
  });
  return warrensCurioFileSchema.parse({ schema: "ddbg-curio-v1", dictionaryVersion: "1.8", cards });
}
