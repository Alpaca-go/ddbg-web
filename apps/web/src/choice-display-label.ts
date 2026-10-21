import { provisionLabels } from "./provision-labels";

const FACE_ALIASES: Record<string, keyof typeof provisionLabels | string> = {
  food: "food",
  bandage: "bandage",
  bandages: "bandage",
  potion: "potion",
  torch: "torch",
  tool: "tool",
  shovel: "tool",
  key: "tool",
  "holy water": "potion",
  antitoxin: "potion",
  "medicinal herbs": "potion",
};

function faceLabel(face: string): string {
  const key = FACE_ALIASES[face.toLowerCase()] ?? face.toLowerCase();
  if (key in provisionLabels) return provisionLabels[key as keyof typeof provisionLabels];
  if (/^[a-z][a-z0-9 _-]*$/i.test(face) && !face.includes(":")) {
    return face.charAt(0).toUpperCase() + face.slice(1);
  }
  const tail = face.split(":").pop() ?? face;
  return tail.replace(/[-_]/g, " ");
}

/** 把引擎 pending / 危险结算文案里的补给 id 换成玩家可读标签（不改引擎）。 */
export function humanizeChoiceOptionLabel(label: string, optionId?: string): string {
  let text = label;

  text = text.replace(
    /使用\s+([a-zA-Z][a-zA-Z0-9 _-]*)\s*（[^）]+）/g,
    (_, face: string) => `使用${faceLabel(face)}`,
  );
  text = text.replace(/先使用\s+Torch\s*（[^）]+）/gi, "先使用火把");
  text = text.replace(/使用\s+Torch\s*（[^）]+）/gi, "使用火把");
  text = text.replace(/（[^）]*:[^）]*）/g, "");
  text = text.replace(/\([^)]*:[^)]*\)/g, "");
  text = text.replace(/\s{2,}/g, " ").trim();

  if (optionId && /^[a-z]+(-[a-z]+)*$/i.test(optionId) && optionId in provisionLabels) {
    return provisionLabels[optionId as keyof typeof provisionLabels];
  }
  if (optionId?.startsWith("use:")) {
    const tail = optionId.slice("use:".length).split(":").pop() ?? "";
    const short = /^([a-z]+)-(\d+)$/.exec(tail);
    if (short && text.endsWith("抵消")) {
      text = text.replace(/抵消$/, `·${short[2]}：抵消`);
    }
    return text || "使用补给";
  }
  return text || label;
}

export function formatProvisionUseButton(
  face: keyof typeof provisionLabels,
  effect: string,
): string {
  return `${provisionLabels[face]}：${effect}`;
}

export function formatProvisionInventoryLine(face: string, count: number): string {
  const name =
    face in provisionLabels
      ? provisionLabels[face as keyof typeof provisionLabels]
      : faceLabel(face);
  return count > 1 ? `${name}×${count}` : name;
}
